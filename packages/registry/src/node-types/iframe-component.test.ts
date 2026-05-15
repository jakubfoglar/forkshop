import { describe, it, expect } from "vitest"
import { iframeComponentNodeType } from "@forkshop/node-types/iframe-component"
import type { AnyNode, IframeComponentNode, InlineReactNode } from "@forkshop/types/node"

const componentNode: IframeComponentNode = {
  id: "block:hero",
  kind: "iframe-component",
  x: 0,
  y: 0,
  width: 1200,
  height: 600,
  slug: "hero",
  previewSrc: "/forkshop/preview/hero",
  componentPath: "components/blocks/hero.tsx",
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

describe("iframeComponentNodeType", () => {
  it("has id 'iframe-component'", () => {
    expect(iframeComponentNodeType.id).toBe("iframe-component")
  })

  it("match() returns true for iframe-component nodes", () => {
    expect(iframeComponentNodeType.match(componentNode)).toBe(true)
  })

  it("match() returns false for other kinds", () => {
    expect(iframeComponentNodeType.match(inlineNode as AnyNode)).toBe(false)
  })

  it("agentMatch returns active=true when slug is in blocks set", () => {
    const activity = {
      pages: new Set<string>(),
      blocks: new Set(["hero"]),
      primitives: new Set<string>(),
    }
    expect(iframeComponentNodeType.agentMatch?.(componentNode, activity).active).toBe(true)
  })

  it("agentMatch returns active=false when slug is not in blocks set", () => {
    const activity = {
      pages: new Set<string>(),
      blocks: new Set(["footer"]),
      primitives: new Set<string>(),
    }
    expect(iframeComponentNodeType.agentMatch?.(componentNode, activity).active).toBe(false)
  })

  it("agentMatch includes fileLabel when active", () => {
    const activity = {
      pages: new Set<string>(),
      blocks: new Set(["hero"]),
      primitives: new Set<string>(),
    }
    expect(iframeComponentNodeType.agentMatch?.(componentNode, activity).fileLabel).toBe("hero.tsx")
  })

})
