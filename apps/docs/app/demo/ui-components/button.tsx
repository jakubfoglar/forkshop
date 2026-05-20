"use client"

import { useMemo } from "react"
import { Button } from "../_components/ui/button"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

const VARIANTS = [
  { variant: "primary",   width: "compact", row: 0, column: 0 },
  { variant: "secondary", width: "compact", row: 0, column: 1 },
  { variant: "ghost",     width: "compact", row: 0, column: 2 },
  { variant: "primary",   width: "wide",    row: 1, column: 0 },
  { variant: "secondary", width: "wide",    row: 1, column: 1 },
  { variant: "ghost",     width: "wide",    row: 1, column: 2 },
] as const

const VARIANT_LABELS: Record<string, string> = {
  primary: "GET PASS",
  secondary: "BUY 7-DAY PASS",
  ghost: "ALL ATHLETES",
}

export function ButtonBoard() {
  const entries = useMemo<GalleryEntry[]>(() => {
    const out: GalleryEntry[] = []
    for (const { variant, width, row, column } of VARIANTS) {
      const id = `button-${variant}-${width}`
      const node: InlineReactNode = {
        id,
        kind: "inline-react",
        x: 0,
        y: 0,
        width: width === "wide" ? 280 : 200,
        height: 80,
        label: `${variant} / ${width}`,
        render: () => (
          <div className="demo-scope inline-flex items-center justify-center bg-waveclash-black p-6 w-full">
            <Button variant={variant} width={width}>
              {VARIANT_LABELS[variant]}
            </Button>
          </div>
        ),
      }
      out.push({ label: `${variant} / ${width}`, node, row, column })
    }
    return out
  }, [])

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={400} fitMode="both" boardId="button">
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
