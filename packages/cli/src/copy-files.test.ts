import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { copyManifestFiles, findCollisions } from "./copy-files.js"
import type { Manifest } from "./manifest-schema.js"

const baseManifest: Manifest = {
  version: "2.1.0",
  generatedAt: "2026-05-17T00:00:00Z",
  registryBaseUrl: "https://example.test/r/",
  engineVersion: "0.3.0",
  bundles: {},
  files: {
    "@forkshop/skill/setup": {
      kind: "text",
      ext: "md",
      content: "Run `npx forkshop init` then open `{{srcPrefix}}app/forkshop/`.\n",
      destOverride: ".claude/skills/forkshop-setup.md",
    },
    "@forkshop/route-stubs/edit": {
      kind: "text",
      ext: "ts",
      content: 'export { POST, GET } from "@forkshop/engine/api/edit/route"\n',
      destOverride: "app/api/forkshop/edit/route.ts",
    },
  },
}

describe("copyManifestFiles", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("writes text files with placeholders applied and records shas", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-copy-"))
    tempDirs.push(root)
    const plan = await copyManifestFiles({
      projectRoot: root,
      manifest: baseManifest,
      aliases: { mount: "@/app/forkshop", srcPrefix: "src/" },
      fileAddresses: ["@forkshop/skill/setup"],
    })
    expect(plan).toHaveLength(1)
    expect(plan[0]!.dest).toBe(".claude/skills/forkshop-setup.md")
    expect(typeof plan[0]!.sha).toBe("string")

    const written = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(written).toContain("`src/app/forkshop/`")
  })

  it("does not touch engine package imports in route stubs", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-copy-"))
    tempDirs.push(root)
    await copyManifestFiles({
      projectRoot: root,
      manifest: baseManifest,
      aliases: { mount: "@/app/forkshop", srcPrefix: "" },
      fileAddresses: ["@forkshop/route-stubs/edit"],
    })
    const written = await fs.readFile(
      path.join(root, "app/api/forkshop/edit/route.ts"),
      "utf8"
    )
    expect(written).toBe('export { POST, GET } from "@forkshop/engine/api/edit/route"\n')
  })
})

describe("findCollisions", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("returns paths that already exist", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-coll-"))
    tempDirs.push(root)
    await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
    await fs.writeFile(path.join(root, ".claude/skills/forkshop-setup.md"), "old")
    const collisions = await findCollisions(root, [
      ".claude/skills/forkshop-setup.md",
      ".claude/skills/forkshop-nonexistent.md",
    ])
    expect(collisions).toEqual([".claude/skills/forkshop-setup.md"])
  })
})
