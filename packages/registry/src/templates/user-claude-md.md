# Fogma

Fogma is a Figma-style canvas + sidebar tool installed into your Next.js + Tailwind project. It always shows the real thing — your actual components and pages rendered in live iframes. Edit in place. Drag to arrange. Set up by Claude Code to match your project.

Everything in `app/fogma/` is yours to customize. This file documents how the pieces connect.

---

## Mental model

### Selection state

One piece of state drives everything:

```ts
type FogmaSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "page"; path: string }
  | { kind: "block"; slug: string }
```

The sidebar rows map directly to selection values. The canvas renders exactly what the selection says. There's no hidden state — if you want to change what the canvas shows, change the selection.

`useFogmaCanvas` owns the selection and passes it down. The sidebar calls `setSelection(next)`. Canvas boards read `selection` and render accordingly.

### Primitives vs kits

**Primitives** are the low-level building blocks — canvas, sidebar, draggable node, iframe hooks, responsive frame view. They live in `@fogma/registry` and are generic: they don't know about your project's routes or design tokens.

**Kits** are configurable boards built from primitives. Each kit is a full canvas view (a React component) that you wire to your project's data. Three kits ship out of the box: `DesignSystemBoard`, `IframeGallery`, and `PageTree`.

Rule of thumb: if you're assembling a new view from scratch, reach for primitives. If you're mounting one of the three standard boards with your data, use the kit.

### How canvas and sidebar collaborate

The sidebar is a controlled component — it receives `selection` and `onSelect`. The canvas receives the same `selection` and renders the matching board. Your `page.tsx` (or `fogma-tool.tsx`) is the single owner of `selection` state. The boards themselves don't hold selection state.

---

## File layout

After init, your Fogma installation lives here:

```
app/fogma/
  page.tsx                    Server entry. Builds route list, title overrides,
                              and token registry; renders FogmaTool.
  fogma.config.ts             Wiring: tailwindConfig path, primitives, blocks, pages.
  design-system-board.tsx     Mounts <DesignSystemBoard> from @fogma/registry.
  components-board.tsx        Mounts <IframeGallery> for your block/component library.
  pages-board.tsx             Mounts <PageTree> for the site sitemap.

app/api/fogma/
  edit/route.ts               Re-exports the edit handler from @fogma/registry.
  positions/route.ts          Re-exports the positions handler from @fogma/registry.
  agent-activity/
    route.ts                  Re-exports the activity POST handler (no-op until wired).
    stream/route.ts           Re-exports the SSE stream handler (no-op until wired).
```

The API routes are thin re-exports — the logic lives in `@fogma/registry`. You shouldn't need to edit them unless you're customizing edit behavior.

---

## How to add a new kit

Kit-worthy criteria: at least two production projects would use the same board shape with different data. A kit is justified when the layout math, node wiring, and iframe hooks would be identical across projects — only the data feed differs.

**Do add a kit if:** you're building a navigation matrix, a flow-graph board, or any other multi-node view that other Fogma users would want.

**Don't add a kit if:** you can write the board in ~30 lines using `<FogmaCanvas>`, `<CanvasNode>`, and `<LazyIframe>`. Just write it in `app/fogma/` as a local board component.

To use an existing kit:

```tsx
import { DesignSystemBoard } from "@fogma/registry"

export function MyDesignBoard({ tailwindConfig, tokenRegistry }) {
  return (
    <DesignSystemBoard
      tailwindConfig={tailwindConfig}
      tokenRegistry={tokenRegistry}
    />
  )
}
```

Each kit accepts typed props — see the `*Props` types exported alongside each kit.

---

## How to add a new node type

A node is a `<CanvasNode>` with custom children. The node handles drag, label, and outline; you control what renders inside.

```tsx
import { CanvasNode } from "@fogma/registry"

// Inside your board component:
<CanvasNode
  id="my-node:unique-id"
  x={position.x}
  y={position.y}
  width={400}
  height={300}
  label="My Custom Node"
  onPositionChange={(id, x, y) => savePosition(id, x, y)}
>
  {/* your content here — iframe, rendered component, chart, etc. */}
</CanvasNode>
```

Node positions are persisted to `layouts/system.json` via POST to `/api/fogma/positions`. Assign stable `id` values (e.g. `"section:colors"`, `"page:/about"`) so positions survive page reloads and HMR.

For iframe-based nodes, combine with `useIframePreview` to lazy-load and auto-size:

