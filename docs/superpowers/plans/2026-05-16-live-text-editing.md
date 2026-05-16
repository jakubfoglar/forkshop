# Live text editing — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the orphaned edit primitives (`use-iframe-edit-wiring.ts`, `edit-popover.tsx`, `edit-mode.ts`, `/api/edit`) into the NodeType / Layout architecture so users can hover text in an iframed page, click to edit, ⌘↵ to save back to the TSX source file — dev-only, with a sourceFile sandbox preventing accidental writes to shared sub-components.

**Architecture:** Add one controller hook (`useIframeEditController`) + one wrapper component (`IframeEditOverlay`). Add a GET handler to `/api/edit/route.ts` for reading source file contents. Patch `use-iframe-edit-wiring.ts` with an optional `editableSet` param that distinguishes editable (in sourceFile) from locked (sub-component) text at hover time. Wire `<IframeEditOverlay>` into iframe-route NodeType, iframe-component NodeType, and ResponsiveFrameView (one per viewport). Production builds tree-shake the entire wiring via `process.env.NODE_ENV === "production"` early-return.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript (strict), Vitest (node env, no jsdom), Tailwind (with `forkshop-*` namespace). Existing canonical alias: `@forkshop/*` → `packages/registry/src/*`. Run `pnpm check` from repo root before claiming any task done.

**Spec:** `docs/specs/2026-05-16-live-text-editing-design.md`

---

## File Structure

### New files

```
packages/registry/src/
  lib/
    extract-string-literals.ts          Pure function: TSX source → Set<string>
    extract-string-literals.test.ts
    use-iframe-edit-controller.ts       Controller hook (composes useIframeEditWiring)
    use-iframe-edit-controller.test.ts  Tests pure save/discard logic via helper functions
  components/canvas/
    iframe-edit-overlay.tsx             Thin React boundary; renders EditPopover
    iframe-edit-overlay.test.ts         Contract test: prod/no-sourceFile → null
```

### Files modified

```
packages/registry/src/
  types/node.ts                         +sourceFile?: string on two Node types
  hooks/use-iframe-edit-wiring.ts       +editableSet param; locked-aware handlers
  lib/edit-mode.ts                      +[data-edit-locked] CSS in PREVIEW_EDIT_CSS
  api/edit/route.ts                     +GET handler
  api/edit/route.test.ts                NEW (no test file existed before)
  node-types/iframe-route.tsx           Capture iframe ref; mount IframeEditOverlay
  node-types/iframe-component.tsx       Capture iframe ref; mount IframeEditOverlay
  layouts/responsive-frame-view.tsx     +sourceFile prop; per-viewport overlay
  templates/user-claude-md.md           Doc sync — new sourceFile field + UX

apps/playground/
  app/forkshop/forkshop.config.tsx      +sourceFile on pages and blocks
  app/forkshop/page.tsx                 Pass sourceFile into ResponsiveFrameView
```

---

## Task 1: Add `sourceFile` to Node types

**Files:**
- Modify: `packages/registry/src/types/node.ts`

- [ ] **Step 1: Update `IframeRouteNode` and `IframeComponentNode`**

Open `packages/registry/src/types/node.ts` and update the two types:

```ts
export type IframeRouteNode = BaseNode & {
  kind: "iframe-route"
  routePath: string
  /** Path (from project root) of the TSX file authoring this page.
   *  Required for live text editing — omit to opt out. */
  sourceFile?: string
  drillInMode?: "single" | "responsive"
}

export type IframeComponentNode = BaseNode & {
  kind: "iframe-component"
  slug: string
  previewSrc: string
  componentPath?: string
  /** Path of the TSX file authoring this block. Typically equals
   *  componentPath. Required for live text editing — omit to opt out. */
  sourceFile?: string
  drillInMode?: "single" | "responsive"
}
```

- [ ] **Step 2: Verify typecheck still green**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS — adding optional fields is backwards-compatible; existing test fixtures continue to compile.

- [ ] **Step 3: Commit**

```bash
git add packages/registry/src/types/node.ts
git commit -m "feat(types): add sourceFile field to iframe Node types"
```

---

## Task 2: GET handler on `/api/edit/route.ts`

**Files:**
- Modify: `packages/registry/src/api/edit/route.ts`
- Create: `packages/registry/src/api/edit/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/registry/src/api/edit/route.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { writeFile, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let originalCwd: string
let tempDir: string

beforeEach(async () => {
  originalCwd = process.cwd()
  tempDir = await mkdtemp(join(tmpdir(), "forkshop-edit-test-"))
  process.chdir(tempDir)
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

describe("GET /api/edit (read source)", () => {
  it("returns 403 in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=app/page.tsx"))
    expect(res.status).toBe(403)
  })

  it("returns 400 when path query is missing", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit"))
    expect(res.status).toBe(400)
  })

  it("returns 400 when path escapes project root", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=../outside.tsx"))
    expect(res.status).toBe(400)
  })

  it("returns 404 when file does not exist", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=nonexistent.tsx"))
    expect(res.status).toBe(404)
  })

  it("returns the file source on success", async () => {
    vi.stubEnv("NODE_ENV", "development")
    await writeFile(join(tempDir, "page.tsx"), "export const HEADLINE = \"Welcome\"\n")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=page.tsx"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe("export const HEADLINE = \"Welcome\"\n")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- src/api/edit/route.test.ts`
