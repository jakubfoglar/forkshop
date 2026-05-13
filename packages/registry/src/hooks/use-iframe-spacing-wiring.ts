"use client"

import { useEffect } from "react"

export type SpacingSide = "top" | "right" | "bottom" | "left"

export type SpacingZoneTarget =
  | {
      kind: "padding"
      element: HTMLElement
      side: SpacingSide
      containingBlock: string | undefined
    }
  | {
      kind: "gap"
      element: HTMLElement
      axis: "x" | "y"
      containingBlock: string | undefined
    }

const ZONE_ATTR = "data-fogma-zone"
const ZONE_KIND_ATTR = "data-fogma-zone-kind"
const ZONE_AXIS_ATTR = "data-fogma-zone-axis"
const ZONE_SCOPE_ATTR = "data-fogma-zone-scope"
const BLOCK_ATTR = "data-fogma-block"
const ZONE_CONTAINER_ID = "fogma-spacing-overlay"

const SPACING_OVERLAY_CSS = `
#${ZONE_CONTAINER_ID} {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 2147483646;
}
[${ZONE_ATTR}] {
  position: absolute;
  pointer-events: auto;
  background: rgba(59, 130, 246, 0.14);
  outline: 1px solid rgba(59, 130, 246, 0.35);
  outline-offset: -1px;
  transition: background 80ms ease;
  cursor: pointer;
  box-sizing: border-box;
}
[${ZONE_ATTR}]:hover {
  background: rgba(59, 130, 246, 0.32);
}
[${ZONE_ATTR}][${ZONE_SCOPE_ATTR}="block"] {
  background: rgba(168, 85, 247, 0.14);
  outline-color: rgba(168, 85, 247, 0.4);
}
[${ZONE_ATTR}][${ZONE_SCOPE_ATTR}="block"]:hover {
  background: rgba(168, 85, 247, 0.32);
}
`

