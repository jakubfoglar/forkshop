import { promises as fs } from "node:fs"
import path from "node:path"
import { ENGINE_ROOT, SRC_ROOT, walkTsFiles } from "./_utils.js"

const RELATIVE_PARENT_RE =
  /^(\s*(?:import|export)\b[^"'\n]*?\bfrom\s+|^\s*import\s*\(\s*)(["'])(\.\.\/[^"']+)\2/gm

async function main() {
  const files = await walkTsFiles(SRC_ROOT)
  const violations: { file: string; match: string }[] = []
  for (const abs of files) {
    const content = await fs.readFile(abs, "utf8")
    let match: RegExpExecArray | null
    while ((match = RELATIVE_PARENT_RE.exec(content)) !== null) {
      violations.push({
        file: path.relative(ENGINE_ROOT, abs),
        match: match[0],
      })
    }
  }
  if (violations.length > 0) {
    console.error("Found relative parent imports — use @forkshop/* canonical alias instead:\n")
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
