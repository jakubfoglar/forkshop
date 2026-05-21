import { readFile, readdir, stat } from "node:fs/promises"
import { resolve, relative } from "node:path"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

const TOKEN_CLASS_REGEX = /(?:bg|text|border|ring|fill|stroke|from|to|via)-forkshop-[a-z][a-z0-9-]*/g

export function findForkshopTokenClasses(src: string): string[] {
  const found: string[] = []
  // Only inspect class attribute values
  const classAttrRegex = /(?:class(?:Name)?)\s*=\s*[{`'"]([^`'"}]+)[{`'"}]/g
  for (const match of src.matchAll(classAttrRegex)) {
    const classes = match[1]
    if (!classes) continue
    for (const c of classes.matchAll(TOKEN_CLASS_REGEX)) {
      found.push(c[0])
    }
  }
  return [...new Set(found)]
}

export async function checkTokenClasses(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  // Walk components/, lib/, src/components/, src/lib/, app/ (excluding app/forkshop/)
  const includeDirs = ["components", "lib", "src/components", "src/lib", "app"]
  const excludeRegex = /\/(forkshop|node_modules|\.next)\//

  async function walk(d: string): Promise<string[]> {
    const out: string[] = []
    try {
      const entries = await readdir(d, { withFileTypes: true })
      for (const e of entries) {
        const p = resolve(d, e.name)
        if (excludeRegex.test(p + "/")) continue
        if (e.isDirectory()) out.push(...(await walk(p)))
        else if (e.isFile() && /\.(tsx?|jsx?|mdx)$/.test(e.name)) out.push(p)
      }
    } catch {}
    return out
  }

  for (const dir of includeDirs) {
    const full = resolve(opts.cwd, dir)
    try {
      if (!(await stat(full)).isDirectory()) continue
    } catch {
      continue
    }
    const files = await walk(full)
    for (const f of files) {
      const src = await readFile(f, "utf8")
      const refs = findForkshopTokenClasses(src)
      if (refs.length > 0) {
        issues.push({
          file: relative(opts.cwd, f),
          message: `uses forkshop-* token classes (${refs.join(", ")}) — these are engine-internal; use your own design tokens here`,
        })
      }
    }
  }
  return issues
}
