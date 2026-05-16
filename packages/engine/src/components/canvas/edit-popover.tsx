"use client"

import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import { createPortal } from "react-dom"
import { cn } from "@forkshop/lib/cn"
import { ForkshopIcon } from "@forkshop/components/icon"

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
    let rafId: number | undefined
    let lastLeft = NaN
    let lastTop = NaN
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
      // Only update state when the position actually changed — avoids
      // re-rendering the popover on every animation frame when pan/zoom is
      // idle.
      if (hostLeft !== lastLeft || hostTop !== lastTop) {
        lastLeft = hostLeft
        lastTop = hostTop
        setPosition({ left: hostLeft, top: hostTop })
      }
    }
    // RAF loop while editing — the canvas's pan/zoom transform is stored in a
    // ref (no re-renders on transform change), so we poll every frame to keep
    // the popover glued to the element through pans, zooms, scrolls.
    function tick() {
      compute()
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    // Also track in-flow size changes inside the iframe document (typing into
    // a contenteditable can grow/shrink the element).
    const observer = new ResizeObserver(compute)
    observer.observe(element)
    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [element])

  if (!element || !position) return null
  return createPortal(
    <div
      style={{ position: "fixed", left: position.left, top: position.top, zIndex: 9999 }}
      className="-translate-y-full pl-forkshop-1"
    >
      <div className="flex items-center gap-forkshop-0.5 rounded-forkshop-full border border-forkshop-border bg-forkshop-surface py-forkshop-0.5 pl-forkshop-1 pr-forkshop-0.5 shadow-md">
        {error && (
          <>
            <span className="px-forkshop-1 text-forkshop-xs text-red-600">{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              className="rounded-forkshop-full p-forkshop-0.5 text-forkshop-fg-muted hover:bg-forkshop-surface-2 hover:text-forkshop-fg"
              aria-label="Dismiss error"
            >
              <ForkshopIcon icon={X} className="size-forkshop-4" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSaving}
          className={cn(
            "rounded-forkshop-full p-forkshop-0.5 hover:bg-forkshop-surface-2",
            isSaving
              ? "cursor-not-allowed opacity-40"
              : "text-forkshop-fg-muted hover:text-forkshop-fg",
          )}
          aria-label="Discard edit"
          title="Discard (esc)"
        >
          <ForkshopIcon icon={X} className="size-forkshop-5" />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            "rounded-forkshop-full bg-forkshop-fg p-forkshop-0.5 text-forkshop-surface hover:bg-forkshop-fg/80",
            isSaving && "cursor-not-allowed opacity-60",
          )}
          aria-label="Save edit"
          title="Save (⌘↵)"
        >
          <ForkshopIcon icon={Check} className="size-forkshop-5" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
