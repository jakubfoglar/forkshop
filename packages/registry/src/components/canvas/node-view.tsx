"use client"

import type { CSSProperties, ReactNode } from "react"
import type { AnyNode } from "@forkshop/types/node"
import type { NodeType, RenderProps } from "@forkshop/types/node-type"
import { NodeFrame } from "@forkshop/components/canvas/node-frame"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import type { NodePosition } from "@forkshop/lib/node-positions"
import type { SnapGuide } from "@forkshop/lib/system-snap"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import { useNodeAgentActive } from "@forkshop/lib/use-node-agent-active"

export function resolveNodeType(
  node: AnyNode,
  nodeTypes: ReadonlyArray<NodeType<AnyNode>>,
): NodeType<AnyNode> | undefined {
  for (const nt of nodeTypes) {
    if (nt.match(node)) return nt
  }
  return undefined
}

export type NodeViewProps = {
  node: AnyNode
  override: NodePosition | undefined
  isSelected: boolean
  agentActive?: boolean
  agentFileLabel?: string
  onSelect?: () => void
  onPositionChange: (id: string, x: number, y: number) => void
  getSnapTargets: GetSnapTargets
  onGuidesChange?: (guides: SnapGuide[]) => void
  onSelectChange?: (id: string, selected: boolean) => void
  onBodyHeightChange?: (height: number) => void
  className?: string
  style?: CSSProperties
}

export function NodeView({
  node,
  override,
  isSelected,
  agentActive,
  agentFileLabel,
  onSelect,
  onPositionChange,
  getSnapTargets,
  onGuidesChange,
  onSelectChange,
  onBodyHeightChange,
  className,
  style,
}: NodeViewProps): ReactNode {
  const { nodeTypes } = useForkshopCanvas()
  const nodeType = resolveNodeType(node, nodeTypes)
  const derivedActivity = useNodeAgentActive(node)
  const effectiveAgentActive = agentActive !== undefined ? agentActive : derivedActivity.agentActive
  const effectiveAgentFileLabel = agentFileLabel ?? derivedActivity.agentFileLabel
  if (!nodeType) {
    if (typeof console !== "undefined") {
      console.warn(`[forkshop] No NodeType matched node ${node.id} (kind=${node.kind})`)
    }
    return null
  }
  const renderProps: RenderProps<AnyNode> = {
    node,
    isSelected,
    agentActive: effectiveAgentActive,
    agentFileLabel: effectiveAgentFileLabel,
    onBodyHeightChange,
  }
  return (
    <NodeFrame
      id={node.id}
      layoutX={node.x}
      layoutY={node.y}
      width={node.width}
      height={node.height}
      override={override}
      label={node.label}
      isSelected={isSelected}
      agentActive={effectiveAgentActive}
      agentFileLabel={effectiveAgentFileLabel}
      onSelect={onSelect}
      onPositionChange={onPositionChange}
      getSnapTargets={getSnapTargets}
      onGuidesChange={onGuidesChange}
      onSelectChange={onSelectChange}
      className={className}
      style={style}
    >
      {nodeType.render(renderProps)}
    </NodeFrame>
  )
}
