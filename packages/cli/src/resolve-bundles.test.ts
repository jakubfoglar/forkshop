import { describe, expect, it } from "vitest"
import { resolveBundles } from "./resolve-bundles.js"
import type { Manifest } from "./manifest-schema.js"

function fakeManifest(): Manifest {
  return {
    version: "1.0.0",
    generatedAt: "2026-05-13T10:00:00Z",
    registryBaseUrl: "https://fogma.dev/r/",
    bundles: {
      a: { kind: "primitive", items: ["@fogma/lib/foo"], deps: ["clsx@^2"] },
      b: { kind: "kit", items: ["@fogma/kits/bar"], deps: [] },
      c: { kind: "kit", items: ["@fogma/kits/bar", "@fogma/kits/baz"] },
      all: { kind: "composite", includes: ["a", "b"] },
    },
    files: {
      "@fogma/lib/foo": { kind: "text", ext: "ts", content: "" },
      "@fogma/kits/bar": { kind: "text", ext: "tsx", content: "" },
      "@fogma/kits/baz": { kind: "text", ext: "tsx", content: "" },
    },
  }
}

describe("resolveBundles", () => {
  it("resolves a single primitive bundle", () => {
    const result = resolveBundles(fakeManifest(), ["a"])
    expect(result.fileAddresses).toEqual(["@fogma/lib/foo"])
    expect(result.deps).toEqual(["clsx@^2"])
  })

  it("dedupes overlapping items across bundles", () => {
    const result = resolveBundles(fakeManifest(), ["b", "c"])
    expect(result.fileAddresses.sort()).toEqual(["@fogma/kits/bar", "@fogma/kits/baz"])
  })

  it("flattens a composite bundle", () => {
    const result = resolveBundles(fakeManifest(), ["all"])
    expect(result.fileAddresses.sort()).toEqual(["@fogma/kits/bar", "@fogma/lib/foo"])
    expect(result.deps).toEqual(["clsx@^2"])
  })

  it("throws for an unknown bundle", () => {
    expect(() => resolveBundles(fakeManifest(), ["nope"])).toThrow(/unknown bundle/i)
  })
})
