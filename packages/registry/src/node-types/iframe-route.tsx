"use client"

import { useCallback, useRef } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeRouteNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"

function IframeRouteRender({ node }: { node: IframeRouteNode }) {
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
      src={node.routePath}
      title={node.routePath}
      width={node.width}
      heightCap={node.height}
      desktopWidth={1440}
      onIframeWheel={handleIframeWheel}
      iframeRef={(el) => {
        iframeRef.current = el ?? null
      }}
      className="bg-white shadow-md"
    />
  )
}

export const iframeRouteNodeType: NodeType<IframeRouteNode> = {
  id: "iframe-route",
  match: (node): node is IframeRouteNode => node.kind === "iframe-route",
  render: ({ node }) => <IframeRouteRender node={node} />,
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
