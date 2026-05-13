"use client"

import { useRef } from "react"
import { ForkshopCanvas, DesignSystemBoard } from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"

// Stage dimensions for the design system board.
// The board lays out color nodes + primitives; 3000×2400 is spacious enough
// for the default token set and fits fine at the initial zoom-to-fit level.
const STAGE_W = 3000
const STAGE_H = 2400

export default function DesignSystemBoardView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="both"
    >
      <DesignSystemBoard
        tailwindConfig={forkshopConfig.tailwindConfig}
        primitives={[...forkshopConfig.primitives]}
      />
    </ForkshopCanvas>
  )
}
