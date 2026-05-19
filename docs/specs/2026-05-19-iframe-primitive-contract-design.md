# Iframe primitive contract — design

**Date:** 2026-05-19
**Status:** Approved, ready for plan + implementation
**Tracks:** field feedback `docs/feedback/2026-05-19-board-building-session.md` items #1, #4, #10, #11, #13, #14
**Defers:** position model unification (separate spec), canvas zoom containment (separate spec)

## Problem

`iframe-route` is intended to be the single NodeType for "render a Next.js route as an iframe inside the canvas," with live-edit overlay, agent-read indicator, wheel forwarding to the canvas, and route-level agent attribution all wired in. In practice it has bugs that push consumers off it. The board-building feedback abandoned `iframe-route` entirely for the Dashboard board, rebuilt iframe lifecycle by hand inside `inline-react`, and lost the live-edit overlay, agent-read indicator, and wheel forwarding in the process. That's a failure of the primitive — the right NodeType for the job costs more than reimplementing from scratch.

Two failures drive the abandonment:

1. **Cap callback is uncapped.** `LazyIframe`'s `onBodyHeightSync` callback fires with the raw `body.scrollHeight` even when `heightMode === "cap"`. The visual wrapper clips at `node.height` (correct), but Gallery — which sizes its cell from the callback — gets the uncapped value. Frames grow past the cap, pile on top of each other, and the cell takes 2x the canvas space it should.
2. **Capped iframes still scroll internally.** The injected style strips `min-h-screen` but doesn't lock `body { overflow }`. The iframe element's `scrolling="no"` prevents an outer scrollbar, but wheel events inside the embedded doc still scroll its content separately from the canvas. Surprising for a preview tile.

Plus three documentation gaps that compound the above: `routePath` is mis-named as `path` in the user-side CLAUDE.md template, the cap behavior isn't documented at all, and there's no example of the "thin custom NodeType wrapping a built-in" pattern that would be the canonical answer for advanced framing cases.

## Goals

