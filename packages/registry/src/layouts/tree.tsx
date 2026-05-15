"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import type { AnyNode } from "@forkshop/types/node"
import { forkshopIcons } from "@forkshop/lib/icons"

const TILE_WIDTH = 400
const TILE_HEIGHT = 280
const COLUMNS = 4
const TILE_GAP_X = 32
const TILE_GAP_Y = 48

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
  focusedEntryId?: string
}

type TileCell = {
  id: string
  path: string
  layoutX: number
  layoutY: number
}

function buildTileLayout(entries: TreeEntry[]): TileCell[] {
  return entries.map((entry, index) => {
    const col = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    return {
      id: entry.id,
      path: entry.path,
      layoutX: col * (TILE_WIDTH + TILE_GAP_X),
      layoutY: row * (TILE_HEIGHT + TILE_GAP_Y),
    }
  })
}

function stageSize(cells: TileCell[]): { width: number; height: number } {
  if (cells.length === 0) return { width: 0, height: 0 }
  const maxX = Math.max(...cells.map((c) => c.layoutX)) + TILE_WIDTH
  const maxY = Math.max(...cells.map((c) => c.layoutY)) + TILE_HEIGHT
  return { width: maxX, height: maxY }
}

const _Tree = memo(TreeInner)
export const Tree: typeof _Tree & {
  icon: typeof forkshopIcons.pages
  defaultTitle: string
} = Object.assign(_Tree, {
  icon: forkshopIcons.pages,
  defaultTitle: "Pages",
})

function TreeInner({
  entries,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
  focusedEntryId,
}: TreeProps) {
  return (
    <SitemapView
      entries={entries}
      nodePositions={nodePositions}
      onPositionChange={onPositionChange}
      selectedId={selectedId}
      onSelectChange={onSelectChange}
      focusedEntryId={focusedEntryId}
    />
  )
}

function SitemapView({
  entries,
  nodePositions,
  onPositionChange,
  selectedId,
  onSelectChange,
  focusedEntryId,
}: {
  entries: TreeEntry[]
  nodePositions: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
  focusedEntryId?: string
}) {
  const { drill } = useForkshopCanvas()
  useEffect(() => {
    if (focusedEntryId === undefined) {
      if (drill.node !== null && entries.some((e) => e.id === drill.node?.id)) {
        drill.clear()
      }
      return
    }
    const entry = entries.find((e) => e.id === focusedEntryId)
    if (entry) drill.mark(entry.node)
  }, [focusedEntryId, entries, drill])

  const cells = useMemo(() => buildTileLayout(entries), [entries])
  const { width: stageWidth, height: stageHeight } = useMemo(() => stageSize(cells), [cells])
  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const handleGuidesChange = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides)
  }, [])

  const allTargets = useMemo<SnapTarget[]>(() => {
    return cells.map((cell) => {
      const override = nodePositions[cell.id]
      return {
        id: cell.id,
        x: override?.x ?? cell.layoutX,
        y: override?.y ?? cell.layoutY,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
      }
    })
  }, [cells, nodePositions])

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
      {cells.map((cell) => {
        const entry = entries.find((e) => e.id === cell.id)
        if (!entry) return null
        const positionedNode: AnyNode = {
          ...entry.node,
          x: cell.layoutX,
          y: cell.layoutY,
          width: TILE_WIDTH,
          height: TILE_HEIGHT,
          label: entry.label ?? entry.node.label,
        }
        return (
          <NodeView
            key={cell.id}
            node={positionedNode}
            override={nodePositions[cell.id]}
            isSelected={selectedId === cell.id}
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
