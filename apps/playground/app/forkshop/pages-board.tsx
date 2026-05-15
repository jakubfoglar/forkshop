"use client"

import { useMemo, useRef } from "react"
import {
  ForkshopCanvas,
  Tree,
  BUILTIN_NODE_TYPES,
  responsiveFrameStageDimensions,
  type TreeEntry,
  type IframeRouteNode,
} from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

function humanize(path: string): string {
  if (path === "/") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}

const GRID_STAGE_W = 1264
const GRID_STAGE_H = 400

const { width: ISOLATION_STAGE_W, height: ISOLATION_STAGE_H } = responsiveFrameStageDimensions(
  undefined,
  [1440, 768, 375],
)

export default function PagesBoardView({
  isolatedPath: controlledIsolatedPath,
  onBack: onBackProp,
  onIsolate,
  selectedNodeId,
}: {
  isolatedPath?: string
  onBack?: () => void
  onIsolate?: (path: string) => void
  selectedNodeId?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { nodePositions, onPositionChange } = useForkshopPositions()

  const entries = useMemo<TreeEntry[]>(() => {
    return forkshopConfig.pages.map((p): TreeEntry => {
      const node: IframeRouteNode = {
        id: `page:${p.path}`,
        kind: "iframe-route",
        x: 0,
        y: 0,
        width: 400,
        height: 280,
        routePath: p.path,
      }
      return { id: node.id, label: humanize(p.path), path: p.path, node }
    })
  }, [])

  const isIsolated = controlledIsolatedPath !== undefined

  const stageWidth = isIsolated ? ISOLATION_STAGE_W : GRID_STAGE_W
  const stageHeight = isIsolated ? ISOLATION_STAGE_H : GRID_STAGE_H
  const fitMode = isIsolated ? "width" : "both"

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      fitMode={fitMode}
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      <Tree
        entries={entries}
        isolatedPath={controlledIsolatedPath}
        onBack={onBackProp}
        onIsolatedPathChange={(path) => {
          if (path !== null) onIsolate?.(path)
        }}
        nodePositions={nodePositions}
        onPositionChange={onPositionChange}
        selectedId={selectedNodeId}
      />
    </ForkshopCanvas>
  )
}
