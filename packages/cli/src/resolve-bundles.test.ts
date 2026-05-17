import { describe, expect, it } from "vitest"
import { resolveBundles } from "./resolve-bundles.js"
import type { Manifest } from "./manifest-schema.js"

function mkManifest(): Manifest {
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
        content: "// ...",
        destOverride: "app/api/forkshop/edit/route.ts",
      },
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content: "# setup",
        destOverride: ".claude/skills/forkshop-setup.md",
      },
      "@forkshop/templates/claude-md": {
        kind: "text",
        ext: "md",
        content: "# claude md",
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

describe("resolveBundles", () => {
  it("expands the init composite to all file addresses", () => {
    const resolved = resolveBundles(mkManifest(), ["init"])
    expect(resolved.fileAddresses).toEqual([
      "@forkshop/route-stubs/edit",
      "@forkshop/skill/setup",
      "@forkshop/templates/claude-md",
      "@forkshop/fonts/raveo/RaveoVF",
    ])
    expect(resolved.bundleNames).toEqual(["route-stubs", "skill", "claude-md", "font"])
  })

  it("resolves a single leaf bundle", () => {
    const resolved = resolveBundles(mkManifest(), ["skill"])
    expect(resolved.fileAddresses).toEqual(["@forkshop/skill/setup"])
    expect(resolved.bundleNames).toEqual(["skill"])
  })

  it("throws on unknown bundle name", () => {
    expect(() => resolveBundles(mkManifest(), ["nope"])).toThrow(/Unknown bundle/)
  })
})
