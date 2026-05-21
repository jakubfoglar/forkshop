import { promises as fs } from "node:fs"
import path from "node:path"
import pc from "picocolors"
import { fetchManifest } from "../fetch-manifest.js"
import { readForkshopJson, writeForkshopJson } from "../forkshop-json.js"
import {
  bumpEnginePin,
  isEnginePinBehind,
  readEnginePin,
} from "../engine-version.js"
import {
  MANIFEST_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  type Manifest,
  type ResolvedAliases,
} from "../manifest-schema.js"
import { applyTemplatePlaceholders } from "../rewrite.js"
import { sha256Hex } from "../sha.js"
import { classifyDrift, type DriftState } from "../update-drift.js"

export interface UpdateOptions {
  projectRoot: string
  manifest?: Manifest                 // for tests
  registryUrl?: string                // override
  checkOnly?: boolean                 // --check
  apply?: boolean                     // skip prompt; useful in tests
  force?: boolean                     // overwrite local-drift
  acceptEngineBump?: boolean          // test-only — production reads from a prompt
}

export type UpdateResult =
  | { ok: true; exitCode: number }
  | { ok: false; reason: string }

interface PlanEntry {
  address: string
  dest: string
  state: DriftState
  manifestSha: string
  manifestContent: string             // rewritten ready-to-write content (binary handled separately)
}

export async function runUpdate(options: UpdateOptions): Promise<UpdateResult> {
  const { projectRoot, checkOnly = false, force = false } = options

  const lock = await readForkshopJson(projectRoot)
  if (!lock) {
    return { ok: false, reason: "Run `forkshop init` first." }
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(lock.schemaVersion)) {
    return {
      ok: false,
      reason:
        "Your installation predates this CLI's manifest schema. Back up `app/forkshop/` and rerun `forkshop init`.",
    }
  }
  if (lock.schemaVersion === "2.0.0" && MANIFEST_SCHEMA_VERSION === "2.1.0") {
    console.warn(
      pc.yellow(
        `forkshop: forkshop.json schemaVersion 2.0.0 detected (current is 2.1.0). ` +
          `Update will still work; re-run \`npx forkshop init\` to upgrade.`
      )
    )
  }

  const registryUrl = options.registryUrl ?? lock.registryUrl
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))
  if (!SUPPORTED_SCHEMA_VERSIONS.has(manifest.version)) {
    return {
      ok: false,
      reason: `Registry returned manifest schema ${manifest.version}; this CLI expects ${MANIFEST_SCHEMA_VERSION}.`,
    }
  }
  if (manifest.version === "2.0.0" && MANIFEST_SCHEMA_VERSION === "2.1.0") {
    console.warn(
      pc.yellow(
        `forkshop: manifest version 2.0.0 detected (current is 2.1.0). ` +
          `Update will still work; re-run \`npx forkshop init\` to upgrade.`
      )
    )
  }

  const aliases: ResolvedAliases = {
    mount: lock.mount,
    srcPrefix: lock.srcPrefix,
  }

  // Build the file plan
  const plan: PlanEntry[] = []
  for (const [address, lockEntry] of Object.entries(lock.files)) {
    const file = manifest.files[address]
    if (!file) continue  // removed upstream; leave on disk
    if (file.kind === "binary") {
      // Binary handled separately in production — out of scope for v2-first-cut tests.
      continue
    }
    const rewritten = applyTemplatePlaceholders(file.content, aliases)
    const manifestSha = sha256Hex(rewritten)
    let diskSha: string | undefined
    try {
      const onDisk = await fs.readFile(path.join(projectRoot, lockEntry.dest), "utf8")
      diskSha = sha256Hex(onDisk)
    } catch {
      diskSha = undefined
    }
    const state = classifyDrift({
      address,
      lockSha: lockEntry.sha,
      manifestSha,
      diskSha,
    })
    plan.push({
      address,
      dest: lockEntry.dest,
      state,
      manifestSha,
      manifestContent: rewritten,
    })
  }

  // Orphan detection: files in the lock but no longer in the manifest.
  // After the live-AI work, .claude/skills/forkshop-live-editing.md becomes
  // an orphan. Surface in summary + delete on apply.
  const orphanAddresses: string[] = []
  for (const address of Object.keys(lock.files)) {
    if (manifest.files[address] === undefined) {
      orphanAddresses.push(address)
    }
  }
  const orphansWithDest = orphanAddresses.map((address) => ({
    address,
    dest: lock.files[address]!.dest,
  }))

  // Engine-pin drift
  const enginePin = await readEnginePin(projectRoot)
  const engineBehind = enginePin && isEnginePinBehind(enginePin.normalized, manifest.engineVersion)

  // Summary
  printSummary(manifest, plan, enginePin, engineBehind ?? false, orphansWithDest)

  if (checkOnly) {
    const anyDrift =
      plan.some((p) => p.state !== "unchanged") || engineBehind === true || orphanAddresses.length > 0
    return { ok: true, exitCode: anyDrift ? 1 : 0 }
  }

  // Apply
  const apply = options.apply ?? true
  if (!apply) return { ok: true, exitCode: 0 }

  let updatedCount = 0
  for (const entry of plan) {
    const shouldApply =
      entry.state === "upstream-drift" ||
      entry.state === "missing-on-disk" ||
      ((entry.state === "local-drift" || entry.state === "both-drift") && force)
    if (!shouldApply) continue
    const abs = path.join(projectRoot, entry.dest)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, entry.manifestContent, "utf8")
    lock.files[entry.address] = { dest: entry.dest, sha: entry.manifestSha }
    updatedCount++
  }

  // Producer pack hook refresh — in-place rewrite of the script file. No
  // re-merge of .claude/settings.json (install-only mutation).
  if (lock.producerPack?.claudeCode === true) {
    const hookAddress = "@forkshop/hooks/forkshop-post-tool-use"
    const hookFile = manifest.files[hookAddress]
    if (hookFile && hookFile.kind === "text") {
      const hookPath = path.join(projectRoot, ".claude/hooks/forkshop-post-tool-use.sh")
      await fs.mkdir(path.dirname(hookPath), { recursive: true })
      await fs.writeFile(hookPath, hookFile.content, { mode: 0o755 })
    }
  }

  // Orphan deletion — best-effort.
  let orphanDeletedCount = 0
  for (const address of orphanAddresses) {
    const dest = lock.files[address]?.dest
    if (!dest) continue
    const abs = path.join(projectRoot, dest)
    try {
      await fs.unlink(abs)
      delete lock.files[address]
      orphanDeletedCount++
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === "ENOENT") {
        // Already gone; remove from lock anyway.
        delete lock.files[address]
        orphanDeletedCount++
      } else {
        console.log(pc.yellow(`Could not delete ${dest}: ${(error as Error).message}`))
      }
    }
  }

  // Engine bump
  if (engineBehind && options.acceptEngineBump) {
    await bumpEnginePin(projectRoot, manifest.engineVersion)
    lock.engineVersion = manifest.engineVersion
  }

  await writeForkshopJson(projectRoot, lock)
  console.log(pc.green(`\nUpdated ${updatedCount} file${updatedCount === 1 ? "" : "s"}.`))
  if (orphanDeletedCount > 0) {
    console.log(pc.dim(`Removed ${orphanDeletedCount} orphan${orphanDeletedCount === 1 ? "" : "s"}.`))
  }
  if (engineBehind && options.acceptEngineBump) {
    console.log(
      pc.dim(`Engine pin bumped to ${manifest.engineVersion}. Run \`pnpm install\` to fetch it.`)
    )
  }
  return { ok: true, exitCode: 0 }
}

