import { describe, it, expect } from "vitest"
import { responsiveFrameEntries } from "@forkshop/lib/responsive-frame-entries"

describe("responsiveFrameEntries", () => {
  it("returns one entry per viewport width", () => {
    const entries = responsiveFrameEntries("/about", {
      viewports: [1440, 768, 375],
      sourceFile: "app/about/page.tsx",
    })
    expect(entries).toHaveLength(3)
    const first = entries[0]
    expect(first?.node.kind).toBe("iframe-route")
    if (first?.node.kind === "iframe-route") {
      expect(first.node.routePath).toBe("/about")
      expect(first.node.width).toBe(1440)
    }
    const third = entries[2]
    if (third?.node.kind === "iframe-route") {
      expect(third.node.width).toBe(375)
    }
  })

  it("uses default viewports [1440, 768, 375] when none provided", () => {
    const entries = responsiveFrameEntries("/", { sourceFile: "app/page.tsx" })
    expect(entries).toHaveLength(3)
    const widths = entries.map((e) => (e.node.kind === "iframe-route" ? e.node.width : 0))
    expect(widths).toEqual([1440, 768, 375])
  })

  it("assigns row=0 and increasing column to entries", () => {
    const entries = responsiveFrameEntries("/about", {})
    expect(entries[0]?.row).toBe(0)
    expect(entries[1]?.row).toBe(0)
    expect(entries[2]?.row).toBe(0)
    expect(entries[0]?.column).toBe(0)
    expect(entries[1]?.column).toBe(1)
    expect(entries[2]?.column).toBe(2)
  })

  it('sets heightMode: "auto" so frames grow to body content', () => {
    const entries = responsiveFrameEntries("/about", {})
    for (const e of entries) {
      if (e.node.kind === "iframe-route") {
        expect(e.node.heightMode).toBe("auto")
      }
    }
  })
})
