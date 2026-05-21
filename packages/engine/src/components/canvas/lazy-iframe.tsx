"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { PREVIEW_AGENT_READ_CSS } from "@forkshop/lib/edit-mode"

export type LazyIframeHeightMode = "auto" | "cap" | "fixed"

export function clampReportedHeight(
  measured: number,
  mode: LazyIframeHeightMode,
  cap: number | undefined,
): number {
  if (mode === "cap" && cap !== undefined) return Math.min(measured, cap)
  return measured
}

export function buildIframeContentStyle(mode: LazyIframeHeightMode): string {
  // Always: hide Next dev chrome and decouple body height from the iframe
  // viewport so min-h-screen doesn't pin body to the iframe's CSS height.
  // Cap mode additionally locks scroll inside the iframe doc — the canvas
  // is the scroll surface, not the embedded page.
  const lockScroll =
    mode === "cap" ? "html, body { overflow: hidden !important; }\n" : ""
  return `
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dev-overlay],
  #__next-build-watcher {
    display: none !important;
  }
  html, body { min-height: 0 !important; height: auto !important; }
  [class*="min-h-screen"],
  [class*="min-h-dvh"],
  [class*="min-h-svh"],
  [class*="min-h-lvh"] { min-height: 0 !important; }
  /* Fixed viewport-height classes (h-screen / h-svh / h-dvh / h-lvh) pin the
   * element to the iframe's intrinsic viewport, which starts at the browser's
   * default 150px. That collapses any Board-rendered page to ~150 tall and
   * the measured body.scrollHeight gets stuck there. Force height: auto so
   * the page grows to its natural content height instead. */
  [class*="h-screen"],
  [class*="h-dvh"],
  [class*="h-svh"],
  [class*="h-lvh"] { height: auto !important; }
  ${lockScroll}`
}

export type LazyIframeProps = {
  src: string
  title: string
  width: number
  /**
   * How the iframe wrapper's height is computed:
   * - "auto": grow to fit body.scrollHeight, no cap (default)
   * - "cap": grow to fit body.scrollHeight, but never exceed `height`
   * - "fixed": always render at `height`, ignoring body scrollHeight
   *
   * `height` is required for "cap" and "fixed"; ignored for "auto".
   */
  heightMode?: LazyIframeHeightMode
  height?: number
  /** @deprecated Use heightMode="cap" + height instead. heightCap maps to heightMode="cap". */
  heightCap?: number
  /**
   * When provided, the iframe loads at this intrinsic width (e.g. 1440 for a
   * desktop thumbnail) and is CSS-scaled down to fit `width × resolvedHeight`.
   * Without it, the iframe renders at `width` directly (mobile-narrow if width
   * is small). Useful for sitemap-style thumbnails that want a desktop render.
   */
  desktopWidth?: number
  iframeRef?: (element: HTMLIFrameElement | undefined) => void
  className?: string
  onIframeWheel?: (event: WheelEvent, iframe: HTMLIFrameElement) => void
  // Optional: called on every contentDocument resize. Used by isolation views
  // that auto-size to their content. Off by default to avoid the cost.
  onBodyHeightSync?: (height: number) => void
  // Project-relative path / label so agent-activity decorations can target
  // this iframe's wrapper container via data attribute.
  hostFileLabel?: string
}

