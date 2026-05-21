"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import type { Layout } from "@forkshop/types/layout"
import type { AnyNode } from "@forkshop/types/node"
import { forkshopIcons } from "@forkshop/lib/icons"

const TILE_WIDTH = 400
const TILE_HEIGHT = 280
const H_GAP = 32
const V_GAP = 80
const CONNECTOR_COLOR = "oklch(0.85 0 0)"
const CONNECTOR_WIDTH = 1

export type TreeEntry = {
  id: string
  label?: ReactNode
  path: string
  node: AnyNode
}

export type TreeProps = {
  entries: TreeEntry[]
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}

// ---------------------------------------------------------------------------
// Hierarchy layout
// ---------------------------------------------------------------------------

type TreeNode = {
  entry: TreeEntry
  children: TreeNode[]
}

type PlacedNode = {
  id: string
  entry: TreeEntry
  layoutX: number
  layoutY: number
  subtreeWidth: number
}

// `/` and any single-segment path ("/about", "/contact") are roots. A path like
// `/about/team` has `/about` as parent — but only if `/about` is in the entries
// set. Orphans are treated as roots so they still render somewhere.
function findParentPath(path: string, paths: Set<string>): string | null {
  if (path === "/") return null
  const lastSlash = path.lastIndexOf("/")
  if (lastSlash <= 0) return null
  const parent = path.substring(0, lastSlash)
  return paths.has(parent) ? parent : null
}

