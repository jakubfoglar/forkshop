import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runInit } from "./init.js"
import type { Manifest } from "../manifest-schema.js"

function fakeManifest(): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    bundles: {
      primitives: {
        kind: "primitive",
        items: ["@forkshop/lib/foo"],
        deps: ["clsx@^2.0.0"],
      },
      "kits/iframe-gallery": {
        kind: "kit",
        items: ["@forkshop/kits/iframe-gallery"],
      },
      "css-and-config": {
        kind: "asset",
        items: ["@forkshop/css/forkshop"],
      },
      init: {
        kind: "composite",
        includes: ["primitives", "kits/iframe-gallery", "css-and-config"],
      },
    },
    files: {
      "@forkshop/lib/foo": {
        kind: "text",
        ext: "ts",
        content: "export const foo = 1",
      },
      "@forkshop/kits/iframe-gallery": {
        kind: "text",
        ext: "tsx",
        content: `import { foo } from "@forkshop/lib/foo"\nexport const Gallery = () => foo`,
      },
      "@forkshop/css/forkshop": {
        kind: "text",
        ext: "css",
        content: "/* forkshop styles */",
        destOverride: "{aliases.mount}/forkshop.css",
      },
    },
  }
}

async function setupProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-init-"))
  await fs.mkdir(path.join(root, "app"))
  await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })
  )
  return root
}

describe("runInit", () => {
  const dirs: string[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("copies all init bundle files, writes forkshop.json, prints a summary", async () => {
    const root = await setupProject()
    dirs.push(root)
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(true)

    expect(await fs.readFile(path.join(root, "lib/forkshop/foo.ts"), "utf8")).toBe("export const foo = 1")
    const gallery = await fs.readFile(
      path.join(root, "components/forkshop/kits/iframe-gallery.tsx"),
      "utf8"
    )
    expect(gallery).toContain('from "@/lib/forkshop/foo"')
    expect(await fs.readFile(path.join(root, "app/forkshop/forkshop.css"), "utf8")).toBe("/* forkshop styles */")

    const forkshopJsonText = await fs.readFile(path.join(root, "forkshop.json"), "utf8")
    const forkshopJson = JSON.parse(forkshopJsonText)
    expect(forkshopJson.registryVersion).toBe("1.0.0")
    expect(forkshopJson.installedBundles).toContain("primitives")
    expect(forkshopJson.files["@forkshop/lib/foo"].dest).toBe("lib/forkshop/foo.ts")
  })

  it("refuses if forkshop.json already exists", async () => {
    const root = await setupProject()
    dirs.push(root)
    await fs.writeFile(path.join(root, "forkshop.json"), "{}")
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/already installed/i)
  })

  it("refuses on collision with an existing file (without --force)", async () => {
    const root = await setupProject()
    dirs.push(root)
    await fs.mkdir(path.join(root, "lib/forkshop"), { recursive: true })
    await fs.writeFile(path.join(root, "lib/forkshop/foo.ts"), "// pre-existing")
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/conflict/i)
  })

  it("overwrites with --force", async () => {
    const root = await setupProject()
    dirs.push(root)
    await fs.mkdir(path.join(root, "lib/forkshop"), { recursive: true })
    await fs.writeFile(path.join(root, "lib/forkshop/foo.ts"), "// pre-existing")
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      noInstall: true,
      force: true,
    })
    expect(result.ok).toBe(true)
    expect(await fs.readFile(path.join(root, "lib/forkshop/foo.ts"), "utf8")).toBe("export const foo = 1")
  })
})
