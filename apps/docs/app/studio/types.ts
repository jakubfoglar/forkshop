import type { ForkshopSelection } from "@forkshop/engine"
import type { AgentSeed } from "../demo/decode-url-state"

export type { AgentSeed }

export interface DemoState {
  selection?: ForkshopSelection
  viewport?: "responsive" | "mobile" | "single"
  canvas?: { zoom?: number; pan?: { x: number; y: number } }
  agents?: AgentSeed[]
}

export interface StudioFrame {
  id: string
  x: number
  y: number
  width: number
  height: number
  demoState: DemoState
}

export interface StudioBoard {
  id: string
  title: string
  frames: StudioFrame[]
}