export function LazyIframe({
  src,
  title,
  width,
  heightMode,
  height,
  heightCap,
  desktopWidth,
  iframeRef,
  className,
  onIframeWheel,
  onBodyHeightSync,
  hostFileLabel,
}: LazyIframeProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const [measuredBodyHeight, setMeasuredBodyHeight] = useState<number | undefined>(undefined)
  const localRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (typeof document === "undefined") return
    if (document.querySelector("style[data-forkshop-agent-read]") !== null) return
    const style = document.createElement("style")
    style.dataset.forkshopAgentRead = "true"
    style.textContent = PREVIEW_AGENT_READ_CSS
    document.head.append(style)
  }, [])

  // Resolve mode + cap up-front so handleBodySync can reference them.
  const effectiveMode: LazyIframeHeightMode =
    heightMode ?? (heightCap !== undefined ? "cap" : "auto")
  const effectiveCap =
    effectiveMode === "cap" ? (height ?? heightCap) : undefined

  // Always tracks internally so the iframe element can self-size to its body,
  // and also forwards to the parent if it asked for body-height sync.
  const handleBodySync = useCallback(
    (h: number) => {
      // Internal state stays raw so the wrapper can render Math.min(measured, cap).
      setMeasuredBodyHeight((prev) => (prev === h ? prev : h))
      onBodyHeightSync?.(clampReportedHeight(h, effectiveMode, effectiveCap))
    },
    [onBodyHeightSync, effectiveMode, effectiveCap],
  )

  useEffect(() => {
    if (shouldLoad) return
    const iframe = localRef.current
    if (!iframe) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
            return
          }
        }
      },
      { rootMargin: "1000px" },
    )
    observer.observe(iframe)
    return () => observer.disconnect()
  }, [shouldLoad])

  useEffect(() => {
    if (!shouldLoad) return
    const iframe = localRef.current
    if (!iframe) return
    let attached: Document | undefined
    let wheelHandler: ((event: WheelEvent) => void) | undefined
    let gestureHandler: ((event: Event) => void) | undefined
    let resizeObserver: ResizeObserver | undefined
    let styleElement: HTMLStyleElement | undefined
    const onLoad = () => {
      const document_ = iframe.contentDocument
      if (!document_) return
      attached = document_
      // Hide Next.js dev chrome (the floating "N" badge, toasts, etc.) so it
      // doesn't bleed into thumbnails or preview tiles. Also decouple body
      // height from the iframe viewport so `min-h-screen` doesn't keep body
      // pinned to the iframe's CSS height — which would defeat the
      // ResizeObserver-driven self-sizing below.
      styleElement = document_.createElement("style")
      styleElement.textContent = buildIframeContentStyle(effectiveMode)
      document_.head.append(styleElement)
      if (onIframeWheel) {
        wheelHandler = (event) => onIframeWheel(event, iframe)
        document_.addEventListener("wheel", wheelHandler, { passive: false })
      }
      gestureHandler = (event) => event.preventDefault()
      document_.addEventListener("gesturestart", gestureHandler, { passive: false })
      document_.addEventListener("gesturechange", gestureHandler, { passive: false })
      document_.addEventListener("gestureend", gestureHandler, { passive: false })
      const sync = () => {
        // Body scrollHeight reflects content extent after the CSS override
        // above frees body from `min-h-screen`. Fall back to documentElement
        // before body is available.
        const body = document_.body
        const measured = body ? body.scrollHeight : document_.documentElement.scrollHeight
        if (measured > 0) handleBodySync(measured)
      }
      sync()
      resizeObserver = new ResizeObserver(sync)
      resizeObserver.observe(document_.body ?? document_.documentElement)
    }
    iframe.addEventListener("load", onLoad)
    if (iframe.contentDocument?.readyState === "complete") {
      onLoad()
    }
    return () => {
      iframe.removeEventListener("load", onLoad)
      resizeObserver?.disconnect()
      styleElement?.remove()
      if (attached && wheelHandler) attached.removeEventListener("wheel", wheelHandler)
      if (attached && gestureHandler) {
        attached.removeEventListener("gesturestart", gestureHandler)
        attached.removeEventListener("gesturechange", gestureHandler)
        attached.removeEventListener("gestureend", gestureHandler)
      }
    }
  }, [shouldLoad, onIframeWheel, handleBodySync, effectiveMode])

  // Resolve height based on the explicit mode, falling back to the
  // deprecated heightCap behavior for back-compat.
  let resolvedHeight: number | undefined
  if (effectiveMode === "fixed") {
    resolvedHeight = height
  } else if (effectiveMode === "cap") {
    resolvedHeight =
      measuredBodyHeight !== undefined && effectiveCap !== undefined
        ? Math.min(measuredBodyHeight, effectiveCap)
        : (measuredBodyHeight ?? effectiveCap)
  } else {
    // "auto" — content drives height, no cap
    resolvedHeight = measuredBodyHeight
  }

  const useScaling = desktopWidth !== undefined && desktopWidth > 0
  const scale = useScaling ? width / desktopWidth : 1

  return (
    <div
      style={{ width, height: resolvedHeight, overflow: "hidden", position: "relative" }}
      className={className}
      data-forkshop-iframe-host={hostFileLabel ?? ""}
    >
      <iframe
        ref={(element) => {
          localRef.current = element
          iframeRef?.(element ?? undefined)
        }}
        src={shouldLoad ? src : undefined}
        title={title}
        scrolling="no"
        style={{
          width: useScaling ? desktopWidth : width,
          height: useScaling && resolvedHeight !== undefined ? resolvedHeight / scale : resolvedHeight,
          border: 0,
          display: "block",
          transform: useScaling ? `scale(${scale})` : undefined,
          transformOrigin: useScaling ? "top left" : undefined,
        }}
      />
    </div>
  )
}
