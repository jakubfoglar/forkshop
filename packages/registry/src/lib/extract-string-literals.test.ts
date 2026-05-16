import { describe, it, expect } from "vitest"
import { extractStringLiterals, resolveJsxTextSpan } from "@forkshop/lib/extract-string-literals"

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

describe("extractStringLiterals — JSX text children", () => {
  it("captures JSX text between tags", () => {
    const set = extractStringLiterals(`<h1>Welcome to Acme</h1>`)
    expect(set.has("Welcome to Acme")).toBe(true)
  })

  it("decodes common HTML entities", () => {
    const set = extractStringLiterals(`<p>We&apos;re building &amp; shipping &quot;the thing&quot;</p>`)
    expect(set.has("We're building & shipping \"the thing\"")).toBe(true)
  })

  it("normalizes multi-line indented JSX text into one whitespace-joined string", () => {
    const source = `
      <p>
        We're a small team building tools
        that help product teams ship.
      </p>`
    const set = extractStringLiterals(source)
    expect(set.has("We're a small team building tools that help product teams ship.")).toBe(true)
  })

  it("does not capture JSX expressions in text content", () => {
    const set = extractStringLiterals(`<h1>Hello {name}</h1>`)
    // The {name} interpolation should NOT appear in the set.
    expect(set.has("Hello {name}")).toBe(false)
    // The static prefix "Hello" gets cut at the `{` — that's fine; it just
    // won't match any rendered DOM text either.
  })

  it("does not capture whitespace-only JSX text", () => {
    const set = extractStringLiterals(`<div>\n  \n</div>`)
    expect(set.size).toBe(0)
  })
})

describe("resolveJsxTextSpan", () => {
  it("returns the verbatim source span for a JSX text whose normalized form matches", () => {
    const source = `<p>\n  We&apos;re a small team\n  building tools.\n</p>`
    const span = resolveJsxTextSpan(source, "We're a small team building tools.")
    expect(span).toBe("\n  We&apos;re a small team\n  building tools.\n")
  })

  it("returns undefined when no JSX text span normalizes to the target", () => {
    const source = `<h1>Welcome</h1>`
    expect(resolveJsxTextSpan(source, "Not here")).toBeUndefined()
  })

  it("returns undefined for empty target", () => {
    expect(resolveJsxTextSpan(`<p>foo</p>`, "")).toBeUndefined()
  })

  it("finds the span even with HTML entity differences", () => {
    const source = `<p>Hello &amp; goodbye</p>`
    const span = resolveJsxTextSpan(source, "Hello & goodbye")
    expect(span).toBe("Hello &amp; goodbye")
  })
})
