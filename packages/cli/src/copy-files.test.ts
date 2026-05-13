import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { copyManifestFiles, type CopyPlan } from "./copy-files.js"
import type { FogmaJson, Manifest } from "./manifest-schema.js"

const aliases: FogmaJson["aliases"] = {
  base: "@/",
  components: "@/components/fogma",
  kits: "@/components/fogma/kits",
  hooks: "@/lib/fogma/hooks",
  lib: "@/lib/fogma",
  api: "@/app/api/fogma",
  tailwind: "@/lib/fogma/tailwind",
  mount: "@/app/fogma",
}

function fakeManifest(): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://fogma.dev/r/",
    bundles: {},
    files: {
      "@fogma/lib/foo": {
        kind: "text",
        ext: "ts",
        content: `import { bar } from "@fogma/lib/bar"\nexport const foo = bar`,
      },
      "@fogma/lib/bar": {
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
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-copy-"))
    dirs.push(root)
    const manifest = fakeManifest()
    const plan: CopyPlan = await copyManifestFiles({
      projectRoot: root,
      manifest,
      aliases,
      fileAddresses: ["@fogma/lib/foo", "@fogma/lib/bar"],
    })
    expect(plan).toHaveLength(2)
    const fooContent = await fs.readFile(path.join(root, "lib/fogma/foo.ts"), "utf8")
    expect(fooContent).toContain(`from "@/lib/fogma/bar"`)
    expect(fooContent).not.toContain("@fogma/")
    const barContent = await fs.readFile(path.join(root, "lib/fogma/bar.ts"), "utf8")
    expect(barContent).toBe("export const bar = 1")
  })

  it("returns CopyPlan entries with dest + sha", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-copy-"))
    dirs.push(root)
    const manifest = fakeManifest()
    const plan = await copyManifestFiles({
      projectRoot: root,
      manifest,
      aliases,
      fileAddresses: ["@fogma/lib/bar"],
    })
    expect(plan[0]).toMatchObject({
      address: "@fogma/lib/bar",
      dest: "lib/fogma/bar.ts",
      sha: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })
})
