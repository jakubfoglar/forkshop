import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { readEnginePin, isEnginePinBehind } from "./engine-version.js"

describe("readEnginePin", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  async function setup(pkg: object): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-engver-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify(pkg))
    return root
  }

  it("reads from dependencies", async () => {
    const root = await setup({ dependencies: { "@forkshop/engine": "^0.2.5" } })
    expect(await readEnginePin(root)).toEqual({ raw: "^0.2.5", normalized: "0.2.5" })
  })

  it("reads from devDependencies", async () => {
    const root = await setup({ devDependencies: { "@forkshop/engine": "~0.3.0" } })
    expect(await readEnginePin(root)).toEqual({ raw: "~0.3.0", normalized: "0.3.0" })
  })

  it("prefers dependencies over devDependencies", async () => {
    const root = await setup({
      dependencies: { "@forkshop/engine": "0.4.0" },
      devDependencies: { "@forkshop/engine": "0.1.0" },
    })
    expect(await readEnginePin(root)).toEqual({ raw: "0.4.0", normalized: "0.4.0" })
  })

  it("returns undefined when not pinned", async () => {
    const root = await setup({ dependencies: {} })
    expect(await readEnginePin(root)).toBeUndefined()
  })
})

describe("isEnginePinBehind", () => {
  it("0.2.5 is behind 0.3.0", () => {
    expect(isEnginePinBehind("0.2.5", "0.3.0")).toBe(true)
  })

  it("0.3.0 is not behind 0.3.0", () => {
    expect(isEnginePinBehind("0.3.0", "0.3.0")).toBe(false)
  })

  it("0.4.0 is not behind 0.3.0", () => {
    expect(isEnginePinBehind("0.4.0", "0.3.0")).toBe(false)
  })

  it("1.0.0 is not behind 0.9.99", () => {
    expect(isEnginePinBehind("1.0.0", "0.9.99")).toBe(false)
  })

  it("0.10.0 is not behind 0.9.0 (numeric not lexical)", () => {
    expect(isEnginePinBehind("0.10.0", "0.9.0")).toBe(false)
  })
})
