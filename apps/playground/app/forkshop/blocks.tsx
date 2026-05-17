"use client"

import { useMemo } from "react"
import { Gallery, type GalleryEntry, type IframeComponentNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export default function BlocksBoardView({
  nodePositions: _nodePositions,
  onPositionChange: _onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const viewport = 1440
  const entries = useMemo<GalleryEntry[]>(
    () =>
      forkshopConfig.blocks.map((b) => {
        const node: IframeComponentNode = {
          id: `block:${b.slug}`,
          kind: "iframe-component",
          x: 0,
          y: 0,
          width: viewport,
          height: 600,
          label: b.name,
          slug: b.slug,
          previewSrc: b.src,
        }
        return { id: `block:${b.slug}`, label: b.name, node }
      }),
    [],
  )
  return (
    <PlaygroundBoard stageWidth={1800} stageHeight={1400} fitMode="width">
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
