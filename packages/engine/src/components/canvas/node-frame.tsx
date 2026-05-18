"use client"

import {
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react"
import type { NodePosition } from "@forkshop/lib/node-positions"
import type { SnapGuide } from "@forkshop/lib/system-snap"
import { CanvasLabel } from "@forkshop/components/canvas/canvas-label"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useDraggableNode, type GetSnapTargets } from "@forkshop/hooks/use-draggable-node"

function outlineFor(isSelected: boolean, isHovered: boolean): string {
  if (isSelected) {
    return "calc(1.5px / var(--canvas-zoom, 1)) solid #3b82f6"
  }
  if (isHovered) {
    return "calc(1px / var(--canvas-zoom, 1)) solid #93c5fd"
  }
  return "none"
}

const FALLBACK_AGENT_COLOR = "oklch(0.62 0.22 280)"

function agentBoxShadow(agentActive: boolean, color: string): string | undefined {
  if (!agentActive) return undefined
  return `0 0 0 calc(2px / var(--canvas-zoom, 1)) ${color}, 0 0 0 calc(7px / var(--canvas-zoom, 1)) color-mix(in oklch, ${color} 18%, transparent)`
}

export type NodeFrameProps = {
  id: string
  layoutX: number
  layoutY: number
  width: number
  height: number
  override: NodePosition | undefined
  label?: ReactNode
  isSelected: boolean
  agentActive?: boolean
  agentFileLabel?: string
  agentColor?: string
  onSelect?: () => void
  onPositionChange: (id: string, x: number, y: number) => void
  getSnapTargets: GetSnapTargets
  onGuidesChange?: (guides: SnapGuide[]) => void
  onSelectChange?: (id: string, selected: boolean) => void
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function NodeFrame({
  id,
  layoutX,
  layoutY,
  width,
  height,
  override,
  label,
  isSelected,
  agentActive = false,
  agentFileLabel,
  agentColor,
  onSelect,
  onPositionChange,
  getSnapTargets,
  onGuidesChange,
  onSelectChange,
  className,
  style,
  children,
}: NodeFrameProps) {
  const { transformRef } = useForkshopCanvas()
  const [isBodyHovered, setIsBodyHovered] = useState(false)
  const [isLabelHovered, setIsLabelHovered] = useState(false)
  const isHovered = isBodyHovered || isLabelHovered
  const { containerRef, x, y, dragHandleProps } = useDraggableNode({
    id,
    layoutX,
    layoutY,
    width,
    height,
    override,
    transformRef,
    getSnapTargets,
    onGuidesChange,
    onCommit: onPositionChange,
    onSelectChange:
      onSelectChange === undefined ? undefined : (selected) => onSelectChange(id, selected),
  })
  const effectiveAgentColor = agentColor ?? FALLBACK_AGENT_COLOR
  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsBodyHovered(true)}
      onMouseLeave={() => setIsBodyHovered(false)}
      onClick={
        onSelect === undefined
          ? undefined
          : (event: ReactMouseEvent<HTMLDivElement>) => {
              event.stopPropagation()
              onSelect()
            }
      }
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        outline: outlineFor(isSelected, isHovered),
        outlineOffset: 0,
        boxShadow: agentBoxShadow(agentActive, effectiveAgentColor),
        ...style,
      }}
      className={className}
    >
      {label !== undefined && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: 6,
          }}
        >
          <CanvasLabel
            selected={isSelected}
            hovered={isLabelHovered}
            onMouseEnter={() => setIsLabelHovered(true)}
            onMouseLeave={() => setIsLabelHovered(false)}
            style={{ touchAction: "none" }}
            {...dragHandleProps}
          >
            {label}
          </CanvasLabel>
        </div>
      )}
      {agentActive && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            right: 0,
            marginBottom: 6,
            pointerEvents: "none",
          }}
        >
          <CanvasLabel
            style={{
              transformOrigin: "bottom right",
              background: effectiveAgentColor,
              color: "white",
              padding: "1px 6px",
              borderRadius: 3,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "white",
                  animation: "forkshop-agent-pulse 1.2s infinite",
                }}
              />
              <span>Claude · {agentFileLabel ?? "editing"}</span>
            </span>
          </CanvasLabel>
        </div>
      )}
      {children}
    </div>
  )
}
