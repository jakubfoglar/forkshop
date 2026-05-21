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

  it("round-trips a v2-shape forkshop.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    const written: ForkshopJson = {
      schemaVersion: "2.1.0",
      installedAt: "2026-05-17T10:00:00Z",
      registryUrl: "https://forkshop.dev/r/",
      engineVersion: "0.3.0",
      mount: "@/app/forkshop",
      srcPrefix: "",
      installedBundles: ["init"],
      files: {
        "@forkshop/skill/setup": {
          dest: ".claude/skills/forkshop-setup.md",
          sha: "abcd1234",
        },
      },
    }
    await writeForkshopJson(root, written)
    const read = await readForkshopJson(root)
    expect(read).toEqual(written)
  })

  it("round-trips with srcPrefix set", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    const written: ForkshopJson = {
      schemaVersion: "2.1.0",
      installedAt: "2026-05-17T10:00:00Z",
      registryUrl: "https://forkshop.dev/r/",
      engineVersion: "0.3.0",
      mount: "@/app/forkshop",
      srcPrefix: "src/",
      installedBundles: ["init"],
      files: {},
    }
    await writeForkshopJson(root, written)
    expect(await readForkshopJson(root)).toEqual(written)
  })

  it("throws a useful error on malformed JSON", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "forkshop.json"), "{ not json")
    await expect(readForkshopJson(root)).rejects.toThrow(/forkshop\.json/)
  })
})
