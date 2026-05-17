"use client"

/**
 * Option-click any element inside a Forkshop iframe to open its source file
 * in the editor (VS Code, Cursor — anything registered for the vscode:// scheme).
 *
 * Hold the Option (Alt) key to preview: every element you mouse over gets a
 * subtle outline + filename:line caption. Release Option to dismiss.
 *
 * Mount once at the root of an iframed page (typically inside the host's
 * `app/layout.tsx`). Does nothing in production, does nothing when the page
 * isn't loaded inside Forkshop's iframe.
 *
 * Implementation notes:
 * - Reads React's `_debugSource` fiber field, which the dev-mode JSX runtime
 *   (`jsxDEV`) attaches automatically. Same mechanism React DevTools uses.
 * - No external dependencies. No compile-time loader required — React's own
 *   dev tooling provides the source attribution we need.
 *
 * Inspired by Locator.js (https://github.com/infi-pc/locatorjs, MIT).
 * Independent implementation; no code shared.
 */

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface SourceLocation {
  fileName: string
  lineNumber: number
  columnNumber: number
}

interface HoverState {
  rect: DOMRect
  source: SourceLocation
}

const FIBER_PREFIX = "__reactFiber$"
const Z_TOP = 2147483647

export function EditorLink({ mountPath = "/forkshop" }: { mountPath?: string } = {}) {
  const [active, setActive] = useState(false)
  const [hover, setHover] = useState<HoverState | null>(null)
  const hoverRef = useRef<HoverState | null>(null)
  hoverRef.current = hover

  // Decide whether to activate at all.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    try {
      if (globalThis.window === globalThis.window.parent) return
      const parentPath = globalThis.window.parent.location.pathname
      if (!parentPath.startsWith(mountPath)) return
    } catch {
      // Cross-origin parent or otherwise inaccessible — skip silently.
      return
    }
    setActive(true)
  }, [mountPath])

  // Wire up listeners while active.
  useEffect(() => {
    if (!active) return

    function onMouseOver(event: MouseEvent) {
      if (!event.altKey) return
      const el = event.target
      if (!(el instanceof HTMLElement)) return
      const source = findSourceForElement(el)
      if (!source) return
      setHover({ rect: el.getBoundingClientRect(), source })
    }

    function onMouseOut() {
      // Don't clear here — mouseover on the next element will replace state.
      // Clearing on out would flicker across child boundaries.
    }

    function onKeyUp(event: KeyboardEvent) {
      if (!event.altKey) setHover(null)
    }

    function onBlur() {
      setHover(null)
    }

    function onClick(event: MouseEvent) {
      if (!event.altKey) return
      const el = event.target
      if (!(el instanceof HTMLElement)) return
      const source = findSourceForElement(el)
      if (!source) return
      event.preventDefault()
      event.stopPropagation()
      navigateToSource(source)
      setHover(null)
    }

    document.addEventListener("mouseover", onMouseOver)
    document.addEventListener("mouseout", onMouseOut)
    document.addEventListener("keyup", onKeyUp)
    document.addEventListener("click", onClick, /* capture */ true)
    globalThis.window.addEventListener("blur", onBlur)

    return () => {
      document.removeEventListener("mouseover", onMouseOver)
      document.removeEventListener("mouseout", onMouseOut)
      document.removeEventListener("keyup", onKeyUp)
      document.removeEventListener("click", onClick, true)
      globalThis.window.removeEventListener("blur", onBlur)
    }
  }, [active])

  if (!active || !hover) return null

  const tagTop = Math.min(hover.rect.bottom + 4, globalThis.window.innerHeight - 24)
  return createPortal(
    <>
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: hover.rect.left,
          top: hover.rect.top,
          width: hover.rect.width,
          height: hover.rect.height,
          outline: "1px solid var(--forkshop-accent, #5b6cff)",
          outlineOffset: 0,
          pointerEvents: "none",
          zIndex: Z_TOP,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: hover.rect.left,
          top: tagTop,
          padding: "2px 6px",
          fontSize: 11,
          lineHeight: "16px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
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
    </>,
    document.body,
  )
}

/**
 * Walk the React fiber attached to `el` upward until we find one with
 * `_debugSource`. Returns null if no fiber carries source attribution
 * (e.g., if the page wasn't built with the dev JSX runtime).
 */
function findSourceForElement(el: HTMLElement): SourceLocation | null {
  const fiberKey = Object.keys(el).find((k) => k.startsWith(FIBER_PREFIX))
  if (!fiberKey) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber: any = (el as any)[fiberKey]
  while (fiber) {
    const source = fiber._debugSource
    if (source && typeof source.fileName === "string") {
      return {
        fileName: source.fileName,
        lineNumber: source.lineNumber ?? 1,
        columnNumber: source.columnNumber ?? 1,
      }
    }
    fiber = fiber.return
  }
  return null
}

/**
 * Display a short relative-looking path. Show up to the last 3 segments
 * so the label stays readable on small canvases.
 */
function formatPath(absPath: string): string {
  const parts = absPath.split("/")
  return parts.slice(-3).join("/")
}

function navigateToSource(source: SourceLocation) {
  const url = `vscode://file/${source.fileName}:${source.lineNumber}:${source.columnNumber}`
  try {
    const top = globalThis.window.top
    if (top) top.location.href = url
    else globalThis.window.location.href = url
  } catch {
    globalThis.window.location.href = url
  }
}
