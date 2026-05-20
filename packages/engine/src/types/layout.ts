import type { ReactNode } from "react"
import type { AnyNode } from "./node"
import type { ForkshopIconComponent } from "../components/icon"
import type { NodePositions } from "../lib/node-positions"

export type LayoutEntry = {
  id: string
  label?: string
  node: AnyNode
  row?: number
  column?: number
}

export type LayoutRenderProps<TOptions> = {
  entries: LayoutEntry[]
  options: TOptions
  nodePositions: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string | undefined) => void
}

export type Layout<TOptions = unknown> = {
  id: string
  icon: ForkshopIconComponent
  defaultOptions: TOptions
  render: (props: LayoutRenderProps<TOptions>) => ReactNode
  stageSize: (entries: LayoutEntry[], options: TOptions) => { width: number; height: number }
}
