"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CanvasNode } from "@forkshop/components/canvas/canvas-node"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useAgentActiveBlocks } from "@forkshop/components/agent-activity-context"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePosition, NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import { forkshopIcons } from "@forkshop/lib/icons"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_INITIAL_HEIGHT = 600

const DEFAULTS = {
  stack: { viewportWidth: 1200, rowGap: 32, columnGap: 0 },
  grid: { viewportWidth: 400, rowGap: 48, columnGap: 32 },
} as const

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type IframeGalleryEntry = {
  /** Unique identifier; used as part of the canvas node id. */
  slug: string
  /** Human-readable label shown above the node. */
  name: string
  /** URL to render inside the iframe (e.g. `/forkshop/preview/<slug>`). */
  iframeSrc: string
  /**
   * Row index for grid layout (0-based).
   * Ignored in stack layout.
   */
  row?: number
  /**
   * Column index for grid layout (0-based).
   * Ignored in stack layout.
   */
  column?: number
}

export type IframeGalleryProps = {
  entries: IframeGalleryEntry[]
  /**
   * - `"stack"`: entries arranged in a vertical column (mirrors blocks-board).
   * - `"grid"`:  entries positioned by `{row, column}` coordinates (mirrors
   *              navigation-board).
   */
  layout: "stack" | "grid"
  /**
   * Iframe viewport width in CSS pixels.
   * Defaults: stack → 1200, grid → 400.
   */
  viewportWidth?: number
  /**
   * Vertical gap between rows in pixels.
   * Defaults: stack → 32, grid → 48.
   */
  rowGap?: number
  /**
   * Horizontal gap between columns in pixels (grid only).
   * Default: 32.
   */
  columnGap?: number
  /** Controlled node positions (overrides from persistent state). */
  nodePositions?: NodePositions
  /** Called when the user drags a node. Update `nodePositions` accordingly. */
  onPositionChange?: (id: string, x: number, y: number) => void
  /** Currently selected node id. */
  selectedId?: string
  /** Called when selection changes. */
  onSelectChange?: (id: string, selected: boolean) => void
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

type LayoutCell = {
  slug: string
  layoutX: number
  layoutY: number
  width: number
  height: number
}

function buildStackLayout(
  entries: IframeGalleryEntry[],
  measuredHeights: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  const cells: LayoutCell[] = []
  let cursorY = 0
  for (const entry of entries) {
    const height = measuredHeights[entry.slug] ?? DEFAULT_INITIAL_HEIGHT
    cells.push({ slug: entry.slug, layoutX: 0, layoutY: cursorY, width: viewportWidth, height })
    cursorY += height + rowGap
  }
  const stageHeight = Math.max(0, cursorY - rowGap)
  return { cells, stageWidth: viewportWidth, stageHeight }
}

function buildGridLayout(
  entries: IframeGalleryEntry[],
  measuredHeights: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
  columnGap: number,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  // Determine the max row height for each row index so cells in the same row
  // start at a consistent y even if individual heights differ.
  const rowMaxHeights = new Map<number, number>()
  for (const entry of entries) {
    const row = entry.row ?? 0
    const height = measuredHeights[entry.slug] ?? DEFAULT_INITIAL_HEIGHT
    rowMaxHeights.set(row, Math.max(rowMaxHeights.get(row) ?? 0, height))
  }

  // Build cumulative row y offsets.
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
    const height = measuredHeights[entry.slug] ?? DEFAULT_INITIAL_HEIGHT
    cells.push({
      slug: entry.slug,
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

// ---------------------------------------------------------------------------
// Main kit component (renders inside <ForkshopCanvas>)
// ---------------------------------------------------------------------------

const _IframeGallery = memo(IframeGalleryInner)
export const IframeGallery: typeof _IframeGallery & {
  icon: typeof forkshopIcons.components
  defaultTitle: string
} = Object.assign(_IframeGallery, {
  icon: forkshopIcons.components,
  defaultTitle: "Components",
})

function IframeGalleryInner({
  entries,
  layout,
  viewportWidth: vpwProp,
  rowGap: rgProp,
  columnGap: cgProp,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
}: IframeGalleryProps) {
  const viewportWidth = vpwProp ?? DEFAULTS[layout].viewportWidth
  const rowGap = rgProp ?? DEFAULTS[layout].rowGap
  const columnGap = cgProp ?? DEFAULTS[layout].columnGap

  // Measured iframe body heights; updated via onBodyHeightSync.
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({})
  const handleHeightChange = useCallback((slug: string, height: number) => {
    setMeasuredHeights((prev) => {
      if (prev[slug] === height) return prev
      return { ...prev, [slug]: height }
    })
  }, [])

  const { cells, stageWidth, stageHeight } = useMemo(() => {
    return layout === "stack"
      ? buildStackLayout(entries, measuredHeights, viewportWidth, rowGap)
      : buildGridLayout(entries, measuredHeights, viewportWidth, rowGap, columnGap)
  }, [entries, layout, measuredHeights, viewportWidth, rowGap, columnGap])

  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const handleGuidesChange = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides)
  }, [])

  const allTargets = useMemo<SnapTarget[]>(() => {
    return cells.map((cell) => {
      const id = `gallery:${cell.slug}`
      const override = nodePositions[id]
      return {
        id,
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
        const nodeId = `gallery:${cell.slug}`
        const entry = entries.find((e) => e.slug === cell.slug)
        if (!entry) return null
        return (
          <GalleryNode
            key={nodeId}
            nodeId={nodeId}
            entry={entry}
            cell={cell}
            override={nodePositions[nodeId] as NodePosition | undefined}
            isSelected={selectedId === nodeId}
            getSnapTargets={getSnapTargets}
            onGuidesChange={handleGuidesChange}
            onPositionChange={handlePositionChange}
            onSelectChange={handleSelectChange}
            onHeightChange={handleHeightChange}
          />
        )
      })}
      <GuideOverlay width={stageWidth} height={stageHeight} guides={activeGuides} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Individual gallery node
// ---------------------------------------------------------------------------

const GalleryNode = memo(GalleryNodeInner)

function GalleryNodeInner({
  nodeId,
  entry,
  cell,
  override,
  isSelected,
  getSnapTargets,
  onGuidesChange,
  onPositionChange,
  onSelectChange,
  onHeightChange,
}: {
  nodeId: string
  entry: IframeGalleryEntry
  cell: LayoutCell
  override: NodePosition | undefined
  isSelected: boolean
  getSnapTargets: GetSnapTargets
  onGuidesChange: (guides: SnapGuide[]) => void
  onPositionChange: (id: string, x: number, y: number) => void
  onSelectChange: (id: string, selected: boolean) => void
  onHeightChange: (slug: string, height: number) => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)
  const activeBlocks = useAgentActiveBlocks()
  const agentActive = activeBlocks.has(entry.slug)

  const handleBodyHeightSync = useCallback(
    (height: number) => onHeightChange(entry.slug, height),
    [entry.slug, onHeightChange],
  )

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  return (
    <CanvasNode
      id={nodeId}
      layoutX={cell.layoutX}
      layoutY={cell.layoutY}
      width={cell.width}
      height={cell.height}
      override={override}
      label={entry.name}
      isSelected={isSelected}
      agentActive={agentActive}
      agentFileLabel={agentActive ? `${entry.slug}.tsx` : undefined}
      onPositionChange={onPositionChange}
      getSnapTargets={getSnapTargets}
      onGuidesChange={onGuidesChange}
      onSelectChange={onSelectChange}
    >
      <LazyIframe
        src={entry.iframeSrc}
        title={entry.name}
        width={cell.width}
        heightCap={cell.height}
        onBodyHeightSync={handleBodyHeightSync}
        onIframeWheel={handleIframeWheel}
        iframeRef={(element) => { iframeRef.current = element ?? null }}
        className="bg-white shadow-md"
      />
    </CanvasNode>
  )
}
