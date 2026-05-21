import { describe, it, expect } from "vitest"
import { findForkshopTokenClasses } from "./check-token-classes.js"

describe("findForkshopTokenClasses", () => {
  it("flags bg-forkshop-* classes", () => {
    const refs = findForkshopTokenClasses('<div className="bg-forkshop-accent">')
    expect(refs).toContain("bg-forkshop-accent")
  })
  it("flags text-forkshop-* classes", () => {
    const refs = findForkshopTokenClasses(`<p class='text-forkshop-fg'>x</p>`)
    expect(refs).toContain("text-forkshop-fg")
  })
  it("ignores forkshop-accent inside a string variable", () => {
    const refs = findForkshopTokenClasses(`const x = "forkshop-accent"`)
    expect(refs).toEqual([])
  })
})
