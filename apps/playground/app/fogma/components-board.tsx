"use client"

import { useRef } from "react"
import { FogmaCanvas, IframeGallery } from "@fogma/registry"
import { fogmaConfig } from "./fogma.config"

// Stack layout: viewport width 1200, 3 blocks stacked ~600px each → ~1900px total height.
const STAGE_W = 1200
const STAGE_H = 2200

export default function ComponentsBoardView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <FogmaCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="width"
    >
      <IframeGallery entries={[...fogmaConfig.blocks]} layout="stack" />
    </FogmaCanvas>
  )
}
