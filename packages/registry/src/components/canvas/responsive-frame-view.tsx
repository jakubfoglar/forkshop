"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CanvasLabel } from "@forkshop/components/canvas/canvas-label"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"

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

type ResponsiveFrameViewProps = (
  // `source` (optional) overrides the iframe URL while `path` stays the
  // identity key — used for synthetic preview paths like /X/_locked that load
  // a different URL than they tree under.
  | { kind: "page"; path: string; source?: string; title?: string; description?: string }
  | { kind: "block"; slug: string; title: string; description: string }
) & {
  measuredHeight: number | undefined
  onBodyHeightChange: (id: string, height: number) => void
  onIframeWheel: (event: WheelEvent, iframe: HTMLIFrameElement) => void
  onIframeMount?: (index: number, iframe: HTMLIFrameElement | undefined) => void
  agentActive?: boolean
  /** Viewport widths to render. Defaults to [1440, 768, 375]. */
  viewports?: number[]
}

// Displayed at 50% of native (1200×630) so the OG preview doesn't dominate
// the page-isolation canvas.
const OG_IMAGE_WIDTH = 600
const OG_IMAGE_HEIGHT = 315
const OG_IMAGE_GAP = 32

export function ResponsiveFrameView(props: ResponsiveFrameViewProps) {
  const {
    measuredHeight,
    onBodyHeightChange,
    onIframeWheel,
    onIframeMount,
    agentActive,
    viewports = DEFAULT_VIEWPORTS,
  } = props
  const id = props.kind === "page" ? props.path : `block:${props.slug}`
  const source = props.kind === "page" ? (props.source ?? props.path) : `/forkshop/block/${props.slug}`
  const title =
    props.kind === "page" ? (props.title ?? props.path) : `${props.slug} — ${props.title}`
  const isPage = props.kind === "page"

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
    onBodyHeightChange(id, maxHeight)
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
            onIframeMount={onIframeMount}
            onLocalHeightChange={handleViewportHeightChange}
            onOgImageDetected={index === 0 && isPage ? setOgImageUrl : undefined}
            onIframeWheel={onIframeWheel}
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
  onIframeMount,
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
  onIframeMount?: (index: number, iframe: HTMLIFrameElement | undefined) => void
  onLocalHeightChange: (index: number, height: number) => void
  onOgImageDetected?: (url: string | undefined) => void
  onIframeWheel: (event: WheelEvent, iframe: HTMLIFrameElement) => void
}) {
  const [iframeElement, setIframeElement] = useState<HTMLIFrameElement>()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    onIframeMount?.(viewportIndex, iframeElement)
  }, [iframeElement, viewportIndex, onIframeMount])

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

      // The marketing layout wraps everything in min-h-screen, which in an
      // iframe == iframe height — body.scrollHeight then reports the iframe
      // size we set, not the actual content extent. Override min-height so the
      // layout sizes to its content; the iframe then sizes correctly.
      // Also hide chrome that would otherwise pollute every previewed page —
      // the cookie banner and Next.js dev-tools button.
      const previewStyle = document_.createElement("style")
      previewStyle.dataset.forkshopPreview = "true"
      previewStyle.textContent = `
        html, body { min-height: 0 !important; height: auto !important; }
        [class*="min-h-screen"] { min-height: 0 !important; }
        [data-cookie-banner] { display: none !important; }
        nextjs-portal,
        [data-nextjs-toast],
        [data-nextjs-dialog],
        [data-nextjs-dialog-overlay],
        [id^="__next-build-watcher"] { display: none !important; }
      `
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
        ref={(element) => { iframeRef.current = element; setIframeElement(element ?? undefined) }}
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
