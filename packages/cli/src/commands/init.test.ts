import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runInit } from "./init.js"
import type { Manifest } from "../manifest-schema.js"

// Hoisted so the factory runs before `runInit` imports child_process.
const spawnSyncMock = vi.hoisted(() =>
  vi.fn().mockReturnValue({ status: 0, stdout: "", stderr: "", pid: 0, output: [], signal: null })
)

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process")
  return { ...actual, spawnSync: spawnSyncMock }
})

function fakeManifest(): Manifest {
  return {
    version: "2.0.0",
    generatedAt: "2026-05-17T00:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    engineVersion: "0.3.0",
    bundles: {
      "route-stubs": { kind: "scaffold", items: ["@forkshop/route-stubs/edit"] },
      skill: { kind: "scaffold", items: ["@forkshop/skill/setup"] },
      "claude-md": { kind: "scaffold", items: ["@forkshop/templates/claude-md"] },
      font: { kind: "asset", items: ["@forkshop/fonts/raveo/RaveoVF"] },
      init: {
        kind: "composite",
        includes: ["route-stubs", "skill", "claude-md", "font"],
      },
    },
    files: {
      "@forkshop/route-stubs/edit": {
        kind: "text",
        ext: "ts",
        content: 'export { POST, GET } from "@forkshop/engine/api/edit/route"\n',
        destOverride: "app/api/forkshop/edit/route.ts",
      },
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content: "# setup\n",
        destOverride: ".claude/skills/forkshop-setup.md",
      },
      "@forkshop/templates/claude-md": {
        kind: "text",
        ext: "md",
        content: "# claude md\nOpen `{{srcPrefix}}app/forkshop/`.\n",
        destOverride: "{aliases.mount}/CLAUDE.md",
      },
      "@forkshop/fonts/raveo/RaveoVF": {
        kind: "binary",
        url: "fonts/raveo/RaveoVF.woff2",
        destOverride: "public/fonts/forkshop/RaveoVF.woff2",
      },
    },
  }
}

async function setupProject(overrides: { withSrc?: boolean } = {}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-init-"))
  await fs.mkdir(path.join(root, overrides.withSrc ? "src/app" : "app"), { recursive: true })
  await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        paths: { "@/*": [overrides.withSrc ? "./src/*" : "./*"] },
      },
    })
  )
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "host", dependencies: { next: "^14.0.0" } }, null, 2)
  )
  await fs.writeFile(
    path.join(root, overrides.withSrc ? "src/app/globals.css" : "app/globals.css"),
    "@tailwind base;\n@tailwind utilities;\n"
  )
  return root
}

describe("runInit (v2)", () => {
  const dirs: string[] = []

  beforeEach(() => {
    // Mock fetch for the font binary
    const payload = new Uint8Array([0x77, 0x4f, 0x46, 0x32])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => payload.buffer,
    } as unknown as Response)
    spawnSyncMock.mockClear()
    spawnSyncMock.mockReturnValue({ status: 0, stdout: "", stderr: "", pid: 0, output: [], signal: null })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("happy path — flat layout, drops scaffold + writes lock", async () => {
    const root = await setupProject()
    dirs.push(root)
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(true)

    expect(
      await fs.readFile(path.join(root, ".claude/skills/forkshop-setup.md"), "utf8")
    ).toBe("# setup\n")
    expect(
      await fs.readFile(path.join(root, "app/api/forkshop/edit/route.ts"), "utf8")
    ).toBe('export { POST, GET } from "@forkshop/engine/api/edit/route"\n')
    expect(await fs.readFile(path.join(root, "app/forkshop/CLAUDE.md"), "utf8")).toContain(
      "Open `app/forkshop/`."
    )

    const fontBuf = await fs.readFile(path.join(root, "public/fonts/forkshop/RaveoVF.woff2"))
    expect(fontBuf.length).toBe(4)

    const globals = await fs.readFile(path.join(root, "app/globals.css"), "utf8")
    expect(globals.startsWith('@import "@forkshop/engine/forkshop.css";')).toBe(true)

    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBeDefined()

    const lock = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lock.schemaVersion).toBe("2.0.0")
    expect(lock.engineVersion).toBe("0.3.0")
    expect(lock.mount).toBe("@/app/forkshop")
    expect(lock.srcPrefix).toBe("")
    expect(lock.installedBundles).toEqual([
      "route-stubs",
      "skill",
      "claude-md",
      "font",
    ])
    expect(lock.files["@forkshop/skill/setup"].dest).toBe(
      ".claude/skills/forkshop-setup.md"
    )
    expect(lock.files["@forkshop/fonts/raveo/RaveoVF"].dest).toBe(
      "public/fonts/forkshop/RaveoVF.woff2"
    )
  })

  it("respects detected src/ convention", async () => {
    const root = await setupProject({ withSrc: true })
    dirs.push(root)
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(true)
    expect(
      await fs.readFile(path.join(root, "src/app/forkshop/CLAUDE.md"), "utf8")
    ).toContain("Open `src/app/forkshop/`.")
    const lock = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lock.srcPrefix).toBe("src/")
  })

  it("refuses if forkshop.json already exists", async () => {
    const root = await setupProject()
    dirs.push(root)
    await fs.writeFile(path.join(root, "forkshop.json"), "{}")
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/already installed/i)
  })

  it("refuses on collision with an existing scaffold file (no --force)", async () => {
    const root = await setupProject()
    dirs.push(root)
    await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
    await fs.writeFile(path.join(root, ".claude/skills/forkshop-setup.md"), "pre-existing")
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/conflict/i)
  })

  it("overwrites on collision with --force", async () => {
    const root = await setupProject()
    dirs.push(root)
    await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
    await fs.writeFile(path.join(root, ".claude/skills/forkshop-setup.md"), "pre-existing")
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      force: true,
    })
    expect(result.ok).toBe(true)
    expect(
      await fs.readFile(path.join(root, ".claude/skills/forkshop-setup.md"), "utf8")
    ).toBe("# setup\n")
  })

  it("rejects v1 manifest", async () => {
    const root = await setupProject()
    dirs.push(root)
    const m = fakeManifest()
    m.version = "1.0.0"
    const result = await runInit({
      projectRoot: root,
      manifest: m,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/schema/i)
  })

  it("runs the detected package manager install after writing scaffold", async () => {
    const root = await setupProject()
    dirs.push(root)
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(true)
    expect(spawnSyncMock).toHaveBeenCalledTimes(1)
    const [cmd, args, opts] = spawnSyncMock.mock.calls[0]
    expect(cmd).toBe("npm") // fixture has no lockfile → detectPackageManager falls back to npm
    expect(args).toEqual(["install"])
    expect(opts).toMatchObject({ cwd: root, stdio: "inherit" })
  })

  it("skips install when skipInstall is true and prints the manual command", async () => {
    const root = await setupProject()
    dirs.push(root)
    const logs: string[] = []
    const originalLog = console.log
    console.log = (msg: string) => { logs.push(String(msg)) }
    try {
      const result = await runInit({
        projectRoot: root,
        manifest: fakeManifest(),
        skipInstall: true,
      })
      expect(result.ok).toBe(true)
    } finally {
      console.log = originalLog
    }
    expect(spawnSyncMock).not.toHaveBeenCalled()
    expect(logs.some((l) => /to fetch it/i.test(l))).toBe(true)
  })
})
