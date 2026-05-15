import { describe, it, expect } from "vitest"
import { inlineReactNodeType } from "@forkshop/node-types/inline-react"
import type { AnyNode, InlineReactNode, IframeRouteNode } from "@forkshop/types/node"

const inlineNode: InlineReactNode = {
  id: "primitive:button",
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

  it("agentMatch returns active=true when filePath is in primitives set", () => {
    const activity = {
      pages: new Set<string>(),
      blocks: new Set<string>(),
      primitives: new Set(["components/ui/button.tsx"]),
    }
    expect(inlineReactNodeType.agentMatch?.(inlineNode, activity).active).toBe(true)
  })

  it("agentMatch returns active=true when stripped id is in primitives set", () => {
    const activity = {
      pages: new Set<string>(),
      blocks: new Set<string>(),
      primitives: new Set(["button"]),
    }
    expect(inlineReactNodeType.agentMatch?.(inlineNode, activity).active).toBe(true)
  })

  it("agentMatch returns active=true when full id is in primitives set", () => {
    const activity = {
      pages: new Set<string>(),
      blocks: new Set<string>(),
      primitives: new Set(["primitive:button"]),
    }
    expect(inlineReactNodeType.agentMatch?.(inlineNode, activity).active).toBe(true)
  })

  it("agentMatch returns active=false when nothing matches", () => {
    const activity = {
      pages: new Set<string>(),
      blocks: new Set<string>(),
      primitives: new Set(["other"]),
    }
    expect(inlineReactNodeType.agentMatch?.(inlineNode, activity).active).toBe(false)
  })

  it("agentMatch returns active=false when filePath absent and id not matched", () => {
    const noPath: InlineReactNode = { ...inlineNode, filePath: undefined }
    const activity = {
      pages: new Set<string>(),
      blocks: new Set<string>(),
      primitives: new Set<string>(),
    }
    expect(inlineReactNodeType.agentMatch?.(noPath, activity).active).toBe(false)
  })

  it("defaultMode is 'interactive-live' and enterMode is 'never'", () => {
    expect(inlineReactNodeType.defaultMode).toBe("interactive-live")
    expect(inlineReactNodeType.enterMode).toBe("never")
  })

  it("has no drillIn", () => {
    expect(inlineReactNodeType.drillIn).toBeUndefined()
  })
})
