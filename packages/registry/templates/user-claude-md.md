# Forkshop

Forkshop is a Figma-style canvas + sidebar tool installed into your Next.js + Tailwind project. It always shows the real thing — your actual components and pages rendered in live iframes. Edit in place. Drag to arrange. Set up by Claude Code to match your project.

Everything in `app/forkshop/` is yours to customize. This file documents how the pieces connect.

---

## Adding a new board

**The default shape of a Forkshop board is a canvas — not a flat page layout.**

When you (or your Claude) want a new section in the Forkshop sidebar with its own content area, the board file should:

1. Wrap content in `<ForkshopCanvas>` so users get pan + zoom + viewport controls automatically.
2. Place each interactive item in a `<CanvasNode id="...">` so users can drag to rearrange and positions persist.
3. Persist positions via `/api/forkshop/positions` — give each `CanvasNode` a stable `id` (e.g. `"product:hero"`, `"section:colors"`) and the kit hooks already shipped will handle save/restore.

### When to deviate (rare)

Flat HTML layouts are appropriate ONLY for genuinely non-spatial content:

- A tabular settings page where rows have no spatial relationship
- A documentation-style reading page
- A single-form input

For ANY board that displays multiple visual items (cards, previews, diagrams, pipelines, lists with images), use canvas primitives. **If you're tempted to write `<div className="grid">`, stop and use `<ForkshopCanvas>` + `<CanvasNode>` instead.**

### Sketch

```tsx
"use client"
import { ForkshopCanvas } from "@/components/forkshop/canvas/forkshop-canvas"
import { CanvasNode } from "@/components/forkshop/canvas/canvas-node"

export default function MyCustomBoard() {
  // Position state — load initial values from /api/forkshop/positions
  // (the same endpoint the page-tree and design-system kits use); call
  // onPositionChange to persist drag moves. See page-tree.tsx for a
  // complete reference of the controlled-position wiring.
  return (
    <ForkshopCanvas fitMode="both">
      <CanvasNode id="item-1" layoutX={0} layoutY={0} width={400} height={300} {...positionProps}>
        <MyCard />
      </CanvasNode>
      <CanvasNode id="item-2" layoutX={420} layoutY={0} width={400} height={300} {...positionProps}>
        <MyOtherCard />
      </CanvasNode>
    </ForkshopCanvas>
  )
}
```

For the full controlled-position pattern (override + onPositionChange + snap targets), copy the wiring from the `PageTree` kit's source — it's the cleanest reference for rolling a custom board.

### Wiring a new board

After writing the board file, register it in three places:

- `app/forkshop/<board-name>-board.tsx` — the board itself (the file above)
- `app/forkshop/forkshop.config.tsx` — add your board to the sidebar nav
- `app/forkshop/page.tsx` — route to it from the canvas selection switch

---

## Mental model

### Selection state

One piece of state drives everything:

```ts
type ForkshopSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "page"; path: string }
  | { kind: "block"; slug: string }
```

The sidebar rows map directly to selection values. The canvas renders exactly what the selection says. There's no hidden state — if you want to change what the canvas shows, change the selection.

`useForkshopCanvas` owns the selection and passes it down. The sidebar calls `setSelection(next)`. Canvas boards read `selection` and render accordingly.

### Primitives vs kits

**Primitives** are the low-level building blocks — canvas, sidebar, draggable node, iframe hooks, responsive frame view. They live in `@forkshop/registry` and are generic: they don't know about your project's routes or design tokens.

**Kits** are configurable boards built from primitives. Each kit is a full canvas view (a React component) that you wire to your project's data. Three kits ship out of the box: `DesignSystemBoard`, `IframeGallery`, and `PageTree`.

Rule of thumb: if you're assembling a new view from scratch, reach for primitives. If you're mounting one of the three standard boards with your data, use the kit.

### How canvas and sidebar collaborate

The sidebar is a controlled component — it receives `selection` and `onSelect`. The canvas receives the same `selection` and renders the matching board. Your `page.tsx` (or `forkshop-tool.tsx`) is the single owner of `selection` state. The boards themselves don't hold selection state.

---

## File layout

After init, your Forkshop installation lives here:

```
app/forkshop/
  page.tsx                    Server entry. Builds route list, title overrides,
                              and token registry; renders ForkshopTool.
  forkshop.config.ts             Wiring: tailwindConfig path, primitives, blocks, pages.
  design-system-board.tsx     Mounts <DesignSystemBoard> from @forkshop/registry.
  components-board.tsx        Mounts <IframeGallery> for your block/component library.
  pages-board.tsx             Mounts <PageTree> for the site sitemap.

app/api/forkshop/
  edit/route.ts               Re-exports the edit handler from @forkshop/registry.
  positions/route.ts          Re-exports the positions handler from @forkshop/registry.
  agent-activity/
    route.ts                  Re-exports the activity POST handler (no-op until wired).
    stream/route.ts           Re-exports the SSE stream handler (no-op until wired).
```

