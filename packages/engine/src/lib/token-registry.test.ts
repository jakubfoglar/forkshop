import { describe, it, expect } from "vitest"
import type { Config } from "tailwindcss"
import { buildTokenRegistry } from "@forkshop/lib/token-registry"

const sampleConfig: Config = {
  content: [],
  theme: {
    colors: {
      blue: { 500: "#3b82f6", 600: "#2563eb" },
      red: "#ef4444",
    },
    spacing: { "4": "1rem", "8": "2rem" },
    fontSize: { sm: "0.875rem", base: "1rem" },
  },
}

describe("buildTokenRegistry", () => {
  it("flattens nested color tokens", () => {
    const { entries, classLookup } = (() => {
      const reg = buildTokenRegistry(sampleConfig)
      return { entries: reg.colors, classLookup: reg.classLookup }
    })()
    const blue500 = entries.find((e) => e.name === "blue-500")
    expect(blue500).toBeDefined()
    if (blue500?.kind !== "color") throw new Error("expected color entry")
    expect(blue500.hex).toBe("#3b82f6")
    expect(classLookup["bg-blue-500"]?.entry).toBe(blue500)
  })

  it("handles flat color tokens", () => {
    const reg = buildTokenRegistry(sampleConfig)
    const entry = reg.classLookup["bg-red"]?.entry
    if (entry?.kind !== "color") throw new Error("expected color entry")
    expect(entry.hex).toBe("#ef4444")
  })

  it("indexes spacing classes", () => {
    const reg = buildTokenRegistry(sampleConfig)
    expect(reg.classLookup["p-4"]?.entry).toBeDefined()
    if (reg.classLookup["p-4"]?.entry.kind !== "spacing") throw new Error("expected spacing")
    expect(reg.classLookup["p-4"]?.entry.rem).toBe("1rem")
    expect(reg.classLookup["size-8"]?.entry).toBeDefined()
    if (reg.classLookup["size-8"]?.entry.kind !== "spacing") throw new Error("expected spacing")
    expect(reg.classLookup["size-8"]?.entry.rem).toBe("2rem")
  })

  it("indexes font sizes", () => {
    const reg = buildTokenRegistry(sampleConfig)
    const entry = reg.classLookup["text-base"]?.entry
    if (entry?.kind !== "fontSize") throw new Error("expected fontSize")
    expect(entry.value).toBe("1rem")
  })

  it("filters forkshop-* tokens by default", () => {
    const registry = buildTokenRegistry({
      content: [],
      theme: {
        colors: {
          brand: "#abcdef",
          "forkshop-accent": "#fefefe",
        },
        spacing: { "4": "1rem", "forkshop-gutter": "1.5rem" },
        borderRadius: { md: "0.375rem", "forkshop-card": "0.75rem" },
      },
    })
    const colorNames = registry.colors.map((entry) => entry.name)
    expect(colorNames).toContain("brand")
    expect(colorNames).not.toContain("forkshop-accent")

    const spacingNames = registry.spacing.map((entry) => entry.name)
    expect(spacingNames).toContain("4")
    expect(spacingNames).not.toContain("forkshop-gutter")

    const radiusNames = registry.radii.map((entry) => entry.name)
    expect(radiusNames).toContain("md")
    expect(radiusNames).not.toContain("forkshop-card")
  })

  it("includes forkshop-* tokens when opted in", () => {
    const registry = buildTokenRegistry(
      {
        content: [],
        theme: {
          colors: {
            brand: "#abcdef",
            "forkshop-accent": "#fefefe",
          },
        },
      },
      { includeForkshopTokens: true },
    )
    expect(registry.colors.map((entry) => entry.name)).toContain("forkshop-accent")
  })

  it("filters tokens whose family is forkshop", () => {
    const registry = buildTokenRegistry({
      content: [],
      theme: {
        colors: {
          forkshop: { accent: "#fefefe", canvas: "#111111" },
          brand: { 500: "#abcdef" },
        },
      },
    })
    const names = registry.colors.map((entry) => entry.name)
    expect(names).toContain("brand-500")
    expect(names).not.toContain("forkshop-accent")
    expect(names).not.toContain("forkshop-canvas")
  })
})
