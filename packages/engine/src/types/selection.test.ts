import { describe, it, expect } from "vitest"
import {
  isSectionSelection, isPageSelection, isPrimitiveSelection,
  isBlockSelection, isCustomSelection,
  type ForkshopSelection,
} from "@forkshop/types/selection"

describe("selection guards", () => {
  it("narrows custom selection by namespace", () => {
    const s: ForkshopSelection = { kind: "custom", namespace: "charts", data: { id: "x" } }
    expect(isCustomSelection(s)).toBe(true)
    expect(isCustomSelection(s) && s.namespace).toBe("charts")
  })
  it("rejects custom guard on non-custom kinds", () => {
    const s: ForkshopSelection = { kind: "page", path: "/" }
    expect(isCustomSelection(s)).toBe(false)
  })
  it("narrows section selection", () => {
    const s: ForkshopSelection = { kind: "section", sectionId: "nav" }
    expect(isSectionSelection(s)).toBe(true)
    expect(isPageSelection(s)).toBe(false)
  })
  it("narrows page selection", () => {
    const s: ForkshopSelection = { kind: "page", path: "/about" }
    expect(isPageSelection(s)).toBe(true)
    expect(isSectionSelection(s)).toBe(false)
  })
  it("narrows block selection", () => {
    const s: ForkshopSelection = { kind: "block", slug: "hero" }
    expect(isBlockSelection(s)).toBe(true)
    expect(isPrimitiveSelection(s)).toBe(false)
  })
  it("narrows primitive selection", () => {
    const s: ForkshopSelection = { kind: "primitive", id: "button" }
    expect(isPrimitiveSelection(s)).toBe(true)
    expect(isBlockSelection(s)).toBe(false)
  })
})
