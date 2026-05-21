import { access } from "node:fs/promises"
import { resolve } from "node:path"

export type VerifyIssue = { file: string; message: string }
export type VerifyCheckOptions = { cwd: string }

export async function checkConfig(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  // Path is derived from forkshop.json's `mount` (Phase 0 of the setup skill enforces this).
  // For now, check both common locations.
  const candidates = [
    resolve(opts.cwd, "app/forkshop/forkshop.config.tsx"),
    resolve(opts.cwd, "app/forkshop/forkshop.config.ts"),
    resolve(opts.cwd, "src/app/forkshop/forkshop.config.tsx"),
  ]
  let found = false
  for (const p of candidates) {
    try {
      await access(p)
      found = true
      break
    } catch {}
  }
  if (!found) {
    issues.push({
      file: "forkshop.config.tsx",
      message: "missing — run the setup skill (open Claude Code, say 'set up Forkshop')",
    })
  }
  return issues
}
