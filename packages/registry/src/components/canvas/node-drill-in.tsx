"use client"

import type { ReactNode } from "react"
import type { AnyNode } from "@forkshop/types/node"
import { resolveNodeType } from "@forkshop/components/canvas/node-view"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useNodeAgentActive } from "@forkshop/lib/use-node-agent-active"

export type NodeDrillInProps = {
  node: AnyNode
  onBack: () => void
}

export function NodeDrillIn({ node, onBack }: NodeDrillInProps): ReactNode {
  const { nodeTypes } = useForkshopCanvas()
  const { agentActive, agentFileLabel } = useNodeAgentActive(node)
  const nodeType = resolveNodeType(node, nodeTypes)
  if (!nodeType) return null

  if (nodeType.drillIn) {
    return nodeType.drillIn({ node, onBack })
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-forkshop-8">
      <div className="bg-white shadow-md p-forkshop-8">
        {nodeType.render({ node, isSelected: false, agentActive, agentFileLabel })}
      </div>
    </div>
  )
}
