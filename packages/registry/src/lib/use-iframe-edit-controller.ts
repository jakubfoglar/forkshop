"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useIframeEditWiring } from "@forkshop/hooks/use-iframe-edit-wiring"
import { extractStringLiterals } from "@forkshop/lib/extract-string-literals"

export type UseIframeEditControllerArgs = {
  iframe: HTMLIFrameElement | null
  sourceFile: string | undefined
  /** Used for both POST (save) and GET (read source). Default "/api/forkshop/edit". */
  editApiPath?: string
  canvasZoom: number
}

export type UseIframeEditControllerResult = {
  editingElement: Element | undefined
  isSaving: boolean
  error: string | undefined
  save(): Promise<void>
  discard(): void
  dismissError(): void
}

export function buildEditableSet(source: string): Set<string> {
  return extractStringLiterals(source)
}

export type PostEditArgs = {
  editApiPath: string
  pagePath: string
  originalText: string
  newText: string
}
export type PostEditResult = { ok: true } | { ok: false; error: string }

export async function postEdit(args: PostEditArgs): Promise<PostEditResult> {
  try {
    const res = await fetch(args.editApiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pagePath: args.pagePath,
        originalText: args.originalText,
        newText: args.newText,
      }),
    })
    if (res.ok) return { ok: true }
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    return { ok: false, error: typeof body.error === "string" ? body.error : `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" }
  }
}

export function useIframeEditController({
  iframe,
  sourceFile,
  editApiPath = "/api/forkshop/edit",
  canvasZoom,
}: UseIframeEditControllerArgs): UseIframeEditControllerResult {
  const [editingElement, setEditingElement] = useState<Element | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [editableSet, setEditableSet] = useState<Set<string> | undefined>(undefined)
  const originalTextRef = useRef<string>("")

  // Fetch source + build editable set when iframe + sourceFile are ready.
  useEffect(() => {
    if (!iframe || !sourceFile) {
      setEditableSet(undefined)
      return
    }
    let cancelled = false
    void fetch(`${editApiPath}?path=${encodeURIComponent(sourceFile)}`)
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as { source?: string }
        if (!cancelled && typeof body.source === "string") {
          setEditableSet(buildEditableSet(body.source))
        }
      })
      .catch(() => {
        // Network error fetching source — leave editableSet undefined. The
        // wiring will fall back to "everything editable" which is the
        // pre-Locked behavior; the popover save will surface any 404.
      })
    return () => { cancelled = true }
  }, [iframe, sourceFile, editApiPath])

  const handleEnterEdit = useCallback((element: Element) => {
    originalTextRef.current = element.textContent ?? ""
    ;(element as HTMLElement).contentEditable = "true"
    ;(element as HTMLElement).dataset.editing = ""
    ;(element as HTMLElement).focus()
    setEditingElement(element)
    setError(undefined)
  }, [])

  const exitEdit = useCallback(() => {
    if (editingElement) {
      ;(editingElement as HTMLElement).contentEditable = "false"
      delete (editingElement as HTMLElement).dataset.editing
    }
    setEditingElement(undefined)
    setError(undefined)
  }, [editingElement])

  const discard = useCallback(() => {
    if (editingElement) {
      editingElement.textContent = originalTextRef.current
    }
    exitEdit()
  }, [editingElement, exitEdit])

  const save = useCallback(async () => {
    if (!editingElement || !sourceFile) return
    const newText = editingElement.textContent ?? ""
    const originalText = originalTextRef.current
    if (newText === originalText) {
      exitEdit()
      return
    }
    setIsSaving(true)
    setError(undefined)
    const result = await postEdit({
      editApiPath,
      pagePath: sourceFile,
      originalText,
      newText,
    })
    setIsSaving(false)
    if (result.ok) {
      exitEdit()
    } else {
      setError(result.error)
    }
  }, [editingElement, sourceFile, editApiPath, exitEdit])

  const handleSwitchEdit = useCallback((newElement: Element) => {
    void save().then(() => handleEnterEdit(newElement))
  }, [save, handleEnterEdit])

  const handleNavigate = useCallback((_path: string) => {
    // Edit mode swallows navigation — the iframe stays on its current route.
    // The controller intentionally does nothing here; the host's selection
    // is owned by the sidebar, not by in-iframe link clicks.
  }, [])

  const dismissError = useCallback(() => setError(undefined), [])

  useIframeEditWiring({
    iframe,
    active: !!sourceFile,
    editingActive: editingElement !== undefined,
    onNavigate: handleNavigate,
    onEnterEdit: handleEnterEdit,
    onSaveEdit: save,
    onSwitchEdit: handleSwitchEdit,
    onDiscardEdit: discard,
    getCanvasZoom: () => canvasZoom,
    editableSet,
  })

  return { editingElement, isSaving, error, save, discard, dismissError }
}
