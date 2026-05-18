/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { deriveChipStack, type ChipInput } from "@forkshop/components/agent-selection-chip"

function entry(o: Partial<ChipInput> & { agent: string; ts: number }): ChipInput {
  const { agent, ...rest } = o
  return {
    agentLabel: agent,
    color: "oklch(0.7 0.18 50)",
    fileLabel: "page.tsx",
    sessionId: "s",
    ...rest,
  }
}

describe("deriveChipStack", () => {
  it("returns [] when no entries", () => {
    expect(deriveChipStack([], 3)).toEqual({ chips: [], overflow: 0 })
  })

  it("sorts by ts desc and caps at maxVisible", () => {
    const res = deriveChipStack(
      [
        entry({ agent: "A", ts: 1 }),
        entry({ agent: "B", ts: 3 }),
        entry({ agent: "C", ts: 2 }),
        entry({ agent: "D", ts: 4 }),
      ],
      3,
    )
    expect(res.chips.map((c) => c.agentLabel)).toEqual(["D", "B", "C"])
    expect(res.overflow).toBe(1)
  })

  it("collapses multiple entries from the same (agent, sessionId) to one chip", () => {
    const res = deriveChipStack(
      [
        entry({ agent: "A", ts: 1, sessionId: "s1" }),
        entry({ agent: "A", ts: 2, sessionId: "s1" }),
        entry({ agent: "A", ts: 3, sessionId: "s2" }),
      ],
      3,
    )
    expect(res.chips).toHaveLength(2)
    expect(res.overflow).toBe(0)
  })
})
