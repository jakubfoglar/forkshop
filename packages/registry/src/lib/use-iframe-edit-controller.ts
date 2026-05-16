"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useIframeEditWiring } from "@forkshop/hooks/use-iframe-edit-wiring"
import { useIframeRegistry } from "@forkshop/components/iframe-registry"
import { computeDomPath } from "@forkshop/lib/edit-mode"
import { extractStringLiterals, resolveJsxTextSpan } from "@forkshop/lib/extract-string-literals"

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
  const [sourceCache, setSourceCache] = useState<string>("")
  const originalTextRef = useRef<string>("")
  // Generation counter: incremented on every enter/discard/iframe-reload. Save
  // captures the value at POST start and bails on resolve if it has changed.
  const editGenerationRef = useRef(0)
  const iframeRegistry = useIframeRegistry()
  // Tracks the `input` listener attached to the editing element so exitEdit
  // can detach it. Undefined when no edit is active.
  const inputListenerRef = useRef<((event: Event) => void) | undefined>(undefined)

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
        setSourceCache(body.source)
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
      // The iframe reloaded (likely HMR after a sibling viewport saved). Refresh
      // the editable set so this viewport recognizes the new text as editable
      // instead of showing it as gray-locked on hover.
      void refetchEditableSet()
    }
    iframe.addEventListener("load", handleLoad)
    return () => iframe.removeEventListener("load", handleLoad)
  }, [iframe, refetchEditableSet])

  const handleEnterEdit = useCallback((element: Element) => {
    editGenerationRef.current += 1
    originalTextRef.current = element.textContent ?? ""
    ;(element as HTMLElement).contentEditable = "true"
    ;(element as HTMLElement).dataset.editing = ""
    ;(element as HTMLElement).focus()
    setEditingElement(element)
    setError(undefined)

    // Live sync: mirror typing into sibling iframes that render the same page.
    // The DOM path is stable through edits (the element identity doesn't move),
    // so we compute it once here and reuse it on every input event. We match
    // siblings by `src` — ResponsiveFrameView's 3 viewports all load the same
    // page URL into iframes registered with the IframeRegistry.
    const path = computeDomPath(element)
    const ownIframe = iframe
    const handleInput = () => {
      if (!iframeRegistry) return
      const newText = element.textContent ?? ""
      for (const sibling of iframeRegistry.getAll()) {
        if (sibling === ownIframe) continue
        if (ownIframe && sibling.src !== ownIframe.src) continue
        const doc = sibling.contentDocument
        if (!doc) continue
        try {
          const target = doc.querySelector(path)
          if (target && target.textContent !== newText) {
            target.textContent = newText
          }
        } catch {
          // querySelector throws on malformed selectors — ignore so a single
          // weird path doesn't break the edit session.
        }
      }
    }
    element.addEventListener("input", handleInput)
    inputListenerRef.current = handleInput
  }, [iframe, iframeRegistry])

  const exitEdit = useCallback(() => {
    if (editingElement && inputListenerRef.current) {
      editingElement.removeEventListener("input", inputListenerRef.current)
      inputListenerRef.current = undefined
    }
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
    // Resolve the originalText to its literal source representation. If the
    // originalText is verbatim in the source (regular prop literal), use it
    // directly. Otherwise it's likely JSX text — search the source for a JSX
    // text span whose normalized form matches, and use that as originalText.
    // The API does a verbatim substring search, so we have to send the raw
    // source span (entities + indentation intact), not the decoded textContent.
    let postOriginal = originalText
    const postNew = newText
    if (!sourceCache.includes(originalText)) {
      const sourceSpan = resolveJsxTextSpan(sourceCache, originalText)
      if (sourceSpan !== undefined) {
        postOriginal = sourceSpan
        // For newText, leave it as the decoded form for now (mixed encoding in
        // the source is valid JSX). A future polish could re-encode apostrophes.
      }
    }
    const generationAtStart = editGenerationRef.current
    setIsSaving(true)
    setError(undefined)
    const result = await postEdit({
      editApiPath,
      pagePath: sourceFile,
      originalText: postOriginal,
      newText: postNew,
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
  }, [editingElement, sourceFile, editApiPath, exitEdit, refetchEditableSet, sourceCache])

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
