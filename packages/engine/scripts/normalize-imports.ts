import { promises as fs } from "node:fs"
import path from "node:path"
import { ENGINE_ROOT, SRC_ROOT, walkTsFiles } from "./_utils.js"

/**
 * Rewrites one import source string. Pure function — no I/O.
 * filePath: source file's path relative to the registry package root (e.g. "src/kits/foo.tsx")
 * importPath: the raw import string as it appears in source
 */
export function normalizeImportSource(filePath: string, importPath: string): string {
  if (importPath.startsWith("@forkshop/")) return importPath
  if (!importPath.startsWith(".")) return importPath

  const importerDir = path.dirname(filePath)
  const absoluteImport = path.normalize(path.join(importerDir, importPath))
  const fromSrc = path.relative("src", absoluteImport).split(path.sep).join("/")
  const noExt = fromSrc.replace(/\.(ts|tsx|js|jsx|mjs)$/, "")
  return `@forkshop/${noExt}`
}

/**
 * Rewrites a single file's content. Returns the new content (or the input if no changes).
 */
export function normalizeFileContent(filePath: string, content: string): string {
  const patterns: RegExp[] = [
    // Matches: import ... from "..."  |  export ... from "..."   at line start
    /^(\s*(?:import|export)\b[^"'\n]*?\bfrom\s+)(["'])([^"']+)\2/gm,
    // Matches: import("...")  at line start (treats dynamic import as a statement here)
    /^(\s*import\s*\(\s*)(["'])([^"']+)\2/gm,
  ]
  let next = content
  for (const re of patterns) {
    next = next.replace(re, (_match, prefix, quote, spec) => {
      const normalized = normalizeImportSource(filePath, spec)
      return `${prefix}${quote}${normalized}${quote}`
    })
  }
  return next
}

async function main() {
  const files = await walkTsFiles(SRC_ROOT)
  let changedCount = 0
  for (const abs of files) {
    const rel = path.relative(ENGINE_ROOT, abs).split(path.sep).join("/")
    const original = await fs.readFile(abs, "utf8")
    const next = normalizeFileContent(rel, original)
    if (next !== original) {
      await fs.writeFile(abs, next, "utf8")
      changedCount += 1
      console.log(`rewrote: ${rel}`)
    }
  }
  console.log(`\nDone. ${changedCount} of ${files.length} files updated.`)
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`
if (isDirectInvocation) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
