"use client"

import { useMemo, useState } from "react"
import { buildSystemGraph } from "@forkshop/lib/system-graph"
import {
  layoutSystem,
  COLOR_NODE_WIDTH,
  COLOR_NODE_HEIGHT,
  type PositionedColorNode,
} from "@forkshop/lib/system-layout"
import type { TokenRegistry } from "@forkshop/lib/token-registry"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ColorGraphMode =
  /** Render swatches only — drop connector edges between raw and semantic. */
  | "swatches"
  /** Render swatches plus SVG bezier edges connecting raw colors to their
   *  semantic aliases by matching hex. This matches DesignSystemView. */
  | "semantic-aliases-as-edges"

export type ColorGraphProps = {
  tokens: TokenRegistry
  /** Visual mode. Defaults to "semantic-aliases-as-edges". */
  mode?: ColorGraphMode
}

// ---------------------------------------------------------------------------
// Connection index — neighbors and edges for hover-driven dimming
// ---------------------------------------------------------------------------

type ConnectionIndex = {
  edgesByNode: Map<string, Set<string>>
  neighborsByNode: Map<string, Set<string>>
}

function buildConnectionIndex(
  edges: readonly { id: string; fromId: string; toId: string }[],
): ConnectionIndex {
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
  for (const edge of edges) {
    addEdge(edge.fromId, edge.id)
    addEdge(edge.toId, edge.id)
    addNeighbor(edge.fromId, edge.toId)
    addNeighbor(edge.toId, edge.fromId)
  }
  return { edgesByNode, neighborsByNode }
}

// ---------------------------------------------------------------------------
// Color swatch body — colored square + token name
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
// Color card — absolutely positioned within the ColorGraph's own bounding box
// ---------------------------------------------------------------------------

function ColorCard({
  positioned,
  isDimmed,
  onHoverIn,
  onHoverOut,
}: {
  positioned: PositionedColorNode
  isDimmed: boolean
  onHoverIn: () => void
  onHoverOut: () => void
}) {
  return (
    <div
      aria-label={positioned.node.name}
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      className="flex items-center rounded-forkshop-xxs border border-forkshop-border bg-forkshop-surface shadow-xs"
      style={{
        position: "absolute",
        left: positioned.x,
        top: positioned.y,
        width: positioned.width,
        height: positioned.height,
        opacity: isDimmed ? 0.25 : 1,
        transition: "opacity 120ms ease-out, box-shadow 120ms ease-out",
      }}
    >
      <ColorSwatchBody hex={positioned.node.hex} name={positioned.node.name} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Standalone color showcase extracted from DesignSystemView. Renders raw and
 * semantic color tokens in a near-square grid, optionally connecting raw
 * scale colors to their semantic aliases (matched by hex) with bezier edges.
 *
 * No canvas / NodeView dependency — the component lays itself out internally
 * via `position: absolute` inside its own `position: relative` wrapper, so
 * the parent only needs to give it space.
 */
export function ColorGraph({ tokens, mode = "semantic-aliases-as-edges" }: ColorGraphProps) {
  const graph = useMemo(() => buildSystemGraph(tokens), [tokens])
  const layout = useMemo(() => layoutSystem(graph, [], {}), [graph])

  const allCards = useMemo(
    () => [...layout.rawColorNodes, ...layout.semanticColorNodes],
    [layout],
  )

  const edges = useMemo(
    () => (mode === "semantic-aliases-as-edges" ? layout.colorEdgePaths : []),
    [mode, layout.colorEdgePaths],
  )
  const connections = useMemo(() => buildConnectionIndex(edges), [edges])

  const [hoveredId, setHoveredId] = useState<string>()
  const highlightedEdges = hoveredId ? connections.edgesByNode.get(hoveredId) : undefined
  const highlightedNodes = useMemo(() => {
    if (!hoveredId) return undefined
    const set = new Set<string>([hoveredId])
    const neighbors = connections.neighborsByNode.get(hoveredId)
    if (neighbors) for (const id of neighbors) set.add(id)
    return set
  }, [hoveredId, connections])
  const isDimming = !!hoveredId

  // Wrap the absolute-positioning playground in an overflow:hidden outer so
  // ColorGraph respects the width the parent (a Gallery cell, a Board, etc.)
  // gives it. Without this, layout.colorsWidth can be huge (150+ default
  // Tailwind colors) and push past any parent. Anything inside an
  // overflow-hidden parent stays inside the parent — and crucially, doesn't
  // trip the Forkshop canvas's overflow handling, which would otherwise fall
  // back to native browser scroll and capture wheel events before the canvas
  // can zoom.
  return (
    <div style={{ overflow: "hidden", width: "100%", height: layout.colorsHeight }}>
      <div
        style={{
          position: "relative",
          width: layout.colorsWidth,
          height: layout.colorsHeight,
        }}
      >
        {edges.length > 0 && (
        <svg
          width={layout.colorsWidth}
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
          {edges.map((edge) => {
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
      )}
        {allCards.map((positioned) => (
          <ColorCard
            key={positioned.id}
            positioned={positioned}
            isDimmed={isDimming && !(highlightedNodes?.has(positioned.id) ?? false)}
            onHoverIn={() => setHoveredId(positioned.id)}
            onHoverOut={() =>
              setHoveredId((current) => (current === positioned.id ? undefined : current))
            }
          />
        ))}
      </div>
    </div>
  )
}

// Re-export constants useful to consumers sizing their own layouts.
export { COLOR_NODE_WIDTH, COLOR_NODE_HEIGHT }
