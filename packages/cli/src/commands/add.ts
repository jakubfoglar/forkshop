import { exec } from "node:child_process"
import { promisify } from "node:util"
import pc from "picocolors"
import { buildInstallCommand, detectPackageManager } from "../detect-pm.js"
import { copyManifestFiles, findCollisions } from "../copy-files.js"
import { fetchManifest } from "../fetch-manifest.js"
import { readForkshopJson, writeForkshopJson } from "../forkshop-json.js"
import type { Manifest } from "../manifest-schema.js"
import { resolveBundles } from "../resolve-bundles.js"
import { resolveDestination } from "../resolve-destination.js"

const execAsync = promisify(exec)

export interface AddOptions {
  projectRoot: string
  bundleName: string
  manifest?: Manifest
  registryUrl?: string
  force?: boolean
  noInstall?: boolean
}

export type AddResult = { ok: true } | { ok: false; reason: string }

export async function runAdd(options: AddOptions): Promise<AddResult> {
  const { projectRoot, bundleName, force = false, noInstall = false } = options

  const forkshopJson = await readForkshopJson(projectRoot)
  if (!forkshopJson) {
    return { ok: false, reason: "Run `forkshop init` first." }
  }

  if (forkshopJson.installedBundles.includes(bundleName)) {
    return { ok: false, reason: `Bundle "${bundleName}" already installed.` }
  }

  const manifest = options.manifest ?? (await fetchManifest(forkshopJson.registryUrl))

  if (!manifest.bundles[bundleName]) {
    const valid = Object.keys(manifest.bundles)
      .filter((n) => {
        const bundle = manifest.bundles[n]
        return bundle && bundle.kind !== "composite"
      })
      .sort()
      .join(", ")
    return { ok: false, reason: `Unknown bundle: "${bundleName}". Available: ${valid}.` }
  }

  const resolved = resolveBundles(manifest, [bundleName])

  // Filter out files already installed.
  const newFileAddresses = resolved.fileAddresses.filter(
    (address) => !forkshopJson.files[address]
  )

  const destinations = newFileAddresses.map((address) => {
    const file = manifest.files[address]
    if (!file) throw new Error(`Missing file in manifest: ${address}`)
    return resolveDestination(address, file, forkshopJson.aliases)
  })
  const collisions = await findCollisions(projectRoot, destinations)
  if (collisions.length > 0 && !force) {
    return {
      ok: false,
      reason:
        "These paths conflict:\n  " +
        collisions.join("\n  ") +
        "\n\nRerun with --force to overwrite.",
    }
  }

  const plan = await copyManifestFiles({
    projectRoot,
    manifest,
    aliases: forkshopJson.aliases,
    fileAddresses: newFileAddresses,
  })

  if (!noInstall && resolved.deps.length > 0) {
    const pm = await detectPackageManager(projectRoot)
    const cmd = buildInstallCommand(pm, resolved.deps)
    try {
      console.log(pc.dim(`\nRunning: ${cmd}`))
      await execAsync(cmd, { cwd: projectRoot })
    } catch (error) {
      console.error(
        pc.yellow(
          `Package install failed. Files written. Retry: ${cmd}\n${(error as Error).message}`
        )
      )
    }
  }

  forkshopJson.installedBundles = [...forkshopJson.installedBundles, bundleName]
  for (const entry of plan) {
    forkshopJson.files[entry.address] = { dest: entry.dest, sha: entry.sha }
  }
  await writeForkshopJson(projectRoot, forkshopJson)

  console.log(pc.green(`\nAdded ${plan.length} files.`))

  return { ok: true }
}
