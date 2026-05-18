import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  __resetActivityStateForTests,
  recordActivity,
  subscribe,
  type ActivityEntry,
} from "@forkshop/lib/agent-activity-state"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1000) // fixed epoch so tests using small lastSeenAt values don't trigger prune
  __resetActivityStateForTests()
})
afterEach(() => {
  vi.useRealTimers()
})

const base = {
  agent: "claude-code",
  agentLabel: "Claude",
  sessionId: "s1",
  color: "oklch(0.7 0.18 50)",
  action: "edit" as const,
}

describe("agent-activity-state", () => {
  it("subscriber receives current snapshot on subscribe", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    expect(seen[0]).toEqual([])
  })

  it("recordActivity broadcasts the entry to subscribers", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({
      filePath: "components/ui/button.tsx",
      ...base,
      hunks: [{ oldString: "a", newString: "b" }],
      lastSeenAt: 1000,
    })
    const latest = seen.at(-1)!
    expect(latest).toHaveLength(1)
    expect(latest[0]).toMatchObject({
      filePath: "components/ui/button.tsx",
      agent: "claude-code",
      sessionId: "s1",
      color: "oklch(0.7 0.18 50)",
      action: "edit",
      hunks: [{ oldString: "a", newString: "b" }],
    })
  })

  it("two agents on the same file produce two entries (compound key)", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({ filePath: "x.tsx", ...base, lastSeenAt: 1000 })
    recordActivity({
      filePath: "x.tsx",
      agent: "cursor",
      agentLabel: "Cursor",
      sessionId: "s2",
      color: "oklch(0.7 0.18 200)",
      action: "edit",
      lastSeenAt: 1100,
    })
    const latest = seen.at(-1)!
    expect(latest).toHaveLength(2)
    expect(latest.map((e) => e.agent).sort()).toEqual(["claude-code", "cursor"])
  })

  it("two sessions of the same agent on the same file also produce two entries", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({ filePath: "x.tsx", ...base, sessionId: "s1", lastSeenAt: 1000 })
    recordActivity({ filePath: "x.tsx", ...base, sessionId: "s2", lastSeenAt: 1100 })
    expect(seen.at(-1)).toHaveLength(2)
  })

  it("entries prune after 5s of inactivity", () => {
    vi.setSystemTime(1000)
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({ filePath: "x.tsx", ...base, lastSeenAt: 1000 })
    expect(seen.at(-1)).toHaveLength(1)
    vi.setSystemTime(7000)
    vi.advanceTimersByTime(1100) // prune timer fires every 1s
    expect(seen.at(-1)).toHaveLength(0)
  })
})
