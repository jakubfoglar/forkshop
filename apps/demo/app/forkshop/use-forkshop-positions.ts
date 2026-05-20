"use client"

import { useForkshopPositions as _useForkshopPositions } from "@forkshop/engine"
import type { NodePositions } from "@forkshop/engine"

/**
 * Thin wrapper that pins the positions mount path to "app/forkshop" — this is
 * the canonical default, but wrapping explicitly documents the mount point and
 * makes it easy to change without touching PlaygroundBoard.
 */
export function useForkshopPositions(): {
  nodePositions: NodePositions
  onPositionChange: (id: string, x: number, y: number) => void
} {
  return _useForkshopPositions({ mountPath: "app/forkshop" })
}
