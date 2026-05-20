"use client"

import { useMemo } from "react"
import type { BadgeFill, BadgeSize } from "../_components/ui/badge"
import { Badge } from "../_components/ui/badge"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

type BadgeInstance = { id: string; label: string; fill: BadgeFill; content: string; size?: BadgeSize }

const INSTANCES: BadgeInstance[] = [
  { id: "badge-culture-yellow", label: "Culture / yellow", fill: "yellow", content: "CULTURE" },
  { id: "badge-competition-red", label: "Competition / red", fill: "red", content: "COMPETITION" },
  { id: "badge-premier-navy", label: "Premier / navy", fill: "navy", content: "PREMIER" },
  { id: "badge-final-black", label: "Final / black", fill: "black", content: "FINAL" },
  { id: "badge-freesurf-yellow-sm", label: "Freesurf / sm", fill: "yellow", content: "FREESURF", size: "sm" },
]

export function BadgeBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      INSTANCES.map(({ id, label, fill, content, size }): GalleryEntry => {
        const node: InlineReactNode = {
          id: `badge:${id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 160,
          height: 64,
          label,
          render: () => (
            <div className="demo-scope inline-flex items-center justify-center bg-waveclash-black p-4">
              <Badge fill={fill} size={size}>{content}</Badge>
            </div>
          ),
        }
        return { id: node.id, label, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={1000} stageHeight={400} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={160}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
