"use client"

import { useEffect, useRef, useState } from "react"

type LazyIframeProps = {
  src: string
  title: string
  width: number
  // Either a fixed pixel `height` or a `heightCap` (height undefined when 0).
  // If both are provided, `height` wins.
  height?: number
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
  onIframeDblClick?: (event: MouseEvent, iframe: HTMLIFrameElement) => void
  // Optional: called on every contentDocument resize. Used by isolation views
  // that auto-size to their content. Off by default to avoid the cost.
  onBodyHeightSync?: (height: number) => void
}

export function LazyIframe({
  src,
  title,
  width,
  height,
  heightCap,
  desktopWidth,
  iframeRef,
  className,
  onIframeWheel,
  onIframeDblClick,
  onBodyHeightSync,
}: LazyIframeProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const localRef = useRef<HTMLIFrameElement | null>(null)

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
    let dblClickHandler: ((event: MouseEvent) => void) | undefined
    let gestureHandler: ((event: Event) => void) | undefined
    let resizeObserver: ResizeObserver | undefined
    let styleElement: HTMLStyleElement | undefined
    const onLoad = () => {
      const document_ = iframe.contentDocument
      if (!document_) return
      attached = document_
      // Hide Next.js dev chrome (the floating "N" badge, toasts, etc.) so it
      // doesn't bleed into thumbnails or preview tiles.
      styleElement = document_.createElement("style")
      styleElement.textContent = `
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dev-overlay],
  #__next-build-watcher {
    display: none !important;
  }
`
      document_.head.append(styleElement)
      if (onIframeWheel) {
        wheelHandler = (event) => onIframeWheel(event, iframe)
        document_.addEventListener("wheel", wheelHandler, { passive: false })
      }
      if (onIframeDblClick) {
        dblClickHandler = (event) => onIframeDblClick(event, iframe)
        document_.addEventListener("dblclick", dblClickHandler, { capture: true })
      }
      gestureHandler = (event) => event.preventDefault()
      document_.addEventListener("gesturestart", gestureHandler, { passive: false })
      document_.addEventListener("gesturechange", gestureHandler, { passive: false })
      document_.addEventListener("gestureend", gestureHandler, { passive: false })
      if (onBodyHeightSync) {
        const sync = () => {
          const measured = document_.documentElement.scrollHeight
          if (measured > 0) onBodyHeightSync(measured)
        }
        sync()
        resizeObserver = new ResizeObserver(sync)
        resizeObserver.observe(document_.documentElement)
      }
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
      if (attached && dblClickHandler) attached.removeEventListener("dblclick", dblClickHandler, { capture: true })
      if (attached && gestureHandler) {
        attached.removeEventListener("gesturestart", gestureHandler)
        attached.removeEventListener("gesturechange", gestureHandler)
        attached.removeEventListener("gestureend", gestureHandler)
      }
    }
  }, [shouldLoad, onIframeWheel, onIframeDblClick, onBodyHeightSync])

  const resolvedHeight =
    height ?? (heightCap !== undefined && heightCap > 0 ? heightCap : undefined)

  const useScaling = desktopWidth !== undefined && desktopWidth > 0
  const scale = useScaling ? width / desktopWidth : 1

  return (
    <div
      style={{ width, height: resolvedHeight, overflow: "hidden", position: "relative" }}
      className={className}
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
