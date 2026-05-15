"use client"

import { useMemo, useRef } from "react"
import {
  ForkshopCanvas,
  Tree,
  BUILTIN_NODE_TYPES,
  type TreeEntry,
  type IframeRouteNode,
} from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

const STAGE_W = 1264
const STAGE_H = 400

function humanize(path: string): string {
  if (path === "/") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}

export default function PagesBoardView({
  onBack,
  selectedNodeId,
}: {
  onBack?: () => void
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

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="both"
      nodeTypes={BUILTIN_NODE_TYPES}
      onBack={onBack}
    >
      <Tree
        entries={entries}
        selectedId={selectedNodeId}
        nodePositions={nodePositions}
        onPositionChange={onPositionChange}
      />
    </ForkshopCanvas>
  )
}
