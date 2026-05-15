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
}

export type IframeComponentNode = BaseNode & {
  kind: "iframe-component"
  slug: string
  previewSrc: string
  componentPath?: string
}

export type AnyNode = InlineReactNode | IframeRouteNode | IframeComponentNode
