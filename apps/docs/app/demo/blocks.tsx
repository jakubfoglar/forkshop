"use client"

import { useMemo } from "react"
import {
  Gallery,
  useDiscoveredBlocks,
  type GalleryEntry,
  type IframeComponentNode,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export default function BlocksBoardView({
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
  const viewport = forkshopConfig.viewportProfile === "mobile" ? 375 : 1440
  const blocks = useDiscoveredBlocks(forkshopConfig.blocks)
  const entries = useMemo<GalleryEntry[]>(
    () =>
      blocks.map((b) => {
        const node: IframeComponentNode = {
          id: `block:${b.slug}`,
          kind: "iframe-component",
          x: 0,
          y: 0,
          width: viewport,
          height: 3000,
          label: b.name,
          slug: b.slug,
          // Override the default /forkshop/block/ path from discoverBlocks —
          // docs app serves block previews at /demo/block/<slug>
          previewSrc: `/demo/block/${b.slug}`,
        }
        return { id: b.slug, label: b.name, node }
      }),
    [blocks, viewport],
  )
  return (
    <PlaygroundBoard stageWidth={1800} stageHeight={6000} fitMode="width" initialZoom={initialZoom} initialPan={initialPan}>
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="stack"
          viewportWidth={viewport}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
