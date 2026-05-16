import { describe, it, expect } from "vitest"
import { deriveChipLabel } from "@forkshop/components/agent-selection-chip"

const empty = {
  activePages: new Set<string>(),
  activeBlocks: new Set<string>(),
  activePrimitives: new Set<string>(),
  siteWide: { active: false },
}

describe("deriveChipLabel", () => {
  it("returns undefined when nothing is active", () => {
    expect(deriveChipLabel(empty)).toBeUndefined()
  })

  it("prefers the selection-specific page match over any other signal", () => {
    const label = deriveChipLabel({
      ...empty,
      pageSelectionPath: "/about",
      activePages: new Set(["/about", "/other"]),
      activeBlocks: new Set(["hero"]),
      activePrimitives: new Set(["button"]),
      siteWide: { active: true, recentBasename: "utils.ts" },
    })
    expect(label).toBe("about/page.tsx")
  })

  it("selection-specific block beats other active edits", () => {
    const label = deriveChipLabel({
      ...empty,
      blockSelectionSlug: "hero",
      activeBlocks: new Set(["hero", "cta-band"]),
      activePages: new Set(["/contact"]),
      siteWide: { active: true, recentBasename: "stale.ts" },
    })
    expect(label).toBe("hero.tsx")
  })

  it("selection-specific primitive beats other active edits", () => {
    const label = deriveChipLabel({
      ...empty,
      primitiveSelectionId: "button",
      activePrimitives: new Set(["button", "badge"]),
      activePages: new Set(["/contact"]),
    })
    expect(label).toBe("button.tsx")
  })

  it("selection match falls through when the selected file isn't currently active", () => {
    // User is viewing /about, but Claude is editing something else: chip names
    // the unrelated edit, not /about.
    const label = deriveChipLabel({
      ...empty,
      pageSelectionPath: "/about",
      activeBlocks: new Set(["hero"]),
    })
    expect(label).toBe("hero.tsx")
  })

  it("falls back to first active page when no selection-specific match", () => {
    const label = deriveChipLabel({
      ...empty,
      activePages: new Set(["/dashboard"]),
    })
    expect(label).toBe("dashboard/page.tsx")
  })

  it("page-active beats block-active in fallback", () => {
    const label = deriveChipLabel({
      ...empty,
      activePages: new Set(["/contact"]),
      activeBlocks: new Set(["hero"]),
    })
    expect(label).toBe("contact/page.tsx")
  })

  it("block-active beats primitive-active in fallback", () => {
    const label = deriveChipLabel({
      ...empty,
      activeBlocks: new Set(["hero"]),
      activePrimitives: new Set(["button"]),
    })
    expect(label).toBe("hero.tsx")
  })

  it("falls back to site-wide basename only when no scoped activity exists", () => {
    const label = deriveChipLabel({
      ...empty,
      siteWide: { active: true, recentBasename: "utils.ts" },
    })
    expect(label).toBe("utils.ts")
  })

  it("site-wide without recentBasename is ignored", () => {
    expect(deriveChipLabel({ ...empty, siteWide: { active: true } })).toBeUndefined()
  })

  it("formats the home route as 'page.tsx', not '/page.tsx'", () => {
    expect(deriveChipLabel({ ...empty, activePages: new Set(["/"]) })).toBe("page.tsx")
  })
})
