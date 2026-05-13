import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REGISTRY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const SRC_ROOT = path.join(REGISTRY_ROOT, "src")

const RELATIVE_PARENT_RE = /(\bfrom\s+|\bimport\s*\(\s*)(["'])(\.\.\/[^"']+)\2/g

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

async function main() {
  const files = await walk(SRC_ROOT)
  const violations: { file: string; match: string }[] = []
  for (const abs of files) {
    const content = await fs.readFile(abs, "utf8")
    let match: RegExpExecArray | null
    while ((match = RELATIVE_PARENT_RE.exec(content)) !== null) {
      violations.push({
        file: path.relative(REGISTRY_ROOT, abs),
        match: match[0],
      })
    }
  }
  if (violations.length > 0) {
    console.error("Found relative parent imports — use @fogma/* canonical alias instead:\n")
    for (const v of violations) {
      console.error(`  ${v.file}:  ${v.match}`)
    }
    process.exit(1)
  }
  console.log(`OK. ${files.length} files, no relative parent imports.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
