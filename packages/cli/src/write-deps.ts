import { promises as fs } from "node:fs"
import path from "node:path"

/**
 * Parse a dep spec like `"clsx@^2.1.1"` or `"@locator/runtime@^0.5.1"` into
 * `{ name, version }`. The last `@` separates name from version unless it's
 * at index 0 (scoped package without a version specifier — treat as `*`).
 */
export function parseDepSpec(spec: string): { name: string; version: string } {
  const lastAt = spec.lastIndexOf("@")
  if (lastAt > 0) {
    return { name: spec.slice(0, lastAt), version: spec.slice(lastAt + 1) }
  }
  return { name: spec, version: "*" }
}

/**
 * Merge dep specs into the project's package.json `dependencies` block.
 *
 * Preserves existing entries: if the user already has a version for a dep
 * (e.g. they're on `clsx@2.0.0`), we don't overwrite it. Forkshop's versions
 * are minimums; the user's existing version wins if it's already pinned.
 *
 * Returns the list of dep names that were newly added (for surfacing in the
 * "next steps" message).
 */
export async function mergeDepsIntoPackageJson(
  projectRoot: string,
  depSpecs: readonly string[],
): Promise<string[]> {
  if (depSpecs.length === 0) return []

  const pkgPath = path.join(projectRoot, "package.json")
  const text = await fs.readFile(pkgPath, "utf8")
  const pkg = JSON.parse(text) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  const dependencies = pkg.dependencies ?? {}
  const devDependencies = pkg.devDependencies ?? {}
  const added: string[] = []

  for (const spec of depSpecs) {
    const { name, version } = parseDepSpec(spec)
    if (dependencies[name] !== undefined || devDependencies[name] !== undefined) {
      continue
    }
    dependencies[name] = version
    added.push(name)
  }

  if (added.length === 0) return []

  pkg.dependencies = sortObject(dependencies)
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8")
  return added
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  const keys = Object.keys(obj).sort()
  const sorted: Record<string, string> = {}
  for (const key of keys) sorted[key] = obj[key]!
  return sorted
}
