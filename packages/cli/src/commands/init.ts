import path from "node:path"
import { promises as fs } from "node:fs"
import { spawnSync } from "node:child_process"
import pc from "picocolors"
import { detectPackageManager } from "../detect-pm.js"
import { detectSrcPrefix } from "../detect-src-dir.js"
import { fetchManifest } from "../fetch-manifest.js"
import { copyManifestFiles, findCollisions } from "../copy-files.js"
import { writeForkshopJson } from "../forkshop-json.js"
import { appendForkshopCssImport } from "../globals-css-append.js"
import { fetchFontTo } from "../font-fetch.js"
import {
  DEFAULT_ALIASES,
  type ForkshopJson,
  type Manifest,
  type ResolvedAliases,
} from "../manifest-schema.js"
import { preflightInit } from "../preflight.js"
import { resolveBundles } from "../resolve-bundles.js"
import { resolveDestination } from "../resolve-destination.js"
import { mergeDepsIntoPackageJson } from "../write-deps.js"
import { maybeInstallClaudeCodePack } from "../install-claude-pack.js"

export interface InitOptions {
  projectRoot: string
  manifest?: Manifest                 // injected by tests; production uses fetchManifest
  registryUrl?: string
  force?: boolean
  installClaudePack?: boolean         // opt-in: writes hook + settings.json
}

export type InitResult = { ok: true } | { ok: false; reason: string }

const DEFAULT_REGISTRY_URL = "https://forkshop.dev/r/"

