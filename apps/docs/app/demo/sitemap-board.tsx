"use client"

import { useMemo } from "react"
import { Tree, type TreeEntry, type IframeRouteNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"

const SITEMAP_STAGE_PADDING = 200

// WAVECLASH demo site routes — the landing page at /demo/site is the only page.
// Additional routes can be added here as the demo site grows.
const DEMO_ROUTES: { path: string; sourceFile: string }[] = [
  { path: "/demo/site", sourceFile: "apps/docs/app/demo/site/page.tsx" },
]

function humanizePagePath(path: string): string {
  if (path === "/demo/site") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}

export function SitemapBoard({
  nodePositions: _nodePositions,
  onPositionChange: _onPositionChange,
  initialZoom,
  initialPan,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
  initialZoom?: number
  initialPan?: { x: number; y: number }
}) {
  const entries = useMemo<TreeEntry[]>(
    () =>
      DEMO_ROUTES.map((r): TreeEntry => {
        const node: IframeRouteNode = {
          id: `page:${r.path}`,
          kind: "iframe-route",
          x: 0,
          y: 0,
          width: 400,
          height: 280,
          routePath: r.path,
          sourceFile: r.sourceFile,
        }
        return { id: node.id, label: humanizePagePath(r.path), path: r.path, node }
      }),
    [],
  )

  const { width: treeW, height: treeH } = useMemo(() => Tree.getStageSize(entries), [entries])

  return (
    <PlaygroundBoard
      stageWidth={treeW + SITEMAP_STAGE_PADDING}
      stageHeight={treeH + SITEMAP_STAGE_PADDING}
      fitMode="both"
      initialZoom={initialZoom}
      initialPan={initialPan}
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
