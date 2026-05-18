/** @vitest-environment jsdom */
import React from "react" // needed for React.ReactNode type reference in HostFixture
import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { AgentReadIndicator } from "@forkshop/components/canvas/agent-read-indicator"
import { AgentActivityProvider } from "@forkshop/components/agent-activity-context"

afterEach(() => cleanup())

function HostFixture({ children, fileLabel }: { children?: React.ReactNode; fileLabel: string }) {
  return (
    <div data-forkshop-iframe-host={fileLabel} data-testid="host">
      <AgentReadIndicator hostFileLabel={fileLabel} />
      {children}
    </div>
  )
}

describe("AgentReadIndicator", () => {
  it("does not set data-forkshop-agent-reading when no read activity matches", async () => {
    // With no activity in the provider, the host stays undecorated.
    // (Driving the read decoration on requires either an SSE source or
    // direct recordActivity dispatch — covered by smoke, not unit test.)
    const { getByTestId } = render(
      <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
        <HostFixture fileLabel="components/ui/button.tsx" />
      </AgentActivityProvider>,
    )
    const host = getByTestId("host")
    expect(host.dataset.forkshopAgentReading).toBeUndefined()
  })
})
