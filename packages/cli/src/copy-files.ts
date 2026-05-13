import { promises as fs } from "node:fs"
import path from "node:path"
import type { ForkshopJson, Manifest } from "./manifest-schema.js"
import { resolveDestination } from "./resolve-destination.js"
import { rewriteImports } from "./rewrite.js"
import { sha256Hex } from "./sha.js"

export interface CopyOptions {
  projectRoot: string
  manifest: Manifest
  aliases: ForkshopJson["aliases"]
  fileAddresses: string[]
}

export interface CopyPlanEntry {
  address: string
  dest: string
  sha: string
}

export type CopyPlan = CopyPlanEntry[]

function aliasMapForRewrite(aliases: ForkshopJson["aliases"]): Record<string, string> {
  return {
    "@forkshop/components": aliases.components,
    "@forkshop/kits": aliases.kits,
    "@forkshop/hooks": aliases.hooks,
    "@forkshop/lib": aliases.lib,
    "@forkshop/api": aliases.api,
    "@forkshop/tailwind": aliases.tailwind,
  }
}

export async function copyManifestFiles(options: CopyOptions): Promise<CopyPlan> {
  const { projectRoot, manifest, aliases, fileAddresses } = options
  const aliasMap = aliasMapForRewrite(aliases)
  const plan: CopyPlan = []

  for (const address of fileAddresses) {
    const file = manifest.files[address]
    if (!file) throw new Error(`Address ${address} missing from manifest files`)

    const dest = resolveDestination(address, file, aliases)
    const absDest = path.join(projectRoot, dest)
    await fs.mkdir(path.dirname(absDest), { recursive: true })

    if (file.kind === "binary") {
      const url = new URL(file.url, manifest.registryBaseUrl).toString()
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Could not fetch binary ${address} from ${url}: HTTP ${response.status}`)
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      await fs.writeFile(absDest, buffer)
      plan.push({ address, dest, sha: sha256Hex(buffer.toString("hex")) })
    } else {
      const rewritten = rewriteImports(file.content, aliasMap)
      await fs.writeFile(absDest, rewritten, "utf8")
      plan.push({ address, dest, sha: sha256Hex(rewritten) })
    }
  }

  return plan
}

export async function findCollisions(
  projectRoot: string,
  destinations: string[]
): Promise<string[]> {
  const collisions: string[] = []
  for (const dest of destinations) {
    try {
      await fs.access(path.join(projectRoot, dest))
      collisions.push(dest)
    } catch {
      // not present — OK
    }
  }
  return collisions
}
