import { exec } from "node:child_process"
import { promisify } from "node:util"
import pc from "picocolors"
import { buildInstallCommand, detectPackageManager } from "../detect-pm.js"
import { copyManifestFiles, findCollisions } from "../copy-files.js"
import { writeFogmaJson } from "../fogma-json.js"
import { fetchManifest } from "../fetch-manifest.js"
import { type FogmaJson, type Manifest } from "../manifest-schema.js"
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

const DEFAULT_REGISTRY_URL = "https://fogma.dev/r/"

const DEFAULT_FOGMA_ALIASES: FogmaJson["aliases"] = {
  base: "@/",
  components: "@/components/fogma",
  kits: "@/components/fogma/kits",
  hooks: "@/lib/fogma/hooks",
  lib: "@/lib/fogma",
  api: "@/app/api/fogma",
  tailwind: "@/lib/fogma/tailwind",
  mount: "@/app/fogma",
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
    await fs.access(path.join(projectRoot, "fogma.json"))
    return {
      ok: false,
      reason: "Fogma is already installed. Use `fogma diff <file>` or `fogma add <kit>`.",
    }
  } catch {
    // OK — fogma.json doesn't exist
  }

  // 3. Fetch manifest (or use injected one for tests).
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))

  // 4. Resolve init bundle.
  const resolved = resolveBundles(manifest, ["init"])

  // 5. Collision check.
  const destinations = resolved.fileAddresses.map((address) => {
    const file = manifest.files[address]
    if (!file) throw new Error(`Missing file in manifest: ${address}`)
    return resolveDestination(address, file, DEFAULT_FOGMA_ALIASES)
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
    aliases: DEFAULT_FOGMA_ALIASES,
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

  // 8. Write fogma.json.
  const fogmaJson: FogmaJson = {
    $schema: "https://fogma.dev/schema/fogma.json",
    registryVersion: manifest.version,
    installedAt: new Date().toISOString(),
    registryUrl,
    aliases: DEFAULT_FOGMA_ALIASES,
    installedBundles: resolved.bundleNames,
    files: Object.fromEntries(
      plan.map((entry) => [entry.address, { dest: entry.dest, sha: entry.sha }])
    ),
  }
  await writeFogmaJson(projectRoot, fogmaJson)

  // 9. Print summary.
  console.log(pc.green(`\nInstalled ${plan.length} files into your project.`))
  console.log("\nNext steps:")
  console.log("  1. Open Claude Code in this project and type 'set up Fogma' to finish wiring.")
  console.log("  2. Or run `pnpm dev` and open /fogma to see the default layout.")

  return { ok: true }
}
