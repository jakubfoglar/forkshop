import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
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

  it("refreshes the hook script when producerPack.claudeCode is true", async () => {
    const content = "setup"
    const sha = sha256Hex(content)
    const root = await setupInstalled({
      setupContentOnDisk: content,
      lockSha: sha,
    })
    dirs.push(root)

    // Pre-place an old hook script.
    const hookDir = path.join(root, ".claude/hooks")
    await fs.mkdir(hookDir, { recursive: true })
    const hookPath = path.join(hookDir, "forkshop-post-tool-use.sh")
    await fs.writeFile(hookPath, "#!/bin/sh\necho old", { mode: 0o755 })

    // Inject producerPack into the lock.
    const lockRaw = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    lockRaw.producerPack = { claudeCode: true }
    await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lockRaw, null, 2))

    // Manifest that includes the new hook file content.
    const manifest: Manifest = {
      ...manifestWithSetupContent(content),
      files: {
        ...manifestWithSetupContent(content).files,
        "@forkshop/hooks/forkshop-post-tool-use": {
          kind: "text",
          ext: "sh",
          content: "#!/bin/sh\necho new-hook",
          destOverride: ".claude/hooks/forkshop-post-tool-use.sh",
        },
      },
    }

    await runUpdate({ projectRoot: root, manifest, apply: true })

    const hookContent = await fs.readFile(hookPath, "utf8")
    expect(hookContent).toBe("#!/bin/sh\necho new-hook")
  })

  it("silently skips hook refresh when manifest has no hook entry", async () => {
    const content = "setup"
    const sha = sha256Hex(content)
    const root = await setupInstalled({
      setupContentOnDisk: content,
      lockSha: sha,
    })
    dirs.push(root)

    // Inject producerPack into the lock (no hook entry in manifest).
    const lockRaw = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    lockRaw.producerPack = { claudeCode: true }
    await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lockRaw, null, 2))

    // Run without a hook file in the manifest — should not throw.
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(content),
      apply: true,
    })
    expect(result.ok).toBe(true)

    // Hook dir should not have been created.
    const hookExists = await fs
      .access(path.join(root, ".claude/hooks/forkshop-post-tool-use.sh"))
      .then(() => true)
      .catch(() => false)
    expect(hookExists).toBe(false)
  })

  it("deletes orphan files and removes them from lock", async () => {
    const content = "setup"
    const sha = sha256Hex(content)
    const root = await setupInstalled({
      setupContentOnDisk: content,
      lockSha: sha,
    })
    dirs.push(root)

    // Add an orphan entry to the lock — a file that does NOT exist in the manifest.
    const orphanDest = ".claude/skills/forkshop-live-editing.md"
    const lockRaw = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    lockRaw.files["@forkshop/skill/live-editing"] = { dest: orphanDest, sha: "abc123" }
    await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lockRaw, null, 2))

    // Place the orphan file on disk.
    await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
    await fs.writeFile(path.join(root, orphanDest), "old live editing skill")

    // Run update — manifest does NOT contain @forkshop/skill/live-editing.
    await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(content),
      apply: true,
    })

    // File should be gone.
    const stillExists = await fs
      .access(path.join(root, orphanDest))
      .then(() => true)
      .catch(() => false)
    expect(stillExists).toBe(false)

    // Key should be removed from forkshop.json.
    const lockAfter = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lockAfter.files["@forkshop/skill/live-editing"]).toBeUndefined()
  })

  it("--check exits 1 when orphan exists", async () => {
    const content = "setup"
    const sha = sha256Hex(content)
    const root = await setupInstalled({
      setupContentOnDisk: content,
      lockSha: sha,
    })
    dirs.push(root)

    // Add an orphan entry to the lock.
    const lockRaw = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    lockRaw.files["@forkshop/skill/live-editing"] = {
      dest: ".claude/skills/forkshop-live-editing.md",
      sha: "abc123",
    }
    await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lockRaw, null, 2))

    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(content),
      checkOnly: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.exitCode).toBe(1)
  })

  it("handles ENOENT orphan gracefully and still removes from lock", async () => {
    const content = "setup"
    const sha = sha256Hex(content)
    const root = await setupInstalled({
      setupContentOnDisk: content,
      lockSha: sha,
    })
    dirs.push(root)

    // Add an orphan entry to the lock but do NOT create the file on disk.
    const lockRaw = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    lockRaw.files["@forkshop/skill/live-editing"] = {
      dest: ".claude/skills/forkshop-live-editing.md",
      sha: "abc123",
    }
    await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lockRaw, null, 2))

    // Should not throw even though the file doesn't exist.
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(content),
      apply: true,
    })
    expect(result.ok).toBe(true)

    // Key should still be removed from forkshop.json.
    const lockAfter = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lockAfter.files["@forkshop/skill/live-editing"]).toBeUndefined()
  })
})
