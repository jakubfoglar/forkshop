"use client"

import { useMemo } from "react"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

const STAGE = { width: 800, height: 600 } as const

export function ComponentsBoard({
  nodePositions,
  onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      forkshopConfig.primitives.map((p): GalleryEntry => {
        const node: InlineReactNode = {
          id: `primitive:${p.id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 320,
          height: 160,
          label: p.name,
          filePath: p.sourcePath,
          render: () => (
            <div className="inline-flex items-center justify-center bg-white p-8 shadow-md">
              {p.render()}
            </div>
          ),
        }
        return { id: node.id, label: p.name, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={STAGE.width} stageHeight={STAGE.height} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={320}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
