"use client"

import { useCallback, useRef } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeComponentNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"

function IframeComponentRender({ node }: { node: IframeComponentNode }) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  return (
    <LazyIframe
      src={node.previewSrc}
      title={node.slug}
      width={node.width}
      heightCap={node.height}
      onIframeWheel={handleIframeWheel}
      iframeRef={(el) => {
        iframeRef.current = el ?? null
      }}
      className="bg-white shadow-md"
    />
  )
}

export const iframeComponentNodeType: NodeType<IframeComponentNode> = {
  id: "iframe-component",
  match: (node): node is IframeComponentNode => node.kind === "iframe-component",
  render: ({ node }) => <IframeComponentRender node={node} />,
  agentMatch: (node, activity) => {
    const hit = activity.blocks.has(node.slug)
    return { active: hit, fileLabel: hit ? `${node.slug}.tsx` : undefined }
  },
}
