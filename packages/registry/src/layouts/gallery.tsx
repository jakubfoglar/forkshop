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

const DEFAULT_INITIAL_HEIGHT = 600
const EMPTY_MEASURED_HEIGHTS: Readonly<Record<string, number>> = {}

const DEFAULTS = {
  stack: { viewportWidth: 1200, rowGap: 32, columnGap: 0 },
  grid: { viewportWidth: 400, rowGap: 48, columnGap: 32 },
} as const

export type GalleryEntry = {
  id: string
  label?: ReactNode
  node: AnyNode
  row?: number
  column?: number
}

export type GalleryProps = {
  entries: GalleryEntry[]
  layout: "stack" | "grid"
  viewportWidth?: number
  rowGap?: number
  columnGap?: number
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
  focusedEntryId?: string
}

type LayoutCell = {
  id: string
  layoutX: number
  layoutY: number
  width: number
  height: number
}

function buildStackLayout(
  entries: GalleryEntry[],
  measuredHeights: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  const cells: LayoutCell[] = []
  let cursorY = 0
  for (const entry of entries) {
    const height = measuredHeights[entry.id] ?? DEFAULT_INITIAL_HEIGHT
    cells.push({ id: entry.id, layoutX: 0, layoutY: cursorY, width: viewportWidth, height })
    cursorY += height + rowGap
  }
  const stageHeight = Math.max(0, cursorY - rowGap)
  return { cells, stageWidth: viewportWidth, stageHeight }
}

function buildGridLayout(
  entries: GalleryEntry[],
  measuredHeights: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
  columnGap: number,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  const rowMaxHeights = new Map<number, number>()
  for (const entry of entries) {
    const row = entry.row ?? 0
    const height = measuredHeights[entry.id] ?? DEFAULT_INITIAL_HEIGHT
    rowMaxHeights.set(row, Math.max(rowMaxHeights.get(row) ?? 0, height))
  }
  const sortedRows = [...rowMaxHeights.keys()].sort((a, b) => a - b)
  const rowY = new Map<number, number>()
  let cursorY = 0
  for (const row of sortedRows) {
    rowY.set(row, cursorY)
    cursorY += (rowMaxHeights.get(row) ?? DEFAULT_INITIAL_HEIGHT) + rowGap
  }
  let maxColumn = 0
  const cells: LayoutCell[] = []
  for (const entry of entries) {
    const row = entry.row ?? 0
    const column = entry.column ?? 0
    maxColumn = Math.max(maxColumn, column)
    const height = measuredHeights[entry.id] ?? DEFAULT_INITIAL_HEIGHT
    cells.push({
      id: entry.id,
      layoutX: column * (viewportWidth + columnGap),
      layoutY: rowY.get(row) ?? 0,
      width: viewportWidth,
      height,
    })
  }
  const stageWidth = (maxColumn + 1) * viewportWidth + maxColumn * columnGap
  const stageHeight = Math.max(0, cursorY - rowGap)
  return { cells, stageWidth, stageHeight }
}

const _Gallery = memo(GalleryInner)
export const Gallery: typeof _Gallery & {
  icon: typeof forkshopIcons.components
  defaultTitle: string
} = Object.assign(_Gallery, {
  icon: forkshopIcons.components,
  defaultTitle: "Components",
})

function GalleryInner({
  entries,
  layout,
  viewportWidth: vpwProp,
  rowGap: rgProp,
  columnGap: cgProp,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
  focusedEntryId,
}: GalleryProps) {
  const viewportWidth = vpwProp ?? DEFAULTS[layout].viewportWidth
  const rowGap = rgProp ?? DEFAULTS[layout].rowGap
  const columnGap = cgProp ?? DEFAULTS[layout].columnGap

  const { drill } = useForkshopCanvas()
  useEffect(() => {
    if (focusedEntryId === undefined) {
      // Only clear if this layout's entries currently own the drill — guards
      // against a sibling layout clearing a drill we didn't set.
      if (drill.node !== null && entries.some((e) => e.id === drill.node?.id)) {
        drill.clear()
      }
      return
    }
    const entry = entries.find((e) => e.id === focusedEntryId)
    if (entry) drill.mark(entry.node)
  }, [focusedEntryId, entries, drill])

  const { cells, stageWidth, stageHeight } = useMemo(() => {
    return layout === "stack"
      ? buildStackLayout(entries, EMPTY_MEASURED_HEIGHTS, viewportWidth, rowGap)
      : buildGridLayout(entries, EMPTY_MEASURED_HEIGHTS, viewportWidth, rowGap, columnGap)
  }, [entries, layout, viewportWidth, rowGap, columnGap])

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
        width: cell.width,
        height: cell.height,
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
      {cells.map((cell) => {
        const entry = entries.find((e) => e.id === cell.id)
        if (!entry) return null
        const positionedNode: AnyNode = {
          ...entry.node,
          x: cell.layoutX,
          y: cell.layoutY,
          width: cell.width,
          height: cell.height,
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
