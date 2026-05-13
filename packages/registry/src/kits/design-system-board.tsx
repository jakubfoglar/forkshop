"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Config } from "tailwindcss"
import { CanvasNode } from "../components/canvas/canvas-node.js"
import { useFogmaCanvas } from "../components/canvas/fogma-canvas.js"
import { GuideOverlay } from "../components/canvas/guide-overlay.js"
import { useDraggableNode, type GetSnapTargets } from "../hooks/use-draggable-node.js"
import type { NodePosition, NodePositions } from "../lib/node-positions.js"
import { buildTokenRegistry } from "../lib/token-registry.js"
import { buildSystemGraph } from "../lib/system-graph.js"
import {
  layoutSystem,
  COLOR_NODE_WIDTH,
  COLOR_NODE_HEIGHT,
  type PositionedColorNode,
  type SystemLayout,
} from "../lib/system-layout.js"
import { type SnapGuide, type SnapTarget } from "../lib/system-snap.js"
import { TypographyFrame, type TypographyFrameProps } from "./typography-frame.js"
import { type PrimitiveDescriptor } from "./primitives-showcase.js"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPOGRAPHY_WIDTH = 720
const TYPOGRAPHY_HEIGHT = 920
const TYPOGRAPHY_GAP = 80

// Default frame size for each primitive group if not specified
const DEFAULT_PRIMITIVE_WIDTH = 720
const DEFAULT_PRIMITIVE_HEIGHT = 480
const PRIMITIVE_GAP = 40

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type DesignSystemBoardProps = {
  /** Tailwind config used to build the token registry (colors, spacing, etc.). */
  tailwindConfig: Config
  /**
   * UI primitive frames to render in the "Primitives" section.
   * Each entry has an `id`, `name`, and a `render` function returning React content.
   * Optionally include `width` and `height` to control frame dimensions.
   */
  primitives: (PrimitiveDescriptor & { width?: number; height?: number })[]
  /** Options forwarded to the TypographyFrame. */
  typographyOptions?: Omit<TypographyFrameProps, "children">
  /** Controlled node positions (overrides). Pass from persistent state. */
  nodePositions?: NodePositions
  /** Called when the user drags a node. Update `nodePositions` accordingly. */
  onPositionChange?: (id: string, x: number, y: number) => void
  /** Currently selected node id. */
  selectedId?: string
  /** Called when selection changes. */
  onSelectChange?: (id: string, selected: boolean) => void
}

// ---------------------------------------------------------------------------
// Primitive layout helper
// ---------------------------------------------------------------------------

type SizedPrimitive = PrimitiveDescriptor & { width: number; height: number }
type PositionedPrimitive = SizedPrimitive & { x: number; y: number }

function layoutPrimitives(
  primitives: (PrimitiveDescriptor & { width?: number; height?: number })[],
  startY: number,
): { positioned: PositionedPrimitive[]; totalHeight: number } {
  const sized: SizedPrimitive[] = primitives.map((p) => ({
    ...p,
    width: p.width ?? DEFAULT_PRIMITIVE_WIDTH,
    height: p.height ?? DEFAULT_PRIMITIVE_HEIGHT,
  }))

  const positioned: PositionedPrimitive[] = []
  let cursorY = startY
  for (const p of sized) {
    positioned.push({ ...p, x: 0, y: cursorY })
    cursorY += p.height + PRIMITIVE_GAP
  }
  const totalHeight = positioned.length > 0 ? cursorY - startY - PRIMITIVE_GAP : 0
  return { positioned, totalHeight }
}

// ---------------------------------------------------------------------------
// Main board component
// ---------------------------------------------------------------------------

export const DesignSystemBoard = memo(DesignSystemBoardInner)

