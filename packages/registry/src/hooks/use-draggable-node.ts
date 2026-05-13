"use client"

import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react"
import type { NodePosition } from "../node-positions.js"
import { applySnap, snapPixelsAt, type SnapGuide, type SnapTarget } from "../system-snap.js"

export type Transform = { zoom: number; panX: number; panY: number }

export type GetSnapTargets = (excludeId: string) => SnapTarget[]

const DRAG_THRESHOLD = 3

export function useDraggableNode({
  id,
  layoutX,
  layoutY,
  width,
  height,
  override,
  transformRef,
  getSnapTargets,
  onGuidesChange,
  onCommit,
  onSelectChange,
}: {
  id: string
  layoutX: number
  layoutY: number
  width: number
  height: number
  override: NodePosition | undefined
  transformRef: RefObject<Transform>
  getSnapTargets: GetSnapTargets
  onGuidesChange?: (guides: SnapGuide[]) => void
  onCommit: (id: string, x: number, y: number) => void
  onSelectChange?: (selected: boolean) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const x = override?.x ?? layoutX
  const y = override?.y ?? layoutY

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (event.button !== 0) return
      const container = containerRef.current
      if (!container) return

      event.preventDefault()
      event.stopPropagation()

      const startClientX = event.clientX
      const startClientY = event.clientY
      const startX = x
      const startY = y
      let currentX = x
      let currentY = y
      let didMove = false
      let pendingGuides: SnapGuide[] | undefined
      let guidesRafId: number | undefined
      const targets = getSnapTargets(id)

      const handle = event.currentTarget as HTMLElement
      handle.setPointerCapture(event.pointerId)
      onSelectChange?.(true)

      const flushGuides = () => {
        guidesRafId = undefined
        if (pendingGuides) {
          onGuidesChange?.(pendingGuides)
          pendingGuides = undefined
        }
      }

      const scheduleGuides = (guides: SnapGuide[]) => {
        pendingGuides = guides
        if (guidesRafId === undefined) guidesRafId = requestAnimationFrame(flushGuides)
      }

      const handleMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startClientX
        const dy = moveEvent.clientY - startClientY
        if (!didMove && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        didMove = true
        const zoom = transformRef.current?.zoom ?? 1
        const targetX = startX + dx / zoom
        const targetY = startY + dy / zoom
        const snap = applySnap(
          { id, x: targetX, y: targetY, width, height },
          targets,
          snapPixelsAt(zoom),
        )
        currentX = snap.x
        currentY = snap.y
        container.style.left = `${currentX}px`
        container.style.top = `${currentY}px`
        scheduleGuides(snap.guides)
      }

      const handleUp = (upEvent: PointerEvent) => {
        try {
          handle.releasePointerCapture(upEvent.pointerId)
        } catch {
          // already released
        }
        handle.removeEventListener("pointermove", handleMove)
        handle.removeEventListener("pointerup", handleUp)
        handle.removeEventListener("pointercancel", handleUp)
        if (guidesRafId !== undefined) cancelAnimationFrame(guidesRafId)
        onGuidesChange?.([])
        if (didMove) onCommit(id, Math.round(currentX), Math.round(currentY))
      }

      handle.addEventListener("pointermove", handleMove)
      handle.addEventListener("pointerup", handleUp)
      handle.addEventListener("pointercancel", handleUp)
    },
    [
      id,
      x,
      y,
      width,
      height,
      transformRef,
      getSnapTargets,
      onGuidesChange,
      onCommit,
      onSelectChange,
    ],
  )

  return {
    containerRef,
    x,
    y,
    dragHandleProps: { onPointerDown: handlePointerDown },
  }
}
