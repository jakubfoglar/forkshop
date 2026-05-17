import { describe, it, expect } from "vitest"
import {
  deriveEntrySelection,
  isEntryActive,
  sectionAutoExpandMatch,
} from "@forkshop/components/sidebar/forkshop-sidebar"
import type { SidebarEntry } from "@forkshop/components/sidebar/forkshop-sidebar"

// ---------------------------------------------------------------------------
// deriveEntrySelection
// ---------------------------------------------------------------------------

describe("deriveEntrySelection — entryKind: 'page'", () => {
  it("emits a page selection when entryKind is 'page'", () => {
    expect(deriveEntrySelection("page", "/about")).toEqual({
      kind: "page",
      path: "/about",
    })
  })

  it("preserves 'block' behaviour unchanged", () => {
    expect(deriveEntrySelection("block", "hero")).toEqual({
      kind: "block",
      slug: "hero",
    })
  })

  it("preserves 'primitive' behaviour unchanged", () => {
    expect(deriveEntrySelection("primitive", "button")).toEqual({
      kind: "primitive",
      id: "button",
    })
  })
})

// ---------------------------------------------------------------------------
// isEntryActive
// ---------------------------------------------------------------------------

describe("isEntryActive — entryKind: 'page'", () => {
  it("returns true when selection.path matches the slug for a page entry", () => {
    expect(
      isEntryActive("page", { kind: "page", path: "/pricing" }, "/pricing"),
    ).toBe(true)
  })

  it("returns false when selection.path does not match", () => {
    expect(
      isEntryActive("page", { kind: "page", path: "/about" }, "/pricing"),
    ).toBe(false)
  })

  it("returns false when selection.kind is not 'page'", () => {
    expect(
      isEntryActive("page", { kind: "block", slug: "/pricing" }, "/pricing"),
    ).toBe(false)
  })

  it("block branch still returns true on slug match", () => {
    expect(
      isEntryActive("block", { kind: "block", slug: "hero" }, "hero"),
    ).toBe(true)
  })

  it("primitive branch still returns true on id match", () => {
    expect(
      isEntryActive("primitive", { kind: "primitive", id: "button" }, "button"),
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// sectionAutoExpandMatch
// ---------------------------------------------------------------------------

describe("sectionAutoExpandMatch — entryKind: 'page'", () => {
  const entries: SidebarEntry[] = [
    { slug: "/about", name: "/about" },
    { slug: "/pricing", name: "/pricing" },
  ]

  it("returns true when selection.path matches an entry in a page section", () => {
    expect(
      sectionAutoExpandMatch("page", { kind: "page", path: "/pricing" }, entries),
    ).toBe(true)
  })

  it("returns false when selection.path is not in entries", () => {
    expect(
      sectionAutoExpandMatch("page", { kind: "page", path: "/contact" }, entries),
    ).toBe(false)
  })

  it("returns false when selection.kind is not 'page'", () => {
    expect(
      sectionAutoExpandMatch("page", { kind: "block", slug: "/about" }, entries),
    ).toBe(false)
  })

  it("block branch still matches correctly", () => {
    const blockEntries: SidebarEntry[] = [{ slug: "hero", name: "Hero" }]
    expect(
      sectionAutoExpandMatch("block", { kind: "block", slug: "hero" }, blockEntries),
    ).toBe(true)
  })

  it("primitive branch still matches correctly", () => {
    const primEntries: SidebarEntry[] = [{ slug: "button", name: "Button" }]
    expect(
      sectionAutoExpandMatch("primitive", { kind: "primitive", id: "button" }, primEntries),
    ).toBe(true)
  })
})
