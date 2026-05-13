import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { detectPackageManager } from "./detect-pm.js"

describe("detectPackageManager", () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  async function mkTemp(): Promise<string> {
    const d = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-pm-"))
    dirs.push(d)
    return d
  }

  it("detects pnpm from pnpm-lock.yaml", async () => {
    const root = await mkTemp()
    await fs.writeFile(path.join(root, "pnpm-lock.yaml"), "")
    expect(await detectPackageManager(root)).toBe("pnpm")
  })

  it("detects yarn from yarn.lock", async () => {
    const root = await mkTemp()
    await fs.writeFile(path.join(root, "yarn.lock"), "")
    expect(await detectPackageManager(root)).toBe("yarn")
  })

  it("detects bun from bun.lockb", async () => {
    const root = await mkTemp()
    await fs.writeFile(path.join(root, "bun.lockb"), "")
    expect(await detectPackageManager(root)).toBe("bun")
  })

  it("falls back to npm when no lockfile exists", async () => {
    const root = await mkTemp()
    expect(await detectPackageManager(root)).toBe("npm")
  })
})
