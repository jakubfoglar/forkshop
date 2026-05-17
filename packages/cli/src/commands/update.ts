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
  type ForkshopJson,
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
  if (lock.schemaVersion !== "2.0.0") {
    return {
      ok: false,
      reason:
        "Your installation predates this CLI's manifest schema. Back up `app/forkshop/` and rerun `forkshop init`.",
    }
  }

  const registryUrl = options.registryUrl ?? lock.registryUrl
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))
  if (manifest.version !== "2.0.0") {
    return {
      ok: false,
      reason: `Registry returned manifest schema ${manifest.version}; this CLI expects 2.0.0.`,
    }
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

  // Engine-pin drift
  const enginePin = await readEnginePin(projectRoot)
  const engineBehind = enginePin && isEnginePinBehind(enginePin.normalized, manifest.engineVersion)

  // Summary
  printSummary(manifest, plan, enginePin, engineBehind ?? false)

  if (checkOnly) {
    const anyDrift =
      plan.some((p) => p.state !== "unchanged") || engineBehind === true
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

  // Engine bump
  if (engineBehind && options.acceptEngineBump) {
    await bumpEnginePin(projectRoot, manifest.engineVersion)
    lock.engineVersion = manifest.engineVersion
  }

  await writeForkshopJson(projectRoot, lock)
  console.log(pc.green(`\nUpdated ${updatedCount} file${updatedCount === 1 ? "" : "s"}.`))
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
  engineBehind: boolean
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
  if (!drift.length && !skipped.length && !engineBehind) {
    console.log(pc.dim("\nNothing to update."))
  }
}
