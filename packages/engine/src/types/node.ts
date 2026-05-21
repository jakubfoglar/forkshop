import type { ReactNode } from "react"

export type BaseNode = {
  id: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  label?: ReactNode
}

export type InlineReactNode = BaseNode & {
  kind: "inline-react"
  filePath?: string
  render: () => ReactNode
}

export type IframeRouteNode = BaseNode & {
  kind: "iframe-route"
  routePath: string
  /** Path (from project root) of the TSX file authoring this page.
   *  Required for live text editing — omit to opt out. */
  sourceFile?: string
  /** How the iframe wrapper sizes vertically:
   *  - "cap" (default) — clip the iframe at `height`; suitable for tiles
   *    where you don't want a single tall route to dominate a board.
   *  - "auto" — grow to the body's natural height; suitable for
   *    full-fidelity views like responsive-frame Boards. */
  heightMode?: "auto" | "cap"
}

export type IframeComponentNode = BaseNode & {
  kind: "iframe-component"
  slug: string
  previewSrc: string
  componentPath?: string
  /** Path of the TSX file authoring this block. Typically equals
   *  componentPath. Required for live text editing — omit to opt out. */
  sourceFile?: string
}

export type AnyNode = InlineReactNode | IframeRouteNode | IframeComponentNode
