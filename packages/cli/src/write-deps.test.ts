import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { mergeDepsIntoPackageJson, parseDepSpec } from "./write-deps.js"

async function makeProject(pkgJson: object): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-deps-"))
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(pkgJson, null, 2),
    "utf8",
  )
  return root
}

describe("parseDepSpec", () => {
  it("parses an unscoped package with version", () => {
    expect(parseDepSpec("clsx@^2.1.1")).toEqual({ name: "clsx", version: "^2.1.1" })
  })
  it("parses a scoped package with version", () => {
    expect(parseDepSpec("@locator/runtime@^0.5.1")).toEqual({
      name: "@locator/runtime",
      version: "^0.5.1",
    })
  })
  it("falls back to '*' for a bare name", () => {
    expect(parseDepSpec("clsx")).toEqual({ name: "clsx", version: "*" })
  })
  it("treats a leading @ without an internal @ as a bare scoped name", () => {
    expect(parseDepSpec("@locator/runtime")).toEqual({ name: "@locator/runtime", version: "*" })
  })
})

describe("mergeDepsIntoPackageJson", () => {
  let root: string | undefined
  afterEach(async () => {
    if (root) await fs.rm(root, { recursive: true, force: true })
    root = undefined
  })

  it("adds new deps to dependencies", async () => {
    root = await makeProject({ name: "x", dependencies: {} })
    const added = await mergeDepsIntoPackageJson(root, ["clsx@^2.1.1", "@locator/runtime@^0.5.1"])
    expect(added.sort()).toEqual(["@locator/runtime", "clsx"])
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["clsx"]).toBe("^2.1.1")
    expect(pkg.dependencies["@locator/runtime"]).toBe("^0.5.1")
  })

  it("preserves existing dependencies and doesn't overwrite their versions", async () => {
    root = await makeProject({ name: "x", dependencies: { clsx: "1.0.0", existing: "0.0.1" } })
    const added = await mergeDepsIntoPackageJson(root, ["clsx@^2.1.1", "lucide-react@^1.14.0"])
    expect(added).toEqual(["lucide-react"])
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["clsx"]).toBe("1.0.0")
    expect(pkg.dependencies["existing"]).toBe("0.0.1")
    expect(pkg.dependencies["lucide-react"]).toBe("^1.14.0")
  })

  it("does not duplicate a dep that exists in devDependencies", async () => {
    root = await makeProject({ name: "x", devDependencies: { clsx: "2.0.0" } })
    const added = await mergeDepsIntoPackageJson(root, ["clsx@^2.1.1"])
    expect(added).toEqual([])
  })

  it("returns empty when there's nothing to add", async () => {
    root = await makeProject({ name: "x", dependencies: { clsx: "2.0.0" } })
    const added = await mergeDepsIntoPackageJson(root, ["clsx@^2.1.1"])
    expect(added).toEqual([])
  })

  it("creates dependencies block if missing", async () => {
    root = await makeProject({ name: "x" })
    const added = await mergeDepsIntoPackageJson(root, ["clsx@^2.1.1"])
    expect(added).toEqual(["clsx"])
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies.clsx).toBe("^2.1.1")
  })
})