function DesignSystemBoardInner({
  tailwindConfig,
  primitives,
  typographyOptions,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
}: DesignSystemBoardProps) {
  const tokens = useMemo(() => buildTokenRegistry(tailwindConfig), [tailwindConfig])
  const graph = useMemo(() => buildSystemGraph(tokens), [tokens])

  // Use layoutSystem with no block rows to get the color column layout
  const layout = useMemo(() => layoutSystem(graph, [], {}), [graph])

  // Lay out the primitive frames below the colors section
  const { positioned: positionedPrimitives } = useMemo(
    () => layoutPrimitives(primitives, layout.primitivesBodyY),
    [primitives, layout.primitivesBodyY],
  )

  const typographyDefaultX = layout.width + TYPOGRAPHY_GAP
  const typographyDefaultY = 0

  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const handleGuidesChange = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides)
  }, [])

  const allTargets = useMemo<SnapTarget[]>(() => {
    const targets: SnapTarget[] = []
    for (const node of layout.rawColorNodes) {
      const override = nodePositions[node.id]
      targets.push({
        id: node.id,
        x: override?.x ?? node.x,
        y: override?.y ?? node.y,
        width: node.width,
        height: node.height,
      })
    }
    for (const node of layout.semanticColorNodes) {
      const override = nodePositions[node.id]
      targets.push({
        id: node.id,
        x: override?.x ?? node.x,
        y: override?.y ?? node.y,
        width: node.width,
        height: node.height,
      })
    }
    for (const p of positionedPrimitives) {
      const override = nodePositions[p.id]
      targets.push({
        id: p.id,
        x: override?.x ?? p.x,
        y: override?.y ?? p.y,
        width: p.width,
        height: p.height,
      })
    }
    const typoOverride = nodePositions["foundation:typography"]
    targets.push({
      id: "foundation:typography",
      x: typoOverride?.x ?? typographyDefaultX,
      y: typoOverride?.y ?? typographyDefaultY,
      width: TYPOGRAPHY_WIDTH,
      height: TYPOGRAPHY_HEIGHT,
    })
    return targets
  }, [layout, nodePositions, positionedPrimitives, typographyDefaultX, typographyDefaultY])

  const allTargetsRef = useRef(allTargets)
  useEffect(() => {
    allTargetsRef.current = allTargets
  }, [allTargets])

  const getSnapTargets = useCallback<GetSnapTargets>(
    (excludeId) => allTargetsRef.current.filter((t) => t.id !== excludeId),
    [],
  )

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => {
      onPositionChange?.(id, x, y)
    },
    [onPositionChange],
  )

  const handleSelectChange = useCallback(
    (id: string, selected: boolean) => {
      onSelectChange?.(id, selected)
    },
    [onSelectChange],
  )

  return (
    <>
      <ColorsSection
        layout={layout}
        nodePositions={nodePositions}
        onNodePositionChange={handlePositionChange}
        getSnapTargets={getSnapTargets}
        onGuidesChange={handleGuidesChange}
        selectedId={selectedId}
        onSelectChange={handleSelectChange}
      />

      {positionedPrimitives.map((p) => (
        <CanvasNode
          key={p.id}
          id={p.id}
          layoutX={p.x}
          layoutY={p.y}
          width={p.width}
          height={p.height}
          override={nodePositions[p.id]}
          label={p.name}
          isSelected={selectedId === p.id}
          onPositionChange={handlePositionChange}
          getSnapTargets={getSnapTargets}
          onGuidesChange={handleGuidesChange}
          onSelectChange={handleSelectChange}
          style={{ height: p.height, transition: "box-shadow 120ms ease-out" }}
          className="border border-fogma-border bg-fogma-surface shadow-xs"
        >
          <div className="p-4">{p.render()}</div>
        </CanvasNode>
      ))}

      <CanvasNode
        id="foundation:typography"
        layoutX={typographyDefaultX}
        layoutY={typographyDefaultY}
        width={TYPOGRAPHY_WIDTH}
        height={TYPOGRAPHY_HEIGHT}
        override={nodePositions["foundation:typography"]}
        label="Typography"
        isSelected={selectedId === "foundation:typography"}
        onPositionChange={handlePositionChange}
        getSnapTargets={getSnapTargets}
        onGuidesChange={handleGuidesChange}
        onSelectChange={handleSelectChange}
        style={{ height: TYPOGRAPHY_HEIGHT, transition: "box-shadow 120ms ease-out" }}
        className="border border-fogma-border bg-fogma-surface shadow-xs"
      >
        <TypographyFrame {...typographyOptions} />
      </CanvasNode>

      <GuideOverlay width={layout.width} height={layout.height} guides={activeGuides} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Colors section (raw + semantic nodes + SVG edges)
// ---------------------------------------------------------------------------

function outlineFor(isSelected: boolean, isHovered: boolean): string {
  if (isSelected) return "calc(1.5px / var(--canvas-zoom, 1)) solid #3b82f6"
  if (isHovered) return "calc(1px / var(--canvas-zoom, 1)) solid #93c5fd"
  return "none"
}

type ConnectionIndex = {
  edgesByNode: Map<string, Set<string>>
  neighborsByNode: Map<string, Set<string>>
}

function buildConnectionIndex(layout: SystemLayout): ConnectionIndex {
  const edgesByNode = new Map<string, Set<string>>()
  const neighborsByNode = new Map<string, Set<string>>()
  function addEdge(nodeId: string, edgeId: string) {
    const set = edgesByNode.get(nodeId)
    if (set) set.add(edgeId)
    else edgesByNode.set(nodeId, new Set([edgeId]))
  }
  function addNeighbor(nodeId: string, otherId: string) {
    const set = neighborsByNode.get(nodeId)
    if (set) set.add(otherId)
    else neighborsByNode.set(nodeId, new Set([otherId]))
  }
  for (const edge of layout.colorEdgePaths) {
    addEdge(edge.fromId, edge.id)
    addEdge(edge.toId, edge.id)
    addNeighbor(edge.fromId, edge.toId)
    addNeighbor(edge.toId, edge.fromId)
  }
  return { edgesByNode, neighborsByNode }
}

function ColorsSection({
  layout,
  nodePositions,
  onNodePositionChange,
  getSnapTargets,
  onGuidesChange,
  selectedId,
  onSelectChange,
}: {
  layout: SystemLayout
  nodePositions: NodePositions
  onNodePositionChange: (id: string, x: number, y: number) => void
  getSnapTargets: GetSnapTargets
  onGuidesChange: (guides: SnapGuide[]) => void
  selectedId: string | undefined
  onSelectChange: (id: string, selected: boolean) => void
}) {
  const { isInteractingRef } = useFogmaCanvas()
  const [hoveredId, setHoveredId] = useState<string>()
  const connections = useMemo(() => buildConnectionIndex(layout), [layout])

  const allCards = useMemo(
    () => [...layout.rawColorNodes, ...layout.semanticColorNodes],
    [layout],
  )

  const livePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const card of allCards) {
      const override = nodePositions[card.id]
      map.set(card.id, override ? { x: override.x, y: override.y } : { x: card.x, y: card.y })
    }
    return map
  }, [allCards, nodePositions])

  const liveEdges = useMemo(
    () =>
      layout.colorEdgePaths.map((edge) => {
        const from = livePositions.get(edge.fromId)
        const to = livePositions.get(edge.toId)
        if (!from || !to) return edge
        const fromX = from.x + COLOR_NODE_WIDTH
        const fromY = from.y + COLOR_NODE_HEIGHT / 2
        const toX = to.x
        const toY = to.y + COLOR_NODE_HEIGHT / 2
        const midX = (fromX + toX) / 2
        const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
        return { ...edge, d }
      }),
    [layout.colorEdgePaths, livePositions],
  )

  const highlightedEdges = hoveredId ? connections.edgesByNode.get(hoveredId) : undefined
  const highlightedNodes = useMemo(() => {
    if (!hoveredId) return undefined
    const set = new Set<string>([hoveredId])
    const neighbors = connections.neighborsByNode.get(hoveredId)
    if (neighbors) for (const id of neighbors) set.add(id)
    return set
  }, [hoveredId, connections])

  const isDimming = !!hoveredId

  const handleHoverIn = (id: string) => {
    if (isInteractingRef.current) return
    setHoveredId(id)
  }
  const handleHoverOut = (id: string) => {
    if (isInteractingRef.current) return
    setHoveredId((current) => (current === id ? undefined : current))
  }

  return (
    <>
      <svg
        width={layout.width}
        height={layout.colorsHeight}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
        aria-hidden="true"
      >
        {liveEdges.map((edge) => {
          const isHighlighted = highlightedEdges?.has(edge.id) ?? false
          const opacity = !isDimming || isHighlighted ? 1 : 0.08
          const stroke = isHighlighted ? "#0f1115" : "#cbd5e1"
          const strokeWidth = isHighlighted ? 2.5 : 1.5
          return (
            <path
              key={edge.id}
              d={edge.d}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              opacity={opacity}
            />
          )
        })}
      </svg>
      {allCards.map((positioned) => (
        <ColorCard
          key={positioned.id}
          positioned={positioned}
          isDimmed={isDimming && !(highlightedNodes?.has(positioned.id) ?? false)}
          isHovered={hoveredId === positioned.id}
          override={nodePositions[positioned.id]}
          getSnapTargets={getSnapTargets}
          onGuidesChange={onGuidesChange}
          onPositionChange={onNodePositionChange}
          isSelected={selectedId === positioned.id}
          onSelectChange={onSelectChange}
          onHoverIn={() => handleHoverIn(positioned.id)}
          onHoverOut={() => handleHoverOut(positioned.id)}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Individual color card
// ---------------------------------------------------------------------------

const ColorCard = memo(ColorCardInner)

function ColorCardInner({
  positioned,
  isDimmed,
  isHovered,
  override,
  getSnapTargets,
  onGuidesChange,
  onPositionChange,
  isSelected,
  onSelectChange,
  onHoverIn,
  onHoverOut,
}: {
  positioned: PositionedColorNode
  isDimmed: boolean
  isHovered: boolean
  override: NodePosition | undefined
  getSnapTargets: GetSnapTargets
  onGuidesChange: (guides: SnapGuide[]) => void
  onPositionChange: (id: string, x: number, y: number) => void
  isSelected: boolean
  onSelectChange: (id: string, selected: boolean) => void
  onHoverIn: () => void
  onHoverOut: () => void
}) {
  const { transformRef } = useFogmaCanvas()
  const { containerRef, x, y, dragHandleProps } = useDraggableNode({
    id: positioned.id,
    layoutX: positioned.x,
    layoutY: positioned.y,
    width: positioned.width,
    height: positioned.height,
    override,
    transformRef,
    getSnapTargets,
    onGuidesChange,
    onCommit: onPositionChange,
    onSelectChange: (selected) => onSelectChange(positioned.id, selected),
  })
  const { node } = positioned
  return (
    <div
      ref={containerRef}
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      {...dragHandleProps}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: positioned.width,
        height: positioned.height,
        opacity: isDimmed ? 0.25 : 1,
        transition: "opacity 120ms ease-out",
        touchAction: "none",
        outline: outlineFor(isSelected, isHovered),
        outlineOffset: 0,
      }}
      className="flex items-center gap-1 rounded border border-fogma-border bg-fogma-surface px-1 shadow-xs"
    >
      <span
        aria-hidden="true"
        style={{
          background: node.hex,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
        }}
        className="size-4 shrink-0 rounded"
      />
      <span className="truncate text-xs text-fogma-fg-muted">{node.name}</span>
    </div>
  )
}
