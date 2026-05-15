import { promises as fs } from "node:fs"
import path from "node:path"
import {
  MANIFEST_SCHEMA_VERSION,
  type Bundle,
  type Manifest,
  type ManifestFile,
} from "./manifest-schema.js"

export interface BuildManifestOptions {
  registryRoot: string
  registryBaseUrl?: string
}

const DEFAULT_BASE_URL = "https://forkshop.dev/r/"

/**
 * Maps an absolute file path inside packages/registry to a canonical @forkshop/* address.
 * Files under src/ get the address derived from their path-from-src.
 * Files under tailwind/ get @forkshop/tailwind/<name> or @forkshop/css/<name> for .css.
 * Files under templates/ get @forkshop/templates/<name>.
 */
function pathToAddress(registryRoot: string, absolutePath: string): string | undefined {
  const rel = path.relative(registryRoot, absolutePath).split(path.sep).join("/")
  if (rel.startsWith("src/")) {
    const noExt = rel.slice("src/".length).replace(/\.(ts|tsx|md|css)$/, "")
    return `@forkshop/${noExt}`
  }
  if (rel.startsWith("tailwind/")) {
    const noExt = rel.slice("tailwind/".length).replace(/\.(ts|css)$/, "")
    // forkshop-preset.ts → @forkshop/tailwind/forkshop-preset
    // forkshop.css → @forkshop/css/forkshop
    if (noExt === "forkshop" && rel.endsWith(".css")) return "@forkshop/css/forkshop"
    return `@forkshop/tailwind/${noExt}`
  }
  if (rel.startsWith("templates/")) {
    const noExt = rel.slice("templates/".length).replace(/\.(md|tsx|ts)$/, "")
    if (noExt === "user-claude-md") return "@forkshop/templates/claude-md"
    return `@forkshop/templates/${noExt}`
  }
  return undefined
}

function extOf(absolutePath: string): "ts" | "tsx" | "md" | "css" | "json" | "sh" {
  const dotIndex = absolutePath.lastIndexOf(".")
  const ext = absolutePath.slice(dotIndex + 1)
  if (ext === "ts" || ext === "tsx" || ext === "md" || ext === "css" || ext === "json" || ext === "sh") {
    return ext
  }
  throw new Error(`Unknown extension for ${absolutePath}`)
}

// Binary font files live under packages/registry/fonts/<family>/<file>.woff2.
// We address them as `@forkshop/fonts/<family>/<file>` and drop them into the
// user's public/fonts/forkshop/<file> so the CSS `@font-face` declaration
// (relative URL `/fonts/forkshop/<file>`) resolves at runtime.
function fontAddress(registryRoot: string, absolutePath: string): string | undefined {
  const rel = path.relative(registryRoot, absolutePath).split(path.sep).join("/")
  if (!rel.startsWith("fonts/")) return undefined
  const noExt = rel.slice("fonts/".length).replace(/\.woff2?$/, "")
  return `@forkshop/fonts/${noExt}`
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries: import("node:fs").Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return out
    throw error
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else out.push(full)
  }
  return out
}

