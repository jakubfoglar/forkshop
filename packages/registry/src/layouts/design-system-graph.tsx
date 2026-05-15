"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePosition, NodePositions } from "@forkshop/lib/node-positions"
import { buildSystemGraph } from "@forkshop/lib/system-graph"
import {
  layoutSystem,
  COLOR_NODE_WIDTH,
  COLOR_NODE_HEIGHT,
  type PositionedColorNode,
  type SystemLayout,
} from "@forkshop/lib/system-layout"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import type { TokenRegistry } from "@forkshop/lib/token-registry"
import { forkshopIcons } from "@forkshop/lib/icons"
import type { AnyNode, InlineReactNode } from "@forkshop/types/node"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPOGRAPHY_WIDTH = 720
const TYPOGRAPHY_HEIGHT = 920
const TYPOGRAPHY_GAP = 80

const DEFAULT_PRIMITIVE_WIDTH = 720
const DEFAULT_PRIMITIVE_HEIGHT = 480
const PRIMITIVE_GAP = 40

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type PrimitiveGroup = {
  id: string
  label: string
  primitives: AnyNode[]
}

export type DesignSystemGraphProps = {
  tokens: TokenRegistry
  primitives: PrimitiveGroup[]
  typography?: AnyNode
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}

// ---------------------------------------------------------------------------
// Primitive layout helper
// ---------------------------------------------------------------------------

type PositionedPrimitiveNode = {
  node: AnyNode
  x: number
  y: number
  width: number
  height: number
}

