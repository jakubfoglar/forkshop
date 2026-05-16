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
  // Generation counter: incremented on every enter/discard/iframe-reload. Save
  // captures the value at POST start and bails on resolve if it has changed.
  const editGenerationRef = useRef(0)

  // Refetches the source file and rebuilds the editable set. Called on mount
  // (when iframe + sourceFile are ready) and after every successful save, so
  // the just-edited text appears in the new set and shows as editable on
  // subsequent hovers instead of becoming gray-locked.
  const refetchEditableSet = useCallback(async () => {
    if (!sourceFile) return
    try {
      const res = await fetch(`${editApiPath}?path=${encodeURIComponent(sourceFile)}`)
      if (!res.ok) return
      const body = (await res.json()) as { source?: string }
      if (typeof body.source === "string") {
        setEditableSet(buildEditableSet(body.source))
      }
    } catch {
      // Network error fetching source — leave editableSet as-is. The wiring
      // will fall back to "everything editable" if the set is undefined; the
      // popover save will surface any 404.
    }
  }, [sourceFile, editApiPath])

  // Initial fetch when iframe + sourceFile become available.
  useEffect(() => {
    if (!iframe || !sourceFile) {
      setEditableSet(undefined)
      return
    }
    void refetchEditableSet()
  }, [iframe, sourceFile, refetchEditableSet])

  // If the iframe document reloads mid-edit (HMR, navigation, manual refresh),
  // the editingElement reference is now detached. Clear edit state so a stray
  // Save doesn't POST against a stale snapshot.
  useEffect(() => {
    if (!iframe) return
    let firstLoadSeen = false
    const handleLoad = () => {
      if (!firstLoadSeen) {
        firstLoadSeen = true
        return
      }
      editGenerationRef.current += 1
      setEditingElement(undefined)
      setError(undefined)
    }
    iframe.addEventListener("load", handleLoad)
    return () => iframe.removeEventListener("load", handleLoad)
  }, [iframe])

  const handleEnterEdit = useCallback((element: Element) => {
    editGenerationRef.current += 1
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
    editGenerationRef.current += 1
    exitEdit()
  }, [editingElement, exitEdit])

  const saveInternal = useCallback(async (): Promise<{ ok: boolean }> => {
    if (!editingElement || !sourceFile) return { ok: false }
    // If the element was detached (iframe reloaded between Cmd+Enter dispatch
    // and our useCallback running), bail without POSTing.
    if (!editingElement.isConnected) {
      setEditingElement(undefined)
      setError(undefined)
      return { ok: false }
    }
    const newText = editingElement.textContent ?? ""
    const originalText = originalTextRef.current
    if (newText === originalText) {
      exitEdit()
      return { ok: true }
    }
    const generationAtStart = editGenerationRef.current
    setIsSaving(true)
    setError(undefined)
    const result = await postEdit({
      editApiPath,
      pagePath: sourceFile,
      originalText,
      newText,
    })
    // If discard/switch/another enter ran while the POST was in flight, the
    // edit we just committed was already abandoned by the user. Don't update
    // state, don't surface success. (The file write isn't undone — that's
    // acceptable; consistency of UI state is the goal.)
    if (editGenerationRef.current !== generationAtStart) {
      setIsSaving(false)
      return { ok: false }
    }
    setIsSaving(false)
    if (result.ok) {
      exitEdit()
      // Refresh the editable set so the just-edited text — now present in the
      // file with its new value — is recognized as editable on the next hover.
      // Otherwise the next hover on the same element would show as gray-locked
      // because the in-memory set still contains the OLD value.
      void refetchEditableSet()
      return { ok: true }
    } else {
      setError(result.error)
      return { ok: false }
    }
  }, [editingElement, sourceFile, editApiPath, exitEdit, refetchEditableSet])

  // Public save narrows the internal result to Promise<void> — callers don't
  // care about success/failure beyond observing `error` and `isSaving`.
  const save = useCallback(async (): Promise<void> => {
    await saveInternal()
  }, [saveInternal])

  const handleSwitchEdit = useCallback(async (newElement: Element) => {
    const result = await saveInternal()
    // Only enter the new element if save succeeded. On failure the popover
    // stays on the old element with its error visible; the user can fix or
    // discard.
    if (result.ok) handleEnterEdit(newElement)
  }, [saveInternal, handleEnterEdit])

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
