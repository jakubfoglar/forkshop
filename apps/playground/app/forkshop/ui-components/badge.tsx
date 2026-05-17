"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

const INSTANCES = [
  { id: "badge-new", label: "New", content: "New" },
  { id: "badge-beta", label: "Beta", content: "Beta" },
  { id: "badge-live", label: "Live", content: "Live" },
  { id: "badge-coming-soon", label: "Coming Soon", content: "Coming Soon" },
  { id: "badge-deprecated", label: "Deprecated", content: "Deprecated" },
] as const

export function BadgeBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      INSTANCES.map(({ id, label, content }): GalleryEntry => {
        const node: InlineReactNode = {
          id: `primitive:${id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 160,
          height: 64,
          label,
          render: () => (
            <div className="inline-flex items-center justify-center bg-white p-4">
              <Badge>{content}</Badge>
            </div>
          ),
        }
        return { id, label, node }
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
