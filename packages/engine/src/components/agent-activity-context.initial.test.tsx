/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import {
  AgentActivityProvider,
  useAgentActivePages,
  type ActivityEntry,
} from "@forkshop/components/agent-activity-context"

// Real ActivityEntry shape (from agent-activity-state.ts):
// { filePath, agent, agentLabel, sessionId, color, action: AgentAction, lastSeenAt, hunks? }
// useAgentActivePages only counts "edit" | "create" actions (isEditish).

describe("AgentActivityProvider initialActivity", () => {
  it("renders with no active pages when initialActivity is omitted", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
        {children}
      </AgentActivityProvider>
    )
    const { result } = renderHook(() => useAgentActivePages(), { wrapper })
    expect(result.current.size).toBe(0)
  })

  it("renders with seeded active pages when initialActivity is provided", () => {
    const initial: ActivityEntry[] = [
      {
        filePath: "app/about/page.tsx",
        agent: "claude",
        agentLabel: "Claude",
        sessionId: "test-session",
        color: "oklch(0.7 0.18 50)",
        action: "edit",
        lastSeenAt: Date.now(),
      },
    ]
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentActivityProvider
        fileMap={{ primitives: [], blocks: [] }}
        initialActivity={initial}
      >
        {children}
      </AgentActivityProvider>
    )
    const { result } = renderHook(() => useAgentActivePages(), { wrapper })
    expect(result.current.has("/about")).toBe(true)
  })
})
