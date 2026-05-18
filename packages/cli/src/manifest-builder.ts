import { promises as fs } from "node:fs"
import path from "node:path"
import {
  MANIFEST_SCHEMA_VERSION,
  type Bundle,
  type Manifest,
  type ManifestFile,
} from "./manifest-schema.js"

export interface BuildManifestOptions {
  registryRoot: string                // path to packages/engine/
  registryBaseUrl?: string
}

const DEFAULT_BASE_URL = "https://forkshop.dev/r/"

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

function extOf(absolutePath: string): "ts" | "tsx" | "md" | "css" | "sh" {
  const m = absolutePath.match(/\.(ts|tsx|md|css|sh)(?:\.template)?$/)
  if (!m) throw new Error(`Unknown extension for ${absolutePath}`)
  return m[1] as "ts" | "tsx" | "md" | "css" | "sh"
}

function skillAddress(rel: string): string {
  const noExt = rel.replace(/^src\/skill\//, "").replace(/\.md$/, "")
  return `@forkshop/skill/${noExt}`
}

function claudeMdAddress(rel: string): string | undefined {
  if (rel === "templates/user-claude-md.md") return "@forkshop/templates/claude-md"
  return undefined
}

function routeStubAddress(rel: string): { address: string; dest: string } | undefined {
  // templates/api-stubs/<name>-route.ts.template
  const m = rel.match(/^templates\/api-stubs\/(.+?)-route\.ts\.template$/)
  if (!m) return undefined
  const name = m[1]!
  // Special case: agent-activity-stream maps to agent-activity/stream/
  const destSubpath = name === "agent-activity-stream" ? "agent-activity/stream" : name
  return {
    address: `@forkshop/route-stubs/${name}`,
    dest: `app/api/forkshop/${destSubpath}/route.ts`,
  }
}

function hookAddress(rel: string): { address: string; dest: string } | undefined {
  // templates/hooks/<name>.sh.template → .claude/hooks/<name>.sh
  const m = rel.match(/^templates\/hooks\/(.+)\.sh\.template$/)
  if (!m) return undefined
  const name = m[1]!
  return {
    address: `@forkshop/hooks/${name}`,
    dest: `.claude/hooks/${name}.sh`,
  }
}

function fontAddress(rel: string): { address: string; basename: string } | undefined {
  const m = rel.match(/^fonts\/(.+)\.woff2?$/)
  if (!m) return undefined
  return { address: `@forkshop/fonts/${m[1]!}`, basename: path.basename(rel) }
}

export async function buildManifest(options: BuildManifestOptions): Promise<Manifest> {
  const { registryRoot, registryBaseUrl = DEFAULT_BASE_URL } = options

  const skillFiles = await walk(path.join(registryRoot, "src/skill"))
  const templateFiles = await walk(path.join(registryRoot, "templates"))
  const fontFiles = await walk(path.join(registryRoot, "fonts"))

  const files: Record<string, ManifestFile> = {}
  const skillItems: string[] = []
  const routeStubItems: string[] = []
  const hookItems: string[] = []

  for (const abs of skillFiles) {
    const rel = path.relative(registryRoot, abs).split(path.sep).join("/")
    if (!rel.endsWith(".md")) continue
    const address = skillAddress(rel)
    const content = await fs.readFile(abs, "utf8")
    const name = rel.replace(/^src\/skill\//, "").replace(/\.md$/, "")
    files[address] = {
      kind: "text",
      ext: "md",
      content,
      destOverride: `.claude/skills/forkshop-${name}.md`,
    }
    skillItems.push(address)
  }

  for (const abs of templateFiles) {
    const rel = path.relative(registryRoot, abs).split(path.sep).join("/")
    const claudeAddr = claudeMdAddress(rel)
    if (claudeAddr) {
      const content = await fs.readFile(abs, "utf8")
      files[claudeAddr] = {
        kind: "text",
        ext: "md",
        content,
        destOverride: "{aliases.mount}/CLAUDE.md",
      }
      continue
    }
    const stub = routeStubAddress(rel)
    if (stub) {
      const content = await fs.readFile(abs, "utf8")
      files[stub.address] = {
        kind: "text",
        ext: extOf(abs),
        content,
        destOverride: stub.dest,
      }
      routeStubItems.push(stub.address)
      continue
    }
    const hook = hookAddress(rel)
    if (hook) {
      const content = await fs.readFile(abs, "utf8")
      files[hook.address] = {
        kind: "text",
        ext: extOf(abs),
        content,
        destOverride: hook.dest,
      }
      hookItems.push(hook.address)
      continue
    }
  }

  for (const abs of fontFiles) {
    const rel = path.relative(registryRoot, abs).split(path.sep).join("/")
    const fa = fontAddress(rel)
    if (!fa) continue
    files[fa.address] = {
      kind: "binary",
      url: rel,
      destOverride: `public/fonts/forkshop/${fa.basename}`,
    }
  }

  const fontItems = Object.keys(files).filter((a) => a.startsWith("@forkshop/fonts/")).sort()

  const bundles: Record<string, Bundle> = {
    "route-stubs": { kind: "scaffold", items: routeStubItems.sort() },
    skill: { kind: "scaffold", items: skillItems.sort() },
    "claude-md": { kind: "scaffold", items: ["@forkshop/templates/claude-md"] },
    hooks: { kind: "scaffold", items: hookItems.sort() },
    font: { kind: "asset", items: fontItems },
    init: {
      kind: "composite",
      // Note: hooks is intentionally NOT in `init` — installed only when the
      // user opts into the Claude Code pack during Phase 5 of setup.md.
      includes: ["route-stubs", "skill", "claude-md", "font"],
    },
  }

  // Read engine version from package.json
  let engineVersion = "0.0.0"
  try {
    const pkgText = await fs.readFile(path.join(registryRoot, "package.json"), "utf8")
    const pkg = JSON.parse(pkgText) as { version?: string }
    engineVersion = pkg.version ?? "0.0.0"
  } catch {
    // OK in test fixtures
  }

  return {
    version: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    registryBaseUrl,
    engineVersion,
    bundles,
    files,
  }
}
