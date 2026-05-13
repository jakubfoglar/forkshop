import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it, beforeAll } from "vitest"
import { buildManifest } from "./manifest-builder.js"
import type { Manifest } from "./manifest-schema.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_ROOT = path.resolve(__dirname, "../../registry")

describe("buildManifest", () => {
  let manifest: Manifest

  beforeAll(async () => {
    manifest = await buildManifest({ registryRoot: REGISTRY_ROOT })
  })

  it("returns a valid top-level shape", () => {
    expect(manifest.version).toBe("1.0.0")
    expect(manifest.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(manifest.registryBaseUrl).toBe("https://fogma.dev/r/")
  })

  it("includes the canvas-node primitive in the manifest", () => {
    const file = manifest.files["@fogma/components/canvas/canvas-node"]
    expect(file).toBeDefined()
    if (!file) throw new Error("canvas-node missing")
    expect(file.kind).toBe("text")
    if (file.kind === "text") {
      expect(file.ext).toBe("tsx")
      expect(file.content).toContain("CanvasNode")
    }
  })

  it("includes the iframe-gallery kit", () => {
    expect(manifest.files["@fogma/kits/iframe-gallery"]).toBeDefined()
  })

  it("defines the primitives bundle with correct kind", () => {
    const bundle = manifest.bundles.primitives
    expect(bundle).toBeDefined()
    if (!bundle) throw new Error("primitives bundle missing")
    expect(bundle.kind).toBe("primitive")
  })

  it("defines the init composite bundle", () => {
    const bundle = manifest.bundles.init
    expect(bundle).toBeDefined()
    if (!bundle) throw new Error("init bundle missing")
    expect(bundle.kind).toBe("composite")
    if (bundle.kind === "composite") {
      expect(bundle.includes).toContain("primitives")
      expect(bundle.includes).toContain("kits/iframe-gallery")
    }
  })

  it("lists clsx + motion + iconoir-react as primitives deps", () => {
    const bundle = manifest.bundles.primitives
    if (!bundle) throw new Error("primitives bundle missing")
    if (bundle.kind === "primitive" || bundle.kind === "kit" || bundle.kind === "asset") {
      expect(bundle.deps).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^clsx@/),
          expect.stringMatching(/^motion@/),
          expect.stringMatching(/^iconoir-react@/),
        ])
      )
    }
  })

  it("every @fogma/* import in file contents resolves to a known address", () => {
    const knownAddresses = new Set(Object.keys(manifest.files))
    // `@fogma/registry` (and sub-paths) is the user-facing package alias used
    // in documentation and doc comments — it doesn't appear as its own entry
    // in the manifest (the barrel is omitted by design).
    const isDocsOnly = (ref: string): boolean =>
      ref === "@fogma/registry" || ref.startsWith("@fogma/registry/")
    const importRe = /@fogma\/[a-zA-Z0-9/_-]+/g
    for (const [address, file] of Object.entries(manifest.files)) {
      if (file.kind !== "text") continue
      // Markdown files are documentation, not imports — skip.
      if (file.ext === "md") continue
      const referenced = file.content.match(importRe) ?? []
      for (const ref of referenced) {
        if (isDocsOnly(ref)) continue
        expect(knownAddresses.has(ref), `${address} references ${ref} which is missing from manifest`).toBe(true)
      }
    }
  })

  it("primitives bundle items all have entries in files map", () => {
    const bundle = manifest.bundles.primitives
    if (!bundle) throw new Error("primitives bundle missing")
    if (bundle.kind !== "primitive") throw new Error("expected primitive kind")
    for (const item of bundle.items) {
      expect(manifest.files[item], `${item} missing from files`).toBeDefined()
    }
  })
})

describe("manifest snapshot", () => {
  it("primitives bundle items match the expected sorted list", async () => {
    const manifest = await buildManifest({ registryRoot: REGISTRY_ROOT })
    const bundle = manifest.bundles.primitives
    if (!bundle) throw new Error("primitives bundle missing")
    if (bundle.kind !== "primitive") throw new Error("kind mismatch")

    // Sanity-check: the primitives bundle should include the well-known core files.
    const required = [
      "@fogma/components/canvas/canvas-node",
      "@fogma/components/canvas/fogma-canvas",
      "@fogma/components/sidebar/fogma-sidebar",
      "@fogma/hooks/use-iframe-preview",
      "@fogma/lib/edit-mode",
      "@fogma/api/edit/route",
    ]
    for (const address of required) {
      expect(bundle.items, `missing ${address}`).toContain(address)
    }
  })
})
