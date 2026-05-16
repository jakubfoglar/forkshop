import { describe, it, expect } from "vitest"
import { extractStringLiterals } from "@forkshop/lib/extract-string-literals"

describe("extractStringLiterals", () => {
  it("extracts double-quoted literals", () => {
    const out = extractStringLiterals(`const a = "hello"; const b = "world"`)
    expect(out.has("hello")).toBe(true)
    expect(out.has("world")).toBe(true)
  })

  it("extracts single-quoted literals", () => {
    const out = extractStringLiterals(`const x = 'foo'`)
    expect(out.has("foo")).toBe(true)
  })

  it("extracts simple backtick literals (no interpolations)", () => {
    const out = extractStringLiterals("const x = `hello world`")
    expect(out.has("hello world")).toBe(true)
  })

  it("skips backtick literals that contain ${...}", () => {
    const out = extractStringLiterals("const x = `Hello ${name}`")
    expect(out.has("Hello ${name}")).toBe(false)
  })

  it("ignores escaped quotes inside literals", () => {
    const out = extractStringLiterals(`const x = "She said \\"hi\\""`)
    expect(out.has("She said \\\"hi\\\"")).toBe(false)
    expect(out.has("She said \"hi\"")).toBe(false)
  })

  it("returns an empty Set for empty input", () => {
    expect(extractStringLiterals("").size).toBe(0)
  })

  it("deduplicates repeated literals", () => {
    const out = extractStringLiterals(`const a = "x"; const b = "x"`)
    expect(out.size).toBe(1)
  })

  it("trims surrounding whitespace inside the literal value", () => {
    const out = extractStringLiterals(`<h1 headline="  Welcome  " />`)
    expect(out.has("Welcome")).toBe(true)
  })
})
