# Live text editing — implementation spec

Date: 2026-05-16
Status: Approved (brainstorming) — ready for plan
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md`,
               `docs/specs/2026-05-15-nodetype-layout-extraction-design.md`
Estimated effort: ~1.5 days

## Goal

Re-activate live text editing — Forkshop's defining "edit in place" capability — by adding the missing glue between the orphaned edit primitives already in the registry and the new NodeType / Layout architecture.

Today, `use-iframe-edit-wiring.ts` (373 LOC), `edit-popover.tsx`, `edit-mode.ts`, and the `/api/edit` POST handler all exist in `packages/registry/src/` from the ravineo-web port but are not exported, not imported, and not reachable from any board. The state machine that owned `editingElement / isSaving / error` and chose what file to write to lived in the ravineo-web caller and was never ported.

This spec adds that state machine (one hook + one small wrapper component), introduces a sandbox model that prevents accidental edits to shared sub-components, and wires the result into the three iframe-rendering sites: the `iframe-route` NodeType, the `iframe-component` NodeType, and the `ResponsiveFrameView` Layout.

## Scope edges

**In scope:**
- New internal hook `useIframeEditController` — owns edit state, calls `useIframeEditWiring`, POSTs to the edit API on save.
- New internal component `<IframeEditOverlay>` — thin wrapper that mounts the controller and renders `<EditPopover>` via portal. Production-gated by a single `process.env.NODE_ENV === "production"` early-return.
- New optional field `sourceFile?: string` on `IframeRouteNode` and `IframeComponentNode`. The only user-facing API change.
- New GET handler appended to `/api/edit/route.ts` (same file as the existing POST) for reading a file's contents (dev-only, same path-escape check). Same public endpoint, two HTTP methods. Used to build the per-iframe "editable literal" set.
- One new patched mouseover handler in `use-iframe-edit-wiring.ts` that distinguishes editable text from sub-component-internal text via the editable set.
- One new CSS class `[data-edit-locked]` added to `PREVIEW_EDIT_CSS` in `edit-mode.ts`.
- Wiring of `<IframeEditOverlay>` into the three iframe-rendering call sites.
- Playground demo: two existing pages get `sourceFile` set in `forkshop.config.tsx`.
- Doc sync to `packages/registry/src/templates/user-claude-md.md`.

**Out of scope (deferred to other specs):**
- Spacing-mode editing (`use-iframe-spacing-wiring.ts`, `spacing-picker.tsx`, `spacing-body-menu.tsx`). Same wiring problem; separate spec.
- Block double-click drill-in (`use-iframe-block-dblclick.ts`).
- Inspect panel selection routing.
- Locator-based per-element source resolution. The literal-set approach ships without it; Locator becomes a future accuracy enhancement.
- Compose mode (`PREVIEW_COMPOSE_CSS`). Strategy already marks this as deferred from 1.0.
- CLI manifest entries beyond what `buildManifest()` already picks up. The bundle layout (whether live editing is its own bundle or part of `init`) is decided during plan.

## Safety model

The thing that keeps shared components safe is the **sourceFile sandbox + editable-literal set**, enforced at hover time, not at save time.

### The two scopes

| Node kind | Typical board | `sourceFile` points to | Author intent |
|---|---|---|---|
| `iframe-route` | Page board (e.g. "Home", "About") | `app/page.tsx`, `app/about/page.tsx` | Edit the page — its props and inline text |
| `iframe-component` | Block board (e.g. "Hero" in a Components tab) | `components/blocks/hero.tsx` | Edit the block itself (user explicitly opted in by being on the block board) |

### How accidental sub-component edits are prevented

On a page board, the user might hover over text that is hardcoded inside a shared sub-component (e.g. a button label inside `Hero.tsx`). Without protection, they would try to edit it, hit Save, and only then learn it cannot be edited from the page context.

Instead, the controller pre-computes which DOM text is editable from this board:

```
On iframe load (per IframeEditOverlay instance, on a page board):
  1. GET /api/forkshop/edit?path=<node.sourceFile>
  2. Extract every string literal from the file (double-, single-, and simple
     backtick-quoted strings of length >= 1 character) into a Set<string>.
  3. Cache that Set for the lifetime of this iframe load.
  4. The set refreshes on every iframe reload (each HMR cycle).

