"use client"

import { useEffect, useState } from "react"
import { Check, Xmark } from "iconoir-react"
import { createPortal } from "react-dom"
import { cn } from "../../lib/cn.js"
import { FogmaIcon } from "../icon.js"

// Inline save/discard widget that hovers right next to the currently-edited
// element. Lives in the host document via portal — positions itself in screen
// coords from the editing element's bounding rect inside the iframe, accounting
// for the canvas's CSS scale on the iframe element.
export function EditPopover({
  element,
  isSaving,
  error,
  onSave,
  onDiscard,
  onDismissError,
  // Recompute position whenever any of these change (re-render trigger).
  transformZoom,
  transformPanX,
  transformPanY,
}: {
  element: Element | undefined
  isSaving: boolean
  error: string | undefined
  onSave: () => void
  onDiscard: () => void
  onDismissError: () => void
  transformZoom: number
  transformPanX: number
  transformPanY: number
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | undefined>()

  useEffect(() => {
    if (!element) {
      setPosition(undefined)
      return
    }
    function compute() {
      if (!element) return
      const iframe = element.ownerDocument.defaultView?.frameElement as
        | HTMLIFrameElement
        | undefined
      if (!iframe) return
      const elementRect = element.getBoundingClientRect()
      const iframeRect = iframe.getBoundingClientRect()
      const offsetWidth = iframe.offsetWidth || 1
      // CSS scale from the canvas. The iframe element itself is scaled by an
      // ancestor; offsetWidth is its layout (unscaled) width.
      const scale = iframeRect.width / offsetWidth
      const hostLeft = iframeRect.left + elementRect.right * scale
      const hostTop = iframeRect.top + elementRect.top * scale
      setPosition({ left: hostLeft, top: hostTop })
    }
    compute()
    // Track in-flow size changes inside the iframe document too (typing into a
    // contenteditable can grow/shrink the element).
    const observer = new ResizeObserver(compute)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, transformZoom, transformPanX, transformPanY])

  if (!element || !position) return null
  return createPortal(
    <div
      style={{ position: "fixed", left: position.left, top: position.top, zIndex: 100 }}
      className="-translate-y-full pl-0.25"
    >
      <div className="flex items-center gap-0.125 rounded-full border border-fogma-border bg-fogma-surface py-0.125 pl-0.25 pr-0.125 shadow-md">
        {error && (
          <>
            <span className="px-0.25 text-xs text-red-600">{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              className="rounded-full p-0.125 text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg"
              aria-label="Dismiss error"
            >
              <FogmaIcon icon={Xmark} className="size-1" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSaving}
          className={cn(
            "rounded-full p-0.125 hover:bg-fogma-surface-2",
            isSaving
              ? "cursor-not-allowed opacity-40"
              : "text-fogma-fg-muted hover:text-fogma-fg",
          )}
          aria-label="Discard edit"
          title="Discard (esc)"
        >
          <FogmaIcon icon={Xmark} className="size-1.25" />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            "rounded-full bg-fogma-fg p-0.125 text-fogma-surface hover:bg-fogma-fg/80",
            isSaving && "cursor-not-allowed opacity-60",
          )}
          aria-label="Save edit"
          title="Save (⌘↵)"
        >
          <FogmaIcon icon={Check} className="size-1.25" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
