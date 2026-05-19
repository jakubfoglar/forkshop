# Forkshop engine — feedback from a board-building session

> Captured verbatim from a separate Claude session that wired two custom boards
> (Dashboard + Charts) inside `ravineo-frontend`. Engine version
> `@forkshop/engine` 0.2.0. Source: `app/forkshop/engine-feedback.md` in that
> project. See polish-backlog for the curated 1.x items derived from this.

---

Collected while wiring up two custom boards: a "Dashboard" board (three iframe-route frames pointing at the same Next.js dashboard page with different query strings + a sidebar-only clip), and a "Charts" board (three real visx chart components fed with mock data, rendered as `inline-react` nodes).

Engine version: `@forkshop/engine` shipped with `forkshop.json` `engineVersion: 0.2.0`.

---

## Bugs / surprising behavior

### 1. `iframe-route` cell does not respect `node.height` cap

`iframeRouteNodeType` renders `LazyIframe` with `heightMode: "cap"` and `height: node.height`. The iframe wrapper visually clips at `node.height` (good), but `onBodyHeightSync` is called with the **uncapped** `measured body height`, which propagates to Gallery's `measuredHeights` → cell height grows past the cap.

Net effect: the iframe is correctly clipped at e.g. 2500px, but the Gallery cell takes ~5000px of canvas space (mostly empty). Frames pile up on top of each other after a page auto-loads more rows. This was the single biggest source of friction in the session.

Fix shape ideas (any of these would have unblocked us):
- Cap the value passed to `onBodyHeightSync` to `Math.min(measured, node.height)` when `heightMode === "cap"`.
- Add a `maxHeight?: number` field to `IframeRouteNode` that bounds both the iframe wrapper *and* the body-height callback.
- Expose `heightMode` on the node type so consumers can pick `"auto" | "cap" | "fixed"` without writing a custom NodeType.

We worked around it by dropping `iframe-route` entirely and using `inline-react` + a plain iframe — which lost live-edit overlay, agent-read indicator, and wheel forwarding. Re-implementing those by hand (see point 5 below) was the bulk of the iframe wiring.

### 2. Gallery grid defaults `entry.row` and `entry.column` to `0`

When entries don't set `row`/`column`, all cells stack at `(0, 0)` and visually overlap. Took a wasted iteration to discover this — the natural reading of "grid layout" suggests auto-flow.

Suggestions:
- Auto-assign a sequential `column` (or `row`) when the field is undefined, OR
- Dev-only console warning when multiple entries resolve to the same `(row, column)` cell.

### 3. Portal-rendered tooltips escape the canvas zoom

visx (and presumably Radix Popover / Tooltip) use `createPortal(..., document.body)`. The canvas applies `transform: scale(zoom)` on a stage div inside the container; portaled descendants render at 100% regardless of zoom. Result: tooltips look comically large when canvas is zoomed out.

We worked around it with a `MutationObserver` on `document.body` watching for `.visx-tooltip` insertions/`style` mutations and applying `style.scale = String(zoom)` + `transform-origin: 0 0`. Uses CSS `scale` (not `transform: scale`) so visx's `translate` stays intact.

Engine-level fixes worth considering:
- A `ForkshopPortal` context: descendants of `ForkshopCanvas` portal into the stage element by default, not body. Most popover libraries respect a portalContainer ref / context.
- Or: an opt-in "scale all `body > [data-forkshop-portal]` descendants by `--canvas-zoom`" mechanism applied automatically.
- Or at minimum: a global CSS variable `--canvas-zoom` exposed on `:root` so portaled DOM can read it via inheritance and the engine ships a utility CSS class consumers can add to portal targets.

### 4. Iframe in `inline-react` node loses canvas wheel/pinch forwarding

When you render a plain iframe inside an `inline-react` node (because of point 1), `cmd+scroll` / two-finger pinch over the iframe doesn't zoom the canvas — wheel events are consumed by the iframe doc and never reach the canvas.

We had to manually attach a `wheel` listener on the iframe's `contentDocument` in `onLoad` and call `canvasRef.current?.applyWheelInput({...})`. The engine's own `iframeRouteNodeType` does the same thing internally via `useForkshopCanvas` + `applyWheelInput`.

This logic should be reusable. See point 5.

---

## Missing exports / shape of the public API

### 5. No exported `LazyIframe` / iframe primitive

Every consumer building a custom iframe-backed node has to reimplement:
- `IntersectionObserver` lazy-load
- Inject `nextjs-portal` / `min-h-screen` neutralization CSS
- Wheel forwarding to canvas
- Body-height sync via `ResizeObserver`
- `scrolling="no"` + `overflow: hidden` wrapper
- (Optional) `AgentReadIndicator` + `IframeEditOverlay`

We rewrote ~80% of `LazyIframe` in our board. Exposing it (with a `heightMode` and a `maxHeight` prop) would let custom boards build "iframe at a route with my own framing" in <10 lines.

### 6. No exported `useForkshopCanvas` hook

