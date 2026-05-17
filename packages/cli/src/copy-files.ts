import { promises as fs } from "node:fs"
import path from "node:path"
import type { Manifest, ResolvedAliases } from "./manifest-schema.js"
import { resolveDestination } from "./resolve-destination.js"
import { applyTemplatePlaceholders } from "./rewrite.js"
import { sha256Hex } from "./sha.js"

export interface CopyOptions {
  projectRoot: string
  manifest: Manifest
  aliases: ResolvedAliases
  fileAddresses: string[]
}

export interface CopyPlanEntry {
  address: string
  dest: string
  sha: string
}

export type CopyPlan = CopyPlanEntry[]

/**
 * Copies the requested manifest files into the user's project, applying
 * template-placeholder substitution to text files. Binary files (the font)
 * are handled by the init flow via the dedicated font-fetch utility — NOT
 * routed through this function — because their delivery has a fallback
 * (unpkg) and a `binary` ManifestFile is just a pointer (no content inline).
 */
export async function copyManifestFiles(options: CopyOptions): Promise<CopyPlan> {
  const { projectRoot, manifest, aliases, fileAddresses } = options
  const plan: CopyPlan = []

  for (const address of fileAddresses) {
    const file = manifest.files[address]
    if (!file) throw new Error(`Address ${address} missing from manifest files`)
    if (file.kind === "binary") {
      // Skipped here — see comment above. Caller handles binaries directly.
      continue
    }

    const dest = resolveDestination(address, file, aliases)
    const absDest = path.join(projectRoot, dest)
    await fs.mkdir(path.dirname(absDest), { recursive: true })

    const rewritten = applyTemplatePlaceholders(file.content, aliases)
    await fs.writeFile(absDest, rewritten, "utf8")
    plan.push({ address, dest, sha: sha256Hex(rewritten) })
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