export async function runInit(options: InitOptions): Promise<InitResult> {
  const { projectRoot, force = false, installClaudePack: cliFlag } = options
  const registryUrl = options.registryUrl ?? DEFAULT_REGISTRY_URL

  // 1. Preflight
  const pre = await preflightInit(projectRoot, {})
  if (!pre.ok) return pre

  // 2. Refuse re-install
  try {
    await fs.access(path.join(projectRoot, "forkshop.json"))
    return {
      ok: false,
      reason:
        "Forkshop is already installed. Use `forkshop diff <file>` or `forkshop update`.",
    }
  } catch {
    /* OK */
  }

  // 3. Fetch manifest
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))

  // 3a. Schema gate
  if (manifest.version !== "2.0.0") {
    return {
      ok: false,
      reason: `Registry returned manifest schema ${manifest.version}; this CLI expects 2.0.0. Update your CLI or registry.`,
    }
  }

  // 4. Detect src/
  const srcPrefix = (await detectSrcPrefix(projectRoot)) as "" | "src/"

  // 5. Build aliases
  const aliases: ResolvedAliases = {
    mount: DEFAULT_ALIASES.mount,
    srcPrefix,
  }
  if (srcPrefix) {
    console.log(
      pc.dim(`\nDetected \`src/\` convention from tsconfig.json — installing under src/.`)
    )
  }

  // 6. Resolve init bundle
  const resolved = resolveBundles(manifest, ["init"])

  // 7. Collision check (text files + font)
  const destinations = resolved.fileAddresses.map((address) => {
    const file = manifest.files[address]
    if (!file) throw new Error(`Missing file in manifest: ${address}`)
    return resolveDestination(address, file, aliases)
  })
  const collisions = await findCollisions(projectRoot, destinations)
  if (collisions.length > 0 && !force) {
    return {
      ok: false,
      reason:
        "These paths conflict with existing files:\n  " +
        collisions.join("\n  ") +
        "\n\nMove them aside or rerun with --force.",
    }
  }

  // 8. Copy text files
  const textPlan = await copyManifestFiles({
    projectRoot,
    manifest,
    aliases,
    fileAddresses: resolved.fileAddresses,
  })

  // 9. Fetch + write font (binary not handled by copyManifestFiles)
  const fontAddress = "@forkshop/fonts/raveo/RaveoVF"
  const fontFile = manifest.files[fontAddress]
  let fontPlanEntry: { address: string; dest: string; sha: string } | undefined
  if (fontFile && fontFile.kind === "binary") {
    const dest = resolveDestination(fontAddress, fontFile, aliases)
    const absDest = path.join(projectRoot, dest)
    const primaryUrl = new URL(fontFile.url, manifest.registryBaseUrl).toString()
    const fallbackUrl = `https://unpkg.com/@forkshop/engine@${manifest.engineVersion}/dist/fonts/RaveoVF.woff2`
    const result = await fetchFontTo({
      primaryUrl,
      fallbackUrl,
      destAbsolute: absDest,
    })
    if (result.source === "fallback") {
      console.log(pc.yellow(`\nFont fetched from unpkg fallback (registry binary unreachable).`))
    }
    const bytes = await fs.readFile(absDest)
    const { sha256Hex } = await import("../sha.js")
    fontPlanEntry = { address: fontAddress, dest, sha: sha256Hex(bytes.toString("hex")) }
  }

  // 10. Append CSS import
  const cssResult = await appendForkshopCssImport(projectRoot, srcPrefix)
  if (cssResult.action === "skipped") {
    console.log(pc.dim(`\n${cssResult.target} already imports forkshop.css — skipped.`))
  } else if (cssResult.action === "not-found") {
    console.log(
      pc.yellow(
        `\nNo globals.css found (looked in ${cssResult.searched.join(", ")}).\n` +
          `Forkshop install will continue, but you need to add this line to your root CSS manually:\n\n` +
          `  @import "@forkshop/engine/forkshop.css";\n`
      )
    )
  }

  // 11. Merge engine into package.json
  const addedDeps = await mergeDepsIntoPackageJson(projectRoot, [
    `@forkshop/engine@^${manifest.engineVersion}`,
  ])

  // 11a. Install Claude Code producer pack if user opted in (via setup skill
  // setting FORKSHOP_INSTALL_CLAUDE_PACK=1, or via CLI flag).
  const consent = cliFlag === true || process.env.FORKSHOP_INSTALL_CLAUDE_PACK === "1"
  const pack = await maybeInstallClaudeCodePack({
    projectRoot,
    manifest,
    consent,
  })

  // 12. Write forkshop.json
  const allPlan = [...textPlan, ...(fontPlanEntry ? [fontPlanEntry] : [])]
  const lock: ForkshopJson = {
    $schema: "https://forkshop.dev/schema/forkshop.json",
    schemaVersion: "2.0.0",
    installedAt: new Date().toISOString(),
    registryUrl,
    engineVersion: manifest.engineVersion,
    mount: aliases.mount,
    srcPrefix: aliases.srcPrefix,
    installedBundles: resolved.bundleNames,
    files: Object.fromEntries(allPlan.map((e) => [e.address, { dest: e.dest, sha: e.sha }])),
    ...(pack.installed ? { producerPack: { claudeCode: true } } : {}),
  }
  await writeForkshopJson(projectRoot, lock)

  // 13. Summary
  console.log(pc.green(`\nInstalled ${allPlan.length} files into your project.`))
  if (pack.installed) {
    console.log(pc.dim(`Claude Code live-AI hook installed to .claude/hooks/forkshop-post-tool-use.sh`))
  }

  // 14. Run package manager install (unless --no-install)
  if (addedDeps.length > 0) {
    const pm = await detectPackageManager(projectRoot)
    console.log(pc.dim(`\nInstalling @forkshop/engine via ${pm}...`))
    const result = spawnSync(pm, ["install"], { cwd: projectRoot, stdio: "inherit" })
    if (result.status !== 0) {
      console.error(
        pc.red(
          `\n${pm} install failed. Scaffold files are in place — re-run \`${pm} install\` manually to retry.`
        )
      )
      return { ok: false, reason: `${pm} install exited with status ${result.status ?? "unknown"}` }
    }
  }

  console.log("\nNext steps:")
  console.log("  1. Open Claude Code in this project and type 'set up Forkshop' to finish wiring.")
  console.log("  2. Or read `app/forkshop/CLAUDE.md` to extend Forkshop by hand.")

  return { ok: true }
}
