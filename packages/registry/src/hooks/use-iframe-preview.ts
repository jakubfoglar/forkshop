"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

// Hides dev/prod chrome that pollutes preview iframes (Next.js dev tools,
// build watcher, cookie banner). Injected as a <style> into each iframe.
const PREVIEW_HIDE_CHROME_CSS = `
  [data-cookie-banner] { display: none !important; }
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dialog],
  [data-nextjs-dialog-overlay],
  [id^="__next-build-watcher"] { display: none !important; }
`

// Lazy-loads an iframe (via IntersectionObserver) and keeps its height synced
// to body.scrollHeight (via ResizeObserver). Forwards wheel events to the host
// canvas so pinch/scroll keep working over iframe content, and optionally
// forwards double-clicks (used by blocks-board to drill into isolation).
//
// Measure body, not documentElement: html is bounded below by the iframe's
// own viewport height, so it always reports back whatever height we set —
// heights would never shrink.
export function useIframePreview({
  onHeightChange,
  onWheel,
  onDoubleClick,
}: {
  onHeightChange?: (height: number) => void
  onWheel: (event: WheelEvent, iframe: HTMLIFrameElement) => void
  onDoubleClick?: () => void
}): { iframeRef: RefObject<HTMLIFrameElement | null>; shouldLoad: boolean } {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (shouldLoad) return
    const iframe = iframeRef.current
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
    const iframe = iframeRef.current
    if (!iframe) return

    let observer: ResizeObserver | undefined
    let attachedDocument: Document | undefined
    let wheelHandler: ((event: WheelEvent) => void) | undefined
    let dblclickHandler: ((event: MouseEvent) => void) | undefined

    const sync = () => {
      const document_ = iframe.contentDocument
      if (!document_) return
      const body = document_.body
      const measured = body ? body.scrollHeight : document_.documentElement.scrollHeight
      if (measured <= 0) return
      iframe.style.height = `${measured}px`
      onHeightChange?.(measured)
    }

    const handleLoad = () => {
      const document_ = iframe.contentDocument
      if (!document_) return
      attachedDocument = document_

      const previewStyle = document_.createElement("style")
      previewStyle.dataset.forkshopPreview = "true"
      previewStyle.textContent = PREVIEW_HIDE_CHROME_CSS
      document_.head.append(previewStyle)

      sync()
      observer = new ResizeObserver(sync)
      observer.observe(document_.body ?? document_.documentElement)
      wheelHandler = (event) => onWheel(event, iframe)
      document_.addEventListener("wheel", wheelHandler, { passive: false })
      if (onDoubleClick) {
        dblclickHandler = (event) => {
          event.preventDefault()
          onDoubleClick()
        }
        document_.addEventListener("dblclick", dblclickHandler)
      }
    }

    iframe.addEventListener("load", handleLoad)
    return () => {
      iframe.removeEventListener("load", handleLoad)
      observer?.disconnect()
      observer = undefined
      if (attachedDocument && wheelHandler) {
        attachedDocument.removeEventListener("wheel", wheelHandler)
      }
      if (attachedDocument && dblclickHandler) {
        attachedDocument.removeEventListener("dblclick", dblclickHandler)
      }
      attachedDocument = undefined
      wheelHandler = undefined
      dblclickHandler = undefined
    }
  }, [shouldLoad, onHeightChange, onWheel, onDoubleClick])

  return { iframeRef, shouldLoad }
}
