import { describe, it, expect } from "vitest"
import { parseTokenRegistryFromCssVars } from "@forkshop/lib/use-token-registry-from-css"

describe("parseTokenRegistryFromCssVars", () => {
  it("returns empty registry for empty input", () => {
    const r = parseTokenRegistryFromCssVars([])
    expect(r.colors).toEqual([])
    expect(r.spacing).toEqual([])
    expect(r.fontSizes).toEqual([])
    expect(r.fontWeights).toEqual([])
    expect(r.radii).toEqual([])
    expect(r.shadows).toEqual([])
    expect(r.containers).toEqual([])
    expect(r.classLookup).toEqual({})
  })

  it("parses --color-* into colors entries", () => {
    const r = parseTokenRegistryFromCssVars([
      ["--color-primary", "oklch(0.55 0.18 250)"],
      ["--color-background-muted", "#f5f5f5"],
    ])
    expect(r.colors).toHaveLength(2)
    expect(r.colors[0]).toMatchObject({ kind: "color", name: "primary", hex: "oklch(0.55 0.18 250)" })
    expect(r.colors[1]).toMatchObject({ kind: "color", name: "background-muted", hex: "#f5f5f5" })
    expect(r.colors[1]?.kind === "color" ? r.colors[1].isSemantic : false).toBe(true)
  })

  it("parses --spacing-* into spacing entries", () => {
    const r = parseTokenRegistryFromCssVars([
      ["--spacing-1", "0.25rem"],
      ["--spacing-4", "1rem"],
    ])
    expect(r.spacing).toHaveLength(2)
    expect(r.spacing[0]).toMatchObject({ kind: "spacing", name: "1", rem: "0.25rem" })
  })

  it("parses --radius-*, --shadow-*, --font-weight-*", () => {
    const r = parseTokenRegistryFromCssVars([
      ["--radius-md", "0.5rem"],
      ["--shadow-md", "0 1px 3px rgba(0,0,0,0.1)"],
      ["--font-weight-bold", "700"],
    ])
    expect(r.radii[0]).toMatchObject({ kind: "radius", name: "md", value: "0.5rem" })
    expect(r.shadows[0]).toMatchObject({ kind: "shadow", name: "md" })
    expect(r.fontWeights[0]).toMatchObject({ kind: "fontWeight", name: "bold", weight: 700 })
  })

  it("parses both --font-size-* and --text-* into fontSizes", () => {
    const r = parseTokenRegistryFromCssVars([
      ["--font-size-base", "1rem"],
      ["--text-lg", "1.125rem"],
    ])
    expect(r.fontSizes).toHaveLength(2)
    expect(r.fontSizes[0]).toMatchObject({ name: "base" })
    expect(r.fontSizes[1]).toMatchObject({ name: "lg" })
  })

  it("ignores unrelated properties", () => {
    const r = parseTokenRegistryFromCssVars([
      ["--color-primary", "blue"],
      ["--breakpoint-md", "768px"],
      ["--ease-out", "cubic-bezier(0,0,0.2,1)"],
      ["color", "red"], // not a custom property
    ])
    expect(r.colors).toHaveLength(1)
    expect(r.spacing).toHaveLength(0)
  })

  it("skips properties with empty values", () => {
    const r = parseTokenRegistryFromCssVars([
      ["--color-primary", ""],
      ["--color-secondary", "blue"],
    ])
    expect(r.colors).toHaveLength(1)
    expect(r.colors[0]?.name).toBe("secondary")
  })

  it("trims whitespace from values", () => {
    const r = parseTokenRegistryFromCssVars([["--color-primary", "  blue  "]])
    expect(r.colors[0]?.kind === "color" ? r.colors[0].hex : "").toBe("blue")
  })

  it("falls back to weight 400 when --font-weight-* value isn't numeric", () => {
    const r = parseTokenRegistryFromCssVars([["--font-weight-normal", "bold"]])
    expect(r.fontWeights[0]).toMatchObject({ kind: "fontWeight", name: "normal", weight: 400 })
  })
})
