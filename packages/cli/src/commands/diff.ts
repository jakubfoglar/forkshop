import { promises as fs } from "node:fs"
import path from "node:path"
import { fetchManifest } from "../fetch-manifest.js"
import { readForkshopJson } from "../forkshop-json.js"
import {
  MANIFEST_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  type Manifest,
  type ResolvedAliases,
} from "../manifest-schema.js"
import { applyTemplatePlaceholders } from "../rewrite.js"
import { unifiedDiff } from "../unified-diff.js"

export interface DiffOptions {
  projectRoot: string
  path: string
  manifest?: Manifest
  registryUrl?: string
}

export interface DiffResult {
  diff?: string
  message?: string
  exitCode: 0 | 1 | 2
}

export async function runDiff(options: DiffOptions): Promise<DiffResult> {
  const lock = await readForkshopJson(options.projectRoot)
  if (!lock) {
    return { exitCode: 2, message: "Run `forkshop init` first." }
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(lock.schemaVersion)) {
    return {
      exitCode: 2,
      message: "Your installation predates the v2 schema. Run `forkshop init` against a fresh layout.",
    }
  }
  if (lock.schemaVersion === "2.0.0" && MANIFEST_SCHEMA_VERSION === "2.1.0") {
    console.warn(
      `forkshop: forkshop.json schemaVersion 2.0.0 detected (current is 2.1.0). ` +
        `Diff will still work; re-run \`npx forkshop init\` to upgrade.`
    )
  }

  // Find the address that maps to this path
  let address: string | undefined
  for (const [addr, entry] of Object.entries(lock.files)) {
    if (entry.dest === options.path) {
      address = addr
      break
    }
  }
  if (!address) {
    return {
      exitCode: 2,
      message: `\`${options.path}\` is not a Forkshop-managed file (not in forkshop.json).`,
    }
  }

  const registryUrl = options.registryUrl ?? lock.registryUrl
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))
  const file = manifest.files[address]
  if (!file || file.kind !== "text") {
    return {
      exitCode: 2,
      message: `\`${options.path}\` is not a text file in the current manifest.`,
    }
  }

  const aliases: ResolvedAliases = {
    mount: lock.mount,
    srcPrefix: lock.srcPrefix,
  }
  const upstream = applyTemplatePlaceholders(file.content, aliases)

  let local: string
  try {
    local = await fs.readFile(path.join(options.projectRoot, options.path), "utf8")
  } catch {
    return {
      exitCode: 2,
      message: `\`${options.path}\` is in forkshop.json but missing on disk.`,
    }
  }

  if (local === upstream) {
    return { exitCode: 0 }
  }

  return {
    exitCode: 1,
    diff: unifiedDiff(local, upstream, {
      from: `${options.path} (local)`,
      to: `${options.path} (upstream)`,
    }),
  }
}
