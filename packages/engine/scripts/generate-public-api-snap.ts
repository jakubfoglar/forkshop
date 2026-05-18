/**
 * Regen the public-API snapshot. Run via `pnpm regen-api-snap` from repo root
 * whenever you intentionally add/remove/rename a public export.
 */
import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const ENGINE_ROOT = path.resolve(path.dirname(__filename), "..")

interface PkgExports {
  [subpath: string]: string
}

async function main(): Promise<void> {
  const pkgText = await fs.readFile(path.join(ENGINE_ROOT, "package.json"), "utf8")
  const pkg = JSON.parse(pkgText) as { exports: PkgExports }
  const entries: Record<string, string[]> = {}

  for (const subpath of Object.keys(pkg.exports)) {
    if (subpath.endsWith(".css")) continue // CSS files have no JS exports
    const importPath = subpath === "." ? "@forkshop/engine" : `@forkshop/engine${subpath.slice(1)}`
    const mod = (await import(importPath)) as Record<string, unknown>
    entries[importPath] = Object.keys(mod).filter((k) => k !== "default").sort()
  }

  const out = path.join(ENGINE_ROOT, "src/__tests__/public-api.snap.json")
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, JSON.stringify(entries, null, 2) + "\n", "utf8")
  console.log(`Wrote ${Object.keys(entries).length} entries to ${out}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
