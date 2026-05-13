import { promises as fs } from "node:fs"
import path from "node:path"

export type PreflightResult = { ok: true } | { ok: false; reason: string }

export interface PreflightOptions {
  warnDirtyGit?: boolean
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function readJsonOrNull(p: string): Promise<Record<string, unknown> | undefined> {
  try {
    const text = await fs.readFile(p, "utf8")
    // Strip line comments and trailing commas — Next.js tsconfig files often have them.
    const cleaned = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/,\s*([}\]])/g, "$1")
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    return undefined
  }
}

export async function preflightInit(
  projectRoot: string,
  _options: PreflightOptions
): Promise<PreflightResult> {
  const hasAppDir = await exists(path.join(projectRoot, "app"))
  const nextConfigCandidates = ["next.config.js", "next.config.ts", "next.config.mjs", "next.config.cjs"]
  const hasNextConfig = (
    await Promise.all(nextConfigCandidates.map((f) => exists(path.join(projectRoot, f))))
  ).some(Boolean)

  if (!hasAppDir && !hasNextConfig) {
    return {
      ok: false,
      reason: "Fogma requires a Next.js App Router project. Run this in your project root, or pass --root <path>.",
    }
  }

  const tsconfigPath = path.join(projectRoot, "tsconfig.json")
  if (!(await exists(tsconfigPath))) {
    return {
      ok: false,
      reason: "Missing tsconfig.json. Add a tsconfig with @/* paths alias and re-run.",
    }
  }

  const tsconfig = await readJsonOrNull(tsconfigPath)
  const compilerOptions = tsconfig?.compilerOptions as Record<string, unknown> | undefined
  const paths = compilerOptions?.paths as Record<string, unknown> | undefined
  if (!paths || !paths["@/*"]) {
    return {
      ok: false,
      reason: 'Missing @/* alias in tsconfig.json. Add this to compilerOptions:\n  "paths": { "@/*": ["./*"] }',
    }
  }

  return { ok: true }
}
