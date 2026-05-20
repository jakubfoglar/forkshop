"use client"

import { useMemo } from "react"
import { StatCounter } from "../_components/ui/stat-counter"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

type StatInstance = { id: string; label: string; value: string; statLabel: string; highlight?: boolean }

const INSTANCES: StatInstance[] = [
  { id: "stat-athletes", label: "Athletes", value: "64", statLabel: "Athletes" },
  { id: "stat-countries", label: "Countries (highlight)", value: "23", statLabel: "Countries", highlight: true },
  { id: "stat-days", label: "Days", value: "10", statLabel: "Days" },
  { id: "stat-prize", label: "Prize", value: "$1.2M", statLabel: "Prize" },
]

export function StatCounterBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      INSTANCES.map(({ id, label, value, statLabel, highlight }): GalleryEntry => {
        const node: InlineReactNode = {
          id,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 200,
          height: 120,
          label,
          render: () => (
            <div className="demo-scope">
              <StatCounter value={value} label={statLabel} highlight={highlight} />
            </div>
          ),
        }
        return { label, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={1000} stageHeight={400} fitMode="both" boardId="stat-counter">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={200}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