The API routes are thin re-exports — the logic lives in `@forkshop/registry`. You shouldn't need to edit them unless you're customizing edit behavior.

---

## How to add a new kit

Kit-worthy criteria: at least two production projects would use the same board shape with different data. A kit is justified when the layout math, node wiring, and iframe hooks would be identical across projects — only the data feed differs.

**Do add a kit if:** you're building a navigation matrix, a flow-graph board, or any other multi-node view that other Forkshop users would want.

**Don't add a kit if:** you can write the board in ~30 lines using `<ForkshopCanvas>`, `<CanvasNode>`, and `<LazyIframe>`. Just write it in `app/forkshop/` as a local board component.

To use an existing kit:

```tsx
import { DesignSystemBoard } from "@/components/forkshop/kits/design-system-board"

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

### Kit icon + title defaults

Every kit ships with a  and  static property so you get sensible zero-config sidebar wiring:

```tsx
import { DesignSystemBoard } from "@/components/forkshop/kits/design-system-board"
import { IframeGallery } from "@/components/forkshop/kits/iframe-gallery"
import { PageTree } from "@/components/forkshop/kits/page-tree"

// In your ForkshopSidebar sections array:
sections={[
  { id: "design-system", title: DesignSystemBoard.defaultTitle, icon: DesignSystemBoard.icon },
  { id: "components",   title: IframeGallery.defaultTitle,    icon: IframeGallery.icon },
  { id: "pages",        title: PageTree.defaultTitle,         icon: PageTree.icon },
]}
```

Override either prop freely —  is just a string and  is a Lucide icon component.

### forkshopIcons catalog

 is a preselected set of Lucide icons for Forkshop's known concepts. Use it instead of importing from  directly to keep the visual identity consistent:

```tsx
import { ForkshopIcon } from "@/components/forkshop/icon"
import { forkshopIcons } from "@/lib/forkshop/icons"

// Render an icon:
<ForkshopIcon icon={forkshopIcons.designSystem} className="size-4" />

// Pass to a sidebar section directly:
{ id: "navigation", title: "Navigation", icon: forkshopIcons.navigation }
```

Available keys: , , , , , , , , , , , , , , , , .

---

## How to add a new node type

A node is a `<CanvasNode>` with custom children. The node handles drag, label, and outline; you control what renders inside.

```tsx
import { CanvasNode } from "@/components/forkshop/canvas/canvas-node"

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

Node positions are persisted to `layouts/system.json` via POST to `/api/forkshop/positions`. Assign stable `id` values (e.g. `"section:colors"`, `"page:/about"`) so positions survive page reloads and HMR.

For iframe-based nodes, combine with `useIframePreview` to lazy-load and auto-size:

