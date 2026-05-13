"use client"

import { useEffect } from "react"
import { CanvasNode } from "@fogma/components/canvas/canvas-node"
import { useFogmaCanvas } from "@fogma/components/canvas/fogma-canvas"
import type { NodePosition } from "@fogma/lib/node-positions"

export function Plain() {
  useEffect(() => {}, [])
  return <CanvasNode />
}