```tsx
import { LazyIframe, useIframePreview } from "@fogma/registry"

function MyIframeNode({ url, width }) {
  const { iframeRef, height, loaded } = useIframePreview({ url, width })
  return (
    <CanvasNode id={`page:${url}`} x={x} y={y} width={width} height={height}>
      <LazyIframe ref={iframeRef} src={url} width={width} height={height} />
    </CanvasNode>
  )
}
```

---

## How edit, spacing, and open-in-editor work

### Inline text editing

Edit mode is always on in page isolation views. Hover any text element — it gets a blue outline. Click → `contenteditable`.

Save triggers a POST to `/api/fogma/edit`:

```ts
POST /api/fogma/edit
{ pagePath: string, originalText: string, newText: string }
```

The handler does a uniqueness check (rejects if `originalText` appears more than once in the file) then writes the change to `page.tsx`. Next.js HMR picks it up immediately.

The hook that wires this into iframes is `useIframeEditWiring`. It injects `PREVIEW_EDIT_CSS` into the iframe document for outline styles, and keeps `--canvas-zoom` on `documentElement` in sync so outlines stay at a constant on-screen thickness regardless of canvas zoom.

### Spacing picker

Click any spacing overlay (padding/margin ring) → a picker appears. Choosing a new value POSTs to `/api/fogma/edit` with the className replacement as `originalText`/`newText`. Powered by `useIframeSpacingWiring` + `SpacingPicker`.

### Open in editor (Locator.js)

Option-click any element inside an iframe → Locator.js fires `/__nextjs_launch-editor` with the source file and line number. This opens the file in VS Code or Cursor.

Locator injects source-location attributes at build time (`data-source-file`, `data-source-line`). It's initialized by `<LocatorInit />` which you mount once in your layout. Works in dev mode only.

---

## The three kits

### DesignSystemBoard

```tsx
import { DesignSystemBoard, type DesignSystemBoardProps } from "@fogma/registry"
```

Renders the full design-system canvas: color graph (raw tokens → semantic aliases as edges), primitive component frames (buttons, badges, inputs), and a typography showcase. Accepts `tailwindConfig` + `tokenRegistry` (built with `buildTokenRegistry`).

Use this for your **Design** board.

### IframeGallery

```tsx
import { IframeGallery, type IframeGalleryProps, type IframeGalleryEntry } from "@fogma/registry"
```

Stacks or grids a list of iframe entries on the canvas. Each entry has a `slug`, `url`, `label`, and optional `width`. Handles lazy loading, auto-height sizing, click-to-select, and double-click-to-isolate.

Use this for your **Blocks** or **Components** board.

### PageTree

```tsx
import { PageTree, type PageTreeProps, type PageTreeEntry } from "@fogma/registry"
```

Renders your site sitemap as a tree of iframe tiles. Each entry is a route. Handles layout, click-to-select, and drill-in to 3-viewport isolation.

Use this for your **Pages** board.

---

## How positions are persisted

Any `<CanvasNode>` with an `id` participates in drag-position persistence automatically. Positions are stored in-memory and synced to `layouts/system.json` via POST to `/api/fogma/positions` on every drag commit.

If you want to set initial positions for new nodes, add entries to `layouts/system.json` keyed by the node id:

```json
{
  "my-node:unique-id": { "x": 100, "y": 200 }
}
```

---

## Live AI awareness

> Currently a no-op. The plumbing is wired but the SSE endpoint is not yet active.

`<AgentActivityProvider>` wraps your Fogma installation and consumes activity events from `/api/fogma/agent-activity/stream`. When the live AI awareness spec is wired up, this will show real-time indicators in the sidebar as Claude Code touches files in your project.

What it will do when active:
- Pulsing dot in the sidebar next to the row matching the file being edited
- Purple ring on the canvas node matching the touched page or block
- In-iframe outline pulse on the specific element being changed
- Top-center chip: "Claude editing `<filename>`"

The `AgentActivityProvider` is already mounted. The `fileToSelection` utility (from `@fogma/registry`) maps file paths to sidebar entries. No changes needed on your end — wiring it up is a separate spec.

---

## Update this file when you customize Fogma

Every time you:
- Add a new board or selection kind
- Change what a kit receives as props
- Add a new API route or extend an existing one
- Change the file layout

...update this CLAUDE.md to reflect it. Future Claude Code sessions in `app/fogma/` load this file and will work from stale information if it drifts.
