"use client"

import { useEffect, useRef } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { InlineReactNode } from "@forkshop/types/node"

function InlineReactRender({
  node,
  fitContent,
  onBodyHeightChange,
  onContentWidthChange,
}: {
  node: InlineReactNode
  fitContent?: boolean
  onBodyHeightChange?: (h: number) => void
  onContentWidthChange?: (w: number) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const lastWidth = useRef<number | undefined>(undefined)
  const lastHeight = useRef<number | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.ceil(entry.contentRect.width)
        const height = Math.ceil(entry.contentRect.height)
        if (onContentWidthChange && width !== lastWidth.current) {
          lastWidth.current = width
          onContentWidthChange(width)
        }
        if (onBodyHeightChange && height !== lastHeight.current) {
          lastHeight.current = height
          onBodyHeightChange(height)
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [onBodyHeightChange, onContentWidthChange])

  // Default: block wrapper that fills the frame's fixed width supplied by
  // the layout. fitContent=true switches to inline-block so the wrapper hugs
  // its content's natural width — used by Gallery's fitContent mode where
  // the cell width is driven by the ResizeObserver-reported content width.
  // A block wrapper there would stretch to the parent and report the
  // parent width instead of the content's intrinsic size.
  const display = fitContent ? "inline-block" : "block"
  return (
    <div ref={ref} style={{ display }}>
      {node.render()}
    </div>
  )
}

export const inlineReactNodeType: NodeType<InlineReactNode> = {
  id: "inline-react",
  match: (node): node is InlineReactNode => node.kind === "inline-react",
  render: ({ node, fitContent, onBodyHeightChange, onContentWidthChange }) => (
    <InlineReactRender
      node={node}
      fitContent={fitContent}
      onBodyHeightChange={onBodyHeightChange}
      onContentWidthChange={onContentWidthChange}
    />
  ),
  agentMatch: (node, activity) => {
    const id = node.id.replace(/^primitive:/, "")
    const filePathHit = node.filePath !== undefined && activity.primitives.has(node.filePath)
    const idHit = activity.primitives.has(id) || activity.primitives.has(node.id)
    return { active: idHit || filePathHit }
  },
}
