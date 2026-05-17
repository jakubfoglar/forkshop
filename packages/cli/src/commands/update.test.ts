import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runUpdate } from "./update.js"
import type { ForkshopJson, Manifest } from "../manifest-schema.js"

function manifestWithSetupContent(content: string, engineVersion = "0.3.0"): Manifest {
  return {
    version: "2.0.0",
    generatedAt: "2026-05-17T00:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    engineVersion,
    bundles: {
      skill: { kind: "scaffold", items: ["@forkshop/skill/setup"] },
      init: { kind: "composite", includes: ["skill"] },
    },
    files: {
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content,
        destOverride: ".claude/skills/forkshop-setup.md",
      },
    },
  }
}

async function setupInstalled(opts: {
  setupContentOnDisk: string
  lockSha: string
  engineVersion?: string
  withEnginePin?: string
}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-upd-"))
  await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
  await fs.writeFile(
    path.join(root, ".claude/skills/forkshop-setup.md"),
    opts.setupContentOnDisk
  )
  const lock: ForkshopJson = {
    schemaVersion: "2.0.0",
    installedAt: "2026-05-17T00:00:00Z",
    registryUrl: "https://example.test/r/",
    engineVersion: opts.engineVersion ?? "0.3.0",
    mount: "@/app/forkshop",
    srcPrefix: "",
    installedBundles: ["skill"],
    files: {
      "@forkshop/skill/setup": {
        dest: ".claude/skills/forkshop-setup.md",
        sha: opts.lockSha,
      },
    },
  }
  await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lock, null, 2))
  if (opts.withEnginePin) {
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify(
        {
          dependencies: { "@forkshop/engine": opts.withEnginePin },
        },
        null,
        2
      )
    )
  }
  return root
}

import { sha256Hex } from "../sha.js"

describe("runUpdate", () => {
  const dirs: string[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("--check exits 0 when unchanged", async () => {
    const content = "old"
    const sha = sha256Hex(content)
    const root = await setupInstalled({
      setupContentOnDisk: content,
      lockSha: sha,
    })
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(content),
      checkOnly: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.exitCode).toBe(0)
  })

  it("--check exits 1 when upstream drift exists", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: oldContent,
      lockSha: sha,
    })
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      checkOnly: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.exitCode).toBe(1)
  })

  it("applies upstream-drift in apply mode", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: oldContent,
      lockSha: sha,
    })
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      apply: true,
    })
    expect(result.ok).toBe(true)
    const after = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(after).toBe("new")
  })

  it("skips local-drift without --force", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: "user edited",
      lockSha: sha,
    })
    dirs.push(root)
    await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      apply: true,
    })
    const after = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(after).toBe("user edited")
  })

  it("overwrites local-drift with --force", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: "user edited",
      lockSha: sha,
    })
    dirs.push(root)
    await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      apply: true,
      force: true,
    })
    const after = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(after).toBe("new")
  })

  it("bumps engine pin when soft offer accepted", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: oldContent,
      lockSha: sha,
      engineVersion: "0.2.0",
      withEnginePin: "^0.2.0",
    })
    dirs.push(root)
    await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(oldContent, "0.3.0"),
      apply: true,
      acceptEngineBump: true,
    })
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBe("^0.3.0")
    const lock = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lock.engineVersion).toBe("0.3.0")
  })

  it("refuses when forkshop.json absent", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-upd-"))
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("x"),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/forkshop init/)
  })
})
