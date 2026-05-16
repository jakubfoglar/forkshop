"use client"

import { useEffect, useRef } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { InlineReactNode } from "@forkshop/types/node"

function InlineReactRender({
  node,
  onBodyHeightChange,
  onContentWidthChange,
}: {
  node: InlineReactNode
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

  // inline-block so the wrapper hugs its content's natural width — otherwise
  // a block-level wrapper would stretch to the parent and the ResizeObserver
  // would report the parent width, not the content's intrinsic size.
  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      {node.render()}
    </div>
  )
}

export const inlineReactNodeType: NodeType<InlineReactNode> = {
  id: "inline-react",
  match: (node): node is InlineReactNode => node.kind === "inline-react",
  render: ({ node, onBodyHeightChange, onContentWidthChange }) => (
    <InlineReactRender
      node={node}
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
