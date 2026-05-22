"use client"

/**
 * Option-click any element inside a Forkshop iframe to open its source file
 * in the editor (VS Code, Cursor — anything registered for the vscode:// scheme).
 *
 * Hold the Option (Alt) key to preview: every element you mouse over gets a
 * subtle outline + a small filename:line caption rendered by the canvas
 * (EditorLinkOverlay), not inside the iframe — so the overlay never clips at
 * the iframe edge and isn't subject to in-iframe overflow contexts.
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
 * This component renders no visible chrome itself. It posts hover state to the
 * parent canvas via window.postMessage; EditorLinkOverlay receives those
 * messages and draws the overlay at canvas level.
 *
 * Inspired by Locator.js (https://github.com/infi-pc/locatorjs, MIT). The
 * runtime here is an independent Forkshop implementation; no code shared.
 * The compile-time loader is `@locator/webpack-loader` (still upstream).
 */

import { useEffect, useState } from "react"

interface SourceLocation {
  fileName: string
  lineNumber: number
  columnNumber: number
}

const LOCATOR_ATTR = "data-locatorjs"

// Pointer cursor on every locatorjs-stamped element while Option is held.
// Lives in a sibling <style> we inject once per iframe document.
const EDITOR_LINK_CSS = `
[data-forkshop-opt-down] [${LOCATOR_ATTR}] { cursor: pointer !important; }
`

export function EditorLink({ mountPath = "/forkshop" }: { mountPath?: string } = {}) {
  const [active, setActive] = useState(false)

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

  // Inject the cursor stylesheet once. Cleanup on unmount.
  useEffect(() => {
    if (!active) return
    const existing = document.head.querySelector("style[data-forkshop-editor-link]")
    if (existing) return
    const style = document.createElement("style")
    style.dataset.forkshopEditorLink = "true"
    style.textContent = EDITOR_LINK_CSS
    document.head.append(style)
    return () => {
      style.remove()
    }
  }, [active])

  // Wire DOM listeners while active.
  useEffect(() => {
    if (!active) return

    function postHover(rect: DOMRect, source: SourceLocation) {
      try {
        globalThis.window.parent.postMessage(
          {
            type: "forkshop:opt-hover",
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            source,
          },
          "*",
        )
      } catch {
        // Cross-origin or detached parent — silently ignore.
      }
    }

    function postClear() {
      try {
        globalThis.window.parent.postMessage({ type: "forkshop:opt-hover-clear" }, "*")
      } catch {
        // Cross-origin or detached parent — silently ignore.
      }
    }

    function setOptDown(value: boolean) {
      if (value) {
        document.documentElement.dataset.forkshopOptDown = ""
      } else {
        delete document.documentElement.dataset.forkshopOptDown
      }
    }

    function clearOptState() {
      setOptDown(false)
      postClear()
    }

    function onMouseOver(event: MouseEvent) {
      // Option held tracks on every mouse event — most reliable signal we
      // have, since keyup may fire in a different window (parent canvas)
      // when keyboard focus isn't in the iframe.
      if (!event.altKey) {
        clearOptState()
        return
      }
      setOptDown(true)
      const el = event.target
      if (!(el instanceof HTMLElement)) {
        postClear()
        return
      }
      const result = findElementWithSource(el)
      if (!result) {
        postClear()
        return
      }
      postHover(result.el.getBoundingClientRect(), result.source)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey) setOptDown(true)
    }

    function onKeyUp(event: KeyboardEvent) {
      if (!event.altKey) clearOptState()
    }

    function onBlur() {
      clearOptState()
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
      clearOptState()
    }

    document.addEventListener("mouseover", onMouseOver)
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("keyup", onKeyUp)
    document.addEventListener("click", onClick, /* capture */ true)
    globalThis.window.addEventListener("blur", onBlur)

    // Keyboard focus often lives in the parent canvas, not inside the iframe.
    // Without listening on the parent, releasing Option there never reaches
    // the iframe and the hover sticks. The parent is same-origin (Forkshop
    // serves both), so cross-document listeners are allowed; if they aren't,
    // bail silently — the mouseover fallback still cleans up on next move.
    let parentWindow: Window | undefined
    let parentDocument: Document | undefined
    try {
      const candidate = globalThis.window.parent
      const candidateDocument = candidate?.document
      if (candidate && candidateDocument) {
        parentWindow = candidate
        parentDocument = candidateDocument
        parentDocument.addEventListener("keyup", onKeyUp)
        parentDocument.addEventListener("keydown", onKeyDown)
        parentWindow.addEventListener("blur", onBlur)
      }
    } catch {
      // Cross-origin parent — relying on mouseover fallback alone.
    }

    return () => {
      document.removeEventListener("mouseover", onMouseOver)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("keyup", onKeyUp)
      document.removeEventListener("click", onClick, true)
      globalThis.window.removeEventListener("blur", onBlur)
      if (parentDocument) {
        parentDocument.removeEventListener("keyup", onKeyUp)
        parentDocument.removeEventListener("keydown", onKeyDown)
      }
      if (parentWindow) parentWindow.removeEventListener("blur", onBlur)
      setOptDown(false)
      postClear()
    }
  }, [active])

  return null
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
