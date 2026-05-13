import { describe, it, expect, beforeEach } from "vitest"
import { recordActivity, subscribe } from "@forkshop/lib/agent-activity-state"

describe("agent-activity-state", () => {
  beforeEach(() => {
    // Drain any leftover state from previous tests by waiting past the
    // 5s prune window — too slow for a unit test. Instead, the module is
    // stateful and we accept that each test sees prior writes. Each test
    // uses unique file paths to avoid collision.
  })

  it("records and broadcasts a single entry", () => {
    const received: unknown[][] = []
    const unsub = subscribe((snapshot) => received.push(snapshot))
    // subscribe immediately invokes with current state — capture the
    // baseline length.
    const baseline = received[0]!.length

    recordActivity({ filePath: "test/unique-1.ts", oldString: "a", newString: "b" })

    expect(received.length).toBeGreaterThan(1)
    const last = received[received.length - 1] as Array<{ filePath: string }>
    expect(last.some((e) => e.filePath === "test/unique-1.ts")).toBe(true)
    expect(last.length).toBe(baseline + 1)

    unsub()
  })

  it("upserts on repeat filePath rather than appending", () => {
    const received: unknown[][] = []
    const unsub = subscribe((snapshot) => received.push(snapshot))
    const baseline = received[0]!.length

    recordActivity({ filePath: "test/unique-2.ts", oldString: "x", newString: "y" })
    recordActivity({ filePath: "test/unique-2.ts", oldString: "x2", newString: "y2" })

    const last = received[received.length - 1] as Array<{
      filePath: string
      newString?: string
    }>
    const matches = last.filter((e) => e.filePath === "test/unique-2.ts")
    expect(matches.length).toBe(1)
    expect(matches[0]!.newString).toBe("y2")
    expect(last.length).toBe(baseline + 1)

    unsub()
  })

  it("broadcasts to multiple subscribers", () => {
    const a: unknown[] = []
    const b: unknown[] = []
    const unsubA = subscribe((s) => a.push(s))
    const unsubB = subscribe((s) => b.push(s))

    recordActivity({ filePath: "test/unique-3.ts" })

    // Each subscriber received the initial snapshot + the new broadcast.
    expect(a.length).toBe(2)
    expect(b.length).toBe(2)

    unsubA()
    unsubB()
  })

  it("subscribe returns an unsubscribe that stops further notifications", () => {
    const received: unknown[] = []
    const unsub = subscribe((s) => received.push(s))
    const lenAfterSubscribe = received.length

    unsub()
    recordActivity({ filePath: "test/unique-4.ts" })

    expect(received.length).toBe(lenAfterSubscribe)
  })
})