Expected: FAIL — `GET` is not exported from `route.ts` yet.

- [ ] **Step 3: Add the GET handler**

Open `packages/registry/src/api/edit/route.ts` and append (the file already imports `NextResponse`, `readFile`/`writeFile`, `resolve`, `sep`):

```ts
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Source API is dev-only" }, { status: 403 })
  }
  const url = new URL(request.url)
  const pagePath = url.searchParams.get("path")
  if (!pagePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 })
  }
  const projectRoot = process.cwd()
  const absolute = resolve(projectRoot, pagePath)
  if (!absolute.startsWith(projectRoot + sep)) {
    return NextResponse.json({ error: "Path escapes project root" }, { status: 400 })
  }
  try {
    const source = await readFile(absolute, "utf-8")
    return NextResponse.json({ source })
  } catch {
    return NextResponse.json({ error: `Cannot read ${pagePath}` }, { status: 404 })
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- src/api/edit/route.test.ts`
Expected: PASS — all 5 cases green.

- [ ] **Step 5: Commit**

```bash
git add packages/registry/src/api/edit/route.ts packages/registry/src/api/edit/route.test.ts
git commit -m "feat(api): add GET handler to /api/edit for reading source files"
```

---

## Task 3: Pure literal extractor

**Files:**
- Create: `packages/registry/src/lib/extract-string-literals.ts`
- Create: `packages/registry/src/lib/extract-string-literals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/registry/src/lib/extract-string-literals.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { extractStringLiterals } from "@forkshop/lib/extract-string-literals"

describe("extractStringLiterals", () => {
  it("extracts double-quoted literals", () => {
    const out = extractStringLiterals(`const a = "hello"; const b = "world"`)
    expect(out.has("hello")).toBe(true)
    expect(out.has("world")).toBe(true)
  })

  it("extracts single-quoted literals", () => {
    const out = extractStringLiterals(`const x = 'foo'`)
    expect(out.has("foo")).toBe(true)
  })

  it("extracts simple backtick literals (no interpolations)", () => {
    const out = extractStringLiterals("const x = `hello world`")
    expect(out.has("hello world")).toBe(true)
  })

  it("skips backtick literals that contain ${...}", () => {
    const out = extractStringLiterals("const x = `Hello ${name}`")
    expect(out.has("Hello ${name}")).toBe(false)
  })

  it("ignores escaped quotes inside literals", () => {
    const out = extractStringLiterals(`const x = "She said \\"hi\\""`)
    expect(out.has("She said \\\"hi\\\"")).toBe(false)
    expect(out.has("She said \"hi\"")).toBe(false)
  })

  it("returns an empty Set for empty input", () => {
    expect(extractStringLiterals("").size).toBe(0)
  })

  it("deduplicates repeated literals", () => {
    const out = extractStringLiterals(`const a = "x"; const b = "x"`)
    expect(out.size).toBe(1)
  })

  it("trims surrounding whitespace inside the literal value", () => {
    const out = extractStringLiterals(`<h1 headline="  Welcome  " />`)
    expect(out.has("Welcome")).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- src/lib/extract-string-literals.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the extractor**

Create `packages/registry/src/lib/extract-string-literals.ts`:

```ts
/** Pull every string-literal token out of a TSX/TS source file. Used by the
 *  edit controller to build a per-iframe "what text in this file is editable"
 *  set. Values are trimmed — DOM textContent is also trimmed at lookup, so
 *  this normalizes both sides. Backtick literals with ${} interpolations are
 *  intentionally skipped (their rendered value depends on runtime data). */
export function extractStringLiterals(source: string): Set<string> {
  const out = new Set<string>()
  if (source.length === 0) return out
  const patterns = [
    /"((?:[^"\\]|\\.)*)"/g,
    /'((?:[^'\\]|\\.)*)'/g,
    /`([^`$\\]*)`/g, // no ${, no backslash escapes — keep it dumb
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = match[1]?.trim()
      if (value && value.length > 0) out.add(value)
    }
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- src/lib/extract-string-literals.test.ts`
Expected: PASS — all 8 cases green.

- [ ] **Step 5: Commit**

```bash
git add packages/registry/src/lib/extract-string-literals.ts packages/registry/src/lib/extract-string-literals.test.ts
git commit -m "feat(lib): add extractStringLiterals helper for editable-set building"
```

---

