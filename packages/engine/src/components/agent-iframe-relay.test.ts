import { describe, expect, it, vi } from "vitest"
import {
  broadcastBlocks,
  broadcastHunks,
  handleAgentHello,
} from "@forkshop/components/agent-iframe-relay"

describe("broadcastBlocks", () => {
  it("posts a forkshop:agent-block message with slugs + color to every iframe", () => {
    const postMessage = vi.fn()
    const iframe = { contentWindow: { postMessage } }
    broadcastBlocks([iframe, iframe], { slugs: ["hero"], color: "oklch(0.7 0.18 50)" })
    expect(postMessage).toHaveBeenCalledTimes(2)
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: "forkshop:agent-block", slugs: ["hero"], color: "oklch(0.7 0.18 50)" },
      "*",
    )
  })

  it("ignores iframes whose contentWindow is null", () => {
    const postMessage = vi.fn()
    broadcastBlocks(
      [{ contentWindow: null }, { contentWindow: { postMessage } }],
      { slugs: ["x"], color: "c" },
    )
    expect(postMessage).toHaveBeenCalledTimes(1)
  })

  it("swallows postMessage errors", () => {
    const throwing = { contentWindow: { postMessage: () => { throw new Error("bad") } } }
    const ok = { contentWindow: { postMessage: vi.fn() } }
    expect(() => broadcastBlocks([throwing, ok], { slugs: [], color: "c" })).not.toThrow()
    expect(ok.contentWindow.postMessage).toHaveBeenCalled()
  })
})

describe("broadcastHunks", () => {
  it("posts forkshop:agent-text with hunks + color", () => {
    const postMessage = vi.fn()
    broadcastHunks([{ contentWindow: { postMessage } }], {
      hunks: [{ oldString: "a", newString: "b" }],
      color: "oklch(0.7 0.18 50)",
    })
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "forkshop:agent-text",
        hunks: [{ oldString: "a", newString: "b" }],
        color: "oklch(0.7 0.18 50)",
      },
      "*",
    )
  })

  it("does not post when hunks is empty", () => {
    const postMessage = vi.fn()
    broadcastHunks([{ contentWindow: { postMessage } }], { hunks: [], color: "c" })
    expect(postMessage).not.toHaveBeenCalled()
  })
})

describe("handleAgentHello", () => {
  it("posts current snapshot back to event.source on hello", () => {
    const postMessage = vi.fn()
    const source = { postMessage }
    const handled = handleAgentHello(
      { data: { type: "forkshop:agent-hello" }, source },
      { slugs: ["x"], hunks: [{ newString: "y" }], color: "c" },
    )
    expect(handled).toBe(true)
    expect(postMessage).toHaveBeenCalledWith(
      { type: "forkshop:agent-block", slugs: ["x"], color: "c" },
      "*",
    )
    expect(postMessage).toHaveBeenCalledWith(
      { type: "forkshop:agent-text", hunks: [{ newString: "y" }], color: "c" },
      "*",
    )
  })

  it("returns false for non-hello messages", () => {
    expect(handleAgentHello({ data: {}, source: {} as never }, { slugs: [], hunks: [], color: "" }))
      .toBe(false)
  })
})
