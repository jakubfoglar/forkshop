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

  it("activityKey() prefers componentPath over slug", () => {
    expect(iframeComponentNodeType.activityKey?.(componentNode)).toBe("components/blocks/hero.tsx")
  })

  it("activityKey() falls back to slug when componentPath is absent", () => {
    const noPath: IframeComponentNode = { ...componentNode, componentPath: undefined }
    expect(iframeComponentNodeType.activityKey?.(noPath)).toBe("hero")
  })

  it("defaultMode is 'click-into' and enterMode is 'double-click'", () => {
    expect(iframeComponentNodeType.defaultMode).toBe("click-into")
    expect(iframeComponentNodeType.enterMode).toBe("double-click")
  })

  it("has a drillIn function", () => {
    expect(typeof iframeComponentNodeType.drillIn).toBe("function")
  })
})
