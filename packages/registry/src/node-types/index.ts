import type { AnyNode } from "@forkshop/types/node"
import type { NodeType } from "@forkshop/types/node-type"
import { inlineReactNodeType } from "@forkshop/node-types/inline-react"
import { iframeRouteNodeType } from "@forkshop/node-types/iframe-route"
import { iframeComponentNodeType } from "@forkshop/node-types/iframe-component"

export { inlineReactNodeType } from "@forkshop/node-types/inline-react"
export { iframeRouteNodeType } from "@forkshop/node-types/iframe-route"
export { iframeComponentNodeType } from "@forkshop/node-types/iframe-component"

export const BUILTIN_NODE_TYPES: ReadonlyArray<NodeType<AnyNode>> = [
  inlineReactNodeType,
  iframeRouteNodeType,
  iframeComponentNodeType,
] as ReadonlyArray<NodeType<AnyNode>>
