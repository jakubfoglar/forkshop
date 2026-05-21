import { access, readdir, readFile, stat } from "node:fs/promises"
import { resolve } from "node:path"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

const REF_REGEX = /(?:sourceFile|filePath|sourcePath)\s*:\s*["'`]([^"'`]+)["'`]/g

export function extractStringFileRefs(src: string): string[] {
  const refs: string[] = []
  for (const match of src.matchAll(REF_REGEX)) {
    if (match[1]) refs.push(match[1])
  }
  return refs
}

export async function checkReferences(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  const mountCandidates = ["app/forkshop", "src/app/forkshop"]
  let mountDir: string | null = null
  for (const c of mountCandidates) {
    try {
      if ((await stat(resolve(opts.cwd, c))).isDirectory()) {
        mountDir = c
        break
      }
    } catch {}
  }
  if (!mountDir) return issues

  const dir = resolve(opts.cwd, mountDir)
  const files = (await readdir(dir)).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))

  for (const f of files) {
    const src = await readFile(resolve(dir, f), "utf8")
    const refs = extractStringFileRefs(src)
    for (const ref of refs) {
      try {
        await access(resolve(opts.cwd, ref))
      } catch {
        issues.push({
          file: `${mountDir}/${f}`,
          message: `references "${ref}" which doesn't exist on disk`,
        })
      }
    }
  }
  return issues
}
