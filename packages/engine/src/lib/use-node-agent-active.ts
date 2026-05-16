"use client"

import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
} from "@forkshop/components/agent-activity-context"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { resolveNodeType } from "@forkshop/components/canvas/node-view"
import type { AnyNode } from "@forkshop/types/node"

export type NodeAgentActivity = {
  agentActive: boolean
  agentFileLabel: string | undefined
}

export function useNodeAgentActive(node: AnyNode): NodeAgentActivity {
  const pages = useAgentActivePages()
  const blocks = useAgentActiveBlocks()
  const primitives = useAgentActivePrimitives()
  const { nodeTypes } = useForkshopCanvas()

  const nodeType = resolveNodeType(node, nodeTypes)
  if (!nodeType?.agentMatch) {
    return { agentActive: false, agentFileLabel: undefined }
  }

  const result = nodeType.agentMatch(node, { pages, blocks, primitives })
  return { agentActive: result.active, agentFileLabel: result.fileLabel }
}