## Task 4: Locked CSS rule in `PREVIEW_EDIT_CSS`

**Files:**
- Modify: `packages/registry/src/lib/edit-mode.ts`

- [ ] **Step 1: Patch `PREVIEW_EDIT_CSS`**

Open `packages/registry/src/lib/edit-mode.ts`. Inside the `PREVIEW_EDIT_CSS` template literal, add the new rule after the existing `[data-edit-mirror]` block:

```css
[data-edit-locked] {
  outline: calc(1px / var(--canvas-zoom, 1)) dashed #94a3b8 !important;
  outline-offset: calc(1px / var(--canvas-zoom, 1)) !important;
  cursor: not-allowed !important;
}
```

The whole appended block goes inside the existing `PREVIEW_EDIT_CSS = \`...\`` template — keep the closing backtick intact.

- [ ] **Step 2: Verify lint + typecheck still green**

Run: `pnpm --filter @forkshop/registry typecheck && pnpm --filter @forkshop/registry lint`
Expected: PASS — CSS is in a template literal; no TS impact.

- [ ] **Step 3: Commit**

```bash
git add packages/registry/src/lib/edit-mode.ts
git commit -m "feat(edit-mode): add data-edit-locked CSS for sub-component text"
```

---

## Task 5: Extend `useIframeEditWiring` with `editableSet`

**Files:**
- Modify: `packages/registry/src/hooks/use-iframe-edit-wiring.ts`

This task is a backwards-compatible parameter addition. No new test file — coverage comes from the controller test in Task 6 and the manual playground test in Task 12.

- [ ] **Step 1: Add the parameter to the args type**

Open `packages/registry/src/hooks/use-iframe-edit-wiring.ts`. The `useIframeEditWiring` function takes an inline-typed args object. Add `editableSet`:

```ts
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
```

- [ ] **Step 2: Update the `mouseoverHandler` inside `handleLoad`**

Find the existing `mouseoverHandler` definition (currently at lines ~189-200). Replace its body to distinguish editable vs locked:

```ts
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
```

- [ ] **Step 3: Update the `mouseoutHandler` to clear both attrs**

Find the existing `mouseoutHandler`. Update to clear both:

```ts
mouseoutHandler = (event) => {
  const target = event.target as HTMLElement | null
  if (target?.dataset) {
    delete target.dataset.editHover
    delete target.dataset.editLocked
  }
  if (target === lastHover) lastHover = undefined
}
```

- [ ] **Step 4: Update the `clickHandler` to no-op on locked**

Find the existing `clickHandler`. The branch that handles `active && target.isTextElement(...)` currently fires unconditionally. Gate it on the hover state (which is set to `editLocked` for non-editable text):

Inside `clickHandler`, locate this block:

```ts
if (active) {
  if (target && isTextElement(target)) {
    event.preventDefault()
    event.stopImmediatePropagation()
    delete target.dataset.editHover
    onEnterEdit(target)
    return
  }
```

Replace with:

```ts
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
```

- [ ] **Step 5: Add `editableSet` to the effect dep array**

Find the `useEffect` dep array at the end of the hook. Add `editableSet`:

```ts
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
```

- [ ] **Step 6: Verify pnpm check still green**

Run: `pnpm check` (from repo root)
Expected: PASS — backwards-compatible parameter; existing call sites (none, since the hook is currently unused) and the new test consumer all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/registry/src/hooks/use-iframe-edit-wiring.ts
git commit -m "feat(hooks): extend useIframeEditWiring with editableSet param"
```

---

## Task 6: `useIframeEditController` hook

**Files:**
- Create: `packages/registry/src/lib/use-iframe-edit-controller.ts`
- Create: `packages/registry/src/lib/use-iframe-edit-controller.test.ts`

The controller hook itself can't be unit-tested in the node-env vitest setup (no jsdom). Instead, extract two pure helpers and test those — together they cover the entire decision logic:

1. `buildEditableSet(source)` — wraps `extractStringLiterals` with the trim policy used at hover time. Trivial wrapper but keeps the call site small.
2. `postEdit(args)` — async function that POSTs to the edit endpoint and returns a discriminated-union result. The hook calls this and updates state from the result.

- [ ] **Step 1: Write the failing test for the helpers**

Create `packages/registry/src/lib/use-iframe-edit-controller.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { buildEditableSet, postEdit } from "@forkshop/lib/use-iframe-edit-controller"

describe("buildEditableSet", () => {
  it("returns a Set of trimmed string literals from TSX source", () => {
    const set = buildEditableSet(`<Hero headline="Welcome to Acme" />`)
    expect(set.has("Welcome to Acme")).toBe(true)
  })

  it("returns an empty Set for an empty source", () => {
    expect(buildEditableSet("").size).toBe(0)
  })
})

