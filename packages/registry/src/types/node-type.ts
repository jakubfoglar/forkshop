import type { ReactNode } from "react"
import type { AnyNode } from "@forkshop/types/node"

export type RenderProps<T extends AnyNode> = {
  node: T
  isSelected: boolean
  agentActive: boolean
  agentFileLabel?: string
}

export type DrillInProps<T extends AnyNode> = {
  node: T
  onBack: () => void
}

export type NodeType<T extends AnyNode = AnyNode> = {
  id: string
  match: (node: AnyNode) => node is T
  render: (props: RenderProps<T>) => ReactNode
  drillIn?: (props: DrillInProps<T>) => ReactNode
  defaultMode?: "interactive-live" | "click-into" | "static"
  enterMode?: "double-click" | "single-click" | "never"
  activityKey?: (node: T) => string | undefined
}
