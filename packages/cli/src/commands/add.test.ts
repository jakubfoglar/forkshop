import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { runAdd } from "./add.js"
import type { ForkshopJson, Manifest } from "../manifest-schema.js"

function fakeManifest(): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    bundles: {
      primitives: { kind: "primitive", items: [], deps: [] },
      "kits/extra": {
        kind: "kit",
        items: ["@forkshop/kits/extra"],
        deps: ["lodash@^4"],
      },
    },
    files: {
      "@forkshop/kits/extra": {
        kind: "text",
        ext: "tsx",
        content: "export const Extra = () => null",
      },
    },
  }
}

async function setupInstalledProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-add-"))
  await fs.mkdir(path.join(root, "app"))
  await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })
  )
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
    files: {},
  }
  await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(forkshopJson, null, 2))
  return root
}

describe("runAdd", () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("adds a kit and updates forkshop.json", async () => {
    const root = await setupInstalledProject()
    dirs.push(root)
    const result = await runAdd({
      projectRoot: root,
      bundleName: "kits/extra",
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(true)
    expect(await fs.readFile(path.join(root, "components/forkshop/kits/extra.tsx"), "utf8")).toContain("Extra")
    const forkshopJson = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(forkshopJson.installedBundles).toContain("kits/extra")
    expect(forkshopJson.files["@forkshop/kits/extra"]).toBeDefined()
  })

  it("refuses without a forkshop.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-add-"))
    dirs.push(root)
    const result = await runAdd({
      projectRoot: root,
      bundleName: "kits/extra",
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/Run `forkshop init`/)
  })

  it("rejects an unknown bundle name with a list of valid names", async () => {
    const root = await setupInstalledProject()
    dirs.push(root)
    const result = await runAdd({
      projectRoot: root,
      bundleName: "kits/missing",
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/Unknown bundle/i)
  })

  it("refuses to re-install a bundle already in installedBundles", async () => {
    const root = await setupInstalledProject()
    dirs.push(root)
    const result = await runAdd({
      projectRoot: root,
      bundleName: "primitives",
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/already installed/i)
  })
})
