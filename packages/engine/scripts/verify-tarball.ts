import { promises as fs } from "node:fs"
import path from "node:path"
import { execa } from "execa"
import { ENGINE_ROOT } from "./_utils.js"

const REQUIRED = [
  "package/package.json",
  "package/LICENSE",
  "package/LICENSE-icons.md",
  "package/README.md",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/forkshop.css",
  "package/dist/fonts/RaveoVF.woff2",
  "package/dist/api/edit/route.js",
  "package/dist/api/positions/route.js",
  "package/dist/api/agent-activity/route.js",
  "package/dist/api/agent-activity/stream/route.js",
]

const FORBIDDEN_PATTERNS: RegExp[] = [
  /^package\/src\//,
  /^package\/templates\//,
  /^package\/src\/skill\//,
  /^package\/tailwind\//,
  /^package\/scripts\//,
  /^package\/fonts\/raveo\//,
  /^package\/\.tmp\//,
  /^package\/node_modules\//,
  /\.test\.(ts|tsx|js)$/,
  /^package\/tsup\.config\.ts$/,
  /^package\/vitest\.config\.ts$/,
  /^package\/tsconfig\.json$/,
]

export interface CheckResult {
  errors: string[]
}

export function matchTarballContents(entries: string[]): CheckResult {
  const errors: string[] = []
  for (const req of REQUIRED) {
    if (!entries.includes(req)) {
      errors.push(`Tarball missing required file: ${req}`)
    }
  }
  for (const entry of entries) {
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(entry)) {
        errors.push(`Tarball contains forbidden path: ${entry}`)
        break
      }
    }
  }
  return { errors }
}

async function listTarball(tgzPath: string): Promise<string[]> {
  const { stdout } = await execa("tar", ["-tzf", tgzPath])
  return stdout.split("\n").map((s) => s.trim()).filter(Boolean)
}

async function readFromTarball(tgzPath: string, member: string): Promise<string> {
  const { stdout } = await execa("tar", ["-xzOf", tgzPath, member])
  return stdout
}

async function main() {
  const tmpDir = path.join(ENGINE_ROOT, ".tmp")
  await fs.mkdir(tmpDir, { recursive: true })
  await execa("pnpm", ["pack", "--pack-destination", tmpDir], {
    stdio: "inherit",
    cwd: ENGINE_ROOT,
  })

  const tgz = (await fs.readdir(tmpDir))
    .filter((f) => f.endsWith(".tgz"))
    .map((f) => path.join(tmpDir, f))
    .sort()
    .pop()
  if (!tgz) throw new Error("Could not locate packed tarball")

  const contents = await listTarball(tgz)
  const result = matchTarballContents(contents)

  // JS quality assertions
  const indexJs = await readFromTarball(tgz, "package/dist/index.js")
  if (!indexJs.includes("process.env.NODE_ENV")) {
    result.errors.push("dist/index.js: process.env.NODE_ENV got substituted at build time (should be runtime ref)")
  }
  if (indexJs.includes("@central-icons-react")) {
    result.errors.push("dist/index.js: @central-icons-react appears externalized (should be bundled in)")
  }

  // Top-level static import of @locator/runtime → disallowed
  // Match `from "@locator/runtime"` not preceded by `import(` (which is dynamic).
  if (/(?<!import\([^)]*?)\bfrom\s+["']@locator\/runtime["']/.test(indexJs)) {
    result.errors.push("dist/index.js: @locator/runtime has top-level static import (should be dynamic)")
  }

  // Tarball size sanity
  const stat = await fs.stat(tgz)
  const kb = stat.size / 1024
  if (kb > 500) {
    result.errors.push(`tarball is ${kb.toFixed(1)}KB > 500KB budget`)
  }

  if (result.errors.length > 0) {
    console.error("verify-tarball FAILED:")
    for (const e of result.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`✓ tarball verified (${kb.toFixed(1)}KB, ${contents.length} entries)`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
