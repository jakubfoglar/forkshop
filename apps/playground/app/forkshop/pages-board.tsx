"use client"

import { useMemo } from "react"
import { Tree, type TreeEntry, type IframeRouteNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

const PAGES_STAGE_PADDING = 200

function humanizePagePath(path: string): string {
  if (path === "/") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}

export function PagesBoard({
  nodePositions,
  onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const entries = useMemo<TreeEntry[]>(
    () =>
      forkshopConfig.pages.map((p): TreeEntry => {
        const node: IframeRouteNode = {
          id: `page:${p.path}`,
          kind: "iframe-route",
          x: 0,
          y: 0,
          width: 400,
          height: 280,
          routePath: p.path,
          sourceFile: p.sourceFile,
        }
        return { id: node.id, label: humanizePagePath(p.path), path: p.path, node }
      }),
    [],
  )

  const { width: treeW, height: treeH } = useMemo(() => Tree.getStageSize(entries), [entries])

  return (
    <PlaygroundBoard
      stageWidth={treeW + PAGES_STAGE_PADDING}
      stageHeight={treeH + PAGES_STAGE_PADDING}
      fitMode="both"
    >
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Tree
          entries={entries}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
