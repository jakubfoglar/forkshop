"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CanvasLabel } from "@forkshop/components/canvas/canvas-label"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"
import { useAgentEditEpoch } from "@forkshop/components/agent-activity-context"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { PREVIEW_HIDE_CHROME_CSS } from "@forkshop/hooks/use-iframe-preview"

type IframeIdentity =
  | { kind: "page"; path: string }
  | { kind: "block"; slug: string }

const BLOCK_VIEWPORT_GAP = 32
const ISOLATION_LABEL_HEIGHT = 80
const DEFAULT_VIEWPORT_HEIGHT = 720

const DEFAULT_VIEWPORTS = [1440, 768, 375]

const DEFAULT_VIEWPORT_LABELS: Record<number, string> = {
  1440: "Desktop · 1440",
  768: "Tablet · 768",
  375: "Mobile · 375",
}

type ViewportPosition = { label: string; width: number; x: number }

function buildViewportLayout(viewportWidths: readonly number[]): readonly ViewportPosition[] {
  const positions: ViewportPosition[] = []
  let x = 0
  for (const width of viewportWidths) {
    const label = DEFAULT_VIEWPORT_LABELS[width] ?? `${width}px`
    positions.push({ label, width, x })
    x += width + BLOCK_VIEWPORT_GAP
  }
  return positions
}

export function responsiveFrameStageDimensions(
  measuredHeight: number | undefined,
  viewports: readonly number[] = DEFAULT_VIEWPORTS,
) {
  const width =
    viewports.reduce((sum, w) => sum + w, 0) + BLOCK_VIEWPORT_GAP * (viewports.length - 1)
  const height = ISOLATION_LABEL_HEIGHT + (measuredHeight ?? DEFAULT_VIEWPORT_HEIGHT)
  return { width, height }
}

export type ResponsiveFrameViewProps = {
  /** Logical identifier for activity matching and agent glow (route path or block slug). */
  path: string
  /** URL to iframe at each viewport. */
  source: string
  /** Viewport widths in pixels. Defaults to [1440, 768, 375]. */
  viewports?: number[]
  /** Drives labels and OG-image rendering. Defaults to "page". */
  kind?: "page" | "block"
  /** Measured body height (for stage-fit calculations from the parent). */
  measuredHeight?: number
  /** Fires when iframes report body height. */
  onBodyHeightChange?: (id: string, height: number) => void
  /** Optional agent-active flag (parent can drive glow indicator). */
  agentActive?: boolean
}

// Displayed at 50% of native (1200×630) so the OG preview doesn't dominate
// the page-isolation canvas.
const OG_IMAGE_WIDTH = 600
const OG_IMAGE_HEIGHT = 315
const OG_IMAGE_GAP = 32

