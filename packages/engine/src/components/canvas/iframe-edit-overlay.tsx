"use client"

import { useIframeEditController } from "@forkshop/lib/use-iframe-edit-controller"
import { useCanvasZoom, useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { EditPopover } from "@forkshop/components/canvas/edit-popover"

export type IframeEditOverlayProps = {
  iframe: HTMLIFrameElement | null
  sourceFile: string | undefined
  /** Default "/api/forkshop/edit". Used for both POST (save) and GET (read source). */
  editApiPath?: string
}

/** Pure predicate — extracted so the conditional-render contract is unit-testable
 *  in the node-env vitest setup (which has no React DOM). */
export function shouldRenderOverlay({
  nodeEnv,
  sourceFile,
}: {
  nodeEnv: string | undefined
  sourceFile: string | undefined
}): boolean {
  if (nodeEnv === "production") return false
  if (sourceFile === undefined || sourceFile === "") return false
  return true
}

export function IframeEditOverlay({
  iframe,
  sourceFile,
  editApiPath = "/api/forkshop/edit",
}: IframeEditOverlayProps) {
  if (!shouldRenderOverlay({ nodeEnv: process.env.NODE_ENV, sourceFile })) return null
  return (
    <IframeEditOverlayInner iframe={iframe} sourceFile={sourceFile!} editApiPath={editApiPath} />
  )
}

function IframeEditOverlayInner({
  iframe,
  sourceFile,
  editApiPath,
}: {
  iframe: HTMLIFrameElement | null
  sourceFile: string
  editApiPath: string
}) {
  const { transformRef } = useForkshopCanvas()
  const zoom = useCanvasZoom()
  const panX = transformRef.current?.panX ?? 0
  const panY = transformRef.current?.panY ?? 0
  const ctl = useIframeEditController({
    iframe,
    sourceFile,
    editApiPath,
    canvasZoom: zoom,
  })
  return (
    <EditPopover
      element={ctl.editingElement}
      isSaving={ctl.isSaving}
      error={ctl.error}
      onSave={ctl.save}
      onDiscard={ctl.discard}
      onDismissError={ctl.dismissError}
      transformZoom={zoom}
      transformPanX={panX}
      transformPanY={panY}
    />
  )
}
