import { describe, it, expect } from "vitest"
import { shouldRenderOverlay } from "@forkshop/components/canvas/iframe-edit-overlay"

describe("shouldRenderOverlay", () => {
  it("returns false in production", () => {
    expect(shouldRenderOverlay({ nodeEnv: "production", sourceFile: "app/page.tsx" })).toBe(false)
  })

  it("returns false when sourceFile is undefined", () => {
    expect(shouldRenderOverlay({ nodeEnv: "development", sourceFile: undefined })).toBe(false)
  })

  it("returns false when sourceFile is empty string", () => {
    expect(shouldRenderOverlay({ nodeEnv: "development", sourceFile: "" })).toBe(false)
  })

  it("returns true in development with a sourceFile", () => {
    expect(shouldRenderOverlay({ nodeEnv: "development", sourceFile: "app/page.tsx" })).toBe(true)
  })
})
