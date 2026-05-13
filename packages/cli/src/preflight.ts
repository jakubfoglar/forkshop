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

function stripJsonComments(text: string): string {
  let out = ""
  let i = 0
  let inString = false
  let stringChar = ""

  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]

    if (inString) {
      if (ch === "\\") {
        // copy the backslash and the next char verbatim
        out += ch
        if (i + 1 < text.length) out += text[i + 1]
        i += 2
        continue
      }
      if (ch === stringChar) {
        inString = false
      }
      out += ch
      i++
      continue
    }

    // Not in a string
    if (ch === '"' || ch === "'") {
      inString = true
      stringChar = ch as string
      out += ch
      i++
      continue
    }

    // Line comment: //...
    if (ch === "/" && next === "/") {
      // skip to end of line
      while (i < text.length && text[i] !== "\n") i++
      continue
    }

    // Block comment: /* ... */
    if (ch === "/" && next === "*") {
      i += 2
      while (i < text.length - 1 && !(text[i] === "*" && text[i + 1] === "/")) i++
      i += 2 // skip past */
      continue
    }

    out += ch
    i++
  }

  return out
}

async function readJsonOrNull(p: string): Promise<Record<string, unknown> | undefined> {
  try {
    const text = await fs.readFile(p, "utf8")
    const noComments = stripJsonComments(text)
    // Strip trailing commas: works correctly even when strings have commas, because
    // a trailing comma can only appear before } or ].
    const noTrailingCommas = noComments.replace(/,(\s*[}\]])/g, "$1")
    return JSON.parse(noTrailingCommas) as Record<string, unknown>
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
      reason: "Forkshop requires a Next.js App Router project. Run this in your project root, or pass --root <path>.",
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
