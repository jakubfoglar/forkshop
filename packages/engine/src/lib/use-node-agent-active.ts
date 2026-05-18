"use client"

import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
  useAgentColorByFile,
  useAgentReadingByFile,
} from "@forkshop/components/agent-activity-context"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { resolveNodeType } from "@forkshop/components/canvas/node-view"
import type { AnyNode } from "@forkshop/types/node"

export type NodeAgentActivity = {
  agentActive: boolean
  agentReading: boolean
  agentFileLabel: string | undefined
  agentColor: string | undefined
}

export function useNodeAgentActive(node: AnyNode): NodeAgentActivity {
  const pages = useAgentActivePages()
  const blocks = useAgentActiveBlocks()
  const primitives = useAgentActivePrimitives()
  const colorByFile = useAgentColorByFile()
  const readingByFile = useAgentReadingByFile()
  const { nodeTypes } = useForkshopCanvas()

  const nodeType = resolveNodeType(node, nodeTypes)
  if (!nodeType?.agentMatch) {
    return {
      agentActive: false,
      agentReading: false,
      agentFileLabel: undefined,
      agentColor: undefined,
    }
  }

  const result = nodeType.agentMatch(node, { pages, blocks, primitives })

  // Resolve color by looking up the file label against the active maps.
  // fileLabel is a relative path or basename; we approximate by suffix-match.
  let agentColor: string | undefined
  if (result.fileLabel !== undefined) {
    for (const [file, color] of colorByFile) {
      if (file.endsWith(result.fileLabel)) {
        agentColor = color
        break
      }
    }
  }

  let agentReading = false
  if (result.fileLabel !== undefined) {
    for (const file of readingByFile.keys()) {
      if (file.endsWith(result.fileLabel)) {
        agentReading = true
        if (agentColor === undefined) {
          agentColor = readingByFile.get(file)?.color
        }
        break
      }
    }
  }

  return {
    agentActive: result.active,
    agentReading,
    agentFileLabel: result.fileLabel,
    agentColor,
  }
}