export function ResponsiveFrameView(props: ResponsiveFrameViewProps) {
  const {
    path,
    source,
    viewports = DEFAULT_VIEWPORTS,
    kind = "page",
    measuredHeight,
    onBodyHeightChange,
    agentActive,
  } = props
  const id = kind === "page" ? path : `block:${path}`
  const title = kind === "page" ? path : `${path}`
  const isPage = kind === "page"

  const { applyWheelInput, transformRef } = useForkshopCanvas()
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

  // Stable identity used to look up the agent-edit epoch for this iframe set.
  // All viewports share one identity so they reload together when Claude
  // touches the underlying file.
  const identity = useMemo<IframeIdentity>(
    () =>
      kind === "page"
        ? { kind: "page", path }
        : { kind: "block", slug: path },
    [kind, path],
  )

  const viewportLayout = buildViewportLayout(viewports)

  const [viewportHeights, setViewportHeights] = useState<readonly number[]>(() =>
    viewportLayout.map(() => measuredHeight ?? DEFAULT_VIEWPORT_HEIGHT),
  )
  const [ogImageUrl, setOgImageUrl] = useState<string>()

  // Re-initialise heights when the viewport count changes
  useEffect(() => {
    setViewportHeights(viewportLayout.map(() => measuredHeight ?? DEFAULT_VIEWPORT_HEIGHT))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewports.join(",")])

  const desktopHeight = viewportHeights[0] ?? DEFAULT_VIEWPORT_HEIGHT
  // For pages we also reserve space under the desktop viewport for the OG image
  // preview so the stage actually fits it on Fit.
  const desktopColumnHeight = isPage
    ? desktopHeight + OG_IMAGE_GAP + OG_IMAGE_HEIGHT
    : desktopHeight
  const maxHeight = viewportHeights.reduce(
    (max, h) => Math.max(max, h),
    Math.max(desktopColumnHeight, DEFAULT_VIEWPORT_HEIGHT),
  )

  useEffect(() => {
    onBodyHeightChange?.(id, maxHeight)
  }, [id, maxHeight, onBodyHeightChange])

  // Reset the captured OG image when the page changes; the new iframe load
  // will re-read its meta tag.
  useEffect(() => {
    setOgImageUrl(undefined)
  }, [id])

  const handleViewportHeightChange = useCallback((index: number, height: number) => {
    setViewportHeights((current) => {
      if (current[index] === height) return current
      const next = [...current]
      next[index] = height
      return next
    })
  }, [])

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "relative",
          top: ISOLATION_LABEL_HEIGHT,
          height: maxHeight,
        }}
      >
        {viewportLayout.map((viewport, index) => (
          <Viewport
            key={viewport.width}
            viewport={viewport}
            source={source}
            title={title}
            height={viewportHeights[index] ?? DEFAULT_VIEWPORT_HEIGHT}
            viewportIndex={index}
            agentActive={agentActive ?? false}
            identity={identity}
            onLocalHeightChange={handleViewportHeightChange}
            onOgImageDetected={index === 0 && isPage ? setOgImageUrl : undefined}
            onIframeWheel={handleIframeWheel}
          />
        ))}
        {isPage && ogImageUrl && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: desktopHeight + OG_IMAGE_GAP,
              width: OG_IMAGE_WIDTH,
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: 4,
              }}
            >
              <CanvasLabel style={{ pointerEvents: "none" }}>OG image</CanvasLabel>
            </div>
            {/* oxlint-disable-next-line no-img-element -- preview image inside an internal tool; next/image adds no value here and would force host allowlisting */}
            <img
              src={ogImageUrl}
              alt="Open Graph preview"
              width={OG_IMAGE_WIDTH}
              height={OG_IMAGE_HEIGHT}
              className="block bg-white shadow-md"
              style={{ width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, display: "block" }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const AGENT_COLOR_LITERAL = "oklch(0.62 0.22 280)"

function Viewport({
  viewport,
  source,
  title,
  height,
  viewportIndex,
  agentActive,
  identity,
  onLocalHeightChange,
  onOgImageDetected,
  onIframeWheel,
}: {
  viewport: ViewportPosition
  source: string
  title: string
  height: number
  viewportIndex: number
  agentActive: boolean
  identity: IframeIdentity
  onLocalHeightChange: (index: number, height: number) => void
  onOgImageDetected?: (url: string | undefined) => void
  onIframeWheel: (event: WheelEvent, iframe: HTMLIFrameElement) => void
}) {
  const [iframeElement, setIframeElement] = useState<HTMLIFrameElement>()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)
  // useCallback is required here: an inline ref callback creates a new function
  // identity on every render, which causes React to call it with null (detach)
  // then with the element (attach) — each call triggers setIframeElement →
  // re-render → new callback identity → infinite loop.
  const handleIframeRef = useCallback((element: HTMLIFrameElement | null) => {
    iframeRef.current = element
    setIframeElement(element ?? undefined)
  }, [])
  const [shouldLoad, setShouldLoad] = useState(false)

  // Reload the iframe each time the agent-edit epoch for this iframe's
  // identity advances. Next.js Fast Refresh isn't reaching iframe documents
  // in Forkshop's nested setup, so we force a fresh load instead. Debounced
  // ~250ms so a burst of edits collapses into one reload.
  const editEpoch = useAgentEditEpoch(identity)
  const reloadedAtRef = useRef(0)
  useEffect(() => {
    if (!shouldLoad) return
    if (editEpoch === 0 || editEpoch <= reloadedAtRef.current) return
    const epochAtSchedule = editEpoch
    const timer = setTimeout(() => {
      reloadedAtRef.current = epochAtSchedule
      const win = iframeElement?.contentWindow
      if (!win) return
      try {
        win.location.reload()
      } catch {
        // cross-origin or pre-load — fall back to bumping src.
        if (iframeElement) iframeElement.src = iframeElement.src
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [editEpoch, shouldLoad, iframeElement])

  useEffect(() => {
    if (shouldLoad) return
    if (!iframeElement) return
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
    observer.observe(iframeElement)
    return () => observer.disconnect()
  }, [shouldLoad, iframeElement])

  useEffect(() => {
    if (!shouldLoad) return
    const iframe = iframeElement
    if (!iframe) return
    let attachedDocument: Document | undefined
    let wheelHandler: ((event: WheelEvent) => void) | undefined
    let gestureHandler: ((event: Event) => void) | undefined
    let resizeObserver: ResizeObserver | undefined
    const handleLoad = () => {
      const document_ = iframe.contentDocument
      if (!document_) return
      attachedDocument = document_

      // Decouple body height from iframe viewport (so min-h-screen pages don't
      // feedback-loop with the ResizeObserver sync below) and hide host-page
      // chrome (cookie banners, Next dev indicators) that would otherwise
      // appear inside every preview tile. Shared with useIframePreview so both
      // iframe paths stay in sync.
      const previewStyle = document_.createElement("style")
      previewStyle.dataset.forkshopPreview = "true"
      previewStyle.textContent = PREVIEW_HIDE_CHROME_CSS
      document_.head.append(previewStyle)

      wheelHandler = (event) => onIframeWheel(event, iframe)
      document_.addEventListener("wheel", wheelHandler, { passive: false })
      gestureHandler = (event) => event.preventDefault()
      document_.addEventListener("gesturestart", gestureHandler, { passive: false })
      document_.addEventListener("gesturechange", gestureHandler, { passive: false })
      document_.addEventListener("gestureend", gestureHandler, { passive: false })
      const sync = () => {
        // Measure body (not documentElement). The CSS override above lets the
        // body size to its content; without it, a min-h-screen layout would
        // keep body at iframe height regardless of content.
        const body = document_.body
        const measured = body ? body.scrollHeight : document_.documentElement.scrollHeight
        if (measured > 0) onLocalHeightChange(viewportIndex, measured)
      }
      sync()
      resizeObserver = new ResizeObserver(sync)
      const target = document_.body ?? document_.documentElement
      resizeObserver.observe(target)

      // Read the actual rendered og:image meta tag so the preview shows the
      // exact same image the page emits in production. Resolve to the current
      // host so we render the dev /api/og output, not the production URL the
      // metadataBase resolves to.
      if (onOgImageDetected) {
        const meta = document_.querySelector('meta[property="og:image"]')
        const content = meta?.getAttribute("content")
        let resolved: string | undefined
        if (content) {
          try {
            const url = new URL(content)
            url.protocol = globalThis.location.protocol
            url.host = globalThis.location.host
            resolved = url.toString()
          } catch {
            // Already relative — use as-is.
            resolved = content
          }
        }
        onOgImageDetected(resolved)
      }
    }
    iframe.addEventListener("load", handleLoad)
    if (iframe.contentDocument?.readyState === "complete") {
      handleLoad()
    }
    return () => {
      iframe.removeEventListener("load", handleLoad)
      resizeObserver?.disconnect()
      if (attachedDocument && wheelHandler) {
        attachedDocument.removeEventListener("wheel", wheelHandler)
      }
      if (attachedDocument && gestureHandler) {
        attachedDocument.removeEventListener("gesturestart", gestureHandler)
        attachedDocument.removeEventListener("gesturechange", gestureHandler)
        attachedDocument.removeEventListener("gestureend", gestureHandler)
      }
    }
  }, [
    shouldLoad,
    viewportIndex,
    onLocalHeightChange,
    onOgImageDetected,
    onIframeWheel,
    iframeElement,
  ])

  return (
    <div style={{ position: "absolute", top: 0, left: viewport.x, width: viewport.width }}>
      <div
        style={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          marginBottom: 4,
        }}
      >
        <CanvasLabel style={{ pointerEvents: "none" }}>{viewport.label}</CanvasLabel>
      </div>
      <iframe
        ref={handleIframeRef}
        src={shouldLoad ? source : undefined}
        title={title}
        scrolling="no"
        style={{
          width: viewport.width,
          height,
          border: 0,
          display: "block",
          boxShadow: agentActive
            ? `0 0 0 calc(2px / var(--canvas-zoom, 1)) ${AGENT_COLOR_LITERAL}, 0 0 0 calc(8px / var(--canvas-zoom, 1)) color-mix(in oklch, ${AGENT_COLOR_LITERAL} 18%, transparent), 0 4px 6px -1px rgba(0,0,0,0.08)`
            : undefined,
          transition: "box-shadow 200ms ease-out",
        }}
        className={agentActive ? "bg-white" : "bg-white shadow-md"}
      />
    </div>
  )
}
