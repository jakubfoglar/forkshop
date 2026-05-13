import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { runDiff } from "./diff.js"
import type { ForkshopJson, Manifest } from "../manifest-schema.js"

function fakeManifest(content: string): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    bundles: {},
    files: {
      "@forkshop/lib/foo": { kind: "text", ext: "ts", content },
    },
  }
}

async function setup(localContent: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-diff-"))
  const forkshopJson: ForkshopJson = {
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
      "@forkshop/lib/foo": { dest: "lib/forkshop/foo.ts", sha: "" },
    },
  }
  await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(forkshopJson, null, 2))
  await fs.mkdir(path.join(root, "lib/forkshop"), { recursive: true })
  await fs.writeFile(path.join(root, "lib/forkshop/foo.ts"), localContent)
  return root
}

describe("runDiff", () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("exits 0 when local and upstream match (after rewrite)", async () => {
    const root = await setup("export const foo = 1")
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: "lib/forkshop/foo.ts",
      manifest: fakeManifest("export const foo = 1"),
    })
    expect(result.exitCode).toBe(0)
    expect(result.diff).toBe("")
  })

  it("exits 1 and returns a diff when local differs", async () => {
    const root = await setup("export const foo = 999")
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: "lib/forkshop/foo.ts",
      manifest: fakeManifest("export const foo = 1"),
    })
    expect(result.exitCode).toBe(1)
    expect(result.diff).toContain("-export const foo = 999")
    expect(result.diff).toContain("+export const foo = 1")
  })

  it("exits 2 when the path is not tracked in forkshop.json", async () => {
    const root = await setup("foo")
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: "lib/random/elsewhere.ts",
      manifest: fakeManifest("foo"),
    })
    expect(result.exitCode).toBe(2)
  })
})
