"use client"

import { useMemo, useRef } from "react"
import {
  ForkshopCanvas,
  Gallery,
  BUILTIN_NODE_TYPES,
  type GalleryEntry,
  type IframeComponentNode,
} from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

const STAGE_W = 1200
const STAGE_H = 2200

export default function ComponentsBoardView({ selectedNodeId }: { selectedNodeId?: string } = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { nodePositions, onPositionChange } = useForkshopPositions()

  const entries = useMemo<GalleryEntry[]>(() => {
    return forkshopConfig.blocks.map((b): GalleryEntry => {
      const node: IframeComponentNode = {
        id: `block:${b.slug}`,
        kind: "iframe-component",
        x: 0,
        y: 0,
        width: 1200,
        height: 600,
        slug: b.slug,
        previewSrc: b.iframeSrc,
        componentPath: b.sourcePath,
      }
      return { id: node.id, label: b.name, node }
    })
  }, [])

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="width"
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      <Gallery
          entries={entries}
          layout="stack"
          nodePositions={nodePositions}
          onPositionChange={onPositionChange}
          selectedId={selectedNodeId}
        />
    </ForkshopCanvas>
  )
}
