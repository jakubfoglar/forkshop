"use client"

import { useEffect } from "react"
import { CanvasNode } from "@forkshop/components/canvas/canvas-node"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import type { NodePosition } from "@forkshop/lib/node-positions"

export function Plain() {
  useEffect(() => {}, [])
  return <CanvasNode />
}
