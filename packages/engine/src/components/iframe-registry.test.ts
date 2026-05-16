import { describe, it, expect } from "vitest"
import { createIframeRegistry } from "@forkshop/components/iframe-registry"

function makeRef(iframe: HTMLIFrameElement | null) {
  return { current: iframe }
}

// Minimal stand-in for HTMLIFrameElement — getAll only inspects `.current`,
// never calls into the element, so the shape doesn't matter for these tests.
function fakeIframe(id: string): HTMLIFrameElement {
  return { __id: id } as unknown as HTMLIFrameElement
}

describe("createIframeRegistry", () => {
  it("starts empty", () => {
    const registry = createIframeRegistry()
    expect(registry.getAll()).toEqual([])
  })

  it("register surfaces a non-null ref via getAll", () => {
    const registry = createIframeRegistry()
    const a = fakeIframe("a")
    registry.register(makeRef(a))
    expect(registry.getAll()).toEqual([a])
  })

  it("filters out refs whose .current is null", () => {
    const registry = createIframeRegistry()
    const a = fakeIframe("a")
    registry.register(makeRef(a))
    registry.register(makeRef(null))
    expect(registry.getAll()).toEqual([a])
  })

  it("the returned unregister removes the ref", () => {
    const registry = createIframeRegistry()
    const a = fakeIframe("a")
    const b = fakeIframe("b")
    const refA = makeRef(a)
    const refB = makeRef(b)
    const unregisterA = registry.register(refA)
    registry.register(refB)
    expect(registry.getAll()).toHaveLength(2)
    unregisterA()
    expect(registry.getAll()).toEqual([b])
  })

  it("double-unregister is safe", () => {
    const registry = createIframeRegistry()
    const unregister = registry.register(makeRef(fakeIframe("a")))
    unregister()
    expect(() => unregister()).not.toThrow()
    expect(registry.getAll()).toEqual([])
  })

  it("getAll reflects post-register mutations to ref.current", () => {
    // Simulates the React ref lifecycle: ref is registered before the iframe
    // mounts (ref.current is null at register time, becomes non-null after).
    const registry = createIframeRegistry()
    const ref = makeRef(null)
    registry.register(ref)
    expect(registry.getAll()).toEqual([])
    const iframe = fakeIframe("mounted")
    ref.current = iframe
    expect(registry.getAll()).toEqual([iframe])
  })

  it("re-registering the same ref doesn't duplicate it", () => {
    const registry = createIframeRegistry()
    const ref = makeRef(fakeIframe("a"))
    registry.register(ref)
    registry.register(ref)
    expect(registry.getAll()).toHaveLength(1)
  })
})
