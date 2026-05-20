"use client"

import { useCallback, useMemo, useRef } from "react"
import { NodeView, type IframeRouteNode, type NodeViewProps } from "@forkshop/engine"
import { PlaygroundBoard } from "../demo/playground-board"
import { buildDemoUrl } from "./build-demo-url"
import type { StudioBoard } from "./types"

type GetSnapTargets = NodeViewProps["getSnapTargets"]

export function StudioBoardView({ board }: { board: StudioBoard }) {
  const stageWidth = Math.max(...board.frames.map((f) => f.x + f.width), 1440)
  const stageHeight = Math.max(...board.frames.map((f) => f.y + f.height), 900)

  const nodes = useMemo<IframeRouteNode[]>(
    () =>
      board.frames.map((frame) => ({
        id: frame.id,
        kind: "iframe-route" as const,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        routePath: buildDemoUrl(frame.demoState),
      })),
    [board.frames],
  )

  // Provide snap targets: every node except the one currently being dragged.
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const getSnapTargets = useCallback<GetSnapTargets>(
    (excludeId) =>
      nodesRef.current
        .filter((n) => n.id !== excludeId)
        .map((n) => ({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height })),
    [],
  )

  return (
    <PlaygroundBoard
      boardId={`studio:${board.id}`}
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      fitMode="none"
    >
      {({ nodePositions, onPositionChange }) => (
        <>
          {nodes.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              override={nodePositions[node.id]}
              isSelected={false}
              onPositionChange={onPositionChange}
              getSnapTargets={getSnapTargets}
            />
          ))}
        </>
      )}
    </PlaygroundBoard>
  )
}
