import { describe, expect, it } from "vitest"
import { unifiedDiff } from "./unified-diff.js"

describe("unifiedDiff", () => {
  it("returns empty string for identical input", () => {
    expect(unifiedDiff("a\nb\nc\n", "a\nb\nc\n", { from: "x", to: "y" })).toBe("")
  })

  it("emits a header + line-prefixed change for a single replaced line", () => {
    const out = unifiedDiff("a\nb\nc\n", "a\nBETA\nc\n", { from: "old", to: "new" })
    expect(out).toContain("--- old")
    expect(out).toContain("+++ new")
    expect(out).toContain("-b")
    expect(out).toContain("+BETA")
  })

  it("emits both lines for an addition", () => {
    const out = unifiedDiff("a\n", "a\nb\n", { from: "old", to: "new" })
    expect(out).toContain("+b")
  })

  it("emits a removal correctly", () => {
    const out = unifiedDiff("a\nb\n", "a\n", { from: "old", to: "new" })
    expect(out).toContain("-b")
  })
})
