"use client"

import { useEffect } from "react"
import { isTextElement } from "@fogma/lib/edit-mode"

const BLOCK_ATTR = "data-fogma-block"

function findBlockAncestor(element: HTMLElement): string | undefined {
  let current: HTMLElement | null = element
  while (current) {
    const slug = current.getAttribute(BLOCK_ATTR)
    if (slug) return slug
    current = current.parentElement
  }
  return undefined
}

function isHtmlElement(node: unknown): node is HTMLElement {
  if (typeof node !== "object" || node === null) return false
  const candidate = node as { nodeType?: number; tagName?: unknown }
  return candidate.nodeType === 1 && typeof candidate.tagName === "string"
}

export function useIframeBlockDoubleClick({
  iframe,
  onOpenBlock,
}: {
  iframe: HTMLIFrameElement | undefined
  onOpenBlock: (slug: string) => void
}) {
  useEffect(() => {
    if (!iframe) return
    const document_ = iframe.contentDocument
    if (!document_) return

    const handler = (event: MouseEvent) => {
      const target = event.target
      if (!isHtmlElement(target)) return
      // Don't hijack double-click on editable text. The user is mid-edit or
      // about to start editing — yanking them into block isolation feels
      // hostile and can lose unsaved copy edits.
      if (isTextElement(target)) return
      const slug = findBlockAncestor(target)
      if (!slug) return
      event.preventDefault()
      event.stopPropagation()
      onOpenBlock(slug)
    }

    document_.addEventListener("dblclick", handler, { capture: true })
    return () => {
      document_.removeEventListener("dblclick", handler, { capture: true })
    }
  }, [iframe, onOpenBlock])
}
