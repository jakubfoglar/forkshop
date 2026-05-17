import { promises as fs } from "node:fs"
import path from "node:path"

const TARGET_REL = "app/globals.css"
const IMPORT_REGEX = /@import\s+["']@forkshop\/engine\/forkshop\.css["'];?/

export type AppendResult =
  | { action: "added"; target: string }
  | { action: "skipped"; target: string }

export async function appendForkshopCssImport(projectRoot: string): Promise<AppendResult> {
  const target = path.join(projectRoot, TARGET_REL)
  let existing: string
  try {
    existing = await fs.readFile(target, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Forkshop expected to find ${TARGET_REL} so it could add the engine ` +
          `stylesheet import. If your root CSS lives elsewhere, add this line ` +
          `manually:\n\n  @import "@forkshop/engine/forkshop.css";\n`
      )
    }
    throw error
  }

  if (IMPORT_REGEX.test(existing)) {
    return { action: "skipped", target: TARGET_REL }
  }

  const next = `@import "@forkshop/engine/forkshop.css";\n${existing}`
  await fs.writeFile(target, next, "utf8")
  return { action: "added", target: TARGET_REL }
}
