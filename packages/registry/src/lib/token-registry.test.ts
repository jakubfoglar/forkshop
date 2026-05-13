import { describe, it, expect } from "vitest"
import type { Config } from "tailwindcss"
import { buildTokenRegistry } from "./token-registry.js"

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
})
