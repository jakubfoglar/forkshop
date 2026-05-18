"use client"

import { useEffect } from "react"
import { isTextElement, PREVIEW_AGENT_CSS, PREVIEW_EDIT_CSS, SKIP_TAGS } from "@forkshop/lib/edit-mode"


function findElementContainingSubstring(
  iframeDocument: Document,
  needle: string | undefined,
): HTMLElement | undefined {
  if (needle === undefined) return undefined
  const trimmed = needle.trim()
  if (trimmed.length < 4) return undefined
  const walker = iframeDocument.createTreeWalker(iframeDocument.body, NodeFilter.SHOW_TEXT)
  let textNode: Node | null = walker.nextNode()
  while (textNode !== null) {
    const text = textNode.nodeValue ?? ""
    if (text.includes(trimmed)) {
      const parent = textNode.parentElement
      if (parent && !SKIP_TAGS.has(parent.tagName)) return parent
    }
    textNode = walker.nextNode()
  }
  return undefined
}

// Extract string-literal contents from a TSX substring so we can match them
// against rendered DOM text. Claude's Edit substrings look like:
//   headline="Stop searching creators."
// where the renderable text lives inside the quotes. We pull "Stop searching
// creators." out and use it as the needle. Matches double quotes, single
// quotes, and simple backticks (template literals without ${} interpolations).
function extractStringLiterals(substring: string | undefined): string[] {
  if (substring === undefined || substring.length === 0) return []
  const literals = new Set<string>()
  const patterns = [/"([^"\\]{4,}?)"/g, /'([^'\\]{4,}?)'/g, /`([^`\\${}]{4,}?)`/g]
  for (const pattern of patterns) {
    for (const match of substring.matchAll(pattern)) {
      if (match[1]) literals.add(match[1])
    }
  }
  return [...literals]
}

function findAllTargetsForChange(
  iframeDocument: Document,
  change: { oldString?: string; newString?: string },
): HTMLElement[] {
  const targets: HTMLElement[] = []
  const seen = new Set<HTMLElement>()
  const tryAdd = (element: HTMLElement | undefined) => {
    if (element && !seen.has(element)) {
      seen.add(element)
      targets.push(element)
    }
  }
  // Whole-substring match first — covers Edits whose old/new is plain text
  // (e.g. a paragraph rewrite inside an MDX file).
  tryAdd(findElementContainingSubstring(iframeDocument, change.newString))
  tryAdd(findElementContainingSubstring(iframeDocument, change.oldString))
  // Then the JSX string-literal extraction — covers the common case where
  // Claude edits prop values like headline="…" inside page.tsx.
  for (const literal of extractStringLiterals(change.newString)) {
    tryAdd(findElementContainingSubstring(iframeDocument, literal))
  }
  for (const literal of extractStringLiterals(change.oldString)) {
    tryAdd(findElementContainingSubstring(iframeDocument, literal))
  }
  return targets
}

