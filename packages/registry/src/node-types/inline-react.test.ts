import { describe, it, expect } from "vitest"
import { inlineReactNodeType } from "@forkshop/node-types/inline-react"
import type { AnyNode, InlineReactNode, IframeRouteNode } from "@forkshop/types/node"

const inlineNode: InlineReactNode = {
  id: "p:button",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  filePath: "components/ui/button.tsx",
  render: () => null,
}

const iframeNode: IframeRouteNode = {
  id: "page:about",
  kind: "iframe-route",
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  routePath: "/about",
}

describe("inlineReactNodeType", () => {
  it("has id 'inline-react'", () => {
    expect(inlineReactNodeType.id).toBe("inline-react")
  })

  it("match() returns true for inline-react nodes", () => {
    expect(inlineReactNodeType.match(inlineNode)).toBe(true)
  })

  it("match() returns false for other kinds", () => {
    expect(inlineReactNodeType.match(iframeNode as AnyNode)).toBe(false)
  })

  it("activityKey() returns the filePath", () => {
    expect(inlineReactNodeType.activityKey?.(inlineNode)).toBe("components/ui/button.tsx")
  })

  it("activityKey() returns undefined when filePath is absent", () => {
    const noPath: InlineReactNode = { ...inlineNode, filePath: undefined }
    expect(inlineReactNodeType.activityKey?.(noPath)).toBeUndefined()
  })

  it("defaultMode is 'interactive-live' and enterMode is 'never'", () => {
    expect(inlineReactNodeType.defaultMode).toBe("interactive-live")
    expect(inlineReactNodeType.enterMode).toBe("never")
  })

  it("has no drillIn", () => {
    expect(inlineReactNodeType.drillIn).toBeUndefined()
  })
})
