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

  it("agentMatch returns active=true when routePath is in pages set", () => {
    const activity = {
      pages: new Set(["/about"]),
      blocks: new Set<string>(),
      primitives: new Set<string>(),
    }
    expect(iframeRouteNodeType.agentMatch?.(routeNode, activity).active).toBe(true)
  })

  it("agentMatch returns active=false when routePath is not in pages set", () => {
    const activity = {
      pages: new Set(["/other"]),
      blocks: new Set<string>(),
      primitives: new Set<string>(),
    }
    expect(iframeRouteNodeType.agentMatch?.(routeNode, activity).active).toBe(false)
  })

  it("agentMatch includes fileLabel when active", () => {
    const activity = {
      pages: new Set(["/about"]),
      blocks: new Set<string>(),
      primitives: new Set<string>(),
    }
    expect(iframeRouteNodeType.agentMatch?.(routeNode, activity).fileLabel).toBe("about/page.tsx")
  })

  it("agentMatch fileLabel for root path is 'page.tsx'", () => {
    const rootNode: IframeRouteNode = { ...routeNode, routePath: "/" }
    const activity = {
      pages: new Set(["/"]),
      blocks: new Set<string>(),
      primitives: new Set<string>(),
    }
    expect(iframeRouteNodeType.agentMatch?.(rootNode, activity).fileLabel).toBe("page.tsx")
  })

})
