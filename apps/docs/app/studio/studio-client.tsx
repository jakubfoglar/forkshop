"use client"

import { useEffect, useRef, useState } from "react"
import {
  ForkshopSidebar,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
} from "@forkshop/engine"
import { STUDIO_BOARDS } from "./boards"
import { StudioFrame } from "./studio-frame"

const DEFAULT_SELECTION: ForkshopSelection = {
  kind: "block",
  slug: STUDIO_BOARDS[0]?.id ?? "hero-with-ai",
}

function computeScale(
  canvasWidth: number,
  canvasHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  if (canvasWidth === 0 || canvasHeight === 0) return 1
  const padding = 48
  const scaleX = (canvasWidth - padding) / frameWidth
  const scaleY = (canvasHeight - padding) / frameHeight
  return Math.min(scaleX, scaleY, 1)
}

export function StudioClient() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const fromHash = parseSelection(window.location.hash)
    if (fromHash) setSelection(fromHash)
  }, [])

  useEffect(() => {
    const next = serializeSelection(selection)
    if (window.location.hash !== next) window.history.replaceState({}, "", next)
  }, [selection])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const activeBoard =
    (selection.kind === "block" && STUDIO_BOARDS.find((b) => b.id === selection.slug)) ||
    STUDIO_BOARDS[0]

  return (
    <div className="flex h-screen overflow-hidden">
      <ForkshopSidebar
        selection={selection}
        onSelect={setSelection}
        sections={[
          {
            id: "boards",
            title: "Boards",
            entryKind: "block",
            entries: STUDIO_BOARDS.map((b) => ({ slug: b.id, name: b.title })),
          },
        ]}
        routes={[]}
      />
      <div ref={canvasRef} className="relative flex flex-1 overflow-hidden bg-neutral-50">
        {activeBoard &&
          activeBoard.frames.map((frame) => {
            const scale = computeScale(canvasSize.width, canvasSize.height, frame.width, frame.height)
            return (
              <div
                key={frame.id}
                style={{
                  position: "absolute",
                  left: frame.x + (canvasSize.width - frame.width * scale) / 2,
                  top: frame.y + (canvasSize.height - frame.height * scale) / 2,
                }}
              >
                <StudioFrame frame={frame} scale={scale} />
              </div>
            )
          })}
      </div>
    </div>
  )
}
