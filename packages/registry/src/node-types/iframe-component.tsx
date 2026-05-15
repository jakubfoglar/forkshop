"use client"

import { useCallback, useRef, useState } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeComponentNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { ResponsiveFrameView } from "@forkshop/components/canvas/responsive-frame-view"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"
import { useAgentActiveBlocks } from "@forkshop/components/agent-activity-context"

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

function IframeComponentDrillIn({
  node,
  onBack,
}: {
  node: IframeComponentNode
  onBack: () => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const activeBlocks = useAgentActiveBlocks()
  const agentActive = activeBlocks.has(node.slug)
  const mode = node.drillInMode ?? "single"
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

  const viewports = mode === "responsive" ? [1440, 768, 375] : [375]

  void onBack
  return (
    <ResponsiveFrameView
      kind="page"
      path={node.slug}
      source={node.previewSrc}
      measuredHeight={measuredHeight}
      onBodyHeightChange={handleBodyHeightChange}
      onIframeWheel={handleIframeWheel}
      viewports={viewports}
      agentActive={agentActive}
    />
  )
}

export const iframeComponentNodeType: NodeType<IframeComponentNode> = {
  id: "iframe-component",
  match: (node): node is IframeComponentNode => node.kind === "iframe-component",
  render: ({ node }) => <IframeComponentRender node={node} />,
  drillIn: ({ node, onBack }) => <IframeComponentDrillIn node={node} onBack={onBack} />,
  defaultMode: "click-into",
  enterMode: "double-click",
  activityKey: (node) => node.componentPath ?? node.slug,
}