```tsx
import { LazyIframe } from "@/components/forkshop/canvas/lazy-iframe"
import { useIframePreview } from "@/lib/forkshop/hooks/use-iframe-preview"

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

Save triggers a POST to `/api/forkshop/edit`:

```ts
POST /api/forkshop/edit
{ pagePath: string, originalText: string, newText: string }
```

The handler does a uniqueness check (rejects if `originalText` appears more than once in the file) then writes the change to `page.tsx`. Next.js HMR picks it up immediately.

The hook that wires this into iframes is `useIframeEditWiring`. It injects `PREVIEW_EDIT_CSS` into the iframe document for outline styles, and keeps `--canvas-zoom` on `documentElement` in sync so outlines stay at a constant on-screen thickness regardless of canvas zoom.

### Spacing picker

Click any spacing overlay (padding/margin ring) → a picker appears. Choosing a new value POSTs to `/api/forkshop/edit` with the className replacement as `originalText`/`newText`. Powered by `useIframeSpacingWiring` + `SpacingPicker`.

### Open in editor (Locator.js)

Option-click any element inside an iframe → Locator.js fires `/__nextjs_launch-editor` with the source file and line number. This opens the file in VS Code or Cursor.

Locator injects source-location attributes at build time (`data-source-file`, `data-source-line`). It's initialized by `<LocatorInit />` which you mount once in your layout. Works in dev mode only.

---

## The three kits

### DesignSystemBoard

```tsx
import { DesignSystemBoard, type DesignSystemBoardProps } from "@/components/forkshop/kits/design-system-board"
```

Renders the full design-system canvas: color graph (raw tokens → semantic aliases as edges), primitive component frames (buttons, badges, inputs), and a typography showcase. Accepts `tailwindConfig` + `tokenRegistry` (built with `buildTokenRegistry`).

Use this for your **Design** board.

### IframeGallery

```tsx
import { IframeGallery, type IframeGalleryProps, type IframeGalleryEntry } from "@/components/forkshop/kits/iframe-gallery"
```

Stacks or grids a list of iframe entries on the canvas. Each entry has a `slug`, `url`, `label`, and optional `width`. Handles lazy loading, auto-height sizing, click-to-select, and double-click-to-isolate.

Use this for your **Blocks** or **Components** board.

### PageTree

```tsx
import { PageTree, type PageTreeProps, type PageTreeEntry } from "@/components/forkshop/kits/page-tree"
```

Renders your site sitemap as a tree of iframe tiles. Each entry is a route. Handles layout, click-to-select, and drill-in to 3-viewport isolation.

Use this for your **Pages** board.

---

## How positions are persisted

Any `<CanvasNode>` with an `id` participates in drag-position persistence automatically. Positions are stored in-memory and synced to `layouts/system.json` via POST to `/api/forkshop/positions` on every drag commit.

If you want to set initial positions for new nodes, add entries to `layouts/system.json` keyed by the node id:

```json
{
  "my-node:unique-id": { "x": 100, "y": 200 }
}
```

---

## Live AI awareness

When Claude Code edits a file in this project, Forkshop visually shows where:

- **Sidebar leaf pulse** — the entry that maps to the edited file pulses (block, primitive, or page).
- **Frame glow** — when the affected entry is the currently-selected node, its `CanvasNode` glows with an indigo ring and shows a `Claude · <filename>` chip.
- **Iframe outline** — inside any page iframe that composes the edited block, the block instance gets an outlined glow.
- **Text pulse** — the specific text Claude changed (via `Edit`/`MultiEdit`) flashes inside the iframe.

The loop is `.claude/hooks/post-tool-use.sh` → POST `/api/forkshop/agent-activity` → in-memory state → SSE → React provider → visual decorations. All wiring is dev-only — production builds return 403 from the API routes and the client provider never opens its EventSource.

### Configuring file mapping

The provider needs to know which on-disk file maps to which sidebar entry. Edit `forkshop.config.ts` and add `sourcePath` (project-relative) to each primitive and block:

```ts
primitives: [
  { id: "button", name: "Button", sourcePath: "components/ui/button.tsx", render: () => <Button /> },
],
blocks: [
  { slug: "hero", name: "Hero", iframeSrc: "/", sourcePath: "components/marketing/hero.tsx" },
],
```

The mount page derives a `FileMap` from these entries and hands it to `AgentActivityProvider`. Pages are filesystem-routed — no `sourcePath` needed for them. Files without a configured mapping fall back to a "site-wide" indicator in the sidebar header.

### Consumer hooks

- `useAgentActivePages()` — pages currently being edited.
- `useAgentActiveBlocks()` — blocks currently being edited (includes blocks identified by `<ComponentName>` mentions in page edits).
- `useAgentActivePrimitives()` — primitives currently being edited.
- `usePageActiveFallback(path)` — true when a page edit can't be attributed to a specific block (drives the soft all-blocks pulse).
- `useSiteWideActivity()` — `{ active, recentBasename }` for unmapped file edits.
- `useAgentSubstringsForPage(path)` / `useAgentSubstringsForBlock(slug)` — substring lists scoped to a single page or block, for targeted text-pulse decoration.
- `useAllAgentSubstrings()` — array of `{ oldString?, newString? }` records, one per active edit. The iframe relay broadcasts the list unfiltered; each iframe walks its own DOM to decide whether to flash. Used by `AgentIframeRelay`.
- `useAgentSeenPagePaths()` — sticky set of every page path the agent has touched this session (used by the sidebar to extend its tree; see below).

### Silent synthetic routes

When the agent edits a page file whose route isn't in the sidebar's `routes` prop, the sidebar adds that path to the tree **silently** — no badge, no pill, no visual distinction from configured routes. The new row is clickable like any other.

These synthetic entries come from `useAgentSeenPagePaths()`, which the sidebar unions with the declared `routes` to produce its rendered tree. The set is sticky for the React-component lifetime and clears on browser reload.

If you're looking at the sidebar and see a leaf you didn't put in your `routes` prop, that's not a bug — it's a recently-edited page Forkshop is surfacing for convenience. Add it to `routes` (or stop editing it) if you want the sidebar to be fully declarative.

### Production behavior

`/api/forkshop/agent-activity` (POST) and `/stream` (GET) both return 403 when `NODE_ENV === "production"`. The `AgentActivityProvider`'s `EventSource` never opens in production. The `.claude/hooks/post-tool-use.sh` script's `curl --max-time 1` fails silently if no dev server is running. None of this code path is reachable from a production deploy.

---

## Update this file when you customize Forkshop

Every time you:
- Add a new board or selection kind
- Change what a kit receives as props
- Add a new API route or extend an existing one
- Change the file layout

...update this CLAUDE.md to reflect it. Future Claude Code sessions in `app/forkshop/` load this file and will work from stale information if it drifts.
