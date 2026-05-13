import { promises as fs } from "node:fs"
import path from "node:path"
import type { ForkshopJson } from "./manifest-schema.js"

export type { ForkshopJson } from "./manifest-schema.js"

const FILENAME = "forkshop.json"

export async function readForkshopJson(projectRoot: string): Promise<ForkshopJson | undefined> {
  const target = path.join(projectRoot, FILENAME)
  let text: string
  try {
    text = await fs.readFile(target, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
  try {
    return JSON.parse(text) as ForkshopJson
  } catch (error) {
    throw new Error(
      `Could not parse forkshop.json at ${target}: ${(error as Error).message}. ` +
        `Hand-fix, or rm forkshop.json && forkshop init --force.`
    )
  }
}

export async function writeForkshopJson(projectRoot: string, value: ForkshopJson): Promise<void> {
  const target = path.join(projectRoot, FILENAME)
  const serialised = JSON.stringify(value, null, 2) + "\n"
  await fs.writeFile(target, serialised, "utf8")
}
