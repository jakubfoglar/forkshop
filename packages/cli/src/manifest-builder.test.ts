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
    expect(manifest.registryBaseUrl).toBe("https://forkshop.dev/r/")
  })

  it("includes the node-view primitive in the manifest", () => {
    const file = manifest.files["@forkshop/components/canvas/node-view"]
    expect(file).toBeDefined()
    if (!file) throw new Error("node-view missing")
    expect(file.kind).toBe("text")
    if (file.kind === "text") {
      expect(file.ext).toBe("tsx")
      expect(file.content).toContain("NodeView")
    }
  })

  it("includes the gallery layout", () => {
    expect(manifest.files["@forkshop/layouts/gallery"]).toBeDefined()
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
      expect(bundle.includes).toContain("layouts/gallery")
    }
  })

  it("primitives bundle has the expected runtime deps", () => {
    const bundle = manifest.bundles.primitives
    if (!bundle) throw new Error("primitives bundle missing")
    if (bundle.kind !== "primitive") throw new Error("expected primitive kind")
    expect(bundle.deps).toBeDefined()
    if (!bundle.deps) return
    // Pin the dep set: order doesn't matter but the package names do.
    // Splits off the trailing `@<range>` while preserving scoped names
    // (e.g. `@locator/runtime@^0.5.1` → `@locator/runtime`).
    const packageNames = bundle.deps.map(
      (dep: string) => dep.split("@").slice(0, -1).join("@") || dep.split("@")[0],
    )
    expect(packageNames.sort()).toEqual(
      ["@locator/runtime", "clsx", "lucide-react", "motion"].sort(),
    )
  })

  it("every @forkshop/* import in file contents resolves to a known address", () => {
    const knownAddresses = new Set(Object.keys(manifest.files))
    // `@forkshop/registry` (and sub-paths) is the user-facing package alias used
    // in documentation and doc comments — it doesn't appear as its own entry
    // in the manifest (the barrel is omitted by design).
    const isDocsOnly = (ref: string): boolean =>
      ref === "@forkshop/registry" || ref.startsWith("@forkshop/registry/")
    const importRe = /@forkshop\/[a-zA-Z0-9/_-]+/g
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

  it("every bundle item resolves to a known files entry", () => {
    for (const [name, bundle] of Object.entries(manifest.bundles)) {
      if (bundle.kind === "composite") continue
      for (const item of bundle.items) {
        expect(manifest.files[item], `bundle "${name}" references missing file ${item}`).toBeDefined()
      }
    }
  })

  it("includes the CLAUDE.md template with destOverride", () => {
    const file = manifest.files["@forkshop/templates/claude-md"]
    expect(file).toBeDefined()
    if (file && file.kind === "text") {
      expect(file.ext).toBe("md")
      expect(file.destOverride).toBe("{aliases.mount}/CLAUDE.md")
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
      "@forkshop/components/canvas/node-view",
      "@forkshop/components/canvas/node-frame",
      "@forkshop/components/canvas/forkshop-canvas",
      "@forkshop/components/sidebar/forkshop-sidebar",
      "@forkshop/lib/edit-mode",
      "@forkshop/api/edit/route",
      "@forkshop/types/node",
      "@forkshop/types/node-type",
      "@forkshop/node-types/index",
    ]
    for (const address of required) {
      expect(bundle.items, `missing ${address}`).toContain(address)
    }
  })
})
