"use client"

import { useMemo } from "react"
import { Gallery, type GalleryEntry, type IframeComponentNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

const STAGE = { width: 1200, height: 2800 } as const

export function BlocksBoard({
  nodePositions,
  onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      forkshopConfig.blocks.map((b): GalleryEntry => {
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
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={STAGE.width} stageHeight={STAGE.height} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="stack"
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
