"use client"

import type { SnapGuide } from "../../lib/system-snap.js"
import { useFogmaCanvas } from "./fogma-canvas.js"

// Red snap-alignment guide lines, rendered over the stage during a drag.
// Stroke width is zoom-invariant via `vectorEffect="non-scaling-stroke"`.
export function GuideOverlay({
  width,
  height,
  guides,
}: {
  width: number
  height: number
  guides: readonly SnapGuide[]
}) {
  const { transformRef } = useFogmaCanvas()
  if (guides.length === 0) return
  const zoom = transformRef.current?.zoom ?? 1
  const strokeWidth = 1 / Math.max(zoom, 0.001)
  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      {guides.map((guide, index) => {
        if (guide.axis === "x") {
          return (
            <line
              key={`x-${index}-${guide.position}`}
              x1={guide.position}
              y1={guide.from - 24}
              x2={guide.position}
              y2={guide.to + 24}
              stroke="#ff3b30"
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          )
        }
        return (
          <line
            key={`y-${index}-${guide.position}`}
            x1={guide.from - 24}
            y1={guide.position}
            x2={guide.to + 24}
            y2={guide.position}
            stroke="#ff3b30"
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}
