/**
 * Post-build step: reads the tsup metafile and prepends "use client" to any
 * output chunk whose inputs include a source file with that directive.
 *
 * Why this exists: esbuild-plugin-preserve-directives mutates file.contents
 * (Buffer) in onEnd, but tsup reads file.text (a getter from the original
 * bytes) when writing to disk, so the mutations are silently discarded.
 * A post-build script that directly patches the written files is the
 * simplest reliable alternative.
 */

import { promises as fs } from "node:fs"
import path from "node:path"
import { ENGINE_ROOT, SRC_ROOT, walkTsFiles } from "./_utils.js"

const USE_CLIENT_DIRECTIVE = `"use client";\n`
const USE_CLIENT_RE = /^\s*(['"])use client\1/m

/** Collect the set of source-relative paths that contain "use client". */
async function collectClientSources(): Promise<Set<string>> {
  const allFiles = await walkTsFiles(SRC_ROOT)
  const result = new Set<string>()
  for (const f of allFiles) {
    const content = await fs.readFile(f, "utf8")
    // Only check the first 5 lines — directive must be near the top
    const firstLines = content.split("\n").slice(0, 5).join("\n")
    if (USE_CLIENT_RE.test(firstLines)) {
      // Key matches what metafile uses: relative to engine root, e.g. "src/components/canvas/forkshop-canvas.tsx"
      result.add(path.relative(ENGINE_ROOT, f))
    }
  }
  return result
}

interface Metafile {
  outputs: Record<string, { inputs: Record<string, unknown>; entryPoint?: string }>
}

export async function injectDirectives(distDir: string): Promise<void> {
  const metafilePath = path.join(distDir, "metafile-esm.json")
  let metafile: Metafile
  try {
    metafile = JSON.parse(await fs.readFile(metafilePath, "utf8"))
  } catch {
    console.warn("inject-directives: no metafile found at", metafilePath, "— skipping")
    return
  }

  const clientSources = await collectClientSources()

  for (const [outRelPath, outData] of Object.entries(metafile.outputs)) {
    // Only patch .js files (not .map, .d.ts, etc.)
    if (!outRelPath.endsWith(".js")) continue

    const inputs = Object.keys(outData.inputs)
    const hasClientInput = inputs.some((inp) => clientSources.has(inp))
    if (!hasClientInput) continue

    // outRelPath is relative to ENGINE_ROOT (e.g. "dist/index.js")
    const absPath = path.join(ENGINE_ROOT, outRelPath)
    const current = await fs.readFile(absPath, "utf8")

    // Idempotent: don't double-prepend
    if (USE_CLIENT_RE.test(current.slice(0, 30))) continue

    await fs.writeFile(absPath, USE_CLIENT_DIRECTIVE + current, "utf8")
    console.log("  injected 'use client' →", path.relative(ENGINE_ROOT, absPath))
  }
}

async function main() {
  const distDir = path.join(ENGINE_ROOT, "dist")
  console.log("inject-directives: scanning", distDir)
  await injectDirectives(distDir)
  console.log("✓ directives injected")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
