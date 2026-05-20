"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import type { LayoutEntry } from "@forkshop/types/layout"
import type { AnyNode } from "@forkshop/types/node"
import { forkshopIcons } from "@forkshop/lib/icons"

const DEFAULT_INITIAL_HEIGHT = 600

const DEFAULTS = {
  stack: { viewportWidth: 1200, rowGap: 32, columnGap: 0 },
  grid: { viewportWidth: 400, rowGap: 48, columnGap: 32 },
} as const

export type GalleryEntry = {
  label?: ReactNode
  node: AnyNode
  row?: number
  column?: number
}

export type GalleryOptions = {
  columns?: number
  rowGap?: number
  columnGap?: number
  rulers?: boolean
  rulerUnit?: "px" | "rem"
}

/**
 * Pure helper that computes (x, y) placements for each entry given the
 * Layout protocol's LayoutEntry shape. Used by Gallery's stageSize contract
 * and downstream Layout protocol consumers. Three modes, detected from input:
 *
 * 1. Grid (explicit) — if any entry sets `row` or `column`, place all entries
 *    on a grid using per-column max-widths and per-row max-heights from
 *    `node.width` / `node.height`.
 * 2. Freeform — no explicit row/column, but at least one node has nonzero
 *    `node.x` or `node.y`. Use the node's own coords directly.
 * 3. Auto-flow — neither of the above. Walk entries in array order; assign
 *    `column = i % columns`, `row = floor(i / columns)`; place using per-
 *    column widths and per-row heights derived from the entries.
 */
export function computeGalleryPlacements(
  entries: LayoutEntry[],
  options: GalleryOptions,
): Record<string, { x: number; y: number }> {
  const columns = Math.max(1, options.columns ?? 1)
  const rowGap = options.rowGap ?? 24
  const columnGap = options.columnGap ?? 24

  const hasExplicit = entries.some((e) => e.row !== undefined || e.column !== undefined)
  const hasFreeform =
    !hasExplicit && entries.some((e) => e.node.x !== 0 || e.node.y !== 0)

  if (hasFreeform) {
    const out: Record<string, { x: number; y: number }> = {}
    for (const e of entries) {
      out[e.id] = { x: e.node.x, y: e.node.y }
    }
    return out
  }

  // Resolve (row, column) per entry — either explicit or auto-flow.
  const resolved: { entry: LayoutEntry; r: number; c: number }[] = entries.map(
    (entry, i) => {
      if (hasExplicit) {
        return { entry, r: entry.row ?? 0, c: entry.column ?? 0 }
      }
      return { entry, r: Math.floor(i / columns), c: i % columns }
    },
  )

  // Per-column max width, per-row max height.
  const colWidths = new Map<number, number>()
  const rowHeights = new Map<number, number>()
  for (const { entry, r, c } of resolved) {
    colWidths.set(c, Math.max(colWidths.get(c) ?? 0, entry.node.width))
    rowHeights.set(r, Math.max(rowHeights.get(r) ?? 0, entry.node.height))
  }

  // Cumulative offsets along each axis (sorted ascending).
  const sortedCols = [...colWidths.keys()].sort((a, b) => a - b)
  const sortedRows = [...rowHeights.keys()].sort((a, b) => a - b)
  const colX = new Map<number, number>()
  const rowY = new Map<number, number>()
  let xCursor = 0
  for (const c of sortedCols) {
    colX.set(c, xCursor)
    xCursor += (colWidths.get(c) ?? 0) + columnGap
  }
  let yCursor = 0
  for (const r of sortedRows) {
    rowY.set(r, yCursor)
    yCursor += (rowHeights.get(r) ?? 0) + rowGap
  }

  const out: Record<string, { x: number; y: number }> = {}
  for (const { entry, r, c } of resolved) {
    out[entry.id] = { x: colX.get(c) ?? 0, y: rowY.get(r) ?? 0 }
  }
  return out
}

export type GalleryProps = {
  entries: GalleryEntry[]
  layout: "stack" | "grid"
  /**
   * Number of columns in grid mode. When entries omit `row`/`column`,
   * Gallery auto-flows by index using this value. Defaults to 2.
   * Ignored when any entry sets `row` or `column` explicitly.
   */
  columns?: number
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
    const height = measuredHeights[entry.node.id] ?? DEFAULT_INITIAL_HEIGHT
    const width = fitContent
      ? (measuredWidths[entry.node.id] ?? viewportWidth)
      : viewportWidth
    cells.push({ id: entry.node.id, layoutX: 0, layoutY: cursorY, width, height })
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
  columnsProp: number | undefined,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  const hasExplicit = entries.some(
    (e) => e.row !== undefined || e.column !== undefined,
  )
  const autoColumns = Math.max(1, columnsProp ?? 2)

  // Resolve (row, column) per entry — explicit fields take precedence;
  // otherwise auto-flow by index across `autoColumns` columns.
  const resolved = entries.map((entry, i) => {
    if (hasExplicit) {
      return { entry, row: entry.row ?? 0, column: entry.column ?? 0 }
    }
    return {
      entry,
      row: Math.floor(i / autoColumns),
      column: i % autoColumns,
    }
  })

  const rowMaxHeights = new Map<number, number>()
  for (const { entry, row } of resolved) {
    const height = measuredHeights[entry.node.id] ?? DEFAULT_INITIAL_HEIGHT
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
  for (const { entry, row, column } of resolved) {
    maxColumn = Math.max(maxColumn, column)
    const height = measuredHeights[entry.node.id] ?? DEFAULT_INITIAL_HEIGHT
    const width = fitContent
      ? (measuredWidths[entry.node.id] ?? viewportWidth)
      : viewportWidth
    cells.push({
      id: entry.node.id,
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
  columns,
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
      : buildGridLayout(entries, measuredHeights, measuredWidths, viewportWidth, rowGap, columnGap, fitContent, columns)
  }, [entries, layout, measuredHeights, measuredWidths, viewportWidth, rowGap, columnGap, fitContent, columns])

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
        const entry = entries.find((e) => e.node.id === cell.id)
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
            fitContent={fitContent}
          />
        )
      })}
      <GuideOverlay width={stageWidth} height={stageHeight} guides={activeGuides} />
    </>
  )
}
