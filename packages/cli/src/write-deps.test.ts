import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { mergeDepsIntoPackageJson, parseDepSpec } from "./write-deps.js"

describe("parseDepSpec", () => {
  it("parses @forkshop/engine@0.3.0", () => {
    expect(parseDepSpec("@forkshop/engine@0.3.0")).toEqual({
      name: "@forkshop/engine",
      version: "0.3.0",
    })
  })

  it("parses a scoped dep with caret range", () => {
    expect(parseDepSpec("@forkshop/engine@^0.3.0")).toEqual({
      name: "@forkshop/engine",
      version: "^0.3.0",
    })
  })

  it("parses an unscoped dep", () => {
    expect(parseDepSpec("clsx@2.1.1")).toEqual({ name: "clsx", version: "2.1.1" })
  })

  it("returns version '*' for bare scoped names", () => {
    expect(parseDepSpec("@forkshop/engine")).toEqual({ name: "@forkshop/engine", version: "*" })
  })
})

describe("mergeDepsIntoPackageJson", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  async function setup(initialPkg: object): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-wd-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify(initialPkg, null, 2))
    return root
  }

  it("adds @forkshop/engine when absent", async () => {
    const root = await setup({ dependencies: { next: "^14.0.0" } })
    const added = await mergeDepsIntoPackageJson(root, ["@forkshop/engine@^0.3.0"])
    expect(added).toEqual(["@forkshop/engine"])
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBe("^0.3.0")
    expect(pkg.dependencies.next).toBe("^14.0.0")
  })

  it("does not overwrite an existing pin", async () => {
    const root = await setup({ dependencies: { "@forkshop/engine": "0.2.0" } })
    const added = await mergeDepsIntoPackageJson(root, ["@forkshop/engine@^0.3.0"])
    expect(added).toEqual([])
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBe("0.2.0")
  })

  it("handles missing dependencies block", async () => {
    const root = await setup({})
    const added = await mergeDepsIntoPackageJson(root, ["@forkshop/engine@^0.3.0"])
    expect(added).toEqual(["@forkshop/engine"])
  })
})
