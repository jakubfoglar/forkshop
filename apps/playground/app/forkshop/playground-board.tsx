"use client"

import { useRef, type ReactNode } from "react"
import { ForkshopCanvas, BUILTIN_NODE_TYPES } from "@forkshop/engine"
import { useForkshopPositions } from "./use-forkshop-positions"

export type PlaygroundBoardChildrenProps = {
  nodePositions: ReturnType<typeof useForkshopPositions>["nodePositions"]
  onPositionChange: ReturnType<typeof useForkshopPositions>["onPositionChange"]
}

export function PlaygroundBoard({
  stageWidth,
  stageHeight,
  fitMode = "both",
  children,
}: {
  stageWidth: number
  stageHeight: number
  fitMode?: "width" | "both"
  children: (props: PlaygroundBoardChildrenProps) => ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const positions = useForkshopPositions()

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      fitMode={fitMode}
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      {children(positions)}
    </ForkshopCanvas>
  )
}
