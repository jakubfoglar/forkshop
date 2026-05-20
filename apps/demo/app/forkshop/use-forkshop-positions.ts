"use client"

import { useForkshopPositions as _useForkshopPositions } from "@forkshop/engine"
import type { NodePositions } from "@forkshop/engine"

/**
 * Thin wrapper that pins the positions mount path to "app/forkshop" — this is
 * the canonical default. Pass `boardId` to scope positions to a specific board
 * so multiple boards with overlapping node IDs don't collide.
 */
export function useForkshopPositions(options?: { boardId?: string }): {
  nodePositions: NodePositions
  onPositionChange: (id: string, x: number, y: number) => void
} {
  return _useForkshopPositions({ mountPath: "app/forkshop", boardId: options?.boardId })
}
