import { motion } from "motion/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CanvasNode } from "@/components/fogma/canvas/canvas-node"
import type { ClassValue } from "clsx"

export function Mixed() {
  const [x] = useState(0)
  return <motion.div>{x}<CanvasNode /><Button /></motion.div>
}
