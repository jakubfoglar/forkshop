"use client"

import type { NodeType } from "@forkshop/types/node-type"
import type { InlineReactNode } from "@forkshop/types/node"

export const inlineReactNodeType: NodeType<InlineReactNode> = {
  id: "inline-react",
  match: (node): node is InlineReactNode => node.kind === "inline-react",
  render: ({ node }) => node.render(),
  defaultMode: "interactive-live",
  enterMode: "never",
  agentMatch: (node, activity) => {
    const id = node.id.replace(/^primitive:/, "")
    const filePathHit = node.filePath !== undefined && activity.primitives.has(node.filePath)
    const idHit = activity.primitives.has(id) || activity.primitives.has(node.id)
    return { active: idHit || filePathHit }
  },
}