On mouseover (inside use-iframe-edit-wiring):
  if (textContent.trim() ∈ editableSet):
    target.dataset.editHover = ""        // blue ring, cursor: text
  else:
    target.dataset.editLocked = ""       // dashed gray ring, cursor: not-allowed
```

The click handler in `use-iframe-edit-wiring` only enters edit mode for elements with `[data-edit-hover]`. Locked elements consume the click as a no-op (no edit, no navigation).

### Resulting properties

- A page board can only modify the file declared as that Node's `sourceFile`. By construction, no other file can be written.
- The hover signal is truthful: blue = "this is editable from here," gray = "this is a sub-component's internal text — open its block board to edit."
- Production builds cannot write to anything: the overlay is tree-shaken in production, and the API route returns 403 in production as a second line of defense.

### Honest trade-offs

- **Heuristic literal extraction.** If "Submit" appears once in both `app/page.tsx` and `hero.tsx` as a hardcoded button label, both DOM occurrences will hover-as-editable. The user clicks the Hero one, edits, saves. The API's uniqueness check finds "Submit" exactly once in `app/page.tsx` and rewrites the page-level occurrence. The home page changes; `hero.tsx` is untouched. The user edited a different occurrence than they visually pointed at, but the sourceFile sandbox held. Acceptable for v0. A future Locator-driven pass would make this exact.
- **Duplicated literals.** If `"Submit"` appears twice in `app/page.tsx`, the API's uniqueness check rejects the edit (409). The popover surfaces the error. The user can disambiguate by wrapping each in a distinct prop on a shared component.
- **The mouseover handler does extra work per hover.** Comparing a trimmed string against a Set is cheap; in practice the cost is negligible. Worth measuring if dev-mode rendering ever feels sluggish.

## Architecture

```
ForkshopCanvas
  └── Board (e.g. SinglePageBoard or a Gallery)
       └── Layout / NodeView
            └── iframe-host (one of three: iframe-route NT, iframe-component NT, RFV viewport)
                 ├── LazyIframe                  ← already renders the iframe
                 └── IframeEditOverlay           ← NEW, dev-only
                      └── useIframeEditController ← NEW
                           ├── fetches sourceFile contents, builds editableSet
                           ├── calls useIframeEditWiring (existing) with editableSet-aware handler
                           ├── owns { editingElement, isSaving, error }
                           ├── POSTs to /api/forkshop/edit on save
                           └── renders <EditPopover> via portal
```

The split between `useIframeEditController` (state and effects) and `<IframeEditOverlay>` (the React boundary) is deliberate: callers compose `<LazyIframe />` + `<IframeEditOverlay />` as two siblings, and the controller's lifecycle is owned by the overlay component's mount/unmount.

## TypeScript shapes

### Node type additions

```ts
// packages/registry/src/types/node.ts

export type IframeRouteNode = BaseNode & {
  kind: "iframe-route"
  routePath: string
  /** Path (from project root) of the TSX file that authors this page.
   *  Required for live text editing — omit to opt this Node out. */
  sourceFile?: string
  drillInMode?: "single" | "responsive"
}

export type IframeComponentNode = BaseNode & {
  kind: "iframe-component"
  slug: string
  previewSrc: string
  componentPath?: string
  /** Path of the TSX file that authors this block. Typically equals
   *  componentPath. Required for live text editing — omit to opt out. */
  sourceFile?: string
  drillInMode?: "single" | "responsive"
}
```

Backwards-compatible: existing Nodes without `sourceFile` continue to work — they just don't get editing.

### Controller hook

```ts
// packages/registry/src/lib/use-iframe-edit-controller.ts

