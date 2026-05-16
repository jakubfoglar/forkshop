import { promises as fs } from "node:fs"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

const USE_CLIENT_RE = /^\s*(['"])use client\1\s*;?/

export interface CheckResult {
  ok: boolean
  errors: string[]
}

async function walkJsFiles(dir: string, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walkJsFiles(full, out)
    else if (entry.name.endsWith(".js")) out.push(full)
  }
  return out
}

async function fileStartsWithUseClient(filePath: string): Promise<boolean> {
  const content = await fs.readFile(filePath, "utf8")
  return USE_CLIENT_RE.test(content)
}

export async function runDirectiveChecks(distDir: string): Promise<CheckResult> {
  const errors: string[] = []
  const allFiles = await walkJsFiles(distDir)

  // Check 1: at least one chunk preserves "use client"
  let foundClient = false
  for (const f of allFiles) {
    if (await fileStartsWithUseClient(f)) {
      foundClient = true
      break
    }
  }
  if (!foundClient) {
    errors.push(`No dist chunk preserves a "use client" directive. The directives plugin likely failed.`)
  }

  // Check 2: no api/* file is client-tagged
  const apiFiles = allFiles.filter((f) => /\/api\//.test(f))
  for (const f of apiFiles) {
    if (await fileStartsWithUseClient(f)) {
      errors.push(`Route handler should not carry "use client": ${path.relative(distDir, f)}`)
    }
  }

  return { ok: errors.length === 0, errors }
}

async function main() {
  const distDir = path.join(ENGINE_ROOT, "dist")
  const result = await runDirectiveChecks(distDir)
  if (!result.ok) {
    console.error("verify-directives FAILED:\n")
    for (const e of result.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log("✓ directives verified")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
