import { exec } from "node:child_process"
import { promisify } from "node:util"
import pc from "picocolors"
import { buildInstallCommand, detectPackageManager } from "../detect-pm.js"
import { copyManifestFiles, findCollisions } from "../copy-files.js"
import { writeForkshopJson } from "../forkshop-json.js"
import { fetchManifest } from "../fetch-manifest.js"
import { type ForkshopJson, type Manifest } from "../manifest-schema.js"
import { preflightInit } from "../preflight.js"
import { resolveBundles } from "../resolve-bundles.js"
import { resolveDestination } from "../resolve-destination.js"

const execAsync = promisify(exec)

export interface InitOptions {
  projectRoot: string
  manifest?: Manifest // for tests; production uses fetchManifest
  registryUrl?: string
  force?: boolean
  noInstall?: boolean
  warnDirtyGit?: boolean
}

export type InitResult = { ok: true } | { ok: false; reason: string }

const DEFAULT_REGISTRY_URL = "https://forkshop.dev/r/"

const DEFAULT_FORKSHOP_ALIASES: ForkshopJson["aliases"] = {
  base: "@/",
  components: "@/components/forkshop",
  kits: "@/components/forkshop/kits",
  hooks: "@/lib/forkshop/hooks",
  lib: "@/lib/forkshop",
  api: "@/app/api/forkshop",
  tailwind: "@/lib/forkshop/tailwind",
  mount: "@/app/forkshop",
}

export async function runInit(options: InitOptions): Promise<InitResult> {
  const { projectRoot, force = false, noInstall = false } = options
  const registryUrl = options.registryUrl ?? DEFAULT_REGISTRY_URL

  // 1. Preflight.
  const preflight = await preflightInit(projectRoot, {})
  if (!preflight.ok) return preflight

  // 2. Refuse re-install.
  const { promises: fs } = await import("node:fs")
  const path = await import("node:path")
  try {
    await fs.access(path.join(projectRoot, "forkshop.json"))
    return {
      ok: false,
      reason: "Forkshop is already installed. Use `forkshop diff <file>` or `forkshop add <kit>`.",
    }
  } catch {
    // OK — forkshop.json doesn't exist
  }

  // 3. Fetch manifest (or use injected one for tests).
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))

  // 4. Resolve init bundle.
  const resolved = resolveBundles(manifest, ["init"])

  // 5. Collision check.
  const destinations = resolved.fileAddresses.map((address) => {
    const file = manifest.files[address]
    if (!file) throw new Error(`Missing file in manifest: ${address}`)
    return resolveDestination(address, file, DEFAULT_FORKSHOP_ALIASES)
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

  // 6. Copy + rewrite.
  const plan = await copyManifestFiles({
    projectRoot,
    manifest,
    aliases: DEFAULT_FORKSHOP_ALIASES,
    fileAddresses: resolved.fileAddresses,
  })

  // 7. Install runtime deps.
  if (!noInstall && resolved.deps.length > 0) {
    const pm = await detectPackageManager(projectRoot)
    const cmd = buildInstallCommand(pm, resolved.deps)
    try {
      console.log(pc.dim(`\nRunning: ${cmd}`))
      await execAsync(cmd, { cwd: projectRoot })
    } catch (error) {
      console.error(
        pc.yellow(
          `\nPackage install failed. Files are written. Retry manually:\n  ${cmd}\n\n${(error as Error).message}`
        )
      )
    }
  }

  // 8. Write forkshop.json.
  const forkshopJson: ForkshopJson = {
    $schema: "https://forkshop.dev/schema/forkshop.json",
    registryVersion: manifest.version,
    installedAt: new Date().toISOString(),
    registryUrl,
    aliases: DEFAULT_FORKSHOP_ALIASES,
    installedBundles: resolved.bundleNames,
    files: Object.fromEntries(
      plan.map((entry) => [entry.address, { dest: entry.dest, sha: entry.sha }])
    ),
  }
  await writeForkshopJson(projectRoot, forkshopJson)

  // 9. Print summary.
  console.log(pc.green(`\nInstalled ${plan.length} files into your project.`))
  console.log("\nNext steps:")
  console.log("  1. Open Claude Code in this project and type 'set up Forkshop' to finish wiring.")
  console.log("  2. Or run `pnpm dev` and open /forkshop to see the default layout.")

  return { ok: true }
}
