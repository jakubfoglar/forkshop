import { describe, it, expect } from "vitest"
import { detectBoardExport } from "./check-boards.js"

describe("detectBoardExport", () => {
  it("detects a defineBoard default export", () => {
    const src = `
import { defineBoard } from "@forkshop/engine"
export default defineBoard({ id: "x", match: () => true, layout: "gallery", useEntries: () => [] })
`
    expect(detectBoardExport(src)).toEqual({ kind: "defineBoard", boardId: "x" })
  })
  it("returns 'raw-component' when default export is a function component without defineBoard", () => {
    const src = `export default function MyBoard() { return null }`
    expect(detectBoardExport(src)).toEqual({ kind: "raw-component" })
  })
  it("returns 'unknown' when no default export is present", () => {
    expect(detectBoardExport("const x = 1")).toEqual({ kind: "unknown" })
  })
})
