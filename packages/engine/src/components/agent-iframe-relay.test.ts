import { describe, it, expect } from "vitest"
import {
  broadcastBlocks,
  broadcastSubstrings,
  handleAgentHello,
} from "@forkshop/components/agent-iframe-relay"

type Call = { message: unknown; targetOrigin: string }

function fakeIframe(): { iframe: { contentWindow: { postMessage: (m: unknown, t: string) => void } }; calls: Call[] } {
  const calls: Call[] = []
  const iframe = {
    contentWindow: {
      postMessage(message: unknown, targetOrigin: string) {
        calls.push({ message, targetOrigin })
      },
    },
  }
  return { iframe, calls }
}

describe("broadcastBlocks", () => {
  it("posts the block payload to every iframe with origin '*'", () => {
    const a = fakeIframe()
    const b = fakeIframe()
    broadcastBlocks([a.iframe, b.iframe], ["hero", "cta-band"])

    expect(a.calls).toEqual([
      {
        message: { type: "forkshop:agent-block", slugs: ["hero", "cta-band"] },
        targetOrigin: "*",
      },
    ])
    expect(b.calls).toEqual(a.calls)
  })

  it("emits an empty-slug payload (sentinel for 'no active blocks')", () => {
    // The iframe-side handler needs an explicit empty broadcast to clear
    // its previous decoration — never silently skipping when slugs is [].
    const a = fakeIframe()
    broadcastBlocks([a.iframe], [])
    expect(a.calls).toHaveLength(1)
    expect(a.calls[0]!.message).toEqual({ type: "forkshop:agent-block", slugs: [] })
  })

  it("skips iframes with a null contentWindow", () => {
    const a = fakeIframe()
    const nulled = { contentWindow: null }
    expect(() => broadcastBlocks([a.iframe, nulled as never], ["hero"])).not.toThrow()
    expect(a.calls).toHaveLength(1)
  })

  it("one failing iframe doesn't abort the rest", () => {
    const bad = { contentWindow: { postMessage: () => { throw new Error("cross-origin") } } }
    const good = fakeIframe()
    broadcastBlocks([bad as never, good.iframe], ["hero"])
    expect(good.calls).toHaveLength(1)
  })
})

describe("broadcastSubstrings", () => {
  it("posts the text payload to every iframe", () => {
    const a = fakeIframe()
    const edits = [
      { oldString: "old", newString: "new" },
      { newString: "added" },
    ]
    broadcastSubstrings([a.iframe], edits)
    expect(a.calls[0]!.message).toEqual({
      type: "forkshop:agent-text",
      strings: edits,
    })
  })

  it("is a no-op when strings is empty", () => {
    // Empty substrings means no edits with old/new text — nothing to flash.
    // We don't broadcast an empty array because it would burn an event without
    // a corresponding decoration on the receiver side.
    const a = fakeIframe()
    broadcastSubstrings([a.iframe], [])
    expect(a.calls).toEqual([])
  })

  it("skips iframes with a null contentWindow", () => {
    const a = fakeIframe()
    const nulled = { contentWindow: null }
    expect(() =>
      broadcastSubstrings([a.iframe, nulled as never], [{ newString: "x" }]),
    ).not.toThrow()
    expect(a.calls).toHaveLength(1)
  })
})

describe("handleAgentHello", () => {
  it("posts block snapshot then text snapshot to the source only", () => {
    const calls: Call[] = []
    const source = {
      postMessage(message: unknown, targetOrigin: string) {
        calls.push({ message, targetOrigin })
      },
    }
    const edits = [{ oldString: "before", newString: "after" }]
    const handled = handleAgentHello(
      { data: { type: "forkshop:agent-hello" }, source },
      { slugs: ["hero", "footer"], strings: edits },
    )
    expect(handled).toBe(true)
    expect(calls).toEqual([
      { message: { type: "forkshop:agent-block", slugs: ["hero", "footer"] }, targetOrigin: "*" },
      { message: { type: "forkshop:agent-text", strings: edits }, targetOrigin: "*" },
    ])
  })

  it("omits the text snapshot when strings is empty", () => {
    const calls: Call[] = []
    const source = {
      postMessage(message: unknown, targetOrigin: string) {
        calls.push({ message, targetOrigin })
      },
    }
    handleAgentHello(
      { data: { type: "forkshop:agent-hello" }, source },
      { slugs: ["hero"], strings: [] },
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]!.message).toEqual({ type: "forkshop:agent-block", slugs: ["hero"] })
  })

  it("ignores messages of a different type", () => {
    const source = { postMessage: () => { throw new Error("should not be called") } }
    const handled = handleAgentHello(
      { data: { type: "something-else" }, source },
      { slugs: [], strings: [] },
    )
    expect(handled).toBe(false)
  })

  it("ignores messages with no source (e.g. cross-origin events with null source)", () => {
    const handled = handleAgentHello(
      { data: { type: "forkshop:agent-hello" }, source: null },
      { slugs: ["hero"], strings: [{ newString: "x" }] },
    )
    expect(handled).toBe(false)
  })

  it("ignores messages with no data", () => {
    expect(handleAgentHello({ source: { postMessage: () => {} } }, { slugs: [], strings: [] })).toBe(false)
  })

  it("a failing source postMessage doesn't throw", () => {
    const source = { postMessage: () => { throw new Error("cross-origin") } }
    expect(() =>
      handleAgentHello(
        { data: { type: "forkshop:agent-hello" }, source },
        { slugs: ["hero"], strings: [] },
      ),
    ).not.toThrow()
  })
})
