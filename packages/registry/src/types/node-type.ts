import type { ReactNode } from "react"
import type { AnyNode } from "@forkshop/types/node"

export type AgentActivitySnapshot = {
  pages: ReadonlySet<string>
  blocks: ReadonlySet<string>
  primitives: ReadonlySet<string>
}

export type AgentMatchResult = {
  active: boolean
  fileLabel?: string
}

export type RenderProps<T extends AnyNode> = {
  node: T
  isSelected: boolean
  agentActive: boolean
  agentFileLabel?: string
}

export type NodeType<T extends AnyNode = AnyNode> = {
  id: string
  match: (node: AnyNode) => node is T
  render: (props: RenderProps<T>) => ReactNode
  agentMatch?: (node: T, activity: AgentActivitySnapshot) => AgentMatchResult
}
