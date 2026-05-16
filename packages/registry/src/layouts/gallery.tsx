"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import type { AnyNode } from "@forkshop/types/node"
import { forkshopIcons } from "@forkshop/lib/icons"

const DEFAULT_INITIAL_HEIGHT = 600

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
  /**
   * When true, each cell sizes to its content's natural width (measured via
   * the NodeType's onContentWidthChange callback) instead of using the fixed
   * viewportWidth. Useful for showing tight single primitives.
   */
  fitContent?: boolean
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
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
  measuredWidths: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
  fitContent: boolean,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  const cells: LayoutCell[] = []
  let cursorY = 0
  let maxWidth = 0
  for (const entry of entries) {
    const height = measuredHeights[entry.id] ?? DEFAULT_INITIAL_HEIGHT
    const width = fitContent
      ? (measuredWidths[entry.id] ?? viewportWidth)
      : viewportWidth
    cells.push({ id: entry.id, layoutX: 0, layoutY: cursorY, width, height })
    maxWidth = Math.max(maxWidth, width)
    cursorY += height + rowGap
  }
  const stageHeight = Math.max(0, cursorY - rowGap)
  return { cells, stageWidth: maxWidth, stageHeight }
}

function buildGridLayout(
  entries: GalleryEntry[],
  measuredHeights: Readonly<Record<string, number>>,
  measuredWidths: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
  columnGap: number,
  fitContent: boolean,
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
    const width = fitContent
      ? (measuredWidths[entry.id] ?? viewportWidth)
      : viewportWidth
    cells.push({
      id: entry.id,
      layoutX: column * (viewportWidth + columnGap),
      layoutY: rowY.get(row) ?? 0,
      width,
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
  fitContent = false,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
}: GalleryProps) {
  const viewportWidth = vpwProp ?? DEFAULTS[layout].viewportWidth
  const rowGap = rgProp ?? DEFAULTS[layout].rowGap
  const columnGap = cgProp ?? DEFAULTS[layout].columnGap

  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({})
  const handleHeightChange = useCallback((entryId: string, height: number) => {
    setMeasuredHeights((prev) => {
      if (prev[entryId] === height) return prev
      return { ...prev, [entryId]: height }
    })
  }, [])

  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>({})
  const handleWidthChange = useCallback((entryId: string, width: number) => {
    setMeasuredWidths((prev) => {
      if (prev[entryId] === width) return prev
      return { ...prev, [entryId]: width }
    })
  }, [])

  const { cells, stageWidth, stageHeight } = useMemo(() => {
    return layout === "stack"
      ? buildStackLayout(entries, measuredHeights, measuredWidths, viewportWidth, rowGap, fitContent)
      : buildGridLayout(entries, measuredHeights, measuredWidths, viewportWidth, rowGap, columnGap, fitContent)
  }, [entries, layout, measuredHeights, measuredWidths, viewportWidth, rowGap, columnGap, fitContent])

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
            onBodyHeightChange={(h) => handleHeightChange(cell.id, h)}
            onContentWidthChange={(w) => handleWidthChange(cell.id, w)}
          />
        )
      })}
      <GuideOverlay width={stageWidth} height={stageHeight} guides={activeGuides} />
    </>
  )
}
