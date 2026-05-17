import { describe, expect, it } from "vitest"
import { classifyDrift, type FileTriple } from "./update-drift.js"

describe("classifyDrift", () => {
  function mk(lockSha: string, manifestSha: string, diskSha?: string): FileTriple {
    return { address: "@forkshop/skill/setup", lockSha, manifestSha, diskSha }
  }

  it("unchanged when all three shas match", () => {
    expect(classifyDrift(mk("a", "a", "a"))).toBe("unchanged")
  })

  it("upstream-drift when manifest moved", () => {
    expect(classifyDrift(mk("a", "b", "a"))).toBe("upstream-drift")
  })

  it("local-drift when disk moved", () => {
    expect(classifyDrift(mk("a", "a", "c"))).toBe("local-drift")
  })

  it("both-drift when both moved", () => {
    expect(classifyDrift(mk("a", "b", "c"))).toBe("both-drift")
  })

  it("missing-on-disk when disk sha absent", () => {
    expect(
      classifyDrift({ address: "x", lockSha: "a", manifestSha: "b", diskSha: undefined })
    ).toBe("missing-on-disk")
  })
})
