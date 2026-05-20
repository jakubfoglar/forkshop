import { describe, it, expect } from "vitest"
import { buildDemoUrl } from "./build-demo-url"

describe("buildDemoUrl", () => {
  it("returns /demo with no params for empty state", () => {
    expect(buildDemoUrl({})).toBe("/demo")
  })

  it("encodes viewport, zoom, pan", () => {
    expect(
      buildDemoUrl({
        viewport: "responsive",
        canvas: { zoom: 0.8, pan: { x: -100, y: -50 } },
      }),
    ).toBe("/demo?viewport=responsive&zoom=0.8&panX=-100&panY=-50")
  })

  it("encodes selection into the hash", () => {
    expect(
      buildDemoUrl({ selection: { kind: "block", slug: "hero" } }),
    ).toContain("#")
  })

  it("encodes agents as comma-separated entries", () => {
    expect(
      buildDemoUrl({
        agents: [
          { kind: "file", path: "components/blocks/hero.tsx" },
          { kind: "page", path: "/about" },
        ],
      }),
    ).toBe("/demo?agents=file:components/blocks/hero.tsx,page:/about")
  })
})
