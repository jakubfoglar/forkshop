"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BackButton } from "../components/canvas/back-button.js"
import { CanvasNode } from "../components/canvas/canvas-node.js"
import { GuideOverlay } from "../components/canvas/guide-overlay.js"
import { LazyIframe } from "../components/canvas/lazy-iframe.js"
import { ResponsiveFrameView } from "../components/canvas/responsive-frame-view.js"
import type { GetSnapTargets } from "../hooks/use-draggable-node.js"
import type { NodePosition, NodePositions } from "../lib/node-positions.js"
import type { SnapGuide, SnapTarget } from "../lib/system-snap.js"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tile dimensions in the sitemap (overview) view. */
const TILE_WIDTH = 400
const TILE_HEIGHT = 280

/** Number of columns in the auto-grid layout. */
const COLUMNS = 4

/** Horizontal and vertical gap between tiles. */
const TILE_GAP_X = 32
const TILE_GAP_Y = 48

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PageTreeEntry = {
  /** Page path, e.g. "/" or "/about" or "/dashboard/settings". */
  path: string
  /**
   * Human-readable label shown above the tile.
   * Defaults to `humanize(path)` when omitted.
   */
  label?: string
}

export type PageTreeProps = {
  /** Pages to render in the sitemap overview. */
  entries: PageTreeEntry[]
  /**
   * Maps a path to the URL loaded inside the iframe.
   * Defaults to the identity function (uses `path` as the URL directly).
   * Use this when preview URLs differ from canonical paths.
   */
  iframeSrcResolver?: (path: string) => string
  /**
   * Viewport widths (px) shown in the isolation drill-in view.
   * Defaults to [1440, 768, 375].
   */
  viewports?: number[]
  /** Controlled node positions (overrides from persistent state). */
  nodePositions?: NodePositions
  /** Called when the user drags a tile. Update `nodePositions` accordingly. */
  onPositionChange?: (id: string, x: number, y: number) => void
  /** Currently selected node id. */
  selectedId?: string
  /** Called when selection changes. */
  onSelectChange?: (id: string, selected: boolean) => void
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

type TileCell = {
  path: string
  layoutX: number
  layoutY: number
}

function buildTileLayout(entries: PageTreeEntry[]): TileCell[] {
  return entries.map((entry, index) => {
    const col = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    return {
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

// ---------------------------------------------------------------------------
// Main kit component — rendered inside a <FogmaCanvas> provided by the caller
// ---------------------------------------------------------------------------

export const PageTree = memo(PageTreeInner)

function PageTreeInner({
  entries,
  iframeSrcResolver = (p) => p,
  viewports = [1440, 768, 375],
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
}: PageTreeProps) {
  const [isolatedPath, setIsolatedPath] = useState<string | null>(null)

  // Isolation view: replace the canvas content with a 3-viewport drill-in.
  if (isolatedPath !== null) {
    return (
      <IsolationView
        path={isolatedPath}
        src={iframeSrcResolver(isolatedPath)}
        viewports={viewports}
        onBack={() => setIsolatedPath(null)}
      />
    )
  }

  return (
    <SitemapView
      entries={entries}
      iframeSrcResolver={iframeSrcResolver}
      nodePositions={nodePositions}
      onPositionChange={onPositionChange}
      selectedId={selectedId}
      onSelectChange={onSelectChange}
      onIsolate={setIsolatedPath}
    />
  )
}

// ---------------------------------------------------------------------------
// Sitemap (overview) view
// ---------------------------------------------------------------------------

function SitemapView({
  entries,
  iframeSrcResolver,
  nodePositions,
  onPositionChange,
  selectedId,
  onSelectChange,
  onIsolate,
}: {
  entries: PageTreeEntry[]
  iframeSrcResolver: (path: string) => string
  nodePositions: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
  onIsolate: (path: string) => void
}) {
  const cells = useMemo(() => buildTileLayout(entries), [entries])
  const { width: stageWidth, height: stageHeight } = useMemo(() => stageSize(cells), [cells])

  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const handleGuidesChange = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides)
  }, [])

  const allTargets = useMemo<SnapTarget[]>(() => {
    return cells.map((cell) => {
      const id = nodeId(cell.path)
      const override = nodePositions[id]
      return {
        id,
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
        const entry = entries.find((e) => e.path === cell.path)
        if (!entry) return null
        const id = nodeId(cell.path)
        return (
          <PageTile
            key={id}
            nodeId={id}
            entry={entry}
            cell={cell}
            override={nodePositions[id] as NodePosition | undefined}
            isSelected={selectedId === id}
            iframeSrc={iframeSrcResolver(entry.path)}
            getSnapTargets={getSnapTargets}
            onGuidesChange={handleGuidesChange}
            onPositionChange={handlePositionChange}
            onSelectChange={handleSelectChange}
            onIsolate={onIsolate}
          />
        )
      })}
      <GuideOverlay width={stageWidth} height={stageHeight} guides={activeGuides} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Individual page tile
// ---------------------------------------------------------------------------

const PageTile = memo(PageTileInner)

function PageTileInner({
  nodeId: id,
  entry,
  cell,
  override,
  isSelected,
  iframeSrc,
  getSnapTargets,
  onGuidesChange,
  onPositionChange,
  onSelectChange,
  onIsolate,
}: {
  nodeId: string
  entry: PageTreeEntry
  cell: TileCell
  override: NodePosition | undefined
  isSelected: boolean
  iframeSrc: string
  getSnapTargets: GetSnapTargets
  onGuidesChange: (guides: SnapGuide[]) => void
  onPositionChange: (id: string, x: number, y: number) => void
  onSelectChange: (id: string, selected: boolean) => void
  onIsolate: (path: string) => void
}) {
  const label = entry.label ?? humanize(entry.path)

  return (
    <CanvasNode
      id={id}
      layoutX={cell.layoutX}
      layoutY={cell.layoutY}
      width={TILE_WIDTH}
      height={TILE_HEIGHT}
      override={override}
      label={label}
      isSelected={isSelected}
      onIsolate={() => onIsolate(entry.path)}
      onPositionChange={onPositionChange}
      getSnapTargets={getSnapTargets}
      onGuidesChange={onGuidesChange}
      onSelectChange={onSelectChange}
    >
      <LazyIframe
        src={iframeSrc}
        title={label}
        width={TILE_WIDTH}
        heightCap={TILE_HEIGHT}
        className="bg-white shadow-md"
      />
    </CanvasNode>
  )
}

// ---------------------------------------------------------------------------
// Isolation (drill-in) view
// ---------------------------------------------------------------------------

function IsolationView({
  path,
  src,
  viewports,
  onBack,
}: {
  path: string
  src: string
  viewports: number[]
  onBack: () => void
}) {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)

  const handleBodyHeightChange = useCallback((_id: string, height: number) => {
    setMeasuredHeight(height)
  }, [])

  // Isolation boards in ravineo-web receive wheel events via useFogmaCanvas.
  // Here we provide a no-op; callers that need scroll-canvas-via-iframe
  // behaviour can extend this kit or wire their own handler.
  const handleIframeWheel = useCallback(() => {
    // no-op — wheel events inside the isolation iframe are not propagated to
    // the canvas by default. Wrap PageTree in a custom host to override.
  }, [])

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <BackButton destinationLabel="Overview" onBack={onBack} />
      <ResponsiveFrameView
        kind="page"
        path={path}
        source={src}
        measuredHeight={measuredHeight}
        onBodyHeightChange={handleBodyHeightChange}
        onIframeWheel={handleIframeWheel}
        viewports={viewports}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function nodeId(path: string): string {
  return `page-tree:${path}`
}

function humanize(path: string): string {
  if (path === "/") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}