`useForkshopCanvas` is referenced in the engine's own node types and gives you `applyWheelInput`, `transformRef`. It's not exported. Consumers who want to wire interactions with the canvas from inside a custom NodeType or a leaf component have to thread the ref manually through props.

### 7. `ForkshopCanvasHandle`, `Transform`, `WheelInput` types aren't exported

Visible in the `.d.ts` but missing from the `export { ... }` block. To type a `useRef<ForkshopCanvasHandle>(null)`, we had to redeclare them structurally:

```ts
type Transform = { zoom: number; panX: number; panY: number }
type WheelInput = { deltaX: number; deltaY: number; pinch: boolean; screenX: number; screenY: number }
type CanvasHandle = {
  fitToView: () => void
  resetZoom: () => void
  animateToBox: (x: number, y: number, w: number, h: number) => void
  getTransform: () => Transform
  setTransform: (t: Transform) => void
  applyWheelInput: (w: WheelInput) => void
}
```

Small change, big DX win.

### 8. `inline-react` agent activity is keyed by `filePath`, not `routePath`

Our custom iframes wrap real Next.js routes (e.g., the dashboard at `/dashboard/[dashboardId]`). When the agent edits `app/dashboard/[dashboardId]/page.tsx`, the sidebar lights up the agent indicator only for `iframe-route` nodes (via `useAgentActivePages`).

An `inline-react` node can declare `filePath: "app/dashboard/[dashboardId]/page.tsx"` and the primitive-level pulse works, but the *page*-level pulse (`useAgentActivePages`) doesn't fire because the engine only attributes activity for `iframe-route` kinds.

Wish: let `inline-react` declare `routePath`/`pagesForAgent` so custom iframe wrappers can still light up the right sidebar entries.

---

## Documentation gaps

### 9. CLAUDE.md template doesn't surface `GalleryEntry.row` / `.column`

The "Adding a new Board" example only sets `path` and `node`. With `layout="grid"`, row/column are necessary for non-overlapping placement. A one-line note ("for grid layout, set `column: idx` to lay entries out left-to-right; `row` stacks vertically") would have saved an iteration. (See bug #2.)

### 10. The `heightMode: "cap"` semantics aren't documented

The CLAUDE.md describes how iframe-route works at a high level but doesn't describe the cap behavior (or its surprising interaction with Gallery cell sizing — bug #1). A short "Frame heights" subsection would help.

### 11. No example of writing a custom NodeType that *wraps* a built-in one

The "Adding a custom NodeType" section shows a Storybook example built from scratch. What we actually wanted was "make an iframe-route variant that caps the reported body height" — a thin wrapper around the existing NodeType. Adding such an example would also document the right primitive for case #1 if you don't want to add a `maxHeight` to the node type itself.

---

## Smaller nits

### 12. `--canvas-zoom` is inline-style on the stage, not on `:root` or the container

Means anything portaled out of the stage can't read it via CSS inheritance. We had to subscribe via `onTransformChange` and apply imperatively.

### 13. `IframeRouteNode.routePath` vs CLAUDE.md template's `path`

The template in CLAUDE.md shows `path: "/docs/getting-started"` but the engine type is `routePath`. We followed the template first, hit a type error, fixed it. Either rename one or update the template.

### 14. `LazyIframe`'s injected style strips `min-h-screen` but not `body { overflow }`

If the embedded page has body overflow scrolling, the iframe doc can still scroll on wheel (separate from the iframe element's scrollbar). We had to inject our own `html, body { overflow: hidden !important }` to truly lock scroll inside a capped frame. Optional opt-in (a `lockScroll` prop on the iframe primitive) would be nice.

---

## Things that worked well

Not all friction — listing the wins so they don't get accidentally regressed:

- `forkshopIcons` named export + nice ones for common Forkshop concepts (`flows`, `pages`, `components`). Made naming the new section trivial.
- `useForkshopPositions` works out of the box for persisting drag positions.
- Sidebar `entryKind: "page" | "primitive" | "block"` covers most cases. We added a section without children — no friction.
- `BUILTIN_NODE_TYPES` re-export from the canvas. Easy to extend.
- Hot-reload of board files via Next dev: dropping in a new board file + wiring it in `page.tsx` and the sidebar updates instantly. The mental model of "Board = a file with a default export" is excellent.
- The agent-activity hooks (`useAgentActivePages`, `useAgentReadingByFile`) for `iframe-route` worked perfectly — when we edited the dashboard page source, the Sitemap row pulsed correctly.

---

## TL;DR — top 3 if budget is tight

1. **Cap the body-height callback for `iframe-route` when `heightMode === "cap"`** (bug #1). Would let our entire Dashboard board be 3 lines of `iframe-route` instead of a reimplemented inline-react iframe.
2. **Make Gallery grid auto-assign `column`** when entries don't specify (bug #2). One-line fix, large DX impact.
3. **Export `LazyIframe`** (or an equivalent `<IframeFrame>` primitive) **with `maxHeight` + `lockScroll` props** (missing exports #5, plus issues #4 and #14). Unblocks every custom iframe-shaped board without consumers reimplementing wheel/scroll/measurement plumbing.
