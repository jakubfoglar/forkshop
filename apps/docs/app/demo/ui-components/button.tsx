"use client"

import { useMemo } from "react"
import { Button } from "../_components/ui/button"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

const VARIANTS = [
  { variant: "primary", width: "compact" },
  { variant: "secondary", width: "compact" },
  { variant: "ghost", width: "compact" },
  { variant: "primary", width: "wide" },
  { variant: "secondary", width: "wide" },
  { variant: "ghost", width: "wide" },
] as const

export function ButtonBoard() {
  const entries = useMemo<GalleryEntry[]>(() => {
    const out: GalleryEntry[] = []
    for (const { variant, width } of VARIANTS) {
      const id = `button-${variant}-${width}`
      const node: InlineReactNode = {
        id: `primitive:${id}`,
        kind: "inline-react",
        x: 0,
        y: 0,
        width: width === "wide" ? 280 : 200,
        height: 80,
        label: `${variant} / ${width}`,
        render: () => (
          <div className="inline-flex items-center justify-center bg-waveclash-black p-6 w-full">
            <Button variant={variant} width={width}>
              {variant === "primary" ? "GET PASS" : variant === "secondary" ? "BUY 7-DAY PASS" : "ALL ATHLETES"}
            </Button>
          </div>
        ),
      }
      out.push({ id, label: `${variant} / ${width}`, node })
    }
    return out
  }, [])

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={600} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={280}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
