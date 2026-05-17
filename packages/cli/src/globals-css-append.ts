import { promises as fs } from "node:fs"
import path from "node:path"

const IMPORT_REGEX = /@import\s+["']@forkshop\/engine\/forkshop\.css["'];?/

export type AppendResult =
  | { action: "added"; target: string }
  | { action: "skipped"; target: string }

/**
 * Prepend the Forkshop engine CSS import to the project's globals.css.
 *
 * @param projectRoot  Absolute project root.
 * @param srcPrefix    Optional srcPrefix detected from tsconfig (`""` or `"src/"`).
 *                     When `"src/"`, looks for `src/app/globals.css` instead of
 *                     `app/globals.css`.
 */
export async function appendForkshopCssImport(
  projectRoot: string,
  srcPrefix: "" | "src/" = ""
): Promise<AppendResult> {
  // Try the srcPrefix-derived path first; if it doesn't exist, fall back to
  // common alternative locations (the other src-vs-flat layout, and a few
  // pages-router holdovers). This avoids bailing on projects whose tsconfig
  // doesn't have the @/* mapping that detectSrcPrefix relies on.
  const candidates = [
    `${srcPrefix}app/globals.css`,
    srcPrefix === "src/" ? "app/globals.css" : "src/app/globals.css",
    `${srcPrefix}app/global.css`,
    `${srcPrefix}styles/globals.css`,
  ]
  let targetRel: string | undefined
  let existing: string | undefined
  for (const candidate of candidates) {
    try {
      existing = await fs.readFile(path.join(projectRoot, candidate), "utf8")
      targetRel = candidate
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  if (targetRel === undefined || existing === undefined) {
    throw new Error(
      `Forkshop expected to find a globals.css (looked in ${candidates.join(", ")}) so it could ` +
        `add the engine stylesheet import. If your root CSS lives elsewhere, add this line ` +
        `manually:\n\n  @import "@forkshop/engine/forkshop.css";\n`
    )
  }
  const target = path.join(projectRoot, targetRel)

  if (IMPORT_REGEX.test(existing)) {
    return { action: "skipped", target: targetRel }
  }

  const next = `@import "@forkshop/engine/forkshop.css";\n${existing}`
  await fs.writeFile(target, next, "utf8")
  return { action: "added", target: targetRel }
}
