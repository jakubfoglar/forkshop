"use client"

import { useMemo, useRef, useState } from "react"
import {
  ForkshopCanvas,
  Tree,
  BUILTIN_NODE_TYPES,
  responsiveFrameStageDimensions,
  type TreeEntry,
  type IframeRouteNode,
} from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"

const GRID_STAGE_W = 1264
const GRID_STAGE_H = 400

const { width: ISOLATION_STAGE_W, height: ISOLATION_STAGE_H } = responsiveFrameStageDimensions(
  undefined,
  [1440, 768, 375],
)

export default function PagesBoardView({
  isolatedPath: controlledIsolatedPath,
  onBack: onBackProp,
}: {
  isolatedPath?: string
  onBack?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [internalIsolated, setInternalIsolated] = useState<string | null>(null)

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
      return { id: node.id, path: p.path, node }
    })
  }, [])

  const isIsolated =
    controlledIsolatedPath !== undefined ? true : internalIsolated !== null

  const stageWidth = isIsolated ? ISOLATION_STAGE_W : GRID_STAGE_W
  const stageHeight = isIsolated ? ISOLATION_STAGE_H : GRID_STAGE_H
  const fitMode = isIsolated ? "width" : "both"

  const handleBack = () => {
    setInternalIsolated(null)
    onBackProp?.()
  }

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
        onBack={handleBack}
        onIsolatedPathChange={setInternalIsolated}
      />
    </ForkshopCanvas>
  )
}
