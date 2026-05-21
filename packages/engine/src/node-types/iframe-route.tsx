"use client"

import { useCallback, useRef, useState } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeRouteNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { IframeEditOverlay } from "@forkshop/components/canvas/iframe-edit-overlay"
import { AgentReadIndicator } from "@forkshop/components/canvas/agent-read-indicator"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"

function IframeRouteRender({
  node,
  onBodyHeightChange,
}: {
  node: IframeRouteNode
  onBodyHeightChange?: (height: number) => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null)
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
    <>
      <LazyIframe
        src={node.routePath}
        title={node.routePath}
        width={node.width}
        heightMode={node.heightMode ?? "cap"} height={node.height}
        desktopWidth={node.desktopWidth}
        hostFileLabel={node.sourceFile ?? ""}
        onIframeWheel={handleIframeWheel}
        onBodyHeightSync={onBodyHeightChange}
        iframeRef={(el) => {
          iframeRef.current = el ?? null
          setIframeEl(el ?? null)
        }}
        className="bg-white shadow-md"
      />
      {node.sourceFile !== undefined && <AgentReadIndicator hostFileLabel={node.sourceFile} />}
      <IframeEditOverlay iframe={iframeEl} sourceFile={node.sourceFile} />
    </>
  )
}

export const iframeRouteNodeType: NodeType<IframeRouteNode> = {
  id: "iframe-route",
  match: (node): node is IframeRouteNode => node.kind === "iframe-route",
  render: ({ node, onBodyHeightChange }) => (
    <IframeRouteRender node={node} onBodyHeightChange={onBodyHeightChange} />
  ),
  agentMatch: (node, activity) => {
    const hit = activity.pages.has(node.routePath)
    return { active: hit, fileLabel: hit ? pageFileLabel(node.routePath) : undefined }
  },
}

function pageFileLabel(path: string): string {
  if (path === "/") return "page.tsx"
  const segments = path.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? "page"
  return `${last}/page.tsx`
}