export type UseIframeEditControllerArgs = {
  iframe: HTMLIFrameElement | null
  sourceFile: string | undefined
  editApiPath?: string       // default "/api/forkshop/edit"
                             // — used for both POST (save) and GET (read source)
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

export function useIframeEditController(
  args: UseIframeEditControllerArgs
): UseIframeEditControllerResult
```

Internal contract:
- When `iframe === null` or `sourceFile === undefined`, the hook is inert (no listeners, no fetches).
- On iframe load, the hook GETs `<editApiPath>?path=<sourceFile>` and builds the editable-literal set.
- The hook calls `useIframeEditWiring` with an `editableSet` parameter (new, optional) and callbacks that move the controller's state machine forward.
- On `save()`: take `editingElement.textContent`, compare to the snapshotted `originalText`, POST `{ pagePath: sourceFile, originalText, newText }` to `editApiPath`. On 2xx, exit edit mode. On error, set `error` and keep editing element contenteditable.
- On `discard()`: restore `editingElement.textContent` from snapshot, clear contenteditable, exit edit mode.
- `dismissError()`: clear the error message without exiting edit mode.

### Overlay component

```tsx
// packages/registry/src/components/canvas/iframe-edit-overlay.tsx

export type IframeEditOverlayProps = {
  iframe: HTMLIFrameElement | null
  sourceFile: string | undefined
  editApiPath?: string       // default "/api/forkshop/edit"
                             // — used for both POST (save) and GET (read source)
}

export function IframeEditOverlay(props: IframeEditOverlayProps): ReactNode
```

Implementation:

```tsx
export function IframeEditOverlay({
  iframe,
  sourceFile,
  editApiPath = "/api/forkshop/edit",
}: IframeEditOverlayProps) {
  if (process.env.NODE_ENV === "production") return null
  if (!sourceFile) return null
  const { transformRef } = useForkshopCanvas()
  const zoom = transformRef.current?.zoom ?? 1
  const panX = transformRef.current?.panX ?? 0
  const panY = transformRef.current?.panY ?? 0
  const ctl = useIframeEditController({
    iframe, sourceFile, editApiPath, canvasZoom: zoom,
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

The early-return in production allows Next.js to tree-shake the entire dead branch — the controller hook, `useIframeEditWiring`, `EditPopover`, and the `data-edit-locked` CSS all drop out of production bundles.

### `useIframeEditWiring` extension

The existing hook gains one optional parameter:

```ts
type UseIframeEditWiringArgs = {
  // ...existing fields unchanged...
  editableSet?: Set<string>   // NEW — if provided, mouseover differentiates
                              // editable vs locked text; if undefined, all
                              // text is treated as editable (back-compat).
}
```

Inside the existing `mouseoverHandler`:

```ts
if (target && isTextElement(target)) {
  const text = (target.textContent ?? "").trim()
  if (editableSet === undefined || editableSet.has(text)) {
    target.dataset.editHover = ""
  } else {
    target.dataset.editLocked = ""
  }
  lastHover = target
}
```

The `mouseoutHandler` clears both `editHover` and `editLocked`. The `clickHandler` only enters edit mode for `[data-edit-hover]`; locked text consumes the click as a no-op.

### CSS addition

```css
/* packages/registry/src/lib/edit-mode.ts → PREVIEW_EDIT_CSS */
[data-edit-locked] {
  outline: calc(1px / var(--canvas-zoom, 1)) dashed #94a3b8 !important;
  outline-offset: calc(1px / var(--canvas-zoom, 1)) !important;
  cursor: not-allowed !important;
}
```

Stays in `PREVIEW_EDIT_CSS` so it's injected by the same wiring that injects `[data-edit-hover]` / `[data-editing]`. No new injection point.

### Edit API — new GET handler

```ts
// packages/registry/src/api/edit/route.ts (existing file gains a GET alongside POST)

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

The user's app already re-exports the POST from `app/api/forkshop/edit/route.ts`. The same re-export covers the new GET — no new endpoint to scaffold, no new file for users to add. The single public path `/api/forkshop/edit` handles both write (POST) and read (GET) of source files.

## File layout

### Adds

```
packages/registry/src/
  lib/
    use-iframe-edit-controller.ts          NEW hook
  components/canvas/
    iframe-edit-overlay.tsx                NEW component
```

### Patches

```
packages/registry/src/
  types/node.ts                            +sourceFile field on two Node types
  hooks/use-iframe-edit-wiring.ts          +editableSet parameter + locked-aware
                                            mouseover/click handlers
  lib/edit-mode.ts                         +[data-edit-locked] CSS rule
  api/edit/route.ts                        +GET handler (alongside existing POST)
  node-types/iframe-route.tsx              +IframeEditOverlay sibling, captures
                                            iframe ref via state
  node-types/iframe-component.tsx          same shape
  layouts/responsive-frame-view.tsx        +sourceFile prop, per-viewport
                                            overlay + iframe-ref state

apps/playground/
  app/forkshop/forkshop.config.tsx         +sourceFile on the two page Nodes
  app/forkshop/page.tsx                    pass sourceFile to ResponsiveFrameView
                                            via SinglePageBoard

packages/registry/src/templates/
  user-claude-md.md                        doc sync — new sourceFile field +
                                            editing UX description
```

### Tests

```
packages/registry/src/
  lib/
    use-iframe-edit-controller.test.ts     NEW — save/discard/error paths
  components/canvas/
    iframe-edit-overlay.test.ts            NEW — contract test (prod returns
                                            null; sourceFile undefined returns
                                            null; otherwise renders)
  api/
    edit/route.test.ts                     existing — extend with GET cases
                                            (path-escape, prod 403, success,
                                             missing-path 400, read 404)
```

## Implementation order

Each step is independently shippable; `pnpm check` stays green throughout.

1. **GET source endpoint.** Add a GET handler to the existing `api/edit/route.ts` (alongside the POST). Extend the existing test file with cases for path-escape, production 403, success, missing-path 400, read 404.
2. **`useIframeEditController` hook.** With a fake `fetch`, unit-test save / discard / 404 / 409 / dismissError paths.
3. **`use-iframe-edit-wiring.ts` extension.** Add optional `editableSet` parameter; thread it through the mouseover handler; gate click-into-edit on `[data-edit-hover]`. Backwards-compatible default: editableSet === undefined ⇒ all text editable.
4. **`PREVIEW_EDIT_CSS` patch.** Add the `[data-edit-locked]` rule.
5. **`<IframeEditOverlay>` component.** Contract test: production returns null, missing sourceFile returns null, otherwise renders.
6. **`sourceFile?: string` on the Node types.** Patch `types/node.ts`. Update any test fixtures.
7. **Wire `iframe-route` NodeType.** Add iframe-ref state, mount `<IframeEditOverlay>`. Manual playground check: hover text on a page board, see blue rings on prop text and gray rings on hardcoded sub-component text.
8. **Wire `iframe-component` NodeType.** Same shape.
9. **Patch `ResponsiveFrameView`.** Add `sourceFile?: string` prop, mount one `<IframeEditOverlay>` per viewport (three by default). Per-viewport iframe-ref state.
10. **Playground config update.** Add `sourceFile` to the two page Nodes in `forkshop.config.tsx`. Pass it through `SinglePageBoard` to `ResponsiveFrameView`. End-to-end manual test: edit text, hit ⌘↵, file rewrites, iframe HMRs, `git diff` shows the change.
11. **Doc sync.** Update `packages/registry/src/templates/user-claude-md.md` with the new `sourceFile` field and the dev-only editing UX. Note that the existing `/api/forkshop/edit` re-export now serves both POST and GET — no new endpoint to scaffold.

## Verification checklist

Before claiming the spec is implemented:

- `pnpm check` green.
- All new unit / contract tests passing.
- Manual playground test in dev:
  - Open a page board (e.g. Home).
  - Hover text passed as a prop in `app/page.tsx` → blue ring, text cursor.
  - Hover text hardcoded inside a sub-component → gray dashed ring, not-allowed cursor; click does nothing.
  - Click prop text → enters contenteditable, popover appears next to it.
  - Type new text, hit ⌘↵ → popover shows brief saving state, popover dismisses, iframe HMRs to the new value, `git diff app/page.tsx` shows the change.
  - Type new text, hit Esc → reverts, popover dismisses.
  - Type new text that would duplicate-match in the file → save fails, popover shows error, element stays editable.
- Production build: `pnpm build && NODE_ENV=production node …` — confirm the production playground does not include the controller hook, `useIframeEditWiring`, or `EditPopover` in client bundles (grep `.next/static/chunks` or use bundle analyzer).

## Open questions deferred to implementation

- **Per-viewport iframe-ref state inside `ResponsiveFrameView`** — whether to use an array of useState or a single record keyed by viewport. Local detail; decide during step 9.
- **Whether the literal extraction regex should also handle template literals with interpolations** — for v0, simple single-, double-, and backtick literals are enough. Interpolations would require lexing, deferred unless it bites in practice.
- **Whether `<IframeEditOverlay>` should expose a way to disable editing per-Node beyond just omitting `sourceFile`** — e.g., for Nodes that have a sourceFile set but are meant to be read-only. No use case identified; defer until requested.

## What this spec never does

- Touch user files passively. No data attributes injected into user TSX, no markup wrappers, no decorators. User code is unchanged until the user actively saves an edit.
- Write outside the configured `sourceFile`. Even a malicious request from inside the iframe cannot escape: the API path-escape check rejects paths outside the project root, and the controller only ever sends the Node's declared `sourceFile`.
- Ship in production. Both the wiring and the API are dev-only with belt-and-suspenders gating (compile-time tree-shake + runtime 403).
- Touch shared sub-component files from a page board. The sourceFile sandbox + editable-set make this physically impossible.

## Doc sync requirements

After implementation, update `packages/registry/src/templates/user-claude-md.md` to document:

- The `sourceFile?: string` field on `IframeRouteNode` and `IframeComponentNode`.
- The editing UX (blue ring = editable, gray dashed ring = locked sub-component text, ⌘↵ to save, Esc to discard).
- The dev-only nature of the feature and what happens in production.
- A note that the existing `/api/forkshop/edit` re-export now serves both POST (save) and GET (read source) — no new endpoint to scaffold.

---

## Implementation deviations (added 2026-05-16 after shipping)

The v0 spec above describes what was designed during brainstorming. The actual implementation grew during a single same-day session, with three categories of additions discovered during manual end-to-end testing:

### 1. Bugs surfaced during manual E2E (8 fixes)

Each landed as its own commit on `main` between 2026-05-16 ~14:30 and ~15:30. None changed the spec's public surface; all hardened the implementation.

- **`EditPopover` z-index 100 → 9999** (`f28bf26`). The popover was rendering below the canvas iframe because the iframe sits in a transformed stacking context that beat the popover's z-index.
- **Refetch editable Set after own save** (`f28bf26`). Without it, just-edited text showed as gray-locked on the next hover because the in-memory Set was stale.
- **RAF-driven popover position tracking** (`f0ff169`). The canvas transform is in a ref (no re-renders), so the popover's transform-dep useEffect never re-ran on pan/zoom. Replaced with a `requestAnimationFrame` poll while editing is active.
- **`saveInternal` race conditions** (`5125b4d`). Three races: switch-on-failure stranding the old element, save-after-discard mutating UI state for an abandoned edit, iframe-reload leaving `editingElement` referencing a detached node. Closed via a generation-counter ref plus an `isConnected` belt-and-suspenders check.
- **Drop `[data-editing]` background fill** (`0f4bec5`). The `rgba(59, 130, 246, 0.06)` background made dark-themed buttons (e.g. `bg-black text-white` CTAs) unreadable while editing. Outline alone is the visual indicator now.
- **Refetch editable Set on iframe-load** (`29ffdb4`). For full page reloads where the iframe `load` event fires.
- **Cross-viewport refetch via `window` event bus** (`066a2ad`). Next.js HMR doesn't fire iframe `load` events (it updates the iframe DOM in place), so the load-listener fix above doesn't reach sibling viewports. The saving controller dispatches `forkshop:source-changed`; every controller listening for the same sourceFile refetches.
- **Playground Locator wiring** (`59c87c9`, post-feature). The playground's `next.config.mjs` had Locator rules under the Next 15+ `turbopack` key, which Next 14 doesn't recognize. Added the equivalent webpack `module.rules.push` so Option-click works on the default `next dev` runner.

### 2. Post-v0 features added at user request (2 features)

Both extend the spec's public surface and are user-visible. The spec didn't anticipate them but they're consistent with the safety model.

- **JSX text children editing**. The v0 extractor only captured quoted literals (`"…"`, `'…'`, simple `` `…` ``). The user wanted to edit text written as JSX children (`<p>We're a small team...</p>` instead of `<p>{body}</p>`). Implementation (`49a67de`, `65d210d`):
  - `extractStringLiterals` extended with a fourth pattern for text between JSX tags (`/>([^<>{}]+)</g`).
  - HTML entity decoding (`&apos;` → `'`, `&amp;` → `&`, `&quot;` → `"`, `&lt;` → `<`, `&gt;` → `>`, `&nbsp;` → space). Decoded form is what enters the Set so it matches rendered DOM textContent.
  - Whitespace normalization (`\s+` → single space, trim).
  - New `resolveJsxTextSpan` helper that, given a normalized search target, returns the verbatim source span — used by `saveInternal` to send the literal source slice (entities + indentation intact) to the API instead of the decoded textContent.
  - Trade-off: when saving an edit to multi-line indented JSX text, the source whitespace collapses to a single line. Cosmetic source-formatting wart; not a safety issue. Future polish could re-wrap with the original leading/trailing whitespace.
- **Live cross-viewport sync** (`cbf6176`). On a `ResponsiveFrameView` board, typing in one viewport mirrors to the other two viewports in real time (parity with the upstream ravineo-web Fogma tool). Implementation:
  - On `handleEnterEdit`, attach an `input` listener to the editing element.
  - On input, compute the editing element's `computeDomPath`, walk `useIframeRegistry().getAll()` for iframes with matching `src` and different identity, run `querySelector(path)` in each sibling's contentDocument, set `textContent` to the new value.
  - Detach the listener in `exitEdit`.
  - The `useIframeRegistry` provider is already in the Forkshop canvas tree; controllers outside a provider get a `undefined` registry and the broadcast is a no-op (safe for standalone kits).

### 3. Open follow-ups (non-blocking, noted by final reviewer)

These don't ship as bugs but are worth a polish pass:

- **`getCanvasZoom` closure churn in controller**. `getCanvasZoom: () => canvasZoom` allocates a new function on every render, and it's in `useIframeEditWiring`'s effect deps — every state change tears down/re-attaches all in-iframe listeners. Fix: wrap in `useCallback`, or read `editableSet` from a ref to keep it out of the effect dep array.
- **`iframe-component` falls back from `sourceFile` to `componentPath`**. The fallback is silent and undocumented; a user setting `componentPath` purely for agent-activity mapping would get unexpected editing wiring. Either drop the fallback or document it in the type's JSDoc.
- **`inputListenerRef` leaks across iframe reloads**. The `handleLoad` clears `editingElement` but not `inputListenerRef.current`. Subsequent `exitEdit` is guarded by `editingElement` so the bad path doesn't fire, but the ref still leaks until the next enter. Cosmetic.
- **Cross-viewport refetch fires on the saving viewport too**. The dispatching controller's own listener catches its own event and does an extra GET, even though it already has fresh source data. One redundant request per save; harmless.

### 4. Tests added beyond the planned set

The plan called for unit tests on `extractStringLiterals`, `postEdit`, `buildEditableSet`, the API route, and `shouldRenderOverlay`. Tests for `resolveJsxTextSpan` (4 cases) and the JSX text patterns in `extractStringLiterals` (5 cases) were added with the post-v0 features. Final test count: 122/122 in `@forkshop/registry`.

### Audit trail

Final state after this work:
- 22 commits on `main` since base `0f49951`.
- `pnpm --filter @forkshop/registry test`: 122/122 passing.
- `pnpm --filter @forkshop/registry typecheck`: clean.
- `pnpm --filter docs validate-registry`: 63 files, 8 bundles, all references resolved.
- `pnpm --filter playground build`: succeeds; production bundles do not include `useIframeEditController`, `EditPopover`, `useIframeEditWiring`, `extractStringLiterals`, or `resolveJsxTextSpan` (verified via `grep` of `.next/static/chunks/`).
- Manual E2E in `apps/playground` confirms all flows: hover signals, edit/save round-trip, live sync, cross-viewport refetch, pan/zoom popover tracking, Option-click open-in-editor.
