"use client"

import { useEffect } from "react"
import { CanvasNode } from "@/components/fogma/canvas/canvas-node"
import { useFogmaCanvas } from "@/components/fogma/canvas/fogma-canvas"
import type { NodePosition } from "@/lib/fogma/node-positions"

export function Plain() {
  useEffect(() => {}, [])
  return <CanvasNode />
}
