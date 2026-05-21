import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runDiff } from "./diff.js"
import type { ForkshopJson, Manifest } from "../manifest-schema.js"
import { sha256Hex } from "../sha.js"

async function setupInstalled(opts: {
  setupOnDisk: string
}): Promise<{ root: string; manifest: Manifest }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-diff-"))
  await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
  await fs.writeFile(
    path.join(root, ".claude/skills/forkshop-setup.md"),
    opts.setupOnDisk
  )
  const lock: ForkshopJson = {
    schemaVersion: "2.1.0",
    installedAt: "2026-05-17T00:00:00Z",
    registryUrl: "https://example.test/r/",
    engineVersion: "0.3.0",
    mount: "@/app/forkshop",
    srcPrefix: "",
    installedBundles: ["skill"],
    files: {
      "@forkshop/skill/setup": {
        dest: ".claude/skills/forkshop-setup.md",
        sha: sha256Hex(opts.setupOnDisk),
      },
    },
  }
  await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lock, null, 2))
  const manifest: Manifest = {
    version: "2.1.0",
    generatedAt: "2026-05-17T00:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    engineVersion: "0.3.0",
    bundles: {},
    files: {
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content: "# updated upstream\n",
        destOverride: ".claude/skills/forkshop-setup.md",
      },
    },
  }
  return { root, manifest }
}

describe("runDiff", () => {
  const dirs: string[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("emits a unified diff when local differs from manifest", async () => {
    const { root, manifest } = await setupInstalled({ setupOnDisk: "# local\n" })
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: ".claude/skills/forkshop-setup.md",
      manifest,
    })
    expect(result.exitCode).toBe(1)
    expect(result.diff).toContain("-# local")
    expect(result.diff).toContain("+# updated upstream")
  })

  it("reports no diff when local matches manifest", async () => {
    const { root, manifest } = await setupInstalled({ setupOnDisk: "# updated upstream\n" })
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: ".claude/skills/forkshop-setup.md",
      manifest,
    })
    expect(result.exitCode).toBe(0)
    expect(result.diff).toBeUndefined()
  })

  it("refuses when forkshop.json is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-diff-"))
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: "anything",
      manifest: {
        version: "2.1.0",
        generatedAt: "x",
        registryBaseUrl: "x",
        engineVersion: "0.3.0",
        bundles: {},
        files: {},
      },
    })
    expect(result.exitCode).toBe(2)
    expect(result.message).toMatch(/init/)
  })
})
