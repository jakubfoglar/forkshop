import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { copyManifestFiles, type CopyPlan } from "./copy-files.js"
import type { ForkshopJson, Manifest } from "./manifest-schema.js"

const aliases: ForkshopJson["aliases"] = {
  base: "@/",
  components: "@/components/forkshop",
  kits: "@/components/forkshop/kits",
  hooks: "@/lib/forkshop/hooks",
  lib: "@/lib/forkshop",
  api: "@/app/api/forkshop",
  tailwind: "@/lib/forkshop/tailwind",
  mount: "@/app/forkshop",
}

function fakeManifest(): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://forkshop.dev/r/",
    bundles: {},
    files: {
      "@forkshop/lib/foo": {
        kind: "text",
        ext: "ts",
        content: `import { bar } from "@forkshop/lib/bar"\nexport const foo = bar`,
      },
      "@forkshop/lib/bar": {
        kind: "text",
        ext: "ts",
        content: `export const bar = 1`,
      },
    },
  }
}

describe("copyManifestFiles", () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("writes each file to its resolved destination with rewritten imports", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-copy-"))
    dirs.push(root)
    const manifest = fakeManifest()
    const plan: CopyPlan = await copyManifestFiles({
      projectRoot: root,
      manifest,
      aliases,
      fileAddresses: ["@forkshop/lib/foo", "@forkshop/lib/bar"],
    })
    expect(plan).toHaveLength(2)
    const fooContent = await fs.readFile(path.join(root, "lib/forkshop/foo.ts"), "utf8")
    expect(fooContent).toContain(`from "@/lib/forkshop/bar"`)
    expect(fooContent).not.toContain("@forkshop/")
    const barContent = await fs.readFile(path.join(root, "lib/forkshop/bar.ts"), "utf8")
    expect(barContent).toBe("export const bar = 1")
  })

  it("returns CopyPlan entries with dest + sha", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-copy-"))
    dirs.push(root)
    const manifest = fakeManifest()
    const plan = await copyManifestFiles({
      projectRoot: root,
      manifest,
      aliases,
      fileAddresses: ["@forkshop/lib/bar"],
    })
    expect(plan[0]).toMatchObject({
      address: "@forkshop/lib/bar",
      dest: "lib/forkshop/bar.ts",
      sha: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })
})
