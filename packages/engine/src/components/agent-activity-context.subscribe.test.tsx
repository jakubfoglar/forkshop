/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import {
  AgentActivityProvider,
  useAgentActivityEntries,
} from "@forkshop/components/agent-activity-context"

// The test-setup-jsdom.ts installs an EventSource stub class onto global.
// Replace it with a vi.fn() constructor so we can assert call count.

const originalEventSource = global.EventSource

function makeEventSourceMock() {
  const mock = vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    readyState: 0,
  }))
  return mock
}

beforeEach(() => {
  // @ts-expect-error — replace stub with trackable mock
  global.EventSource = makeEventSourceMock()
})
afterEach(() => {
  // @ts-expect-error — restore
  global.EventSource = originalEventSource
})

function makeWrapper(subscribeToStream?: boolean) {
  return ({ children }: { children: React.ReactNode }) => (
    <AgentActivityProvider
      fileMap={{ primitives: [], blocks: [] }}
      subscribeToStream={subscribeToStream}
    >
      {children}
    </AgentActivityProvider>
  )
}

describe("AgentActivityProvider subscribeToStream prop", () => {
  it("does NOT construct EventSource when subscribeToStream={false}", () => {
    renderHook(() => useAgentActivityEntries(), {
      wrapper: makeWrapper(false),
    })
    expect(global.EventSource).not.toHaveBeenCalled()
  })

  it("DOES construct EventSource when subscribeToStream is omitted (default true)", () => {
    renderHook(() => useAgentActivityEntries(), {
      wrapper: makeWrapper(undefined),
    })
    expect(global.EventSource).toHaveBeenCalledTimes(1)
  })
})
