import { describe, it, expect } from "vitest"
import { discoverBlocks } from "@forkshop/lib/use-discovered-blocks"

const Hero = () => null
const FeatureGrid = () => null

describe("discoverBlocks", () => {
  it("returns PascalCase function exports as blocks", () => {
    const result = discoverBlocks({ Hero, FeatureGrid })
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ slug: "hero", name: "Hero" })
    expect(result[1]).toMatchObject({ slug: "feature-grid", name: "FeatureGrid" })
  })

  it("returns Component, name, and preview-src convention", () => {
    const result = discoverBlocks({ Hero })
    expect(result[0]?.Component).toBe(Hero)
    expect(result[0]?.previewSrc).toBe("/forkshop/block/hero")
  })

  it("returns empty array for empty barrel", () => {
    expect(discoverBlocks({})).toEqual([])
  })
})
