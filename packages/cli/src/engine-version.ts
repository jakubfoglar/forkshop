import { promises as fs } from "node:fs"
import path from "node:path"

export interface EnginePin {
  raw: string // as written in package.json (e.g. "^0.2.5")
  normalized: string // stripped of range prefix ("0.2.5")
}

const RANGE_PREFIX = /^[~^>=<]+\s*/

export async function readEnginePin(projectRoot: string): Promise<EnginePin | undefined> {
  let text: string
  try {
    text = await fs.readFile(path.join(projectRoot, "package.json"), "utf8")
  } catch {
    return undefined
  }
  const pkg = JSON.parse(text) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const raw =
    pkg.dependencies?.["@forkshop/engine"] ?? pkg.devDependencies?.["@forkshop/engine"]
  if (!raw) return undefined
  const normalized = raw.replace(RANGE_PREFIX, "").trim()
  return { raw, normalized }
}

/**
 * True when `current` is older than `target` using numeric semver comparison.
 * Pre-release tags are not handled (Forkshop doesn't ship them at 1.0).
 */
export function isEnginePinBehind(current: string, target: string): boolean {
  const a = current.split(".").map((n) => Number.parseInt(n, 10))
  const b = target.split(".").map((n) => Number.parseInt(n, 10))
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai < bi) return true
    if (ai > bi) return false
  }
  return false
}

/**
 * Rewrites `@forkshop/engine` in the user's package.json to a new version,
 * preserving any leading range prefix (^, ~). Used by `forkshop update` when
 * the user accepts the engine-pin soft offer.
 */
export async function bumpEnginePin(
  projectRoot: string,
  newNormalizedVersion: string
): Promise<void> {
  const target = path.join(projectRoot, "package.json")
  const text = await fs.readFile(target, "utf8")
  const pkg = JSON.parse(text) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const updateBlock = (block: Record<string, string> | undefined): boolean => {
    if (!block || !block["@forkshop/engine"]) return false
    const existing = block["@forkshop/engine"]!
    const prefixMatch = existing.match(RANGE_PREFIX)
    const prefix = prefixMatch ? prefixMatch[0] : ""
    block["@forkshop/engine"] = `${prefix}${newNormalizedVersion}`
    return true
  }
  const inDeps = updateBlock(pkg.dependencies)
  if (!inDeps) updateBlock(pkg.devDependencies)
  await fs.writeFile(target, JSON.stringify(pkg, null, 2) + "\n", "utf8")
}
