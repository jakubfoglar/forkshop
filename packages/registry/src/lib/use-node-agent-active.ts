"use client"

import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
} from "@forkshop/components/agent-activity-context"
import type { AnyNode } from "@forkshop/types/node"

export type NodeAgentActivity = {
  agentActive: boolean
  agentFileLabel: string | undefined
}

export function useNodeAgentActive(node: AnyNode): NodeAgentActivity {
  const activePages = useAgentActivePages()
  const activeBlocks = useAgentActiveBlocks()
  const activePrimitives = useAgentActivePrimitives()

  if (node.kind === "iframe-route") {
    const active = activePages.has(node.routePath)
    return {
      agentActive: active,
      agentFileLabel: active ? pageFileLabel(node.routePath) : undefined,
    }
  }
  if (node.kind === "iframe-component") {
    const active = activeBlocks.has(node.slug)
    return {
      agentActive: active,
      agentFileLabel: active ? `${node.slug}.tsx` : undefined,
    }
  }
  if (node.kind === "inline-react") {
    const idMatch = activePrimitives.has(node.id)
    const filePathMatch = node.filePath !== undefined && activePrimitives.has(node.filePath)
    return {
      agentActive: idMatch || filePathMatch,
      agentFileLabel: undefined,
    }
  }
  return { agentActive: false, agentFileLabel: undefined }
}

function pageFileLabel(path: string): string {
  if (path === "/") return "page.tsx"
  const segments = path.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? "page"
  return `${last}/page.tsx`
}
