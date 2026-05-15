"use client"

import { useCallback, useRef, useState } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeRouteNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { ResponsiveFrameView } from "@forkshop/components/canvas/responsive-frame-view"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"
import { useAgentActivePages } from "@forkshop/components/agent-activity-context"

function IframeRouteRender({ node, onIsolate }: { node: IframeRouteNode; onIsolate?: () => void }) {
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
      onIframeDblClick={onIsolate === undefined ? undefined : () => onIsolate()}
      iframeRef={(el) => {
        iframeRef.current = el ?? null
      }}
      className="bg-white shadow-md"
    />
  )
}

function IframeRouteDrillIn({
  node,
  onBack,
}: {
  node: IframeRouteNode
  onBack: () => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const activePages = useAgentActivePages()
  const agentActive = activePages.has(node.routePath)
  const mode = node.drillInMode ?? "responsive"
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)

  const handleBodyHeightChange = useCallback((_id: string, height: number) => {
    setMeasuredHeight(height)
  }, [])

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

  const viewports = mode === "single" ? [375] : [1440, 768, 375]

  void onBack
  return (
    <ResponsiveFrameView
      kind="page"
      path={node.routePath}
      source={node.routePath}
      measuredHeight={measuredHeight}
      onBodyHeightChange={handleBodyHeightChange}
      onIframeWheel={handleIframeWheel}
      viewports={viewports}
      agentActive={agentActive}
    />
  )
}

export const iframeRouteNodeType: NodeType<IframeRouteNode> = {
  id: "iframe-route",
  match: (node): node is IframeRouteNode => node.kind === "iframe-route",
  render: ({ node, onIsolate }) => <IframeRouteRender node={node} onIsolate={onIsolate} />,
  drillIn: ({ node, onBack }) => <IframeRouteDrillIn node={node} onBack={onBack} />,
  defaultMode: "click-into",
  enterMode: "double-click",
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
