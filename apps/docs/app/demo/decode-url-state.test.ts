import { describe, it, expect } from "vitest"
import { decodeUrlState } from "./decode-url-state"

describe("decodeUrlState", () => {
  it("returns defaults for empty search string", () => {
    expect(decodeUrlState("")).toEqual({
      viewport: undefined,
      zoom: undefined,
      pan: undefined,
      agents: [],
    })
  })

  it("decodes viewport=responsive", () => {
    expect(decodeUrlState("?viewport=responsive").viewport).toBe("responsive")
  })

  it("decodes zoom and pan from numeric params", () => {
    const state = decodeUrlState("?zoom=0.8&panX=-100&panY=-50")
    expect(state.zoom).toBe(0.8)
    expect(state.pan).toEqual({ x: -100, y: -50 })
  })

  it("decodes comma-separated agents", () => {
    const state = decodeUrlState("?agents=file:components/blocks/hero.tsx,page:/about")
    expect(state.agents).toEqual([
      { kind: "file", path: "components/blocks/hero.tsx" },
      { kind: "page", path: "/about" },
    ])
  })
})
