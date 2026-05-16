import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const ENGINE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
export const SRC_ROOT = path.join(ENGINE_ROOT, "src")

/**
 * Recursively collects all .ts and .tsx file paths under `dir`.
 */
export async function walkTsFiles(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walkTsFiles(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}
