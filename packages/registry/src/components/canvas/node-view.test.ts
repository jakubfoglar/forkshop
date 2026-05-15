import { describe, it, expect } from "vitest"
import { resolveNodeType } from "@forkshop/components/canvas/node-view"
import type { AnyNode, InlineReactNode, IframeRouteNode } from "@forkshop/types/node"
import type { NodeType } from "@forkshop/types/node-type"

const noopRender = () => null

const inlineReactStub: NodeType<InlineReactNode> = {
  id: "inline-react",
  match: (n): n is InlineReactNode => n.kind === "inline-react",
  render: noopRender,
}

const iframeRouteStub: NodeType<IframeRouteNode> = {
  id: "iframe-route",
  match: (n): n is IframeRouteNode => n.kind === "iframe-route",
  render: noopRender,
}

const inlineReactNode: InlineReactNode = {
  id: "n1",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  render: () => null,
}

const iframeRouteNode: IframeRouteNode = {
  id: "n2",
  kind: "iframe-route",
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  routePath: "/about",
}

describe("resolveNodeType", () => {
  it("returns the first NodeType whose match() returns true", () => {
    const types: NodeType<AnyNode>[] = [
      inlineReactStub as NodeType<AnyNode>,
      iframeRouteStub as NodeType<AnyNode>,
    ]
    expect(resolveNodeType(inlineReactNode, types)?.id).toBe("inline-react")
    expect(resolveNodeType(iframeRouteNode, types)?.id).toBe("iframe-route")
  })

  it("respects array order — earlier NodeTypes win", () => {
    const customInlineReact: NodeType<InlineReactNode> = {
      id: "custom-inline",
      match: (n): n is InlineReactNode => n.kind === "inline-react",
      render: noopRender,
    }
    const types: NodeType<AnyNode>[] = [
      customInlineReact as NodeType<AnyNode>,
      inlineReactStub as NodeType<AnyNode>,
    ]
    expect(resolveNodeType(inlineReactNode, types)?.id).toBe("custom-inline")
  })

  it("returns undefined when no NodeType matches", () => {
    const types: NodeType<AnyNode>[] = [iframeRouteStub as NodeType<AnyNode>]
    expect(resolveNodeType(inlineReactNode, types)).toBeUndefined()
  })
})
