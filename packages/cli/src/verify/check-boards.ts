import { readdir, readFile, stat } from "node:fs/promises"
import { resolve } from "node:path"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

export type BoardExportShape =
  | { kind: "defineBoard"; boardId: string }
  | { kind: "raw-component" }
  | { kind: "unknown" }

export function detectBoardExport(src: string): BoardExportShape {
  // Conservative parser — looks for `defineBoard({ ... id: "..." })` or `export default function`.
  const defineMatch = src.match(
    /export\s+default\s+defineBoard\s*\(\s*{[\s\S]*?id:\s*["'`]([^"'`]+)["'`]/,
  )
  if (defineMatch && defineMatch[1]) return { kind: "defineBoard", boardId: defineMatch[1] }
  if (/export\s+default\s+(function|\()/m.test(src)) return { kind: "raw-component" }
  return { kind: "unknown" }
}

export async function checkBoards(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  const mountCandidates = ["app/forkshop", "src/app/forkshop"]
  let mountDir: string | null = null
  for (const candidate of mountCandidates) {
    try {
      const s = await stat(resolve(opts.cwd, candidate))
      if (s.isDirectory()) {
        mountDir = candidate
        break
      }
    } catch {}
  }
  if (!mountDir) return issues // checkConfig already flagged this

  const dir = resolve(opts.cwd, mountDir)
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith("-board.tsx") || f.endsWith("-board.ts"),
  )

  for (const f of files) {
    const fullPath = resolve(dir, f)
    const src = await readFile(fullPath, "utf8")
    const shape = detectBoardExport(src)
    if (shape.kind === "unknown") {
      issues.push({
        file: `${mountDir}/${f}`,
        message:
          "no default export detected — Board files must default-export a defineBoard() call or a raw React component",
      })
    }
  }
  return issues
}
