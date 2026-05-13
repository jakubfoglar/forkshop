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
        items: ["@fogma/lib/foo"],
        deps: ["clsx@^2.0.0"],
      },
      "kits/iframe-gallery": {
        kind: "kit",
        items: ["@fogma/kits/iframe-gallery"],
      },
      "css-and-config": {
        kind: "asset",
        items: ["@fogma/css/fogma"],
      },
      init: {
        kind: "composite",
        includes: ["primitives", "kits/iframe-gallery", "css-and-config"],
      },
    },
    files: {
      "@fogma/lib/foo": {
        kind: "text",
        ext: "ts",
        content: "export const foo = 1",
      },
      "@fogma/kits/iframe-gallery": {
        kind: "text",
        ext: "tsx",
        content: `import { foo } from "@fogma/lib/foo"\nexport const Gallery = () => foo`,
      },
      "@fogma/css/fogma": {
        kind: "text",
        ext: "css",
        content: "/* fogma styles */",
        destOverride: "{aliases.mount}/fogma.css",
      },
    },
  }
}

async function setupProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-init-"))
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

  it("copies all init bundle files, writes fogma.json, prints a summary", async () => {
    const root = await setupProject()
    dirs.push(root)
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      noInstall: true,
    })
    expect(result.ok).toBe(true)

    expect(await fs.readFile(path.join(root, "lib/fogma/foo.ts"), "utf8")).toBe("export const foo = 1")
    const gallery = await fs.readFile(
      path.join(root, "components/fogma/kits/iframe-gallery.tsx"),
      "utf8"
    )
    expect(gallery).toContain('from "@/lib/fogma/foo"')
    expect(await fs.readFile(path.join(root, "app/fogma/fogma.css"), "utf8")).toBe("/* fogma styles */")

    const fogmaJsonText = await fs.readFile(path.join(root, "fogma.json"), "utf8")
    const fogmaJson = JSON.parse(fogmaJsonText)
    expect(fogmaJson.registryVersion).toBe("1.0.0")
    expect(fogmaJson.installedBundles).toContain("primitives")
    expect(fogmaJson.files["@fogma/lib/foo"].dest).toBe("lib/fogma/foo.ts")
  })

  it("refuses if fogma.json already exists", async () => {
    const root = await setupProject()
    dirs.push(root)
    await fs.writeFile(path.join(root, "fogma.json"), "{}")
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
    await fs.mkdir(path.join(root, "lib/fogma"), { recursive: true })
    await fs.writeFile(path.join(root, "lib/fogma/foo.ts"), "// pre-existing")
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
    await fs.mkdir(path.join(root, "lib/fogma"), { recursive: true })
    await fs.writeFile(path.join(root, "lib/fogma/foo.ts"), "// pre-existing")
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      noInstall: true,
      force: true,
    })
    expect(result.ok).toBe(true)
    expect(await fs.readFile(path.join(root, "lib/fogma/foo.ts"), "utf8")).toBe("export const foo = 1")
  })
})
