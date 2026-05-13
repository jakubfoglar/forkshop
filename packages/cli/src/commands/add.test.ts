import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { runAdd } from "./add.js"
import type { FogmaJson, Manifest } from "../manifest-schema.js"

function fakeManifest(): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    bundles: {
      primitives: { kind: "primitive", items: [], deps: [] },
      "kits/extra": {
        kind: "kit",
        items: ["@fogma/kits/extra"],
        deps: ["lodash@^4"],
      },
    },
    files: {
      "@fogma/kits/extra": {
        kind: "text",
        ext: "tsx",
        content: "export const Extra = () => null",
      },
    },
  }
}

async function setupInstalledProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-add-"))
  await fs.mkdir(path.join(root, "app"))
  await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })
  )
  const fogmaJson: FogmaJson = {
    registryVersion: "1.0.0",
    installedAt: "2026-05-13T10:00:00Z",
    registryUrl: "https://fogma.dev/r/",
    aliases: {
      base: "@/",
      components: "@/components/fogma",
      kits: "@/components/fogma/kits",
      hooks: "@/lib/fogma/hooks",
      lib: "@/lib/fogma",
      api: "@/app/api/fogma",
      tailwind: "@/lib/fogma/tailwind",
      mount: "@/app/fogma",
    },
    installedBundles: ["primitives"],
    files: {},
  }
  await fs.writeFile(path.join(root, "fogma.json"), JSON.stringify(fogmaJson, null, 2))
  return root
}

describe("runAdd", () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("adds a kit and updates fogma.json", async () => {
    const root = await setupInstalledProject()
    dirs.push(root)
    const result = await runAdd({
      projectRoot: root,
      bundleName: "kits/extra",
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(true)
    expect(await fs.readFile(path.join(root, "components/fogma/kits/extra.tsx"), "utf8")).toContain("Extra")
    const fogmaJson = JSON.parse(await fs.readFile(path.join(root, "fogma.json"), "utf8"))
    expect(fogmaJson.installedBundles).toContain("kits/extra")
    expect(fogmaJson.files["@fogma/kits/extra"]).toBeDefined()
  })

  it("refuses without a fogma.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-add-"))
    dirs.push(root)
    const result = await runAdd({
      projectRoot: root,
      bundleName: "kits/extra",
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/Run `fogma init`/)
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
