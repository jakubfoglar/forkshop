import { promises as fs } from "node:fs"
import path from "node:path"
import type { FogmaJson } from "./manifest-schema.js"

export type { FogmaJson } from "./manifest-schema.js"

const FILENAME = "fogma.json"

export async function readFogmaJson(projectRoot: string): Promise<FogmaJson | undefined> {
  const target = path.join(projectRoot, FILENAME)
  let text: string
  try {
    text = await fs.readFile(target, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
  try {
    return JSON.parse(text) as FogmaJson
  } catch (error) {
    throw new Error(
      `Could not parse fogma.json at ${target}: ${(error as Error).message}. ` +
        `Hand-fix, or rm fogma.json && fogma init --force.`
    )
  }
}

export async function writeFogmaJson(projectRoot: string, value: FogmaJson): Promise<void> {
  const target = path.join(projectRoot, FILENAME)
  const serialised = JSON.stringify(value, null, 2) + "\n"
  await fs.writeFile(target, serialised, "utf8")
}
