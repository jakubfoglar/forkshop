import { describe, it, expect } from "vitest"
import { defineLayout } from "@forkshop/lib/define-layout"
import { forkshopIcons } from "@forkshop/lib/icons"

describe("defineLayout", () => {
  it("returns a Layout object with id, icon, defaultOptions, render, stageSize", () => {
    const layout = defineLayout<{ orbit: number }>({
      id: "x",
      icon: forkshopIcons.flows,
      defaultOptions: { orbit: 100 },
      render: () => null,
      stageSize: () => ({ width: 800, height: 600 }),
    })
    expect(layout.id).toBe("x")
    expect(layout.defaultOptions.orbit).toBe(100)
    expect(layout.stageSize([], { orbit: 0 })).toEqual({ width: 800, height: 600 })
  })
})