function printSummary(
  manifest: Manifest,
  plan: PlanEntry[],
  enginePin: { raw: string; normalized: string } | undefined,
  engineBehind: boolean,
  orphans: Array<{ address: string; dest: string }>,
): void {
  console.log(
    pc.bold(`\nforkshop update — registry@${manifest.generatedAt.slice(0, 10)}`)
  )
  if (engineBehind && enginePin) {
    console.log(
      pc.dim(
        `\nEngine pin:  @forkshop/engine ${enginePin.normalized} → ${manifest.engineVersion}  (in package.json)`
      )
    )
  }
  const drift = plan.filter(
    (p) => p.state !== "unchanged" && p.state !== "local-drift" && p.state !== "both-drift"
  )
  const skipped = plan.filter((p) => p.state === "local-drift" || p.state === "both-drift")
  if (drift.length) {
    console.log(`\n${drift.length} file${drift.length === 1 ? "" : "s"} would update:`)
    for (const p of drift) {
      const marker = p.state === "missing-on-disk" ? "+" : "~"
      console.log(`  ${marker} ${p.dest}    (${p.state})`)
    }
  }
  if (skipped.length) {
    console.log(`\n${skipped.length} file${skipped.length === 1 ? "" : "s"} have local edits — skipped:`)
    for (const p of skipped) {
      console.log(`  ! ${p.dest}    (${p.state}; rerun with --force to overwrite)`)
    }
  }
  if (orphans.length) {
    console.log(`\n${orphans.length} file${orphans.length === 1 ? "" : "s"} no longer in registry — will delete:`)
    for (const o of orphans) {
      console.log(`  - ${o.dest}    (orphan)`)
    }
  }
  if (!drift.length && !skipped.length && !engineBehind && !orphans.length) {
    console.log(pc.dim("\nNothing to update."))
  }
}
