"use client"

/**
 * Canvas-level renderer for the opt-click hover state. The runtime that lives
 * inside iframed routes (EditorLink) only posts the element's bounding box +
 * source location via postMessage. This component receives those messages,
 * resolves the iframe element via IframeRegistry (by contentWindow identity),
 * translates the iframe-document rect to screen coordinates, and renders the
 * outline + filename caption as `position: fixed` chrome — outside any
 * iframe's overflow context.
 *
 * Why canvas-level: the in-iframe portal approach clipped at the iframe's
 * `overflow: hidden` wrapper at low zoom. Rendering up at canvas level lets
 * the overlay extend anywhere on screen, and keeps sizes in raw pixels (no
 * `calc(X / var(--canvas-zoom))` games needed — we're already in screen units).
 */

import { useEffect, useRef, useState } from "react"
import { useIframeRegistry } from "@forkshop/components/iframe-registry"

const Z_TOP = 2147483647

type Source = {
  fileName: string
  lineNumber: number
  columnNumber: number
}

type IframeRect = {
  x: number
  y: number
  width: number
  height: number
}

type HoverState = {
  iframe: HTMLIFrameElement
  rect: IframeRect
  source: Source
}

type OptHoverMessage = {
  type: "forkshop:opt-hover"
  rect: IframeRect
  source: Source
}

type OptHoverClearMessage = {
  type: "forkshop:opt-hover-clear"
}

function isOptHoverMessage(data: unknown): data is OptHoverMessage {
  if (data === null || typeof data !== "object") return false
  const message = data as Partial<OptHoverMessage>
  if (message.type !== "forkshop:opt-hover") return false
  if (!message.rect || !message.source) return false
  return true
}

function isOptHoverClearMessage(data: unknown): data is OptHoverClearMessage {
  if (data === null || typeof data !== "object") return false
  return (data as { type?: string }).type === "forkshop:opt-hover-clear"
}

export function EditorLinkOverlay() {
  const registry = useIframeRegistry()
  const [hover, setHover] = useState<HoverState | null>(null)
  // Bump on every animation frame while hover is active so we re-read the
  // iframe's screen rect and re-render — needed because pan/zoom changes the
  // iframe's on-screen position without triggering React updates here.
  const [tick, setTick] = useState(0)
  const tickRef = useRef(0)

  useEffect(() => {
    if (!registry) return
    function onMessage(event: MessageEvent) {
      if (isOptHoverClearMessage(event.data)) {
        setHover(null)
        return
      }
      if (!isOptHoverMessage(event.data)) return
      // Resolve iframe by contentWindow identity. event.source is the iframe's
      // window object; registry holds all registered iframe elements.
      const iframes = registry!.getAll()
      const iframe = iframes.find((frame) => frame.contentWindow === event.source)
      if (!iframe) return
      setHover({ iframe, rect: event.data.rect, source: event.data.source })
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [registry])

  useEffect(() => {
    if (!hover) return
    let rafId = 0
    const loop = () => {
      tickRef.current += 1
      setTick(tickRef.current)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [hover])

  if (!hover) return null

  const iframeScreen = hover.iframe.getBoundingClientRect()
  // The iframe element's clientWidth is its CSS width before any transforms;
  // the bounding-rect width reflects the visible on-screen width after both
  // the lazy-iframe's optional desktop->display scale and the canvas's zoom.
  // The ratio collapses both factors into a single scale we apply to the
  // element rect (which is in iframe-document coords).
  const intrinsicWidth = hover.iframe.clientWidth
  // Uniform scale derived from width — iframe content is laid out in CSS
  // pixels and any non-uniform scaling would distort the page itself, which
  // would be a bug at the iframe layer.
  const scale = intrinsicWidth > 0 ? iframeScreen.width / intrinsicWidth : 1

  const left = iframeScreen.left + hover.rect.x * scale
  const top = iframeScreen.top + hover.rect.y * scale
  const width = hover.rect.width * scale
  const height = hover.rect.height * scale

  // Clamp the caption to stay in the viewport. Prefer below the element;
  // flip above when there's no room.
  const captionGap = 4
  const viewportHeight = globalThis.window.innerHeight
  const viewportWidth = globalThis.window.innerWidth
  const captionHeight = 22
  let captionTop = top + height + captionGap
  if (captionTop + captionHeight > viewportHeight) {
    // Try above
    const flipped = top - captionGap - captionHeight
    captionTop = flipped >= 0 ? flipped : viewportHeight - captionHeight - 4
  }
  const captionLeft = Math.max(
    4,
    Math.min(left, viewportWidth - 160),
  )

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed",
          left,
          top,
          width,
          height,
          outline: "1.5px dashed var(--forkshop-accent, #5b6cff)",
          outlineOffset: 1,
          pointerEvents: "none",
          zIndex: Z_TOP,
        }}
        data-forkshop-opt-overlay-tick={tick}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: captionLeft,
          top: captionTop,
          padding: "2px 6px",
          fontSize: 11,
          lineHeight: "16px",
          fontFamily: '"Raveo", system-ui, sans-serif',
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          background: "var(--forkshop-accent, #5b6cff)",
          color: "var(--forkshop-accent-fg, #ffffff)",
          borderRadius: 3,
          pointerEvents: "none",
          zIndex: Z_TOP,
          whiteSpace: "nowrap",
        }}
      >
        {formatPath(hover.source.fileName)}:{hover.source.lineNumber}
      </div>
    </>
  )
}

function formatPath(absPath: string): string {
  const parts = absPath.split("/")
  return parts.slice(-3).join("/")
}