function layoutPrimitiveGroups(
  groups: PrimitiveGroup[],
  startY: number,
): PositionedPrimitiveNode[] {
  const positioned: PositionedPrimitiveNode[] = []
  let cursorY = startY
  for (const group of groups) {
    for (const node of group.primitives) {
      const width = node.width > 0 ? node.width : DEFAULT_PRIMITIVE_WIDTH
      const height = node.height > 0 ? node.height : DEFAULT_PRIMITIVE_HEIGHT
      positioned.push({ node, x: 0, y: cursorY, width, height })
      cursorY += height + PRIMITIVE_GAP
    }
  }
  return positioned
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const _DesignSystemGraph = memo(DesignSystemGraphInner)
export const DesignSystemGraph: typeof _DesignSystemGraph & {
  icon: typeof forkshopIcons.designSystem
  defaultTitle: string
} = Object.assign(_DesignSystemGraph, {
  icon: forkshopIcons.designSystem,
  defaultTitle: "Foundations",
})

function DesignSystemGraphInner({
  tokens,
  primitives,
  typography,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
}: DesignSystemGraphProps) {
  const graph = useMemo(() => buildSystemGraph(tokens), [tokens])
  const layout = useMemo(() => layoutSystem(graph, [], {}), [graph])

  const positionedPrimitives = useMemo(
    () => layoutPrimitiveGroups(primitives, layout.primitivesBodyY),
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
    for (const pp of positionedPrimitives) {
      const override = nodePositions[pp.node.id]
      targets.push({
        id: pp.node.id,
        x: override?.x ?? pp.x,
        y: override?.y ?? pp.y,
        width: pp.width,
        height: pp.height,
      })
    }
    if (typography) {
      const override = nodePositions[typography.id]
      const w = typography.width > 0 ? typography.width : TYPOGRAPHY_WIDTH
      const h = typography.height > 0 ? typography.height : TYPOGRAPHY_HEIGHT
      targets.push({
        id: typography.id,
        x: override?.x ?? typographyDefaultX,
        y: override?.y ?? typographyDefaultY,
        width: w,
        height: h,
      })
    }
    return targets
  }, [layout, nodePositions, positionedPrimitives, typography, typographyDefaultX, typographyDefaultY])

  const allTargetsRef = useRef(allTargets)
  useEffect(() => {
    allTargetsRef.current = allTargets
  }, [allTargets])

  const getSnapTargets = useCallback<GetSnapTargets>(
    (excludeId) => allTargetsRef.current.filter((t) => t.id !== excludeId),
    [],
  )

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => onPositionChange?.(id, x, y),
    [onPositionChange],
  )
  const handleSelectChange = useCallback(
    (id: string, selected: boolean) => onSelectChange?.(id, selected),
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

      {positionedPrimitives.map((pp) => {
        const positionedNode: AnyNode = {
          ...pp.node,
          x: pp.x,
          y: pp.y,
          width: pp.width,
          height: pp.height,
        }
        return (
          <NodeView
            key={pp.node.id}
            node={positionedNode}
            override={nodePositions[pp.node.id]}
            isSelected={selectedId === pp.node.id}
            onPositionChange={handlePositionChange}
            getSnapTargets={getSnapTargets}
            onGuidesChange={handleGuidesChange}
            onSelectChange={handleSelectChange}
          />
        )
      })}

      {typography && (
        <NodeView
          node={{
            ...typography,
            x: typographyDefaultX,
            y: typographyDefaultY,
            width: typography.width > 0 ? typography.width : TYPOGRAPHY_WIDTH,
            height: typography.height > 0 ? typography.height : TYPOGRAPHY_HEIGHT,
          }}
          override={nodePositions[typography.id]}
          isSelected={selectedId === typography.id}
          onPositionChange={handlePositionChange}
          getSnapTargets={getSnapTargets}
          onGuidesChange={handleGuidesChange}
          onSelectChange={handleSelectChange}
        />
      )}

      <GuideOverlay width={layout.width} height={layout.height} guides={activeGuides} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Colors section (raw + semantic nodes + SVG edges)
// ---------------------------------------------------------------------------

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
  const { isInteractingRef } = useForkshopCanvas()
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
// Color swatch body — rendered by the inline-react node type
// ---------------------------------------------------------------------------

function ColorSwatchBody({ hex, name }: { hex: string; name: string }) {
  return (
    <div className="flex h-full items-center gap-forkshop-1 px-forkshop-1">
      <span
        aria-hidden="true"
        style={{
          background: hex,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
        }}
        className="size-forkshop-4 shrink-0 rounded-forkshop-xxs"
      />
      <span className="truncate text-forkshop-xs text-forkshop-fg-muted">{name}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual color card — NodeView-backed, with hover-driven dimming
// ---------------------------------------------------------------------------

const ColorCard = memo(ColorCardInner)

function ColorCardInner({
  positioned,
  isDimmed,
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
  override: NodePosition | undefined
  getSnapTargets: GetSnapTargets
  onGuidesChange: (guides: SnapGuide[]) => void
  onPositionChange: (id: string, x: number, y: number) => void
  isSelected: boolean
  onSelectChange: (id: string, selected: boolean) => void
  onHoverIn: () => void
  onHoverOut: () => void
}) {
  const { hex, name } = positioned.node
  const inlineNode = useMemo<InlineReactNode>(
    () => ({
      id: positioned.id,
      kind: "inline-react",
      x: positioned.x,
      y: positioned.y,
      width: positioned.width,
      height: positioned.height,
      render: () => <ColorSwatchBody hex={hex} name={name} />,
    }),
    // hex/name are stable for a given layout; rebuild when positioned id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positioned.id, positioned.x, positioned.y, positioned.width, positioned.height, hex, name],
  )

  return (
    // Wrapper only for hover events; NodeFrame inside is position:absolute
    // and positions itself, so this element has no effective layout footprint.
    <div onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}>
      <NodeView
        node={inlineNode}
        override={override}
        isSelected={isSelected}
        onPositionChange={onPositionChange}
        getSnapTargets={getSnapTargets}
        onGuidesChange={onGuidesChange}
        onSelectChange={onSelectChange}
        className="flex items-center rounded-forkshop-xxs border border-forkshop-border bg-forkshop-surface shadow-xs"
        style={{
          height: positioned.height,
          opacity: isDimmed ? 0.25 : 1,
          transition: "opacity 120ms ease-out, box-shadow 120ms ease-out",
        }}
      />
    </div>
  )
}
