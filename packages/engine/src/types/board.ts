import type { ComponentType } from "react"
import type { ForkshopSelection } from "./selection"
import type { Layout } from "./layout"
import type { ForkshopIconComponent } from "@forkshop/components/icon"

export type SidebarChild = {
  selection: ForkshopSelection
  label: string
  icon?: ForkshopIconComponent
}

export type BoardConfig<TLayoutOptions = unknown> = {
  id: string
  label?: string
  icon?: ForkshopIconComponent
  match: (selection: ForkshopSelection) => boolean
  layout: "gallery" | "tree" | Layout<TLayoutOptions>
  layoutOptions?: Partial<TLayoutOptions>
  useEntries: () => import("./layout").LayoutEntry[]
  useSidebarChildren?: () => SidebarChild[]
}

export type BoardComponent<TLayoutOptions = unknown> = ComponentType<Record<string, never>> & {
  readonly __config: BoardConfig<TLayoutOptions>
  readonly __isBoard: true
  // Set by withBoardMeta — when true, BoardRegistry renders the Component
  // directly (it owns its canvas) instead of running useEntries through a layout.
  readonly __rawRender?: true
}

// Use at API boundaries that collect Boards from user code. defineBoard infers
// BoardComponent<{ specific-options }> from its caller; the layout/options
// generic is invariant in TS, so a plain BoardComponent<unknown> rejects them.
// Internally the registry dispatches every Board through Layout<unknown>, so
// erasing the generic here is contract-preserving.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBoardComponent = BoardComponent<any>
