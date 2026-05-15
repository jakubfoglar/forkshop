"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { ReactNode } from "react"
import { BackButton } from "@forkshop/components/canvas/back-button"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import { ResponsiveFrameView } from "@forkshop/components/canvas/responsive-frame-view"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useAgentActivePages } from "@forkshop/components/agent-activity-context"
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
  viewports?: number[]
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
  isolatedPath?: string
  onBack?: () => void
  onIsolatedPathChange?: (path: string | null) => void
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
  viewports = [1440, 768, 375],
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
  isolatedPath: controlledIsolatedPath,
  onBack,
  onIsolatedPathChange,
}: TreeProps) {
  const [internalIsolated, setInternalIsolated] = useState<string | null>(null)
  const effectiveIsolated =
    controlledIsolatedPath !== undefined
      ? entries.some((e) => e.path === controlledIsolatedPath)
        ? controlledIsolatedPath
        : null
      : internalIsolated

  const handleIsolate = (path: string) => {
    setInternalIsolated(path)
    onIsolatedPathChange?.(path)
  }

  const handleBack = () => {
    setInternalIsolated(null)
    onIsolatedPathChange?.(null)
    onBack?.()
  }

  const showBackButton = controlledIsolatedPath === undefined && internalIsolated !== null

  if (effectiveIsolated !== null) {
    const isolated = entries.find((e) => e.path === effectiveIsolated)
    return (
      <IsolationView
        path={effectiveIsolated}
        src={isolated?.path ?? effectiveIsolated}
        viewports={viewports}
        showBackButton={showBackButton}
        onBack={handleBack}
      />
    )
  }

  return (
    <SitemapView
      entries={entries}
      nodePositions={nodePositions}
      onPositionChange={onPositionChange}
      selectedId={selectedId}
      onSelectChange={onSelectChange}
      onIsolate={handleIsolate}
    />
  )
}

function SitemapView({
  entries,
  nodePositions,
  onPositionChange,
  selectedId,
  onSelectChange,
  onIsolate,
}: {
  entries: TreeEntry[]
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
            onIsolate={() => onIsolate(entry.path)}
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
        createPortal(
          <BackButton destinationLabel="Overview" onBack={onBack} />,
          containerRef.current,
        )}
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
