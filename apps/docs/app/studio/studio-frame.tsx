"use client"

import type { StudioFrame as StudioFrameType } from "./types"
import { buildDemoUrl } from "./build-demo-url"

export function StudioFrame({ frame, scale }: { frame: StudioFrameType; scale: number }) {
  return (
    <div
      style={{
        width: frame.width,
        height: frame.height,
        transformOrigin: "top left",
        transform: `scale(${scale})`,
      }}
    >
      <iframe
        src={buildDemoUrl(frame.demoState)}
        style={{ width: frame.width, height: frame.height, border: "1px solid #ddd" }}
        title={frame.id}
      />
    </div>
  )
}
