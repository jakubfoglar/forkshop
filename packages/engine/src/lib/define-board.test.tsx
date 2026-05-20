import { describe, it, expect } from "vitest"
import { defineBoard } from "@forkshop/lib/define-board"

describe("defineBoard", () => {
  it("returns a Component with __config and __isBoard attached", () => {
    const Board = defineBoard({
      id: "test",
      label: "Test",
      match: (s) => s.kind === "section" && s.sectionId === "test",
      layout: "gallery",
      useEntries: () => [],
    })
    expect(Board.__isBoard).toBe(true)
    expect(Board.__config.id).toBe("test")
    expect(Board.__config.label).toBe("Test")
  })

  it("throws BoardConfigError when id is missing", () => {
    expect(() =>
      defineBoard({
        id: "",
        match: () => true,
        layout: "gallery",
        useEntries: () => [],
      })
    ).toThrowError(/BoardConfigError/)
  })

  it("throws BoardConfigError when match is not a function", () => {
    expect(() =>
      defineBoard({
        id: "x",
        // @ts-expect-error -- testing bad shape
        match: "not a function",
        layout: "gallery",
        useEntries: () => [],
      })
    ).toThrowError(/match/)
  })

  it("throws BoardConfigError when useEntries is not a function", () => {
    expect(() =>
      defineBoard({
        id: "x",
        match: () => true,
        layout: "gallery",
        // @ts-expect-error -- testing bad shape
        useEntries: undefined,
      })
    ).toThrowError(/useEntries/)
  })

  it("throws BoardConfigError when layout is missing", () => {
    expect(() =>
      defineBoard({
        id: "x",
        match: () => true,
        // @ts-expect-error -- testing bad shape
        layout: undefined,
        useEntries: () => [],
      })
    ).toThrowError(/layout/)
  })

  it("__config and __isBoard are not enumerable", () => {
    const Board = defineBoard({
      id: "y",
      match: () => true,
      layout: "gallery",
      useEntries: () => [],
    })
    expect(Object.keys(Board)).not.toContain("__config")
    expect(Object.keys(Board)).not.toContain("__isBoard")
  })
})
