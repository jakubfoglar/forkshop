"use client"

import { useEffect } from "react"
import { CanvasNode } from "@/components/forkshop/canvas/canvas-node"
import { useForkshopCanvas } from "@/components/forkshop/canvas/forkshop-canvas"
import type { NodePosition } from "@/lib/forkshop/node-positions"

export function Plain() {
  useEffect(() => {}, [])
  return <CanvasNode />
}
