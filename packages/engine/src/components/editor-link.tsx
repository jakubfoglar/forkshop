"use client"

/**
 * Option-click any element inside a Forkshop iframe to open its source file
 * in the editor (VS Code, Cursor — anything registered for the vscode:// scheme).
 *
 * Hold the Option (Alt) key to preview: every element you mouse over gets a
 * subtle outline + a small filename:line caption. Release Option to dismiss.
 *
 * Mount once at the root of an iframed page (typically inside the host's
 * `app/layout.tsx`). Does nothing in production, does nothing when the page
 * isn't loaded inside Forkshop's iframe.
 *
 * Source attribution comes from `@locator/webpack-loader` (build-time only):
 * it stamps every JSX element with `data-locatorjs="<file>:<line>:<col>"` so
 * the runtime here only needs to read a DOM attribute — no React internals,
 * no SWC quirks, works in any framework that runs the loader.
 *
 * Inspired by Locator.js (https://github.com/infi-pc/locatorjs, MIT). The
 * runtime here is an independent Forkshop implementation; no code shared.
 * The compile-time loader is `@locator/webpack-loader` (still upstream).
 */

import { useEffect, useState } from "react"
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

const LOCATOR_ATTR = "data-locatorjs"
const Z_TOP = 2147483647

export function EditorLink({ mountPath = "/forkshop" }: { mountPath?: string } = {}) {
  const [active, setActive] = useState(false)
  const [hover, setHover] = useState<HoverState | null>(null)

  // Activation: dev only, inside an iframe, parent path matches mountPath.
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

  // Wire DOM listeners while active.
  useEffect(() => {
    if (!active) return

    function onMouseOver(event: MouseEvent) {
      if (!event.altKey) return
      const el = event.target
      if (!(el instanceof HTMLElement)) return
      const result = findElementWithSource(el)
      if (!result) return
      setHover({ rect: result.el.getBoundingClientRect(), source: result.source })
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
      const result = findElementWithSource(el)
      if (!result) return
      event.preventDefault()
      event.stopPropagation()
      navigateToSource(result.source)
      setHover(null)
    }

    document.addEventListener("mouseover", onMouseOver)
    document.addEventListener("keyup", onKeyUp)
    document.addEventListener("click", onClick, /* capture */ true)
    globalThis.window.addEventListener("blur", onBlur)

    return () => {
      document.removeEventListener("mouseover", onMouseOver)
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
 * Walk up from `el` looking for the nearest ancestor with a parseable
 * `data-locatorjs` attribute. Returns the element + parsed source, or null.
 */
function findElementWithSource(
  el: HTMLElement,
): { el: HTMLElement; source: SourceLocation } | null {
  let cur: HTMLElement | null = el
  while (cur && cur !== document.body) {
    const raw = cur.getAttribute(LOCATOR_ATTR)
    if (raw) {
      const source = parseLocatorValue(raw)
      if (source) return { el: cur, source }
    }
    cur = cur.parentElement
  }
  return null
}

/**
 * Locator's webpack loader emits values shaped like:
 *   "/abs/path/to/file.tsx:14:5"
 * The file path itself can contain colons on weird systems, so split from the
 * right: the last two `:N` segments are line and column; everything before is
 * the filename.
 */
function parseLocatorValue(raw: string): SourceLocation | null {
  const parts = raw.split(":")
  if (parts.length < 3) return null
  const columnStr = parts.pop()!
  const lineStr = parts.pop()!
  const fileName = parts.join(":")
  const lineNumber = Number.parseInt(lineStr, 10)
  const columnNumber = Number.parseInt(columnStr, 10)
  if (!fileName || Number.isNaN(lineNumber)) return null
  return {
    fileName,
    lineNumber: lineNumber || 1,
    columnNumber: Number.isNaN(columnNumber) ? 1 : columnNumber,
  }
}

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
