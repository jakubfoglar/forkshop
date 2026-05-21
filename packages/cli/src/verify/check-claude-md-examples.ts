import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

export function extractTsCodeBlocks(md: string): { lang: "ts" | "tsx"; code: string }[] {
  const blocks: { lang: "ts" | "tsx"; code: string }[] = []
  const regex = /```(ts|tsx)\n([\s\S]*?)```/g
  for (const match of md.matchAll(regex)) {
    if (match[1] && match[2] !== undefined) {
      blocks.push({ lang: match[1] as "ts" | "tsx", code: match[2] })
    }
  }
  return blocks
}

// Field names that must NOT appear in code blocks (these were the stale ones)
const FORBIDDEN_FIELDS = [
  /\bsourcePath\b\s*:/, // InlineReactNode now uses `filePath`
  /path\s*:\s*["'`]\/[^"'`]*["'`]/, // IframeComponentNode has no `path` field (only iframe-route does; this regex over-flags but is conservative)
]

export async function checkClaudeMdExamples(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  const candidatePaths = ["app/forkshop/CLAUDE.md", "src/app/forkshop/CLAUDE.md"]
  for (const p of candidatePaths) {
    try {
      const md = await readFile(resolve(opts.cwd, p), "utf8")
      const blocks = extractTsCodeBlocks(md)
      for (const [i, block] of blocks.entries()) {
        for (const forbidden of FORBIDDEN_FIELDS) {
          if (forbidden.test(block.code)) {
            issues.push({
              file: p,
              message: `code block #${i + 1} uses a deprecated field name. Update to match @forkshop/engine type definitions.`,
            })
            break
          }
        }
      }
    } catch {
      // file missing — checkConfig handles it
    }
  }
  return issues
}
