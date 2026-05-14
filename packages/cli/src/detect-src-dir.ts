import { promises as fs } from "node:fs"
import path from "node:path"

/**
 * Detect whether the project uses Next.js's `src/` convention by inspecting
 * `tsconfig.json`'s `compilerOptions.paths["@/*"]` value.
 *
 * Returns `"src/"` if the alias points into `src/` (e.g. `["./src/*"]`),
 * otherwise `""`. The returned string is meant to be prepended to all
 * workspace-relative destination paths during install — so files actually
 * land where the `@/*` alias expects to find them.
 *
 * Strips JSONC comments (`//` and `/* ... *​/`) so the parse handles the
 * tsconfig variants that ship with `create-next-app --src-dir`.
 */
export async function detectSrcPrefix(projectRoot: string): Promise<string> {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json")
  let text: string
  try {
    text = await fs.readFile(tsconfigPath, "utf8")
  } catch {
    return ""
  }

  // Strip JSONC comments to make JSON.parse safe.
  const stripped = text
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/(^|[^:])\/\/.*$/gm, "$1")

  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    return ""
  }

  const paths = (parsed as { compilerOptions?: { paths?: Record<string, string[]> } })
    .compilerOptions?.paths
  if (!paths) return ""

  const atSlashTarget = paths["@/*"]
  if (!atSlashTarget || atSlashTarget.length === 0) return ""

  // Normalise the first target: drop leading "./" if present.
  const first = atSlashTarget[0]!.replace(/^\.\//, "")
  if (first === "src/*" || first === "src") return "src/"
  return ""
}
