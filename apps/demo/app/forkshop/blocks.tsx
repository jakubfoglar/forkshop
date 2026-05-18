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
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
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
          // height here flows into iframe-component NodeType's LazyIframe as heightMode="cap" + height.
          // Generous cap so block content (CTA, Hero, etc.) isn't clipped silently.
          height: 3000,
          label: b.name,
          slug: b.slug,
          previewSrc: b.previewSrc,
        }
        return { id: b.slug, label: b.name, node }
      }),
    [blocks, viewport],
  )
  return (
    <PlaygroundBoard stageWidth={1800} stageHeight={6000} fitMode="width">
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
