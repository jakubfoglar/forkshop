"use client"

import { useMemo } from "react"
import { Tree, type TreeEntry, type IframeRouteNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"

const SITEMAP_STAGE_PADDING = 200

// Playground routes declared inline — the playground is a hand-maintained dev
// surface. Users would derive these from the filesystem via the sitemap config.
const PLAYGROUND_ROUTES: { path: string; sourceFile: string }[] = [
  { path: "/", sourceFile: "app/page.tsx" },
  { path: "/about", sourceFile: "app/about/page.tsx" },
  { path: "/pricing", sourceFile: "app/pricing/page.tsx" },
]

function humanizePagePath(path: string): string {
  if (path === "/") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}

export function SitemapBoard({
  nodePositions: _nodePositions,
  onPositionChange: _onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const entries = useMemo<TreeEntry[]>(
    () =>
      PLAYGROUND_ROUTES.map((r): TreeEntry => {
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
