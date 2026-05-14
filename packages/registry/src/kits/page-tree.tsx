"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BackButton } from "@forkshop/components/canvas/back-button"
import { CanvasNode } from "@forkshop/components/canvas/canvas-node"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { ResponsiveFrameView } from "@forkshop/components/canvas/responsive-frame-view"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useAgentActivePages } from "@forkshop/components/agent-activity-context"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePosition, NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import { forkshopIcons } from "@forkshop/lib/icons"

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
  /**
   * Controlled isolated path. When provided, overrides internal isolation state
   * and immediately shows the isolation (drill-in) view for the given path.
   * If the path doesn't match any entry the grid view is shown instead.
   */
  isolatedPath?: string
  /**
   * Called when the user clicks the "Back" button in isolation view.
   * When not provided, the component manages isolation state internally.
   */
  onBack?: () => void
  /**
   * Called when the internal isolation state changes (double-click enters
   * isolation or back button exits it) in uncontrolled mode.
   * Use this to react to isolation state changes from the parent, e.g. to
   * switch the ForkshopCanvas stageWidth for zoom-to-fit.
   * Only fires when `isolatedPath` prop is not provided (uncontrolled mode).
   */
  onIsolatedPathChange?: (path: string | null) => void
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
// Main kit component — rendered inside a <ForkshopCanvas> provided by the caller
// ---------------------------------------------------------------------------

const _PageTree = memo(PageTreeInner)
export const PageTree: typeof _PageTree & {
  icon: typeof forkshopIcons.pages
  defaultTitle: string
} = Object.assign(_PageTree, {
  icon: forkshopIcons.pages,
  defaultTitle: "Pages",
})

function PageTreeInner({
  entries,
  iframeSrcResolver = (p) => p,
  viewports = [1440, 768, 375],
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
  isolatedPath: controlledIsolatedPath,
  onBack,
  onIsolatedPathChange,
}: PageTreeProps) {
  const [internalIsolated, setInternalIsolated] = useState<string | null>(null)

  // Controlled mode: if isolatedPath prop is provided, use it.
  // Uncontrolled mode: use internal state driven by double-click.
  const effectiveIsolated =
    controlledIsolatedPath !== undefined
      ? // Validate that the path actually exists in entries; fall back to null (grid).
        entries.some((e) => e.path === controlledIsolatedPath)
        ? controlledIsolatedPath
        : null
      : internalIsolated

  // In uncontrolled mode, notify parent whenever isolation state changes
  // so it can update stageWidth for zoom-to-fit.
  const handleIsolate = (path: string) => {
    setInternalIsolated(path)
    if (controlledIsolatedPath === undefined) {
      onIsolatedPathChange?.(path)
    }
  }

  const handleBack = () => {
    if (onBack) {
      // Parent controls navigation — let it handle the state update.
      // Also clear internal state so a subsequent double-click works correctly.
      setInternalIsolated(null)
      if (controlledIsolatedPath === undefined) {
        onIsolatedPathChange?.(null)
      }
      onBack()
    } else {
      setInternalIsolated(null)
      onIsolatedPathChange?.(null)
    }
  }

  // Show the back button only when isolation was triggered by internal
  // double-click. When the host controls isolatedPath externally (e.g. sidebar
  // navigation), the back button is hidden — the host owns that UI.
  const showBackButton = controlledIsolatedPath === undefined && internalIsolated !== null

  // Isolation view: replace the canvas content with a 3-viewport drill-in.
  if (effectiveIsolated !== null) {
    return (
      <IsolationView
        path={effectiveIsolated}
        src={iframeSrcResolver(effectiveIsolated)}
        viewports={viewports}
        showBackButton={showBackButton}
        onBack={handleBack}
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
      onIsolate={handleIsolate}
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
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)
  const activePages = useAgentActivePages()
  const agentActive = activePages.has(entry.path)
  const label = entry.label ?? humanize(entry.path)

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
      id={id}
      layoutX={cell.layoutX}
      layoutY={cell.layoutY}
      width={TILE_WIDTH}
      height={TILE_HEIGHT}
      override={override}
      label={label}
      isSelected={isSelected}
      agentActive={agentActive}
      agentFileLabel={agentActive ? pageFileLabel(entry.path) : undefined}
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
        desktopWidth={1440}
        onIframeWheel={handleIframeWheel}
        onIframeDblClick={() => onIsolate(entry.path)}
        iframeRef={(element) => { iframeRef.current = element ?? null }}
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
  showBackButton,
  onBack,
}: {
  path: string
  src: string
  viewports: number[]
  showBackButton: boolean
  onBack: () => void
}) {
  const { applyWheelInput, transformRef, containerRef } = useForkshopCanvas()
  const activePages = useAgentActivePages()
  const agentActive = activePages.has(path)
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  // Track when containerRef is populated so the portal can attach.
  const [containerReady, setContainerReady] = useState(false)
  useEffect(() => {
    setContainerReady(!!containerRef.current)
  }, [containerRef])

  const handleBodyHeightChange = useCallback((_id: string, height: number) => {
    setMeasuredHeight(height)
  }, [])

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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {showBackButton &&
        containerReady &&
        containerRef.current &&
        createPortal(<BackButton destinationLabel="Overview" onBack={onBack} />, containerRef.current)}
      <ResponsiveFrameView
        kind="page"
        path={path}
        source={src}
        measuredHeight={measuredHeight}
        onBodyHeightChange={handleBodyHeightChange}
        onIframeWheel={handleIframeWheel}
        viewports={viewports}
        agentActive={agentActive}
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

function pageFileLabel(path: string): string {
  if (path === "/") return "page.tsx"
  const segments = path.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? "page"
  return `${last}/page.tsx`
}

function humanize(path: string): string {
  if (path === "/") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}