export function useIframeEditWiring({
  iframe,
  active,
  editingActive,
  onNavigate,
  onEnterEdit,
  onSaveEdit,
  onSwitchEdit,
  onDiscardEdit,
  getCanvasZoom,
  editableSet,
}: {
  iframe: HTMLIFrameElement | null | undefined
  active: boolean
  editingActive: boolean
  onNavigate: (path: string) => void
  onEnterEdit: (element: Element) => void
  onSaveEdit: () => void
  onSwitchEdit: (newElement: Element) => void
  onDiscardEdit: () => void
  getCanvasZoom?: () => number
  editableSet?: Set<string>
}) {
  useEffect(() => {
    if (!iframe) return
    const iframeElement = iframe
    let attachedDocument: Document | undefined
    let attachedWindow: Window | undefined
    let lastHover: HTMLElement | undefined
    let mouseoverHandler: ((event: Event) => void) | undefined
    let mouseoutHandler: ((event: Event) => void) | undefined
    let clickHandler: ((event: Event) => void) | undefined
    let keydownHandler: ((event: KeyboardEvent) => void) | undefined
    let popstateHandler: (() => void) | undefined
    let agentMessageHandler: ((event: MessageEvent) => void) | undefined
    const agentBlockTimers = new Map<string, ReturnType<typeof setTimeout>>()
    const agentTextTimers = new Set<ReturnType<typeof setTimeout>>()

    const detach = () => {
      if (attachedDocument) {
        if (mouseoverHandler) attachedDocument.removeEventListener("mouseover", mouseoverHandler)
        if (mouseoutHandler) attachedDocument.removeEventListener("mouseout", mouseoutHandler)
        if (keydownHandler) {
          attachedDocument.removeEventListener("keydown", keydownHandler, { capture: true })
        }
      }
      if (attachedWindow) {
        if (clickHandler) {
          attachedWindow.removeEventListener("click", clickHandler, { capture: true })
        }
        if (popstateHandler) attachedWindow.removeEventListener("popstate", popstateHandler)
        if (agentMessageHandler) attachedWindow.removeEventListener("message", agentMessageHandler)
      }
      for (const timer of agentBlockTimers.values()) clearTimeout(timer)
      agentBlockTimers.clear()
      for (const timer of agentTextTimers) clearTimeout(timer)
      agentTextTimers.clear()
      attachedDocument = undefined
      attachedWindow = undefined
      mouseoverHandler = undefined
      mouseoutHandler = undefined
      clickHandler = undefined
      keydownHandler = undefined
      popstateHandler = undefined
      agentMessageHandler = undefined
      lastHover = undefined
    }

    const handleLoad = () => {
      detach()
      // eslint-disable-next-line react-hooks/immutability
      const iframeDocument = iframeElement.contentDocument
      const iframeWindow = iframeElement.contentWindow
      if (!iframeDocument || !iframeWindow) return
      attachedDocument = iframeDocument
      attachedWindow = iframeWindow

      const styleElement = iframeDocument.createElement("style")
      styleElement.dataset.previewTool = "true"
      styleElement.textContent = PREVIEW_EDIT_CSS
      iframeDocument.head.append(styleElement)

      const styleAgent = iframeDocument.createElement("style")
      styleAgent.dataset.previewToolAgent = "true"
      styleAgent.textContent = PREVIEW_AGENT_CSS
      iframeDocument.head.append(styleAgent)

      // Seed the canvas zoom variable so edit/inspect outline widths read at a
      // consistent thickness immediately. The host keeps this in sync on every
      // transform change.
      const initialZoom = getCanvasZoom?.()
      if (initialZoom !== undefined) {
        iframeDocument.documentElement.style.setProperty("--canvas-zoom", String(initialZoom))
      }

      const propagateNavigation = () => {
        const url = new URL(iframeWindow.location.href)
        onNavigate(url.pathname + url.search + url.hash)
      }
      const originalPushState = iframeWindow.history.pushState.bind(iframeWindow.history)
      const originalReplaceState = iframeWindow.history.replaceState.bind(iframeWindow.history)
      iframeWindow.history.pushState = (state, unused, url) => {
        originalPushState(state, unused, url)
        propagateNavigation()
      }
      iframeWindow.history.replaceState = (state, unused, url) => {
        originalReplaceState(state, unused, url)
        propagateNavigation()
      }
      popstateHandler = propagateNavigation
      iframeWindow.addEventListener("popstate", popstateHandler)

      mouseoverHandler = (event) => {
        if (!active || editingActive) return
        const target = event.target as HTMLElement | null
        if (lastHover && lastHover !== target) {
          delete lastHover.dataset.editHover
          delete lastHover.dataset.editLocked
          lastHover = undefined
        }
        if (target && isTextElement(target)) {
          const text = (target.textContent ?? "").trim()
          if (editableSet === undefined || editableSet.has(text)) {
            target.dataset.editHover = ""
          } else {
            target.dataset.editLocked = ""
          }
          lastHover = target
        }
      }
      mouseoutHandler = (event) => {
        const target = event.target as HTMLElement | null
        if (target?.dataset) {
          delete target.dataset.editHover
          delete target.dataset.editLocked
        }
        if (target === lastHover) lastHover = undefined
      }
      iframeDocument.addEventListener("mouseover", mouseoverHandler)
      iframeDocument.addEventListener("mouseout", mouseoutHandler)

      clickHandler = (event) => {
        const target = event.target as HTMLElement | null
        // Spacing zones (padding strips, gap strips) have their own click
        // handler. Don't swallow those events here.
        if (target?.dataset.forkshopZone !== undefined) return
        // Cmd/Ctrl is the spacing-mode modifier — let the spacing wiring
        // handle modifier-clicks (zone clicks, body margin menu). Bail before
        // we'd capture and turn a Cmd-click on text into an edit-mode entry.
        const mouseEvent = event as MouseEvent
        if (mouseEvent.metaKey || mouseEvent.ctrlKey) return
        if (editingActive) {
          const editingElement = iframeDocument.querySelector("[data-editing]")
          if (editingElement && target && editingElement.contains(target)) return
          event.preventDefault()
          event.stopImmediatePropagation()
          if (target && isTextElement(target)) {
            onSwitchEdit(target)
          } else {
            onSaveEdit()
          }
          return
        }
        if (active) {
          if (target && isTextElement(target)) {
            const text = (target.textContent ?? "").trim()
            const isEditable = editableSet === undefined || editableSet.has(text)
            if (isEditable) {
              event.preventDefault()
              event.stopImmediatePropagation()
              delete target.dataset.editHover
              onEnterEdit(target)
              return
            }
            // Locked sub-component text — consume the click as a no-op so it doesn't
            // navigate or trigger form submits, but don't enter edit mode.
            event.preventDefault()
            event.stopImmediatePropagation()
            return
          }
          // Non-text click in edit mode: stop browser navigation (links, form
          // submits) but let other handlers process — spacing-wiring uses this
          // to surface the body popover with the element's margin classes.
          event.preventDefault()
          return
        }
        const link = target?.closest("a")
        if (link instanceof HTMLAnchorElement && link.href.startsWith(globalThis.location.origin)) {
          event.preventDefault()
          event.stopImmediatePropagation()
          const url = new URL(link.href)
          onNavigate(url.pathname + url.search + url.hash)
        }
      }
      iframeWindow.addEventListener("click", clickHandler, { capture: true })

      keydownHandler = (event) => {
        if (!editingActive) return
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopImmediatePropagation()
          onDiscardEdit()
        } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          event.stopImmediatePropagation()
          onSaveEdit()
        }
      }
      iframeDocument.addEventListener("keydown", keydownHandler, { capture: true })

      // Host-side AgentActivityProvider broadcasts active block slugs +
      // changed substrings via postMessage. We toggle data-* attributes that
      // PREVIEW_AGENT_CSS targets so the decoration runs inside the iframe.
      agentMessageHandler = (event: MessageEvent) => {
        const data = event.data as unknown
        if (data === null || typeof data !== "object") return
        const message = data as {
          type?: string
          slugs?: string[]
          hunks?: readonly { oldString?: string; newString?: string }[]
          color?: string
        }
        if (message.type === "forkshop:agent-block") {
          const targetSlugs = new Set<string>(message.slugs ?? [])
          const color = message.color ?? "oklch(0.62 0.22 280)"
          for (const node of iframeDocument.querySelectorAll<HTMLElement>(
            "[data-forkshop-block][data-forkshop-agent-active]",
          )) {
            const slug = node.dataset.forkshopBlock
            if (slug && !targetSlugs.has(slug)) {
              delete node.dataset.forkshopAgentActive
              node.style.removeProperty("--forkshop-agent-color")
            }
          }
          for (const slug of targetSlugs) {
            for (const node of iframeDocument.querySelectorAll<HTMLElement>(
              `[data-forkshop-block="${CSS.escape(slug)}"]`,
            )) {
              node.dataset.forkshopAgentActive = ""
              node.style.setProperty("--forkshop-agent-color", color)
            }
            const previous = agentBlockTimers.get(slug)
            if (previous) clearTimeout(previous)
            agentBlockTimers.set(
              slug,
              setTimeout(() => {
                for (const node of iframeDocument.querySelectorAll<HTMLElement>(
                  `[data-forkshop-block="${CSS.escape(slug)}"]`,
                )) {
                  delete node.dataset.forkshopAgentActive
                  node.style.removeProperty("--forkshop-agent-color")
                }
                agentBlockTimers.delete(slug)
              }, 2000),
            )
          }
          return
        }
        if (message.type === "forkshop:agent-page-active") {
          const active = (data as { active?: boolean }).active
          if (active) {
            iframeDocument.documentElement.dataset.forkshopAgentPageActive = ""
            iframeDocument.documentElement.style.setProperty(
              "--forkshop-agent-color",
              message.color ?? "oklch(0.62 0.22 280)",
            )
          } else {
            delete iframeDocument.documentElement.dataset.forkshopAgentPageActive
            iframeDocument.documentElement.style.removeProperty("--forkshop-agent-color")
          }
          return
        }
        if (message.type === "forkshop:agent-text") {
          const color = message.color ?? "oklch(0.62 0.22 280)"
          for (const hunk of message.hunks ?? []) {
            const targets = findAllTargetsForChange(iframeDocument, hunk)
            for (const target of targets) {
              delete target.dataset.forkshopAgentTextPulse
              // oxlint-disable-next-line no-unused-expressions
              void target.offsetHeight
              target.dataset.forkshopAgentTextPulse = ""
              target.style.setProperty("--forkshop-agent-color", color)
              const timer = setTimeout(() => {
                delete target.dataset.forkshopAgentTextPulse
                target.style.removeProperty("--forkshop-agent-color")
                agentTextTimers.delete(timer)
              }, 2100)
              agentTextTimers.add(timer)
            }
          }
        }
      }
      iframeWindow.addEventListener("message", agentMessageHandler)

      // Ask the host to replay current agent state — handles reload mid-edit.
      // Simulate an iframe-to-host hello so the relay (which listens on
      // window.addEventListener("message", ...)) sees event.source as the iframe
      // and can post the snapshot back via source.postMessage.
      try {
        window.dispatchEvent(new MessageEvent("message", {
          data: { type: "forkshop:agent-hello" },
          source: iframeWindow,
        }))
      } catch {
        // MessageEvent constructor or dispatch rejected; ignore.
      }
    }

    iframeElement.addEventListener("load", handleLoad)
    // The iframe may have already finished loading by the time this effect runs
    // (the hook activates after the iframe is captured in state, which is async
    // relative to iframe load). If so, the load event fired before our listener
    // was attached and we'd never wire anything up. Detect and run setup now.
    if (iframeElement.contentDocument?.readyState === "complete") {
      handleLoad()
    }
    return () => {
      iframeElement.removeEventListener("load", handleLoad)
      detach()
    }
  }, [
    iframe,
    active,
    editingActive,
    onNavigate,
    onEnterEdit,
    onSaveEdit,
    onSwitchEdit,
    onDiscardEdit,
    getCanvasZoom,
    editableSet,
  ])
}
