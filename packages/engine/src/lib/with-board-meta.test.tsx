import { describe, it, expect } from "vitest"
import { withBoardMeta } from "@forkshop/lib/with-board-meta"

describe("withBoardMeta", () => {
  it("attaches __config, __isBoard, and __rawRender to the component", () => {
    function ExoticBoard() { return null }
    const Board = withBoardMeta(ExoticBoard, {
      id: "exotic",
      label: "Exotic",
      match: (s) => s.kind === "section" && s.sectionId === "exotic",
    })
    expect(Board.__isBoard).toBe(true)
    expect(Board.__rawRender).toBe(true)
    expect(Board.__config.id).toBe("exotic")
    expect(Board.__config.label).toBe("Exotic")
  })

  it("fills layout and useEntries with no-op defaults so the registry can dispatch", () => {
    function X() { return null }
    const Board = withBoardMeta(X, {
      id: "x",
      match: () => true,
    })
    expect(Board.__config.layout).toBe("gallery")
    expect(Board.__config.useEntries()).toEqual([])
  })

  it("honors caller-supplied layout and useEntries", () => {
    function Y() { return null }
    const useEntries = () => []
    const Board = withBoardMeta(Y, {
      id: "y",
      match: () => true,
      layout: "tree",
      useEntries,
    })
    expect(Board.__config.layout).toBe("tree")
    expect(Board.__config.useEntries).toBe(useEntries)
  })

  it("metadata properties are non-enumerable", () => {
    function Z() { return null }
    const Board = withBoardMeta(Z, { id: "z", match: () => true })
    expect(Object.keys(Board)).not.toContain("__config")
    expect(Object.keys(Board)).not.toContain("__isBoard")
    expect(Object.keys(Board)).not.toContain("__rawRender")
  })
})