describe("postEdit", () => {
  let originalFetch: typeof globalThis.fetch
  beforeEach(() => { originalFetch = globalThis.fetch })
  afterEach(() => { globalThis.fetch = originalFetch })

  it("returns { ok: true } on a 2xx response", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    ) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "Hello",
      newText: "World",
    })
    expect(result.ok).toBe(true)
  })

  it("returns { ok: false, error } when API returns 404 with an error body", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Original text not found" }), { status: 404 })
    ) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "Hello",
      newText: "World",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/not found/i)
  })

  it("returns { ok: false, error } when API returns 409 (duplicate)", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Original text not unique" }), { status: 409 })
    ) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "Submit",
      newText: "Go",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/unique/i)
  })

  it("returns { ok: false, error } when fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("network down") }) as typeof globalThis.fetch
    const result = await postEdit({
      editApiPath: "/api/forkshop/edit",
      pagePath: "app/page.tsx",
      originalText: "x",
      newText: "y",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/network/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- src/lib/use-iframe-edit-controller.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook + helpers**

Create `packages/registry/src/lib/use-iframe-edit-controller.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- src/lib/use-iframe-edit-controller.test.ts`
Expected: PASS — all helper tests green. (The hook itself is not unit-tested; covered by manual playground test in Task 12.)

- [ ] **Step 5: Commit**

```bash
git add packages/registry/src/lib/use-iframe-edit-controller.ts packages/registry/src/lib/use-iframe-edit-controller.test.ts
git commit -m "feat(lib): add useIframeEditController hook + pure helpers"
```

---

## Task 7: `IframeEditOverlay` component

**Files:**
- Create: `packages/registry/src/components/canvas/iframe-edit-overlay.tsx`
- Create: `packages/registry/src/components/canvas/iframe-edit-overlay.test.ts`

The component is a thin React boundary. The test verifies the conditional rendering contract (production / missing sourceFile → null) by importing a pure predicate function. The React-tree behavior (mounting the controller, rendering the popover) is exercised by the manual playground test.

- [ ] **Step 1: Write the failing test**

Create `packages/registry/src/components/canvas/iframe-edit-overlay.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest"
import { shouldRenderOverlay } from "@forkshop/components/canvas/iframe-edit-overlay"

describe("shouldRenderOverlay", () => {
  it("returns false in production", () => {
    expect(shouldRenderOverlay({ nodeEnv: "production", sourceFile: "app/page.tsx" })).toBe(false)
  })

  it("returns false when sourceFile is undefined", () => {
    expect(shouldRenderOverlay({ nodeEnv: "development", sourceFile: undefined })).toBe(false)
  })

  it("returns false when sourceFile is empty string", () => {
    expect(shouldRenderOverlay({ nodeEnv: "development", sourceFile: "" })).toBe(false)
  })

  it("returns true in development with a sourceFile", () => {
    expect(shouldRenderOverlay({ nodeEnv: "development", sourceFile: "app/page.tsx" })).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- src/components/canvas/iframe-edit-overlay.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `packages/registry/src/components/canvas/iframe-edit-overlay.tsx`:

```tsx
"use client"

import { useIframeEditController } from "@forkshop/lib/use-iframe-edit-controller"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { EditPopover } from "@forkshop/components/canvas/edit-popover"

export type IframeEditOverlayProps = {
  iframe: HTMLIFrameElement | null
  sourceFile: string | undefined
  /** Default "/api/forkshop/edit". Used for both POST (save) and GET (read source). */
  editApiPath?: string
}

/** Pure predicate — extracted so the conditional-render contract is unit-testable
 *  in the node-env vitest setup (which has no React DOM). */
export function shouldRenderOverlay({
  nodeEnv,
  sourceFile,
}: {
  nodeEnv: string | undefined
  sourceFile: string | undefined
}): boolean {
  if (nodeEnv === "production") return false
  if (sourceFile === undefined || sourceFile === "") return false
  return true
}

export function IframeEditOverlay({
  iframe,
  sourceFile,
  editApiPath = "/api/forkshop/edit",
}: IframeEditOverlayProps) {
  if (!shouldRenderOverlay({ nodeEnv: process.env.NODE_ENV, sourceFile })) return null
  return (
    <IframeEditOverlayInner iframe={iframe} sourceFile={sourceFile!} editApiPath={editApiPath} />
  )
}

function IframeEditOverlayInner({
  iframe,
  sourceFile,
  editApiPath,
}: {
  iframe: HTMLIFrameElement | null
  sourceFile: string
  editApiPath: string
}) {
  const { transformRef } = useForkshopCanvas()
  const zoom = transformRef.current?.zoom ?? 1
  const panX = transformRef.current?.panX ?? 0
  const panY = transformRef.current?.panY ?? 0
  const ctl = useIframeEditController({
    iframe,
    sourceFile,
    editApiPath,
    canvasZoom: zoom,
  })
  return (
    <EditPopover
      element={ctl.editingElement}
      isSaving={ctl.isSaving}
      error={ctl.error}
      onSave={ctl.save}
      onDiscard={ctl.discard}
      onDismissError={ctl.dismissError}
      transformZoom={zoom}
      transformPanX={panX}
      transformPanY={panY}
    />
  )
}
```

Note: the inner component is split out so React doesn't call `useIframeEditController` in production builds — the early return in the outer component happens before any hook. Next.js inlines `process.env.NODE_ENV`, so the entire `IframeEditOverlayInner` branch tree-shakes in production builds.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- src/components/canvas/iframe-edit-overlay.test.ts`
Expected: PASS — all 4 cases green.

- [ ] **Step 5: Verify pnpm check still green**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/registry/src/components/canvas/iframe-edit-overlay.tsx packages/registry/src/components/canvas/iframe-edit-overlay.test.ts
git commit -m "feat(canvas): add IframeEditOverlay wrapper + shouldRenderOverlay predicate"
```

---

## Task 8: Wire `iframe-route` NodeType

**Files:**
- Modify: `packages/registry/src/node-types/iframe-route.tsx`

- [ ] **Step 1: Mount the overlay alongside the iframe**

Open `packages/registry/src/node-types/iframe-route.tsx`. The current `IframeRouteRender` returns a single `<LazyIframe>`. Update it to capture the iframe element in state and render the overlay as a sibling.

Replace the existing imports + `IframeRouteRender` with:

```tsx
"use client"

import { useCallback, useRef, useState } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeRouteNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { IframeEditOverlay } from "@forkshop/components/canvas/iframe-edit-overlay"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"

function IframeRouteRender({
  node,
  onBodyHeightChange,
}: {
  node: IframeRouteNode
  onBodyHeightChange?: (height: number) => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  return (
    <>
      <LazyIframe
        src={node.routePath}
        title={node.routePath}
        width={node.width}
        heightCap={node.height}
        desktopWidth={1440}
        onIframeWheel={handleIframeWheel}
        onBodyHeightSync={onBodyHeightChange}
        iframeRef={(el) => {
          iframeRef.current = el ?? null
          setIframeEl(el ?? null)
        }}
        className="bg-white shadow-md"
      />
      <IframeEditOverlay iframe={iframeEl} sourceFile={node.sourceFile} />
    </>
  )
}
```

The `iframeRouteNodeType` export and `pageFileLabel` helper at the bottom of the file are unchanged.

- [ ] **Step 2: Verify pnpm check still green**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/registry/src/node-types/iframe-route.tsx
git commit -m "feat(node-types): wire IframeEditOverlay into iframe-route NodeType"
```

---

## Task 9: Wire `iframe-component` NodeType

**Files:**
- Modify: `packages/registry/src/node-types/iframe-component.tsx`

- [ ] **Step 1: Same pattern as Task 8, for iframe-component**

Open `packages/registry/src/node-types/iframe-component.tsx` and apply the same pattern. Replace the existing `IframeComponentRender` with:

```tsx
"use client"

import { useCallback, useRef, useState } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeComponentNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { IframeEditOverlay } from "@forkshop/components/canvas/iframe-edit-overlay"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"

function IframeComponentRender({
  node,
  onBodyHeightChange,
}: {
  node: IframeComponentNode
  onBodyHeightChange?: (height: number) => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  return (
    <>
      <LazyIframe
        src={node.previewSrc}
        title={node.slug}
        width={node.width}
        heightCap={node.height}
        onIframeWheel={handleIframeWheel}
        onBodyHeightSync={onBodyHeightChange}
        iframeRef={(el) => {
          iframeRef.current = el ?? null
          setIframeEl(el ?? null)
        }}
        className="bg-white shadow-md"
      />
      <IframeEditOverlay iframe={iframeEl} sourceFile={node.sourceFile ?? node.componentPath} />
    </>
  )
}
```

The `iframeComponentNodeType` export is unchanged.

- [ ] **Step 2: Verify pnpm check still green**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/registry/src/node-types/iframe-component.tsx
git commit -m "feat(node-types): wire IframeEditOverlay into iframe-component NodeType"
```

---

## Task 10: Add `sourceFile` prop + per-viewport overlay to `ResponsiveFrameView`

**Files:**
- Modify: `packages/registry/src/layouts/responsive-frame-view.tsx`

`ResponsiveFrameView` already has a per-viewport `Viewport` sub-component (lines ~241-onwards) that holds its own `iframeElement` state. So the per-viewport iframe-ref plumbing already exists — we just thread `sourceFile` down and add a sibling overlay inside each `Viewport`.

- [ ] **Step 1: Add `sourceFile` to `ResponsiveFrameViewProps`**

Open `packages/registry/src/layouts/responsive-frame-view.tsx`. Find `ResponsiveFrameViewProps` (around line 72) and add:

```ts
export type ResponsiveFrameViewProps = {
  path: string
  source: string
  viewports?: number[]
  kind?: "page" | "block"
  measuredHeight?: number
  onBodyHeightChange?: (id: string, height: number) => void
  agentActive?: boolean
  /** TSX source file authoring this page/block. Required for live text editing. */
  sourceFile?: string
}
```

- [ ] **Step 2: Read `sourceFile` from props**

Inside `ResponsiveFrameView` (around line 95), add `sourceFile` to the destructuring:

```ts
const {
  path,
  source,
  viewports = DEFAULT_VIEWPORTS,
  kind = "page",
  measuredHeight,
  onBodyHeightChange,
  agentActive,
  sourceFile,
} = props
```

- [ ] **Step 3: Pass `sourceFile` down to each `<Viewport>`**

Inside the `viewportLayout.map((viewport, index) => (...))` JSX (around line 189), add a `sourceFile` prop to the `<Viewport>` element:

```tsx
<Viewport
  key={viewport.width}
  viewport={viewport}
  source={source}
  title={title}
  height={viewportHeights[index] ?? DEFAULT_VIEWPORT_HEIGHT}
  viewportIndex={index}
  agentActive={agentActive ?? false}
  identity={identity}
  onLocalHeightChange={handleViewportHeightChange}
  onOgImageDetected={index === 0 && isPage ? setOgImageUrl : undefined}
  onIframeWheel={handleIframeWheel}
  sourceFile={sourceFile}
/>
```

- [ ] **Step 4: Accept `sourceFile` in the `Viewport` component's props type**

Find the `Viewport` function (around line 241). Add `sourceFile?: string` to its inline props type:

```ts
function Viewport({
  viewport,
  source,
  title,
  height,
  viewportIndex,
  agentActive,
  identity,
  onLocalHeightChange,
  onOgImageDetected,
  onIframeWheel,
  sourceFile,
}: {
  viewport: ViewportPosition
  source: string
  title: string
  height: number
  viewportIndex: number
  agentActive: boolean
  identity: IframeIdentity
  onLocalHeightChange: (index: number, height: number) => void
  onOgImageDetected?: (url: string | undefined) => void
  onIframeWheel: (event: WheelEvent, iframe: HTMLIFrameElement) => void
  sourceFile?: string
}) {
```

- [ ] **Step 5: Import `IframeEditOverlay`**

Near the top of the file, alongside the existing `@forkshop/components/canvas/*` imports:

```ts
import { IframeEditOverlay } from "@forkshop/components/canvas/iframe-edit-overlay"
```

- [ ] **Step 6: Mount the overlay inside the `Viewport` return**

`Viewport` already has `const [iframeElement, setIframeElement] = useState<HTMLIFrameElement>()` and a `handleIframeRef` callback that updates it. So the overlay just consumes that state.

Find the `Viewport`'s return JSX. After the existing iframe wrapper `<div>` (which contains the `<iframe>` and its surrounding chrome), add the overlay as a sibling — wrap the return in a fragment if needed:

```tsx
return (
  <>
    <div style={{ /* existing positioning style */ }}>
      {/* existing iframe wrapper JSX, unchanged */}
    </div>
    <IframeEditOverlay iframe={iframeElement ?? null} sourceFile={sourceFile} />
  </>
)
```

The exact existing wrapper styling stays put — the overlay renders nothing visible itself (it portals the popover into `document.body`), so positioning doesn't matter.

- [ ] **Step 7: Verify pnpm check still green**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/registry/src/layouts/responsive-frame-view.tsx
git commit -m "feat(layouts): mount IframeEditOverlay per viewport in ResponsiveFrameView"
```

---

## Task 11: Playground config + page wiring

**Files:**
- Modify: `apps/playground/app/forkshop/forkshop.config.tsx`
- Modify: `apps/playground/app/forkshop/page.tsx`

- [ ] **Step 1: Add `sourceFile` to pages and blocks in the config**

Open `apps/playground/app/forkshop/forkshop.config.tsx`. Update the `pages` and `blocks` arrays:

```tsx
blocks: [
  { slug: "hero", name: "Hero", iframeSrc: "/forkshop-preview/hero",
    sourcePath: "components/blocks/hero.tsx",
    sourceFile: "components/blocks/hero.tsx" },
  { slug: "cta-band", name: "CTA Band", iframeSrc: "/forkshop-preview/cta-band",
    sourcePath: "components/blocks/cta-band.tsx",
    sourceFile: "components/blocks/cta-band.tsx" },
  { slug: "feature-row", name: "Feature Row", iframeSrc: "/forkshop-preview/feature-row",
    sourcePath: "components/blocks/feature-row.tsx",
    sourceFile: "components/blocks/feature-row.tsx" },
],
pages: [
  { path: "/", sourceFile: "app/page.tsx" },
  { path: "/about", sourceFile: "app/about/page.tsx" },
  { path: "/contact", sourceFile: "app/contact/page.tsx" },
  { path: "/about/team", sourceFile: "app/about/team/page.tsx" },
  { path: "/about/careers", sourceFile: "app/about/careers/page.tsx" },
],
```

Keep the `as const` at the end.

- [ ] **Step 2: Pass `sourceFile` into `ResponsiveFrameView` from `SinglePageBoard` and `SingleBlockBoard`**

Open `apps/playground/app/forkshop/page.tsx`. Find `SinglePageBoard` (around line 192). Update it to look up the page's `sourceFile`:

```tsx
function SinglePageBoard({ path }: { path: string }) {
  const page = forkshopConfig.pages.find((p) => p.path === path)
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  const handleBodyHeightChange = useCallback((_id: string, h: number) => setMeasuredHeight(h), [])
  const { width, height } = useMemo(
    () => responsiveFrameStageDimensions(measuredHeight, [1440, 768, 375]),
    [measuredHeight],
  )
  return (
    <PlaygroundBoard stageWidth={width} stageHeight={height} fitMode="width">
      {() => (
        <ResponsiveFrameView
          kind="page"
          path={path}
          source={path}
          sourceFile={page?.sourceFile}
          viewports={[1440, 768, 375]}
          measuredHeight={measuredHeight}
          onBodyHeightChange={handleBodyHeightChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

Find `SingleBlockBoard` (around line 167). Update it similarly:

```tsx
function SingleBlockBoard({ slug }: { slug: string }) {
  const block = forkshopConfig.blocks.find((b) => b.slug === slug)
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  const handleBodyHeightChange = useCallback((_id: string, h: number) => setMeasuredHeight(h), [])
  const { width, height } = useMemo(
    () => responsiveFrameStageDimensions(measuredHeight, [1440, 768, 375]),
    [measuredHeight],
  )
  if (!block) return null
  return (
    <PlaygroundBoard stageWidth={width} stageHeight={height} fitMode="width">
      {() => (
        <ResponsiveFrameView
          kind="block"
          path={block.slug}
          source={block.iframeSrc}
          sourceFile={block.sourceFile}
          viewports={[1440, 768, 375]}
          measuredHeight={measuredHeight}
          onBodyHeightChange={handleBodyHeightChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

- [ ] **Step 3: Add the API route re-export in the playground if missing**

Check whether the playground already re-exports the edit route. Run:

```bash
ls apps/playground/app/api/forkshop/edit/ 2>&1
```

If it doesn't exist, create `apps/playground/app/api/forkshop/edit/route.ts`:

```ts
export { POST, GET } from "@forkshop/registry/api/edit/route"
```

If it exists but only re-exports POST, update it to re-export both:

```ts
export { POST, GET } from "@forkshop/registry/api/edit/route"
```

- [ ] **Step 4: Verify pnpm check still green**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/app/forkshop/forkshop.config.tsx apps/playground/app/forkshop/page.tsx apps/playground/app/api/forkshop/edit/route.ts
git commit -m "feat(playground): wire sourceFile through to enable live text editing"
```

---

## Task 12: Manual end-to-end verification

**Files:** none modified — this is a manual test.

- [ ] **Step 1: Start the playground dev server**

Run: `pnpm dev`
Expected: Next.js dev server starts on `http://localhost:3000` (or whichever port the playground uses).

- [ ] **Step 2: Open the playground in a browser**

Navigate to `http://localhost:3000/forkshop` (or the playground's Forkshop mount path).

- [ ] **Step 3: Verify hover signals work on a page board**

Click a page in the sidebar (e.g. `/about`). The canvas should show the three-viewport ResponsiveFrameView.

- Hover text that is a literal in `app/about/page.tsx` (e.g. a heading or a prop value). Expected: **blue solid hover ring** + text cursor.
- Hover text that comes from a hardcoded string inside a sub-component (e.g. a button label inside Hero). Expected: **gray dashed hover ring** + not-allowed cursor.

- [ ] **Step 4: Verify enter-edit + save round-trip**

Click a blue-rung element. Expected:
- The element gains a thicker blue ring.
- The element becomes editable (cursor inside, can select text).
- A popover with Save (✓) and Discard (✗) buttons appears next to the element.

Type new text. Press ⌘↵. Expected:
- Brief saving state.
- Popover dismisses.
- Iframe HMRs to show the new text.
- `git diff app/about/page.tsx` shows exactly one substitution.

- [ ] **Step 5: Verify Esc discards**

Click another editable element. Type new text. Press Esc. Expected:
- Element reverts to its original text.
- Popover dismisses.
- `git diff` is empty.

- [ ] **Step 6: Verify locked text is non-interactive**

Click a gray-rung element. Expected:
- No popover appears.
- No edit mode entered.
- No navigation (if it was a link).

- [ ] **Step 7: Verify error UX on a duplicate-literal edit**

Find a piece of text that appears more than once in the page source (or temporarily add one — e.g. `<p>Submit</p>` twice in `app/about/page.tsx`). Hover, click, edit, save. Expected:
- Popover shows an error message ("Original text not unique" or similar).
- Element stays in edit mode.
- File is unchanged on disk.

- [ ] **Step 8: Verify production-mode degradation**

Build and run a production server:

```bash
pnpm build
pnpm --filter playground start
```

Open `http://localhost:3000/forkshop`. Expected:
- Canvas + sidebar work.
- Hovering text shows no rings, no cursor changes, no edit popover.
- The controller hook / EditPopover / useIframeEditWiring are absent from client bundles (spot-check by searching `.next/static/chunks/*.js` for `editing-active` or `EditPopover` — should not be found).

- [ ] **Step 9: Commit any playground fixture changes**

If you added duplicate-text fixtures for Step 7, decide whether they should be reverted or kept as a test fixture. If keeping:

```bash
git add apps/playground/app/<...>
git commit -m "test(playground): add duplicate-literal fixture for edit-mode error UX"
```

Otherwise revert:

```bash
git checkout apps/playground/app/<...>
```

---

## Task 13: Doc sync — update user CLAUDE.md template

**Files:**
- Modify: `packages/registry/src/templates/user-claude-md.md`

- [ ] **Step 1: Open the template + locate the kit / Node-type reference section**

Open `packages/registry/src/templates/user-claude-md.md`. Find the section that documents `IframeRouteNode` and `IframeComponentNode` (likely under a "Node types" or "kit API" heading).

- [ ] **Step 2: Add the `sourceFile` field documentation**

Under each iframe Node type's field list, add:

```markdown
- `sourceFile?: string` — TSX file (path from project root) that authors this
  page/block. Required to enable live text editing on this Node. When set,
  hovering text inside the iframe in dev mode shows:
  - **Blue ring** on text whose value appears as a string literal in `sourceFile`
    (editable — click to enter edit mode, ⌘↵ to save back to the file).
  - **Gray dashed ring** on text hardcoded inside sub-components imported by
    this file (locked — open the sub-component's own block board to edit it).

  Live editing is **dev-only**. Production builds tree-shake the entire wiring.
```

- [ ] **Step 3: Add a "Live text editing" subsection if one doesn't exist**

If the template doesn't already cover live editing UX in a dedicated subsection, add:

```markdown
## Live text editing

In dev mode, text rendered inside a Forkshop iframe is **editable in place**
when the surrounding Node carries a `sourceFile` field:

- Hover text → see a blue ring if it's editable from this board, gray-dashed
  if it's owned by a sub-component (open that component's block board to edit).
- Click editable text → enters an inline contenteditable, popover appears.
- ⌘↵ to save (writes the file to disk; iframe HMRs to the new value).
- Esc to discard.
- If two identical literals exist in the same `sourceFile`, the save fails with
  a "not unique" error — refactor one of them to a distinct prop.

The `/api/forkshop/edit` endpoint serves both POST (save) and GET (read source).
Make sure `app/api/forkshop/edit/route.ts` re-exports both:

\`\`\`ts
export { POST, GET } from "@forkshop/registry/api/edit/route"
\`\`\`

Live editing is **dev-only** by construction. The overlay component returns
`null` in production, the entire wiring tree-shakes, and the API route itself
returns 403 in production as a second line of defense.
```

- [ ] **Step 4: Verify pnpm check still green**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/registry/src/templates/user-claude-md.md
git commit -m "docs: document sourceFile + live text editing UX in user CLAUDE.md template"
```

---

## Verification — final checks before claiming done

- [ ] **Step 1: Full repo check**

Run: `pnpm check`
Expected: PASS — typecheck and lint both green.

- [ ] **Step 2: Full test run**

Run: `pnpm --filter @forkshop/registry test`
Expected: PASS — all existing tests + the 4 new test files (route, extract-string-literals, use-iframe-edit-controller, iframe-edit-overlay) green.

- [ ] **Step 3: Manual Task 12 checklist**

Confirm every box in Task 12 was actually exercised in a running browser, not just assumed to work.

- [ ] **Step 4: Validate registry manifest**

Run: `pnpm --filter docs validate-registry`
Expected: PASS — the new files (`use-iframe-edit-controller.ts`, `extract-string-literals.ts`, `iframe-edit-overlay.tsx`) are picked up by `buildManifest()` without canonical-import or placeholder errors. If validation fails, fix the underlying issue (likely a missing manifest entry for a new file or a non-canonical import inside one of the new files).

- [ ] **Step 5: Spot-check the production bundle**

After `pnpm build`:

```bash
grep -r "useIframeEditController\|EditPopover\|useIframeEditWiring" apps/playground/.next/static/chunks/ 2>&1 | head
```

Expected: no matches in production chunks. (The dev-only tree-shake should drop all three names.)
