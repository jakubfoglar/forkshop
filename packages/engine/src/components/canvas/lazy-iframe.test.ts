import { describe, expect, it } from "vitest"
import { clampReportedHeight } from "@forkshop/components/canvas/lazy-iframe"

describe("clampReportedHeight", () => {
  it("returns the measured value in auto mode regardless of cap", () => {
    expect(clampReportedHeight(900, "auto", undefined)).toBe(900)
    expect(clampReportedHeight(900, "auto", 500)).toBe(900)
  })

  it("returns the measured value in fixed mode regardless of cap", () => {
    expect(clampReportedHeight(900, "fixed", 500)).toBe(900)
  })

  it("returns measured when cap mode and measured is below cap", () => {
    expect(clampReportedHeight(400, "cap", 500)).toBe(400)
  })

  it("returns cap when cap mode and measured exceeds cap", () => {
    expect(clampReportedHeight(900, "cap", 500)).toBe(500)
  })

  it("returns cap when cap mode and measured equals cap", () => {
    expect(clampReportedHeight(500, "cap", 500)).toBe(500)
  })

  it("returns measured when cap mode but cap is undefined", () => {
    expect(clampReportedHeight(900, "cap", undefined)).toBe(900)
  })
})
