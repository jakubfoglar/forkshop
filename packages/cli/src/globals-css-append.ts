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
  const targetRel = `${srcPrefix}app/globals.css`
  const target = path.join(projectRoot, targetRel)
  let existing: string
  try {
    existing = await fs.readFile(target, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Forkshop expected to find ${targetRel} so it could add the engine ` +
          `stylesheet import. If your root CSS lives elsewhere, add this line ` +
          `manually:\n\n  @import "@forkshop/engine/forkshop.css";\n`
      )
    }
    throw error
  }

  if (IMPORT_REGEX.test(existing)) {
    return { action: "skipped", target: targetRel }
  }

  const next = `@import "@forkshop/engine/forkshop.css";\n${existing}`
  await fs.writeFile(target, next, "utf8")
  return { action: "added", target: targetRel }
}
