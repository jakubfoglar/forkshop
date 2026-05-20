"use client"

import { useMemo } from "react"
import {
  Gallery,
  useDiscoveredPrimitives,
  type GalleryEntry,
  type InlineReactNode,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export function UIComponentsBoard() {
  const primitives = useDiscoveredPrimitives(forkshopConfig.ui)
  const entries = useMemo<GalleryEntry[]>(
    () =>
      primitives.map((p) => {
        const node: InlineReactNode = {
          id: `components:primitive:${p.slug}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 320,
          height: 120,
          label: p.name,
          render: () => <div className="demo-scope"><p.Component /></div>,
        }
        return { label: p.name, node }
      }),
    [primitives],
  )

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={700} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={320}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
