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

const DEFAULT_BASE_URL = "https://fogma.dev/r/"

/**
 * Maps an absolute file path inside packages/registry to a canonical @fogma/* address.
 * Files under src/ get the address derived from their path-from-src.
 * Files under tailwind/ get @fogma/tailwind/<name> or @fogma/css/<name> for .css.
 * Files under templates/ get @fogma/templates/<name>.
 */
function pathToAddress(registryRoot: string, absolutePath: string): string | undefined {
  const rel = path.relative(registryRoot, absolutePath).split(path.sep).join("/")
  if (rel.startsWith("src/")) {
    const noExt = rel.slice("src/".length).replace(/\.(ts|tsx|md|css)$/, "")
    return `@fogma/${noExt}`
  }
  if (rel.startsWith("tailwind/")) {
    const noExt = rel.slice("tailwind/".length).replace(/\.(ts|css)$/, "")
    // fogma-preset.ts → @fogma/tailwind/fogma-preset
    // fogma.css → @fogma/css/fogma
    if (noExt === "fogma" && rel.endsWith(".css")) return "@fogma/css/fogma"
    return `@fogma/tailwind/${noExt}`
  }
  if (rel.startsWith("templates/")) {
    const noExt = rel.slice("templates/".length).replace(/\.(md|tsx|ts)$/, "")
    if (noExt === "user-claude-md") return "@fogma/templates/claude-md"
    return `@fogma/templates/${noExt}`
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

  // destOverrides for fixed-location files.
  const overrides: Record<string, string> = {
    "@fogma/templates/claude-md": "{aliases.mount}/CLAUDE.md",
    "@fogma/css/fogma": "{aliases.mount}/fogma.css",
    "@fogma/tailwind/fogma-preset": "{aliases.tailwind}/fogma-preset.ts",
    "@fogma/skill/setup": ".claude/skills/fogma-setup.md",
  }
  for (const [address, dest] of Object.entries(overrides)) {
    const existing = files[address]
    if (existing && existing.kind === "text") {
      files[address] = { ...existing, destOverride: dest }
    }
  }

  // Construct bundles. Items computed by inspecting the files map.
  const isPrimitiveAddress = (addr: string): boolean =>
    addr.startsWith("@fogma/components/") ||
    addr.startsWith("@fogma/hooks/") ||
    addr.startsWith("@fogma/lib/") ||
    addr.startsWith("@fogma/api/")

  const primitiveItems = Object.keys(files).filter(isPrimitiveAddress).sort()

  const skillItems = Object.keys(files).filter((addr) => addr.startsWith("@fogma/skill/")).sort()

  // Bundle authoring note:
  // - `fonts` is intentionally empty in v1; it will be populated when Raveo
  //   woff2 files land in packages/registry/fonts/. The bundle exists so `init`
  //   already includes it — adding the assets later won't require manifest
  //   schema changes.
  // - `skill` is populated dynamically from any `@fogma/skill/*` addresses
  //   present in the registry's `src/skill/` directory.
  // - `primitives.deps` mirrors packages/registry/package.json `dependencies`.
  //   Keep the pins in sync when bumping the registry.
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
    "kits/iframe-gallery": {
      kind: "kit",
      items: ["@fogma/kits/iframe-gallery"],
    },
    "kits/page-tree": {
      kind: "kit",
      items: ["@fogma/kits/page-tree"],
    },
    "kits/design-system-board": {
      kind: "kit",
      items: [
        "@fogma/kits/design-system-board",
        "@fogma/kits/typography-frame",
        "@fogma/kits/primitives-showcase",
      ],
    },
    fonts: {
      kind: "asset",
      items: [],
    },
    "css-and-config": {
      kind: "asset",
      items: [
        "@fogma/css/fogma",
        "@fogma/tailwind/fogma-preset",
        "@fogma/templates/claude-md",
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
        "kits/iframe-gallery",
        "kits/page-tree",
        "kits/design-system-board",
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
