"use client"

import { useMemo } from "react"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export function UIComponentsBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      forkshopConfig.primitives.map((p): GalleryEntry => {
        const Component = p.component as React.ComponentType<Record<string, unknown>>
        const node: InlineReactNode = {
          id: `primitive:${p.slug}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 320,
          height: 120,
          label: p.name,
          render: () => (
            <div className="inline-flex items-center justify-center bg-white p-8 shadow-md">
              <Component {...(p.exampleProps as Record<string, unknown>)} />
            </div>
          ),
        }
        return { id: p.slug, label: p.name, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={700} fitMode="both">
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
