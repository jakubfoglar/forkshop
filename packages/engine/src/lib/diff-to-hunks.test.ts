import { describe, expect, it } from "vitest"
import { diffToHunks } from "@forkshop/lib/diff-to-hunks"

describe("diffToHunks", () => {
  it("returns empty array for identical input", () => {
    expect(diffToHunks("a\nb\nc\n", "a\nb\nc\n")).toEqual([])
  })

  it("groups consecutive removed+added into one hunk", () => {
    const prev = 'headline="Old text"\n'
    const next = 'headline="New text"\n'
    const hunks = diffToHunks(prev, next)
    expect(hunks).toEqual([
      { oldString: 'headline="Old text"\n', newString: 'headline="New text"\n' },
    ])
  })

  it("treats pure additions as added-only hunks (no oldString)", () => {
    const prev = "line1\nline3\n"
    const next = "line1\nline2\nline3\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toEqual([{ newString: "line2\n" }])
  })

  it("treats pure removals as removed-only hunks (no newString)", () => {
    const prev = "line1\nline2\nline3\n"
    const next = "line1\nline3\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toEqual([{ oldString: "line2\n" }])
  })

  it("produces N separated hunks for non-adjacent changes", () => {
    const prev = "a\nb\nc\nd\ne\n"
    const next = "A\nb\nc\nd\nE\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toEqual({ oldString: "a\n", newString: "A\n" })
    expect(hunks[1]).toEqual({ oldString: "e\n", newString: "E\n" })
  })

  it("handles whole-file replacement (Write tool case)", () => {
    const prev = "old\ncontent\nhere\n"
    const next = "completely\ndifferent\nfile\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toHaveLength(1)
    expect(hunks[0]).toEqual({
      oldString: "old\ncontent\nhere\n",
      newString: "completely\ndifferent\nfile\n",
    })
  })
})
