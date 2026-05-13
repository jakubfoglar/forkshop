import { describe, expect, it } from "vitest"
import { resolveBundles } from "./resolve-bundles.js"
import type { Manifest } from "./manifest-schema.js"

function fakeManifest(): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://forkshop.dev/r/",
    bundles: {
      a: { kind: "primitive", items: ["@forkshop/lib/foo"], deps: ["clsx@^2"] },
      b: { kind: "kit", items: ["@forkshop/kits/bar"], deps: [] },
      c: { kind: "kit", items: ["@forkshop/kits/bar", "@forkshop/kits/baz"] },
      all: { kind: "composite", includes: ["a", "b"] },
    },
    files: {
      "@forkshop/lib/foo": { kind: "text", ext: "ts", content: "" },
      "@forkshop/kits/bar": { kind: "text", ext: "tsx", content: "" },
      "@forkshop/kits/baz": { kind: "text", ext: "tsx", content: "" },
    },
  }
}

describe("resolveBundles", () => {
  it("resolves a single primitive bundle", () => {
    const result = resolveBundles(fakeManifest(), ["a"])
    expect(result.fileAddresses).toEqual(["@forkshop/lib/foo"])
    expect(result.deps).toEqual(["clsx@^2"])
  })

  it("dedupes overlapping items across bundles", () => {
    const result = resolveBundles(fakeManifest(), ["b", "c"])
    expect(result.fileAddresses.sort()).toEqual(["@forkshop/kits/bar", "@forkshop/kits/baz"])
  })

  it("flattens a composite bundle", () => {
    const result = resolveBundles(fakeManifest(), ["all"])
    expect(result.fileAddresses.sort()).toEqual(["@forkshop/kits/bar", "@forkshop/lib/foo"])
    expect(result.deps).toEqual(["clsx@^2"])
  })

  it("throws for an unknown bundle", () => {
    expect(() => resolveBundles(fakeManifest(), ["nope"])).toThrow(/unknown bundle/i)
  })
})
