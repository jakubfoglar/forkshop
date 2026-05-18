import { afterEach, describe, expect, it } from "vitest"
import {
  __resetPaletteForTests,
  AGENT_PALETTE,
  getOrAssignColor,
} from "@forkshop/lib/agent-color-palette"

afterEach(() => {
  __resetPaletteForTests()
})

describe("agent-color-palette", () => {
  it("known-agent (claude-code) reserves slot 0 (orange)", () => {
    expect(getOrAssignColor("claude-code", "session-a")).toBe(AGENT_PALETTE[0])
  })

  it("same (agent, sessionId) is deterministic across calls", () => {
    const first = getOrAssignColor("claude-code", "session-a")
    const second = getOrAssignColor("claude-code", "session-a")
    expect(first).toBe(second)
  })

  it("second session of claude-code takes the next free slot", () => {
    const a = getOrAssignColor("claude-code", "session-a")
    const b = getOrAssignColor("claude-code", "session-b")
    expect(a).toBe(AGENT_PALETTE[0])
    expect(b).toBe(AGENT_PALETTE[1])
    expect(a).not.toBe(b)
  })

  it("unknown agent takes the first free slot after reservations", () => {
    const claude = getOrAssignColor("claude-code", "s1")
    const unknown = getOrAssignColor("custom-bot", "s1")
    expect(claude).toBe(AGENT_PALETTE[0])
    expect(unknown).toBe(AGENT_PALETTE[1])
  })

  it("wraps around the palette when more than 8 (agent, session) pairs", () => {
    const colors = new Set<string>()
    for (let i = 0; i < AGENT_PALETTE.length; i++) {
      colors.add(getOrAssignColor("agent-" + i, "s"))
    }
    expect(colors.size).toBe(AGENT_PALETTE.length)
    // 9th pair wraps to slot 0 (no free slots left).
    const wrapped = getOrAssignColor("agent-overflow", "s")
    expect(AGENT_PALETTE).toContain(wrapped)
  })

  it("palette has 8 OKLCH entries", () => {
    expect(AGENT_PALETTE).toHaveLength(8)
    for (const entry of AGENT_PALETTE) {
      expect(entry).toMatch(/^oklch\(/)
    }
  })
})
