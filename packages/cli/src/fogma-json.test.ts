import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { readFogmaJson, writeFogmaJson, type FogmaJson } from "./fogma-json.js"

describe("fogma.json", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("returns undefined when no fogma.json exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-json-"))
    tempDirs.push(root)
    expect(await readFogmaJson(root)).toBeUndefined()
  })

  it("round-trips a valid fogma.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-json-"))
    tempDirs.push(root)
    const written: FogmaJson = {
      registryVersion: "1.0.0",
      installedAt: "2026-05-13T10:00:00Z",
      registryUrl: "https://fogma.dev/r/",
      aliases: {
        base: "@/",
        components: "@/components/fogma",
        kits: "@/components/fogma/kits",
        hooks: "@/lib/fogma/hooks",
        lib: "@/lib/fogma",
        api: "@/app/api/fogma",
        tailwind: "@/lib/fogma/tailwind",
        mount: "@/app/fogma",
      },
      installedBundles: ["primitives"],
      files: {
        "@fogma/lib/edit-mode": {
          dest: "lib/fogma/edit-mode.ts",
          sha: "abcd1234",
        },
      },
    }
    await writeFogmaJson(root, written)
    const read = await readFogmaJson(root)
    expect(read).toEqual(written)
  })

  it("throws a useful error on malformed JSON", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-json-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "fogma.json"), "{ not json")
    await expect(readFogmaJson(root)).rejects.toThrow(/fogma\.json/)
  })
})
