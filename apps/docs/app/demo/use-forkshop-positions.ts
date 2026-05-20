"use client"

import { useForkshopPositions as _useForkshopPositions } from "@forkshop/engine"
import type { NodePositions } from "@forkshop/engine"

/**
 * Thin wrapper that pins the positions mount path to "app/demo" — positions
 * are stored in app/demo/positions.json instead of the engine default
 * (app/forkshop). No env-var override needed.
 */
export function useForkshopPositions(): {
  nodePositions: NodePositions
  onPositionChange: (id: string, x: number, y: number) => void
} {
  return _useForkshopPositions({ mountPath: "app/demo" })
}
