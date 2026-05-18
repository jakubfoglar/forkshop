/**
 * v2 schema — engine on npm, manifest carries only thin scaffolds + the
 * Raveo font binary. v1 schema (primitives + layouts copied as source)
 * is fully retired.
 */

export const MANIFEST_SCHEMA_VERSION = "2.0.0"

export interface Manifest {
  version: string                  // "2.0.0"
  generatedAt: string
  registryBaseUrl: string
  engineVersion: string            // engine version this manifest was built against
  bundles: Record<string, Bundle>
  files: Record<string, ManifestFile>
}

export type Bundle =
  | { kind: "scaffold"; items: string[] }    // text files copied via the file walker
  | { kind: "asset"; items: string[] }       // binary files
  | { kind: "composite"; includes: string[] }

export type ManifestFile =
  | {
      kind: "text"
      ext: "tsx" | "ts" | "md" | "css" | "sh"
      content: string
      destOverride?: string
    }
  | {
      kind: "binary"
      url: string                     // resolved against registryBaseUrl
      destOverride: string
    }

/**
 * Slim alias map used at install time. Only `mount` is user-configurable
 * (where `app/forkshop/` lives); `srcPrefix` is detected from tsconfig.
 */
export interface ResolvedAliases {
  mount: string                       // e.g. "@/app/forkshop"
  srcPrefix: "" | "src/"
}

export const DEFAULT_ALIASES: ResolvedAliases = {
  mount: "@/app/forkshop",
  srcPrefix: "",
}

/**
 * The shape persisted at <project>/forkshop.json after `init` runs.
 */
export interface ForkshopJson {
  $schema?: string
  schemaVersion: "2.0.0"
  installedAt: string
  registryUrl: string
  engineVersion: string               // pinned `@forkshop/engine` version at install time
  mount: string                       // mirror of ResolvedAliases.mount
  srcPrefix: "" | "src/"              // mirror of ResolvedAliases.srcPrefix
  installedBundles: string[]
  files: Record<string, ForkshopJsonFile>
}

export interface ForkshopJsonFile {
  dest: string                        // workspace-relative path on disk
  sha: string                         // sha256 of content as written (post-rewrite)
}