// Wires hover + click behavior for padding and gap zones inside an iframe.
// On hover, computes the relevant spacing strips for the element under the
// cursor (padding: 4 sides; gap: between flex children) and renders them as
// overlay divs. Clicking emits SpacingZoneTarget with the underlying element
// and which strip was hit. The host resolves the controlling class and opens
// the picker.
export function useIframeSpacingWiring({
  iframe,
  active,
  onZoneClick,
  onBodyClick,
}: {
  iframe: HTMLIFrameElement | null | undefined
  active: boolean
  onZoneClick: (target: SpacingZoneTarget) => void
  onBodyClick?: (element: HTMLElement, containingBlock: string | undefined) => void
}) {
  useEffect(() => {
    if (!iframe) return
    if (!active) return
    const iframeElement = iframe

    let attachedDocument: Document | undefined
    let attachedWindow: Window | undefined
    let container: HTMLDivElement | undefined
    let currentTarget: HTMLElement | undefined
    let currentContainingBlock: string | undefined
    let mousemoveHandler: ((event: MouseEvent) => void) | undefined
    let mouseleaveHandler: (() => void) | undefined
    let zoneClickHandler: ((event: MouseEvent) => void) | undefined
    let bodyClickHandler: ((event: MouseEvent) => void) | undefined
    let keyupHandler: ((event: KeyboardEvent) => void) | undefined
    let bodyObserver: MutationObserver | undefined

    const detach = () => {
      if (attachedDocument) {
        if (mousemoveHandler) {
          attachedDocument.removeEventListener("mousemove", mousemoveHandler, { capture: true })
        }
        if (mouseleaveHandler) {
          attachedDocument.documentElement.removeEventListener("mouseleave", mouseleaveHandler)
        }
        if (bodyClickHandler) {
          attachedDocument.removeEventListener("click", bodyClickHandler, { capture: true })
        }
        if (keyupHandler) {
          attachedDocument.removeEventListener("keyup", keyupHandler, { capture: true })
        }
      }
      if (container && zoneClickHandler) {
        container.removeEventListener("click", zoneClickHandler, { capture: true })
      }
      if (bodyObserver) bodyObserver.disconnect()
      if (container && container.parentNode) {
        container.remove()
      }
      attachedDocument = undefined
      attachedWindow = undefined
      container = undefined
      currentTarget = undefined
      mousemoveHandler = undefined
      mouseleaveHandler = undefined
      zoneClickHandler = undefined
      bodyClickHandler = undefined
      keyupHandler = undefined
      bodyObserver = undefined
    }

    const clearZones = () => {
      if (container) container.replaceChildren()
      currentTarget = undefined
      currentContainingBlock = undefined
    }

    const makeZone = (
      kind: "padding" | "gap",
      side: string,
      rect: { left: number; top: number; width: number; height: number },
    ) => {
      if (!attachedDocument || !container) return
      if (rect.width <= 0 || rect.height <= 0) return
      const zone = attachedDocument.createElement("div")
      zone.setAttribute(ZONE_ATTR, "true")
      zone.setAttribute(ZONE_KIND_ATTR, kind)
      zone.setAttribute(ZONE_AXIS_ATTR, side)
      if (currentContainingBlock) {
        zone.setAttribute(ZONE_SCOPE_ATTR, "block")
        // Stamp the block slug onto the zone so the double-click handler can
        // route "dblclick on a purple gap" to the same "open block" navigation
        // as "dblclick on the block's body" (which finds the slug via DOM walk).
        zone.setAttribute(BLOCK_ATTR, currentContainingBlock)
      }
      zone.style.left = `${rect.left}px`
      zone.style.top = `${rect.top}px`
      zone.style.width = `${rect.width}px`
      zone.style.height = `${rect.height}px`
      container.append(zone)
    }

    const updateZonesFor = (element: HTMLElement) => {
      const win = attachedWindow
      if (!win) return
      clearZones()
      currentTarget = element
      currentContainingBlock = findContainingBlock(element)
      const style = win.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      const scrollX = win.scrollX ?? 0
      const scrollY = win.scrollY ?? 0
      const padding: Record<SpacingSide, number> = {
        top: Number.parseFloat(style.paddingTop) || 0,
        right: Number.parseFloat(style.paddingRight) || 0,
        bottom: Number.parseFloat(style.paddingBottom) || 0,
        left: Number.parseFloat(style.paddingLeft) || 0,
      }
      // Padding strips (4 sides). Each strip is the rectangular area of the
      // padding on that side.
      if (padding.top > 0) {
        makeZone("padding", "top", {
          left: rect.left + scrollX,
          top: rect.top + scrollY,
          width: rect.width,
          height: padding.top,
        })
      }
      if (padding.bottom > 0) {
        makeZone("padding", "bottom", {
          left: rect.left + scrollX,
          top: rect.bottom + scrollY - padding.bottom,
          width: rect.width,
          height: padding.bottom,
        })
      }
      if (padding.left > 0) {
        makeZone("padding", "left", {
          left: rect.left + scrollX,
          top: rect.top + scrollY + padding.top,
          width: padding.left,
          height: rect.height - padding.top - padding.bottom,
        })
      }
      if (padding.right > 0) {
        makeZone("padding", "right", {
          left: rect.right + scrollX - padding.right,
          top: rect.top + scrollY + padding.top,
          width: padding.right,
          height: rect.height - padding.top - padding.bottom,
        })
      }
      // Gap strips: between consecutive children in flex containers. Skip if
      // element isn't a flex container, has no gap, or has < 2 children.
      const display = style.display
      const isFlex = display === "flex" || display === "inline-flex"
      if (!isFlex) return
      const colGap = Number.parseFloat(style.columnGap) || 0
      const rowGap = Number.parseFloat(style.rowGap) || 0
      const flexDirection = style.flexDirection
      const isRow = flexDirection === "row" || flexDirection === "row-reverse"
      const children = [...element.children].filter((child): child is HTMLElement =>
        isHtmlElement(child),
      )
      if (children.length < 2) return
      if (isRow && colGap > 0) {
        const sorted = [...children].sort(
          (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
        )
        for (let index = 0; index < sorted.length - 1; index++) {
          const left = sorted[index]
          const right = sorted[index + 1]
          if (!left || !right) continue
          const leftRect = left.getBoundingClientRect()
          const rightRect = right.getBoundingClientRect()
          const gapLeft = leftRect.right
          const gapRight = rightRect.left
          if (gapRight <= gapLeft) continue
          const top = Math.min(leftRect.top, rightRect.top)
          const bottom = Math.max(leftRect.bottom, rightRect.bottom)
          makeZone("gap", "x", {
            left: gapLeft + scrollX,
            top: top + scrollY,
            width: gapRight - gapLeft,
            height: bottom - top,
          })
        }
      }
      if (!isRow && rowGap > 0) {
        const sorted = [...children].sort(
          (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        )
        for (let index = 0; index < sorted.length - 1; index++) {
          const top = sorted[index]
          const bottom = sorted[index + 1]
          if (!top || !bottom) continue
          const topRect = top.getBoundingClientRect()
          const bottomRect = bottom.getBoundingClientRect()
          const gapTop = topRect.bottom
          const gapBottom = bottomRect.top
          if (gapBottom <= gapTop) continue
          const left = Math.min(topRect.left, bottomRect.left)
          const right = Math.max(topRect.right, bottomRect.right)
          makeZone("gap", "y", {
            left: left + scrollX,
            top: gapTop + scrollY,
            width: right - left,
            height: gapBottom - gapTop,
          })
        }
      }
    }

    // Spacing edits are gated on Cmd/Ctrl: zones only appear while the user
    // holds the modifier, and clicks only register when it's still held.
    // Text editing stays always-on so the gate is what swaps between modes.
    const isModifierHeld = (event: MouseEvent | KeyboardEvent) => event.metaKey || event.ctrlKey

    const handleMousemove = (event: MouseEvent) => {
      const iframeDocument = attachedDocument
      const win = attachedWindow
      if (!iframeDocument || !win) return
      if (!isModifierHeld(event)) {
        clearZones()
        return
      }
      const stack = iframeDocument.elementsFromPoint(event.clientX, event.clientY)
      const cursorTarget = stack.find(
        (element): element is HTMLElement =>
          isHtmlElement(element) && !element.hasAttribute(ZONE_ATTR),
      )
      if (!cursorTarget) {
        clearZones()
        return
      }
      const spacingTarget = findSpacingAncestor(cursorTarget, win, iframeDocument)
      if (!spacingTarget) {
        clearZones()
        return
      }
      if (spacingTarget === currentTarget) return
      updateZonesFor(spacingTarget)
    }

    const handleMouseleave = () => {
      clearZones()
    }

    const handleKeyup = (event: KeyboardEvent) => {
      // Releasing Cmd/Ctrl while zones are visible should remove them
      // immediately rather than wait for the next mouse move.
      if (event.key === "Meta" || event.key === "Control") {
        clearZones()
      }
    }

    const handleZoneClick = (event: MouseEvent) => {
      const zone = (event.target as HTMLElement | null)?.closest(`[${ZONE_ATTR}]`)
      if (!zone) return
      if (!isModifierHeld(event)) return
      event.preventDefault()
      event.stopPropagation()
      if (!currentTarget) return
      const kind = zone.getAttribute(ZONE_KIND_ATTR)
      const sideOrAxis = zone.getAttribute(ZONE_AXIS_ATTR)
      if (kind === "padding" && isSpacingSide(sideOrAxis)) {
        onZoneClick({
          kind: "padding",
          element: currentTarget,
          side: sideOrAxis,
          containingBlock: currentContainingBlock,
        })
      } else if (kind === "gap" && (sideOrAxis === "x" || sideOrAxis === "y")) {
        onZoneClick({
          kind: "gap",
          element: currentTarget,
          axis: sideOrAxis,
          containingBlock: currentContainingBlock,
        })
      }
    }

    const handleBodyClick = (event: MouseEvent) => {
      if (!onBodyClick) return
      // Margin-edit body menu is part of the spacing mode — gated the same way.
      if (!isModifierHeld(event)) return
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.hasAttribute(ZONE_ATTR)) return
      const iframeDocument = attachedDocument
      if (!iframeDocument) return
      if (target === iframeDocument.body || target === iframeDocument.documentElement) return
      onBodyClick(target, findContainingBlock(target))
    }

    const handleLoad = () => {
      detach()
      const iframeDocument = iframeElement.contentDocument
      const iframeWindow = iframeElement.contentWindow
      if (!iframeDocument || !iframeWindow) return
      attachedDocument = iframeDocument
      attachedWindow = iframeWindow

      const styleElement = iframeDocument.createElement("style")
      styleElement.dataset.fogmaSpacing = "true"
      styleElement.textContent = SPACING_OVERLAY_CSS
      iframeDocument.head.append(styleElement)

      container = iframeDocument.createElement("div")
      container.id = ZONE_CONTAINER_ID
      iframeDocument.body.append(container)

      // React hydration inside the iframe (or a hydration-mismatch recovery)
      // can rewrite body's children and wipe our overlay. Watch for it and
      // re-append. Also re-append the style tag if React swallowed it.
      bodyObserver = new MutationObserver(() => {
        if (!attachedDocument || !container) return
        if (!styleElement.isConnected) {
          attachedDocument.head.append(styleElement)
        }
        if (!container.isConnected) {
          attachedDocument.body.append(container)
        }
      })
      bodyObserver.observe(iframeDocument.body, { childList: true })

      mousemoveHandler = handleMousemove
      mouseleaveHandler = handleMouseleave
      zoneClickHandler = handleZoneClick
      bodyClickHandler = handleBodyClick
      keyupHandler = handleKeyup
      iframeDocument.addEventListener("mousemove", mousemoveHandler, { capture: true })
      iframeDocument.documentElement.addEventListener("mouseleave", mouseleaveHandler)
      container.addEventListener("click", zoneClickHandler, { capture: true })
      iframeDocument.addEventListener("click", bodyClickHandler, { capture: true })
      iframeDocument.addEventListener("keyup", keyupHandler, { capture: true })
    }

    iframeElement.addEventListener("load", handleLoad)
    if (iframeElement.contentDocument?.readyState === "complete") {
      handleLoad()
    }

    return () => {
      iframeElement.removeEventListener("load", handleLoad)
      detach()
    }
  }, [iframe, active, onZoneClick, onBodyClick])
}

function isSpacingSide(value: string | null): value is SpacingSide {
  return value === "top" || value === "right" || value === "bottom" || value === "left"
}

// Walks up to find the nearest ancestor carrying the dev-only marker
// `data-fogma-block="<slug>"` injected by withBlockMarker. If found, the
// hovered/clicked element lives inside that block and spacing edits should
// route to its file in components/blocks/.
function findContainingBlock(element: HTMLElement): string | undefined {
  let current: HTMLElement | null = element
  while (current) {
    const slug = current.getAttribute(BLOCK_ATTR)
    if (slug) return slug
    current = current.parentElement
  }
  return undefined
}

// Cross-realm-safe "is this an HTML element?" check. `instanceof HTMLElement`
// fails for elements from a child iframe because the iframe has its own
// HTMLElement constructor — the parent-realm constructor isn't in the iframe
// element's prototype chain. Element.nodeType === 1 is the standard cross-realm
// way; we additionally check for a property that any HTMLElement has to satisfy
// the type predicate.
function isHtmlElement(node: unknown): node is HTMLElement {
  if (typeof node !== "object" || node === null) return false
  const element = node as Element
  if (element.nodeType !== 1) return false
  return typeof (element as HTMLElement).style === "object"
}

// Walk up from the cursor target to find the nearest ancestor that actually
// has padding or (flex/grid) gap. Without this, hovering a text leaf inside
// a `<section py-8>` would show nothing — the section's padding is visually
// "the empty space at the top/bottom" and we want to surface it whenever the
// user is hovering anywhere inside that section.
function findSpacingAncestor(
  start: HTMLElement,
  win: Window,
  document_: Document,
): HTMLElement | undefined {
  let current: HTMLElement | null = start
  let depth = 0
  while (current && depth < 8) {
    if (current === document_.body || current === document_.documentElement) return undefined
    const style = win.getComputedStyle(current)
    const padding =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingRight) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0) +
      (Number.parseFloat(style.paddingLeft) || 0)
    if (padding > 0) return current
    const display = style.display
    const isFlex = display === "flex" || display === "inline-flex"
    if (isFlex) {
      const colGap = Number.parseFloat(style.columnGap) || 0
      const rowGap = Number.parseFloat(style.rowGap) || 0
      if (colGap > 0 || rowGap > 0) return current
    }
    current = current.parentElement
    depth++
  }
  return undefined
}