function buildForest(entries: TreeEntry[]): TreeNode[] {
  const paths = new Set(entries.map((e) => e.path))
  const byPath = new Map<string, TreeNode>()
  for (const entry of entries) byPath.set(entry.path, { entry, children: [] })
  const roots: TreeNode[] = []
  for (const entry of entries) {
    const node = byPath.get(entry.path)
    if (!node) continue
    const parentPath = findParentPath(entry.path, paths)
    if (parentPath === null) {
      roots.push(node)
    } else {
      const parent = byPath.get(parentPath)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  }
  return roots
}

// Recursive tidy-tree layout. Each node returns its placed self plus all
// descendants, with subtreeWidth equal to either TILE_WIDTH or the sum of
// children's subtree widths plus inter-child gaps.
function placeSubtree(
  node: TreeNode,
  startX: number,
  startY: number,
  accumulator: PlacedNode[],
): PlacedNode {
  if (node.children.length === 0) {
    const placed: PlacedNode = {
      id: node.entry.id,
      entry: node.entry,
      layoutX: startX,
      layoutY: startY,
      subtreeWidth: TILE_WIDTH,
    }
    accumulator.push(placed)
    return placed
  }
  // Layout children first to know subtree widths.
  const childY = startY + TILE_HEIGHT + V_GAP
  let cursorX = startX
  const placedChildren: PlacedNode[] = []
  for (const [index, child] of node.children.entries()) {
    if (index > 0) cursorX += H_GAP
    const placed = placeSubtree(child, cursorX, childY, accumulator)
    placedChildren.push(placed)
    cursorX += placed.subtreeWidth
  }
  const childrenSpan = cursorX - startX
  const subtreeWidth = Math.max(TILE_WIDTH, childrenSpan)
  // Center parent above its children's span.
  const parentX = startX + (subtreeWidth - TILE_WIDTH) / 2
  const placed: PlacedNode = {
    id: node.entry.id,
    entry: node.entry,
    layoutX: parentX,
    layoutY: startY,
    subtreeWidth,
  }
  accumulator.push(placed)
  return placed
}

function layoutForest(entries: TreeEntry[]): PlacedNode[] {
  const roots = buildForest(entries)
  const placed: PlacedNode[] = []
  let cursorX = 0
  for (const [index, root] of roots.entries()) {
    if (index > 0) cursorX += H_GAP
    const rootPlaced = placeSubtree(root, cursorX, 0, placed)
    cursorX += rootPlaced.subtreeWidth
  }
  return placed
}

function stageSize(placed: PlacedNode[]): { width: number; height: number } {
  if (placed.length === 0) return { width: 0, height: 0 }
  const maxX = Math.max(...placed.map((p) => p.layoutX)) + TILE_WIDTH
  const maxY = Math.max(...placed.map((p) => p.layoutY)) + TILE_HEIGHT
  return { width: maxX, height: maxY }
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

// Compute the stage dimensions a Tree will produce for a given entries set.
// Layouts that host a Tree (e.g., the playground) can call this to size their
// stage to match the tidy-tree's actual content footprint — avoiding both
// content-overflow (panning/zooming hits weird edges) and excess empty space.
export function getTreeStageSize(entries: TreeEntry[]): { width: number; height: number } {
  return stageSize(layoutForest(entries))
}

const _Tree = memo(TreeInner)
export const Tree: typeof _Tree & {
  icon: typeof forkshopIcons.sitemap
  defaultTitle: string
  getStageSize: typeof getTreeStageSize
} = Object.assign(_Tree, {
  icon: forkshopIcons.sitemap,
  defaultTitle: "Sitemap",
  getStageSize: getTreeStageSize,
})

function TreeInner({
  entries,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
}: TreeProps) {
  return (
    <SitemapView
      entries={entries}
      nodePositions={nodePositions}
      onPositionChange={onPositionChange}
      selectedId={selectedId}
      onSelectChange={onSelectChange}
    />
  )
}

function SitemapView({
  entries,
  nodePositions,
  onPositionChange,
  selectedId,
  onSelectChange,
}: {
  entries: TreeEntry[]
  nodePositions: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}) {
  const placed = useMemo(() => layoutForest(entries), [entries])
  const { width: stageWidth, height: stageHeight } = useMemo(() => stageSize(placed), [placed])

  // Connector lines parent.bottom-center → child.top-center. Computed from
  // LIVE positions so the lines follow nodes as the user drags them.
  const livePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const p of placed) {
      const override = nodePositions[p.id]
      map.set(p.id, override ? { x: override.x, y: override.y } : { x: p.layoutX, y: p.layoutY })
    }
    return map
  }, [placed, nodePositions])

  const connectors = useMemo(() => {
    const lines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = []
    const paths = new Set(entries.map((e) => e.path))
    for (const entry of entries) {
      const parentPath = findParentPath(entry.path, paths)
      if (!parentPath) continue
      const parentEntry = entries.find((e) => e.path === parentPath)
      if (!parentEntry) continue
      const parentPos = livePositions.get(parentEntry.id)
      const childPos = livePositions.get(entry.id)
      if (!parentPos || !childPos) continue
      lines.push({
        id: `${parentEntry.id}->${entry.id}`,
        x1: parentPos.x + TILE_WIDTH / 2,
        y1: parentPos.y + TILE_HEIGHT,
        x2: childPos.x + TILE_WIDTH / 2,
        y2: childPos.y,
      })
    }
    return lines
  }, [entries, livePositions])

  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const handleGuidesChange = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides)
  }, [])

  const allTargets = useMemo<SnapTarget[]>(() => {
    return placed.map((p) => {
      const override = nodePositions[p.id]
      return {
        id: p.id,
        x: override?.x ?? p.layoutX,
        y: override?.y ?? p.layoutY,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
      }
    })
  }, [placed, nodePositions])

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
      <svg
        width={stageWidth}
        height={stageHeight}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
        aria-hidden="true"
      >
        {connectors.map((line) => {
          // Stepped (3-segment) path: down from parent to mid-y, across, then down to child.
          const midY = (line.y1 + line.y2) / 2
          const d = `M ${line.x1} ${line.y1} L ${line.x1} ${midY} L ${line.x2} ${midY} L ${line.x2} ${line.y2}`
          return (
            <path
              key={line.id}
              d={d}
              stroke={CONNECTOR_COLOR}
              strokeWidth={CONNECTOR_WIDTH}
              fill="none"
            />
          )
        })}
      </svg>
      {placed.map((p) => {
        const positionedNode: AnyNode = {
          ...p.entry.node,
          x: p.layoutX,
          y: p.layoutY,
          width: TILE_WIDTH,
          height: TILE_HEIGHT,
          label: p.entry.label ?? p.entry.node.label,
        }
        return (
          <NodeView
            key={p.id}
            node={positionedNode}
            override={nodePositions[p.id]}
            isSelected={selectedId === p.id}
            onPositionChange={handlePositionChange}
            getSnapTargets={getSnapTargets}
            onGuidesChange={handleGuidesChange}
            onSelectChange={handleSelectChange}
          />
        )
      })}
      <GuideOverlay width={stageWidth} height={stageHeight} guides={activeGuides} />
    </>
  )
}

export type TreeOptions = {
  connectors?: "stepped" | "curved" | "straight"
  rowHeight?: number
}

export const treeLayoutProtocol: Layout<TreeOptions> = {
  id: "tree",
  icon: forkshopIcons.pages,
  defaultOptions: { connectors: "stepped", rowHeight: 80 },
  render: ({ entries, nodePositions, onPositionChange, selectedId, onSelectChange }) => {
    const handleSelect = onSelectChange
      ? (id: string, selected: boolean) => onSelectChange(selected ? id : undefined)
      : undefined
    // Cast: Tree requires TreeEntry shape (with `path`); LayoutEntry has no `path`.
    // Users wiring a Board to layout="tree" must supply path-bearing entries —
    // missing `path` will throw at render time inside buildForest/findParentPath.
    return (
      <Tree
        entries={entries as unknown as TreeEntry[]}
        nodePositions={nodePositions}
        onPositionChange={onPositionChange}
        selectedId={selectedId}
        onSelectChange={handleSelect}
      />
    )
  },
  stageSize: (entries) => getTreeStageSize(entries as unknown as TreeEntry[]),
}
