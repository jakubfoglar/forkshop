import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { readForkshopJson, writeForkshopJson, type ForkshopJson } from "./forkshop-json.js"

describe("forkshop.json", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("returns undefined when no forkshop.json exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    expect(await readForkshopJson(root)).toBeUndefined()
  })

  it("round-trips a valid forkshop.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    const written: ForkshopJson = {
      registryVersion: "1.0.0",
      installedAt: "2026-05-13T10:00:00Z",
      registryUrl: "https://forkshop.dev/r/",
      aliases: {
        base: "@/",
        components: "@/components/forkshop",
        kits: "@/components/forkshop/kits",
        hooks: "@/lib/forkshop/hooks",
        lib: "@/lib/forkshop",
        api: "@/app/api/forkshop",
        tailwind: "@/lib/forkshop/tailwind",
        mount: "@/app/forkshop",
      },
      installedBundles: ["primitives"],
      files: {
        "@forkshop/lib/edit-mode": {
          dest: "lib/forkshop/edit-mode.ts",
          sha: "abcd1234",
        },
      },
    }
    await writeForkshopJson(root, written)
    const read = await readForkshopJson(root)
    expect(read).toEqual(written)
  })

  it("throws a useful error on malformed JSON", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "forkshop.json"), "{ not json")
    await expect(readForkshopJson(root)).rejects.toThrow(/forkshop\.json/)
  })
})