export async function buildManifest(options: BuildManifestOptions): Promise<Manifest> {
  const { registryRoot, registryBaseUrl = DEFAULT_BASE_URL } = options

  const srcFiles = await walk(path.join(registryRoot, "src"))
  const tailwindFiles = await walk(path.join(registryRoot, "tailwind"))
  const templateFiles = await walk(path.join(registryRoot, "templates"))
  const fontFiles = await walk(path.join(registryRoot, "fonts"))

  // The registry's own top-level barrel — not consumed by users, so skip it.
  // Only the exact `packages/registry/src/index.ts` is dropped; nested
  // `components/foo/index.ts` files (if introduced later) are still included.
  const topLevelBarrel = path.join(registryRoot, "src", "index.ts")

  const files: Record<string, ManifestFile> = {}

  for (const absPath of [...srcFiles, ...tailwindFiles, ...templateFiles]) {
    // Skip test files
    if (/\.test\.(ts|tsx)$/.test(absPath)) continue
    // Skip only the registry's own top-level barrel.
    if (absPath === topLevelBarrel) continue
    const address = pathToAddress(registryRoot, absPath)
    if (!address) continue
    const content = await fs.readFile(absPath, "utf8")
    files[address] = {
      kind: "text",
      ext: extOf(absPath),
      content,
    }
  }

  // Font binaries — referenced by URL relative to registryBaseUrl. Dropped at
  // public/fonts/forkshop/<basename> so the @font-face URL `/fonts/forkshop/...`
  // resolves at runtime.
  for (const absPath of fontFiles) {
    const address = fontAddress(registryRoot, absPath)
    if (!address) continue
    const rel = path.relative(registryRoot, absPath).split(path.sep).join("/")
    const basename = path.basename(absPath)
    files[address] = {
      kind: "binary",
      url: rel, // registryBaseUrl + url = the binary's serving URL
      destOverride: `public/fonts/forkshop/${basename}`,
    }
  }

  // destOverrides for fixed-location files.
  const overrides: Record<string, string> = {
    "@forkshop/templates/claude-md": "{aliases.mount}/CLAUDE.md",
    "@forkshop/css/forkshop": "{aliases.mount}/forkshop.css",
    "@forkshop/tailwind/forkshop-preset": "{aliases.tailwind}/forkshop-preset.ts",
  }
  for (const [address, dest] of Object.entries(overrides)) {
    const existing = files[address]
    if (existing && existing.kind === "text") {
      files[address] = { ...existing, destOverride: dest }
    }
  }

  // Skill files all land in .claude/skills/forkshop-<name>.md. Pattern-based
  // so new skill files (doc-sync, etc.) install correctly without a manifest
  // edit.
  for (const address of Object.keys(files)) {
    if (!address.startsWith("@forkshop/skill/")) continue
    const name = address.slice("@forkshop/skill/".length)
    const existing = files[address]
    if (existing && existing.kind === "text") {
      files[address] = { ...existing, destOverride: `.claude/skills/forkshop-${name}.md` }
    }
  }

  // Construct bundles. Items computed by inspecting the files map.
  const isPrimitiveAddress = (addr: string): boolean =>
    addr.startsWith("@forkshop/components/") ||
    addr.startsWith("@forkshop/hooks/") ||
    addr.startsWith("@forkshop/lib/") ||
    addr.startsWith("@forkshop/api/") ||
    addr.startsWith("@forkshop/types/") ||
    addr.startsWith("@forkshop/node-types/")

  const primitiveItems = Object.keys(files).filter(isPrimitiveAddress).sort()

  const skillItems = Object.keys(files).filter((addr) => addr.startsWith("@forkshop/skill/")).sort()

  // Bundle authoring note:
  // - `fonts` is intentionally empty in v1; it will be populated when Raveo
  //   woff2 files land in packages/registry/fonts/. The bundle exists so `init`
  //   already includes it — adding the assets later won't require manifest
  //   schema changes.
  // - `skill` is populated dynamically from any `@forkshop/skill/*` addresses
  //   present in the registry's `src/skill/` directory.
  // - `primitives.deps` mirrors packages/registry/package.json `dependencies`.
  //   Keep the pins in sync when bumping the registry.
  // - Layout bundles replaced the old `kits/*` bundles after the Node/NodeType
  //   refactor. Each Layout is a single file (gallery, tree, design-system-view).
  const bundles: Record<string, Bundle> = {
    primitives: {
      kind: "primitive",
      items: primitiveItems,
      deps: [
        "clsx@^2.1.1",
        "motion@^11.0.0",
        "lucide-react@^1.14.0",
        "@locator/runtime@^0.5.1",
      ],
    },
    "layouts/gallery": {
      kind: "kit",
      items: ["@forkshop/layouts/gallery"],
    },
    "layouts/tree": {
      kind: "kit",
      items: ["@forkshop/layouts/tree"],
    },
    "layouts/design-system-view": {
      kind: "kit",
      items: ["@forkshop/layouts/design-system-view"],
    },
    fonts: {
      kind: "asset",
      items: Object.keys(files).filter((addr) => addr.startsWith("@forkshop/fonts/")).sort(),
    },
    "css-and-config": {
      kind: "asset",
      items: [
        "@forkshop/css/forkshop",
        "@forkshop/tailwind/forkshop-preset",
        "@forkshop/templates/claude-md",
      ].filter((address) => address in files),
    },
    skill: {
      kind: "asset",
      items: skillItems,
    },
    init: {
      kind: "composite",
      includes: [
        "primitives",
        "layouts/gallery",
        "layouts/tree",
        "layouts/design-system-view",
        "fonts",
        "skill",
        "css-and-config",
      ],
    },
  }

  return {
    version: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    registryBaseUrl,
    bundles,
    files,
  }
}
