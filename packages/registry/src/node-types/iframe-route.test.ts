import { describe, it, expect } from "vitest"
import { iframeRouteNodeType } from "@forkshop/node-types/iframe-route"
import type { AnyNode, IframeRouteNode, InlineReactNode } from "@forkshop/types/node"

const routeNode: IframeRouteNode = {
  id: "page:about",
  kind: "iframe-route",
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  routePath: "/about",
}

const inlineNode: InlineReactNode = {
  id: "p:button",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  render: () => null,
}

describe("iframeRouteNodeType", () => {
  it("has id 'iframe-route'", () => {
    expect(iframeRouteNodeType.id).toBe("iframe-route")
  })

  it("match() returns true for iframe-route nodes", () => {
    expect(iframeRouteNodeType.match(routeNode)).toBe(true)
  })

  it("match() returns false for other kinds", () => {
    expect(iframeRouteNodeType.match(inlineNode as AnyNode)).toBe(false)
  })

  it("activityKey() returns the routePath", () => {
    expect(iframeRouteNodeType.activityKey?.(routeNode)).toBe("/about")
  })

  it("defaultMode is 'click-into' and enterMode is 'double-click'", () => {
    expect(iframeRouteNodeType.defaultMode).toBe("click-into")
    expect(iframeRouteNodeType.enterMode).toBe("double-click")
  })

  it("has a drillIn function", () => {
    expect(typeof iframeRouteNodeType.drillIn).toBe("function")
  })
})
