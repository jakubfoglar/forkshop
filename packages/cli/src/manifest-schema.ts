/**
 * Shared schema for the fogma registry manifest.
 * Consumed by the CLI, produced by apps/docs.
 */

export interface Manifest {
  version: string
  generatedAt: string
  registryBaseUrl: string
  bundles: Record<string, Bundle>
  files: Record<string, ManifestFile>
}

export type Bundle =
  | { kind: "primitive"; items: string[]; deps?: string[] }
  | { kind: "kit"; items: string[]; deps?: string[] }
  | { kind: "asset"; items: string[]; deps?: string[] }
  | { kind: "composite"; includes: string[] }

export type ManifestFile =
  | {
      kind: "text"
      ext: "tsx" | "ts" | "md" | "css" | "json" | "sh"
      content: string
      destOverride?: string
    }
  | {
      kind: "binary"
      url: string
      destOverride: string
    }

/**
 * Resolved alias map for path rewriting. Keys are `@fogma/<prefix>`,
 * values are the user-side alias (e.g. `@/components/fogma`).
 */
export type ResolvedAliases = Record<string, string>

/**
 * Default alias map applied when init has not yet been customised.
 */
export const DEFAULT_ALIASES: ResolvedAliases = {
  "@fogma/components": "@/components/fogma",
  "@fogma/kits": "@/components/fogma/kits",
  "@fogma/hooks": "@/lib/fogma/hooks",
  "@fogma/lib": "@/lib/fogma",
  "@fogma/api": "@/app/api/fogma",
  "@fogma/tailwind": "@/lib/fogma/tailwind",
}

/**
 * The shape persisted at <project>/fogma.json after `init` runs.
 */
export interface FogmaJson {
  $schema?: string
  registryVersion: string
  installedAt: string
  registryUrl: string
  aliases: {
    base: string
    components: string
    kits: string
    hooks: string
    lib: string
    api: string
    tailwind: string
    mount: string
  }
  installedBundles: string[]
  files: Record<string, FogmaJsonFile>
}

export interface FogmaJsonFile {
  dest: string // workspace-relative
  sha: string // sha256 of the rewritten content at install time
}

export const MANIFEST_SCHEMA_VERSION = "1.0.0"
