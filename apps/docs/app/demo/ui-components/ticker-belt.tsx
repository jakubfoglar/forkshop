"use client"

import { useMemo } from "react"
import { TickerBelt } from "../_components/ui/ticker-belt"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

type TickerBeltInstance = {
  id: string
  label: string
  fill: "yellow" | "black"
  size: "lg" | "md"
  separator?: string
}

const INSTANCES: TickerBeltInstance[] = [
  { id: "ticker-yellow-lg", label: "yellow / lg (hero)",   fill: "yellow", size: "lg", separator: "◆" },
  { id: "ticker-black-lg",  label: "black / lg",           fill: "black",  size: "lg", separator: "◆" },
  { id: "ticker-yellow-md", label: "yellow / md (footer)", fill: "yellow", size: "md", separator: "★" },
  { id: "ticker-black-md",  label: "black / md",           fill: "black",  size: "md", separator: "★" },
]

export function TickerBeltBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      INSTANCES.map(({ id, label, fill, size, separator }): GalleryEntry => {
        const node: InlineReactNode = {
          id: `ticker-belt:${id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 900,
          height: size === "lg" ? 80 : 70,
          label,
          render: () => (
            <TickerBelt fill={fill} size={size} separator={separator} />
          ),
        }
        return { id: node.id, label, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={500} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="stack"
          viewportWidth={900}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
