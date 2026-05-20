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
}