- Make `iframe-route` the obvious right answer for "iframe at a Next.js route inside the canvas." Custom Boards should reach for it first; falling back to `inline-react` + a hand-rolled iframe is a workaround, not a design.
- Fix the two observable bugs (#1 and #14) without enlarging the public API surface.
- Document the cap behavior, the field naming, and the custom-NodeType wrapping pattern so future board builders don't re-discover the same things.
- Keep `LazyIframe` internal. The public contract is the `IframeRouteNode` shape and `iframeRouteNodeType` export; the React component underneath stays a private implementation detail.

## Non-goals

- `LazyIframe` as a public React component. Decided in brainstorming — NodeType-only public surface.
- Adding new public fields to `IframeRouteNode`. Cap stays implicit via `node.height`; scroll lock is always-on for cap mode. No `maxHeight`, no `lockScroll`, no `desktopWidth` field this cycle.
- Letting `inline-react` claim route-level agent attribution. Custom iframe wrappers either use `iframe-route` (covers most cases) or write a custom NodeType with their own `agentMatch` (covers the 5%). `inline-react` stays focused on primitive-level pulses keyed by `sourcePath`.
- Position model fixes (Gallery row/column, `node.x`/`node.y` semantics) — separate spec.
- Canvas zoom containment (portal-rendered tooltips) — separate spec.
- Type exports (`ForkshopCanvasHandle`, `Transform`, `WheelInput`) — pure DX, can ship anytime independent of this work.
- Advanced iframe framing (sidebar-only clip, viewport offsets, search-param-only diffs). Not a bug. Revisit if recurring user need; for now, custom NodeType (documented per Doc 3.3 below) is the escape hatch.

## Decisions

### D1 — Cap is implicit via `node.height`; no new field

Every iframe-route Node is capped. `node.height` is the cap. No `maxHeight` field, no `heightMode` exposed on the public Node shape. Smallest API surface; matches what `iframe-route`'s render already does internally (`heightMode="cap" height={node.height}`).

If a future need surfaces for unbounded growth, we add `maxHeight?: number` then. YAGNI for now.

### D2 — Scroll lock is always-on for `heightMode === "cap"`

No opt-in field. Every capped iframe gets `html, body { overflow: hidden !important }` injected. The canvas is the scroll surface; the embedded page is a preview tile, not an interactive surface. If someone needs inner scroll later, opt-out becomes a field; we don't speculate.

### D3 — `iframe-route` stays the only route-attributed NodeType

`agentMatch` on `inline-react` continues to match by `sourcePath` (primitive-level pulse). Custom iframe wrappers that want route attribution either use `iframe-route` (richer than today after this spec's fixes) or write a custom NodeType that returns route attribution via its own `agentMatch`. Documented per Doc 3.3.

### D4 — Bug fixes happen in `LazyIframe`, not in `iframe-route`'s render

`iframe-route`'s render code is already correct (passes `heightMode="cap" height={node.height}`). The bugs are in `LazyIframe`'s implementation of cap mode. Fix at the source so any future internal consumer (including `iframe-component`) benefits without duplication.

## Implementation outline

### Code changes — `packages/engine/src/components/canvas/lazy-iframe.tsx`

**Change 1 — Cap the `onBodyHeightSync` callback value.**

In `handleBodySync`, branch on `effectiveMode`:

```tsx
const handleBodySync = useCallback(
  (h: number) => {
    setMeasuredBodyHeight(prev => prev === h ? prev : h)
    const reported =
      effectiveMode === "cap" && effectiveCap !== undefined
        ? Math.min(h, effectiveCap)
        : h
    onBodyHeightSync?.(reported)
  },
  [onBodyHeightSync, effectiveMode, effectiveCap],
)
```

Internal `measuredBodyHeight` still stores the raw value so the visual wrapper can render at `Math.min(measured, cap)`. The callback — used by Gallery to size its cell — reports the capped value.

**Change 2 — Lock scroll when capped.**

Extend the injected style block in `onLoad` to add the scroll-lock rule when `effectiveMode === "cap"`:

```tsx
const lockScrollCss =
  effectiveMode === "cap" ? "html, body { overflow: hidden !important; }" : ""

styleElement.textContent = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-overlay], #__next-build-watcher { display: none !important; }
  html, body { min-height: 0 !important; height: auto !important; }
  [class*="min-h-screen"], [class*="min-h-dvh"], [class*="min-h-svh"], [class*="min-h-lvh"] { min-height: 0 !important; }
  ${lockScrollCss}
`
```

Always-on for cap mode. `auto` and `fixed` modes are unchanged.

### Doc changes — `packages/engine/templates/user-claude-md.md`

**Doc 3.1 — `routePath` field naming.** Rename `path: "/docs/getting-started"` → `routePath: "/docs/getting-started"` in the "Adding a new Board" example. Three-character edit.

**Doc 3.2 — Add a "Frame heights" subsection.** New subsection under "How edit, spacing, and open-in-editor work":

```markdown
### Frame heights

`iframe-route` clamps the rendered iframe to `node.height`. The iframe loads the
full page, auto-sizes vertically until it hits the cap, then clips. Scrolling
inside the iframe is locked — the canvas is the scroll surface, not the
embedded page.

If you want the iframe to grow taller to fit a long page, increase `node.height`.
If you want a fixed-thumbnail look regardless of content length, set `node.height`
to your desired tile height — the iframe will clip the page accordingly.

(`iframe-component` follows the same rules using its `previewSrc` URL.)
```

**Doc 3.3 — Add a "Wrapping a built-in NodeType" example.** A second example under "Adding a custom NodeType," after the existing from-scratch Storybook example. Canonical case: a NodeType that wraps `iframe-route` to add custom framing while inheriting `agentMatch` (so route attribution keeps working).

```tsx
// app/forkshop/node-types/sidebar-only-frame.tsx
// Renders a dashboard route but clips to a right-edge sidebar view.
"use client"
import { iframeRouteNodeType } from "@forkshop/engine"
import type { NodeType, IframeRouteNode } from "@forkshop/engine"

type SidebarOnlyFrame = IframeRouteNode & { kind: "sidebar-only-frame" }

export const sidebarOnlyFrameNodeType: NodeType<SidebarOnlyFrame> = {
  ...iframeRouteNodeType,
  id: "sidebar-only-frame",
  match: (node): node is SidebarOnlyFrame => node.kind === "sidebar-only-frame",
  // agentMatch inherited — route attribution still works
  render: ({ node, onBodyHeightChange }) => (
    <div style={{ width: 520, overflow: "hidden" }}>
      <div style={{ marginLeft: -(1440 - 520) }}>
        {iframeRouteNodeType.render({ node, onBodyHeightChange })}
      </div>
    </div>
  ),
}
```

Surrounding prose explains the pattern: spread the built-in's fields, override only what you're changing (here `id`, `match`, `render`), inherit `agentMatch` so live-AI integration keeps working. Mention that this is the right path for "I need iframe-route's behavior with one tweak" — rather than going back to `inline-react` + hand-rolled iframe.

## Migration

None. `IframeRouteNode` shape is unchanged. Existing scaffolded Boards (`sitemap-board.tsx`, any custom Board using `iframe-route`) get the cap-callback fix and scroll-lock automatically when the new engine version ships. Consumers don't update any Node configs.

The user-side CLAUDE.md template change ships in the next setup-skill release; existing installs keep their current CLAUDE.md until re-scaffolded. Optional `forkshop update` command (separate concern) could refresh it.

## Out of scope

These came up in scoping; deferred to other specs or YAGNI:

- **Position model unification.** Gallery row/column defaults, `node.x` / `node.y` semantics, persisted-position drift in DesignSystemView. Its own spec (next).
- **Canvas zoom containment.** Portal-rendered tooltips, `--canvas-zoom` on `:root` vs portal context provider. Its own spec.
- **Type exports** (`ForkshopCanvasHandle`, `Transform`, `WheelInput`). Pure DX paper cuts; ship alongside any patch release.
- **`LazyIframe` as a public React component.** Decided no — internal only. If a future consumer hits a case neither `iframe-route` nor a custom NodeType can handle, revisit.
- **Search-param support on `IframeRouteNode`** (e.g. three iframes at the same route with different `?country=` values). Today consumers concat the query string into `routePath`; that works. Cleaner field deferred until recurring demand.
- **`desktopWidth` as a Node field.** Currently hardcoded to 1440 in `iframe-route`'s render. Useful for non-1440 reference designs; deferred until a real install needs it.
- **`maxHeight` as an explicit field.** `node.height` already serves this; explicit field deferred unless `node.height`'s implicit meaning becomes a confusion source.

## Success criteria

- Board-building feedback's TL;DR #1 ("cap the body-height callback") closes.
- Board-building feedback's #14 ("lockScroll for capped frames") closes.
- Board-building feedback's #10, #11, #13 (doc gaps) close.
- Dashboard-board.tsx pattern (three frames at the same route with different query strings + a sidebar-only clip) is rebuildable using standard `iframe-route` Nodes for the three frames (query string concatenated into `routePath`) and one small custom NodeType for the sidebar-only clip, instead of reimplementing iframe lifecycle inside `inline-react`. Demonstrated by the doc 3.3 example.
- No new fields on `IframeRouteNode`. No new public exports from `@forkshop/engine`.
- Existing installs work unchanged after engine bump.
