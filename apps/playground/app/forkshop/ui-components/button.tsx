"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

const VARIANTS = ["default", "subtle"] as const

export function ButtonBoard() {
  const entries = useMemo<GalleryEntry[]>(() => {
    const out: GalleryEntry[] = []
    for (const variant of VARIANTS) {
      const id = `button-${variant}`
      const node: InlineReactNode = {
        id: `primitive:${id}`,
        kind: "inline-react",
        x: 0,
        y: 0,
        width: 240,
        height: 80,
        label: variant,
        render: () => (
          <div className="inline-flex items-center justify-center bg-white p-6">
            <Button variant={variant}>Click me</Button>
          </div>
        ),
      }
      out.push({ id, label: variant, node })
    }
    return out
  }, [])

  return (
    <PlaygroundBoard stageWidth={800} stageHeight={400} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={240}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
