import { promises as fs } from "node:fs"
import path from "node:path"
import { SRC_ROOT, walkTsFiles } from "./_utils.js"

const BANNED_LIBS = [
  /from\s+["']lucide-react["']/,
  /from\s+["']iconoir-react["']/,
  /from\s+["']@heroicons\//,
  /from\s+["']react-icons\//,
  /from\s+["']phosphor-react["']/,
]

export interface Violation {
  file: string
  match: string
}

export async function findIconLibImports(root: string = SRC_ROOT): Promise<Violation[]> {
  const files = await walkTsFiles(root)
  const violations: Violation[] = []
  for (const abs of files) {
    const content = await fs.readFile(abs, "utf8")
    for (const re of BANNED_LIBS) {
      const m = re.exec(content)
      if (m) {
        violations.push({ file: path.relative(root, abs), match: m[0] })
      }
    }
  }
  return violations
}

async function main() {
  const violations = await findIconLibImports()
  if (violations.length > 0) {
    console.error("Found external icon-library imports — use @forkshop/lib/icons (Central Icons) instead:\n")
    for (const v of violations) {
      console.error(`  ${v.file}:  ${v.match}`)
    }
    process.exit(1)
  }
  console.log("OK. No external icon-library imports.")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
