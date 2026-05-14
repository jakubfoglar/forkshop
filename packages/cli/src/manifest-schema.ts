/**
 * Shared schema for the forkshop registry manifest.
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
 * Resolved alias map for path rewriting. Keys are `@forkshop/<prefix>`,
 * values are the user-side alias (e.g. `@/components/forkshop`).
 */
export type ResolvedAliases = Record<string, string>

/**
 * Default alias map applied when init has not yet been customised.
 */
export const DEFAULT_ALIASES: ResolvedAliases = {
  "@forkshop/components": "@/components/forkshop",
  "@forkshop/kits": "@/components/forkshop/kits",
  "@forkshop/hooks": "@/lib/forkshop/hooks",
  "@forkshop/lib": "@/lib/forkshop",
  "@forkshop/api": "@/app/api/forkshop",
  "@forkshop/tailwind": "@/lib/forkshop/tailwind",
}

/**
 * The shape persisted at <project>/forkshop.json after `init` runs.
 */
export interface ForkshopJson {
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
    /**
     * Disk-path prefix prepended to all workspace-relative destinations.
     * `""` for projects where `@/*` resolves to `./*` (flat layout, default).
     * `"src/"` for projects where `@/*` resolves to `./src/*` (Next's
     * `--src-dir` convention). Detected at `init` from `tsconfig.json`.
     */
    srcPrefix?: string
  }
  installedBundles: string[]
  files: Record<string, ForkshopJsonFile>
}

export interface ForkshopJsonFile {
  dest: string // workspace-relative
  sha: string // sha256 of the rewritten content at install time
}

export const MANIFEST_SCHEMA_VERSION = "1.0.0"
