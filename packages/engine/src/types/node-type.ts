import type { ReactNode } from "react"
import type { AnyNode } from "@forkshop/types/node"

export type AgentActivitySnapshot = {
  pages: ReadonlySet<string>
  blocks: ReadonlySet<string>
  primitives: ReadonlySet<string>
}

export type AgentMatchResult = {
  active: boolean
  fileLabel?: string
}

export type RenderProps<T extends AnyNode> = {
  node: T
  isSelected: boolean
  agentActive: boolean
  agentFileLabel?: string
  /**
   * Callback for NodeTypes that can measure their content height (e.g., iframe
   * NodeTypes via LazyIframe.onBodyHeightSync). Layouts use this to grow cells
   * to fit content instead of using a fixed default height.
   */
  onBodyHeightChange?: (height: number) => void
  /**
   * Callback for NodeTypes that can measure their content's natural width
   * (e.g., inline-react via ResizeObserver). Layouts use this to shrink
   * cells to content instead of using a fixed viewportWidth.
   */
  onContentWidthChange?: (width: number) => void
  /**
   * When true, the NodeType should render in a way that hugs its content's
   * natural size (so ResizeObserver-driven measurement reports the content's
   * intrinsic dimensions). When false/omitted, the NodeType should fill the
   * frame supplied by the layout (the standard "fixed-dimension" mode).
   *
   * Only relevant for NodeTypes that distinguish between the two — currently
   * inline-react. iframe NodeTypes ignore this.
   */
  fitContent?: boolean
}

export type NodeType<T extends AnyNode = AnyNode> = {
  id: string
  match: (node: AnyNode) => node is T
  render: (props: RenderProps<T>) => ReactNode
  agentMatch?: (node: T, activity: AgentActivitySnapshot) => AgentMatchResult
}
