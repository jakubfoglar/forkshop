/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
  AgentActivityProvider,
  useAgentActivityEntries,
  type ActivityEntry,
} from "@forkshop/components/agent-activity-context"

// STALE_MS in the provider is 5500. We use 60 000ms-old entries to be well past it.
const STALE_AGE_MS = 60_000

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

const base: Omit<ActivityEntry, "filePath" | "lastSeenAt"> = {
  agent: "demo",
  agentLabel: "Demo",
  sessionId: "demo-seed",
  color: "#3057f0",
  action: "edit",
}

function makeWrapper(initialActivity: ActivityEntry[]) {
  return ({ children }: { children: React.ReactNode }) => (
    <AgentActivityProvider
      fileMap={{ primitives: [], blocks: [] }}
      initialActivity={initialActivity}
    >
      {children}
    </AgentActivityProvider>
  )
}

describe("ActivityEntry pinned flag", () => {
  it("pinned entry survives past STALE_MS", () => {
    const now = Date.now()
    const entry: ActivityEntry = {
      ...base,
      filePath: "app/page.tsx",
      lastSeenAt: now - STALE_AGE_MS,
      pinned: true,
    }
    const { result } = renderHook(() => useAgentActivityEntries(), {
      wrapper: makeWrapper([entry]),
    })

    // Advance time + fire the 1-second prune interval several times
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    const entries = result.current
    expect(entries).toHaveLength(1)
    expect(entries[0]!.filePath).toBe("app/page.tsx")
  })

  it("non-pinned entry gets pruned past STALE_MS", () => {
    const now = Date.now()
    const entry: ActivityEntry = {
      ...base,
      filePath: "app/page.tsx",
      lastSeenAt: now - STALE_AGE_MS,
      // no pinned flag
    }
    const { result } = renderHook(() => useAgentActivityEntries(), {
      wrapper: makeWrapper([entry]),
    })

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(result.current).toHaveLength(0)
  })
})
