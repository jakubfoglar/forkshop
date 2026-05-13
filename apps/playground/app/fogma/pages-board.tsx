"use client"

import { useRef } from "react"
import { FogmaCanvas, PageTree } from "@fogma/registry"
import { fogmaConfig } from "./fogma.config"

// 3 pages in a 4-column grid → all in one row.
// Each tile is 400×280. One row with 3 columns: 3×400 + 2×32 gap = 1264 wide.
const STAGE_W = 1264
const STAGE_H = 400

export default function PagesBoardView({
  isolatedPath,
  onBack,
}: {
  isolatedPath?: string
  onBack?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <FogmaCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="both"
    >
      <PageTree
        entries={[...fogmaConfig.pages]}
        isolatedPath={isolatedPath}
        onBack={onBack}
      />
    </FogmaCanvas>
  )
}
