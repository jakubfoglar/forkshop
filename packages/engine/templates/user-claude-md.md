# Forkshop

Forkshop is a Figma-style canvas + sidebar tool installed into your Next.js + Tailwind project. It shows the real thing — your actual components and pages rendered in live iframes. Edit in place. Drag to arrange.

This file is auto-loaded by Claude Code when working in `{{srcPrefix}}app/forkshop/`. Everything in that directory is yours to customize.

---

## Mental model

Five concepts compose the whole system.

### Node

A **Node** is a positioned instance on the canvas. It has `(x, y)`, a `kind` discriminator, and content. The `kind` selects rendering shape:

- `inline-react` — a small React render (button, color swatch, typography sample)
- `iframe-route` — a full Next.js page inside an iframe
- `iframe-component` — a component-preview iframe

```ts
import type { AnyNode, InlineReactNode, IframeRouteNode, IframeComponentNode } from "@forkshop/engine"

const buttonNode: InlineReactNode = {
  id: "primitive:button",
  kind: "inline-react",
  x: 0, y: 0, width: 0, height: 0,
  render: () => <Button>Label</Button>,
}

const aboutNode: IframeRouteNode = {
  id: "page:/about",
  kind: "iframe-route",
  x: 0, y: 0, width: 1200, height: 800,
  path: "/about",
  sourceFile: "app/about/page.tsx",
}
```

### NodeType

A **NodeType** is a plugin that defines a *kind* of Node: how it matches, renders, and ties into agent-activity. Three built-in NodeTypes ship at 1.0 (`inlineReactNodeType`, `iframeRouteNodeType`, `iframeComponentNodeType`). Users can add custom ones in `{{srcPrefix}}app/forkshop/node-types/`.

```ts
import type { NodeType, AnyNode, RenderProps, AgentActivitySnapshot, AgentMatchResult } from "@forkshop/engine"

interface NodeType<T extends AnyNode> {
  id: string
  match: (node: AnyNode) => node is T
  render: (props: RenderProps<T>) => ReactNode
  agentMatch?: (node: T, activity: AgentActivitySnapshot) => AgentMatchResult
}
```

### Layout

A **Layout** is an engine-shipped React component that arranges multiple Nodes on a Board. Four Layouts ship at 1.0: `Gallery`, `Tree`, `DesignSystemView`, `ResponsiveFrameView`. Layouts are rare to add — that's an engine contribution (see below).

```tsx
import { Gallery, type GalleryProps, type GalleryEntry } from "@forkshop/engine"

// Gallery arranges entries in a stack or grid:
<Gallery
  entries={entries}
  layout="stack"
  nodePositions={nodePositions}
  onPositionChange={handlePositionChange}
/>
```

### Board

A **Board** is a configured tab in the sidebar: one Layout + its data + a sidebar entry. Adding a new section to Forkshop means adding a Board. Boards live in `{{srcPrefix}}app/forkshop/` as React components.

```tsx
"use client"
import { ForkshopCanvas, Gallery, type GalleryEntry } from "@forkshop/engine"

export function ComponentsBoard({ entries, nodePositions, onPositionChange }) {
  return (
    <ForkshopCanvas fitMode="both">
      <Gallery
        entries={entries}
        layout="grid"
        nodePositions={nodePositions}
        onPositionChange={onPositionChange}
      />
    </ForkshopCanvas>
  )
}
```

### Kit

A **Kit** is a project-type starter pack. It ships a kit config file, a scaffolded `forkshop.config.tsx`, and a scaffolded `page.tsx` — wired to that project type's data. Kits are the rarest extension point (deferred to spec #4; not yet built).

```ts
// Kit installs via: forkshop add <kit-name>
// Kit is a bundle that scaffolds:
//   {{srcPrefix}}app/forkshop/forkshop.config.tsx
//   {{srcPrefix}}app/forkshop/page.tsx
//   {{srcPrefix}}app/forkshop/<board-name>-board.tsx
```

---

## File layout

After `forkshop init`, your installation lives at:

```
{{srcPrefix}}app/forkshop/
  page.tsx                    Server entry. Builds route list, token registry;
                              renders ForkshopSidebar + canvas.
  forkshop.config.tsx         Wiring: sidebar sections, node entries.
  components-board.tsx        Mounts Gallery for your component library.
  pages-board.tsx             Mounts Tree for the site sitemap.
  design-system-board.tsx     Mounts DesignSystemView for tokens + primitives.
  node-types/                 User-side custom NodeTypes (optional).

{{srcPrefix}}app/api/forkshop/
  edit/route.ts               Re-exports the edit handler from @forkshop/engine.
  positions/route.ts          Re-exports the positions handler from @forkshop/engine.
  agent-activity/
    route.ts                  Re-exports the activity POST handler.
    stream/route.ts           Re-exports the SSE stream handler.
```

The API routes are thin re-exports — the logic lives in `@forkshop/engine`. You shouldn't need to edit them unless you're customizing edit behavior.

---

## Adding a new Board (Layout + data)

A Board is the unit of extension for Forkshop. When you want a new sidebar section:

1. Write a board component in `{{srcPrefix}}app/forkshop/<name>-board.tsx`. Choose a Layout from the four built-ins and pass your data as Nodes.
2. Register it in `{{srcPrefix}}app/forkshop/forkshop.config.tsx` — add a sidebar section entry.
3. Wire the route in `{{srcPrefix}}app/forkshop/page.tsx` — render the board when that section is selected.

```tsx
"use client"
// {{srcPrefix}}app/forkshop/docs-board.tsx
import { ForkshopCanvas, Gallery, type GalleryEntry } from "@forkshop/engine"

const nodes: GalleryEntry[] = [
  {
    id: "doc:getting-started",
    label: "Getting started",
    node: {
      id: "doc:getting-started",
      kind: "iframe-route",
      x: 0, y: 0, width: 1200, height: 800,
      path: "/docs/getting-started",
      sourceFile: "app/docs/getting-started/page.tsx",
    },
  },
]

export function DocsBoard({ nodePositions, onPositionChange }) {
  return (
    <ForkshopCanvas fitMode="both">
      <Gallery
        entries={nodes}
        layout="stack"
        nodePositions={nodePositions}
        onPositionChange={onPositionChange}
      />
    </ForkshopCanvas>
  )
}
```

**When to add a Board vs a Layout vs a Kit:**
- Board = always (it's just configuration — new section, new data).
- Layout = rarely (requires an engine contribution; only if the spatial math doesn't fit Gallery/Tree/DesignSystemView/ResponsiveFrameView).
- Kit = deferred (spec #4). Build Boards directly until then.

---

## Adding a custom NodeType

Custom NodeTypes live in `{{srcPrefix}}app/forkshop/node-types/` and are registered in `forkshop.config.tsx`. Use them when none of the three built-in kinds (`inline-react`, `iframe-route`, `iframe-component`) fits your content.

```tsx
// {{srcPrefix}}app/forkshop/node-types/storybook-story-node-type.tsx
"use client"
import type { NodeType, AnyNode, RenderProps } from "@forkshop/engine"

type StorybookStoryNode = AnyNode & {
  kind: "storybook-story"
  storyId: string
}

export const storybookStoryNodeType: NodeType<StorybookStoryNode> = {
  id: "storybook-story",

  match(node): node is StorybookStoryNode {
    return node.kind === "storybook-story"
  },

  render({ node, isSelected }: RenderProps<StorybookStoryNode>) {
    const src = `http://localhost:6006/?path=/story/${node.storyId}`
    return (
      <iframe
        src={src}
        title={node.id}
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    )
  },

  agentMatch(node, activity) {
    // Optional — return { active: true } when Claude is editing this node's file.
    return { active: false }
  },
}
```

Register the NodeType in `forkshop.config.tsx`:

```ts
import { storybookStoryNodeType } from "./node-types/storybook-story-node-type"
import { BUILTIN_NODE_TYPES } from "@forkshop/engine"

export const nodeTypes = [...BUILTIN_NODE_TYPES, storybookStoryNodeType]
```

---

## How edit, spacing, and open-in-editor work

### Live text editing

Text rendered inside any Forkshop iframe is editable in place when the surrounding Node carries a `sourceFile`. Edit mode is always on in dev.

- Hover text → **blue ring** if the string appears as a literal in `sourceFile` (editable from this board), **gray dashed ring** if it's hardcoded inside a sub-component imported by this file (locked).
- Click an editable element → it becomes `contenteditable` and a Save / Discard popover appears.
- `⌘↵` saves (writes the file; Next.js HMR picks up the new value).
- `Esc` discards.
- Both quoted string literals (`"…"`, `'…'`, `` `…` ``) and JSX text children (`<p>Hello world</p>`) are editable.
- On a `ResponsiveFrameView` board (multi-viewport pages), typing in one viewport live-syncs to all others as you type.

The `/api/forkshop/edit` route handles both POST (save) and GET (read source). Make sure your re-export forwards both:

```ts
// {{srcPrefix}}app/api/forkshop/edit/route.ts
export { POST, GET } from "@forkshop/engine/api/edit/route"
```

Live text editing is dev-only by construction. Production builds tree-shake the overlay wiring and the API route returns 403 in production.

### Spacing picker

Click any spacing overlay (padding/margin ring) → a picker appears. Choosing a new value POSTs to `/api/forkshop/edit` with the className replacement as `originalText`/`newText`. Powered by `useIframeSpacingWiring` + `SpacingPicker`.

### Open in editor

Option-click any element inside an iframe → `EditorLink` fires `vscode://file/...` with the source file and line number, opening VS Code or Cursor.

`EditorLink` is built into `@forkshop/engine` — no mount step needed in your layout. The setup skill wires `@locator/webpack-loader` into your `next.config` during init, which injects `data-locatorjs` attributes at compile time. Works in dev mode only.

---

## The four Layouts at 1.0

### Gallery

Stacks or grids a list of Nodes on the canvas. Handles lazy loading, auto-height sizing, snap-to-grid, and selection.

```tsx
import { Gallery, type GalleryProps, type GalleryEntry } from "@forkshop/engine"

// GalleryProps:
// entries: GalleryEntry[]          — nodes to render
// layout: "stack" | "grid"         — stack = single column, grid = rows + columns
// viewportWidth?: number           — column width (default: 1200 stack / 400 grid)
// rowGap?: number                  — vertical gap between rows
// columnGap?: number               — horizontal gap between columns
// fitContent?: boolean             — shrink cells to content's natural width
// nodePositions?: NodePositions    — persisted drag overrides
// onPositionChange?                — called on drag commit
// selectedId?: string              — currently selected node
// onSelectChange?                  — called on selection change
```

### Tree

Renders a sitemap tree of Nodes with stepped connector lines. Parent–child relationships derive from URL paths (e.g. `/about/team` is a child of `/about`).

```tsx
import { Tree, type TreeProps, type TreeEntry } from "@forkshop/engine"

// TreeProps:
// entries: TreeEntry[]             — each entry has { id, label, path, node }
// nodePositions?: NodePositions
// onPositionChange?
// selectedId?: string
// onSelectChange?
//
// Tree.getStageSize(entries)       — utility to size the canvas to the tree's footprint
```

### DesignSystemView

Renders the full design-system canvas: color graph (raw tokens → semantic aliases as edges), typography showcase, and primitive component frames.

```tsx
import { DesignSystemView, type DesignSystemViewProps, type PrimitiveGroup } from "@forkshop/engine"

// DesignSystemViewProps:
// tokens: TokenRegistry            — built with buildTokenRegistry()
// primitives: PrimitiveGroup[]     — { id, label, primitives: AnyNode[] }
// typography?: AnyNode             — optional typography showcase node
// nodePositions?: NodePositions
// onPositionChange?
// selectedId?: string
// onSelectChange?
//
// DesignSystemView.getStageSize(props)  — utility to size the canvas to the content footprint
```

### ResponsiveFrameView

Renders a single route or component at multiple viewport widths side-by-side (default: 1440 / 768 / 375). Used for the selected-page isolation view.

```tsx
import { ResponsiveFrameView, type ResponsiveFrameViewProps } from "@forkshop/engine"

// ResponsiveFrameViewProps:
// path: string                     — route path or block slug (for agent-activity matching)
// source: string                   — iframe URL
// viewports?: number[]             — viewport widths; default [1440, 768, 375]
// kind?: "page" | "block"          — drives labels and OG image rendering; default "page"
// measuredHeight?: number          — measured body height (for canvas fit)
// onBodyHeightChange?              — fires when iframes report body height
// agentActive?: boolean            — drives indigo glow ring
// sourceFile?: string              — TSX source file; required for live text editing
```

---

## How positions are persisted

Node positions are stored in-memory and synced to `{{srcPrefix}}layouts/system.json` via POST to `/api/forkshop/positions` on every drag commit.

Positions are keyed by Node `id`. To set initial positions for new nodes, add entries to `layouts/system.json`:

```json
{
  "page:/about": { "x": 0, "y": 0 },
  "page:/contact": { "x": 464, "y": 0 }
}
```

The `id` values must match exactly what the Nodes declare in your Board's entries array. Use stable, predictable IDs (e.g. `"page:/about"`, `"primitive:button"`) so positions survive page reloads and HMR.

---

## Live AI awareness

When Claude Code edits a file in this project, Forkshop visually shows where:

- **Sidebar leaf pulse** — the entry that maps to the edited file pulses.
- **Frame glow** — when the affected entry is the currently-selected Node, its frame glows with an indigo ring and shows a `Claude · <filename>` chip.
- **Iframe outline** — inside any page iframe that composes the edited `iframe-component` Node, the instance gets an outlined glow.
- **Text pulse** — the specific text Claude changed (via `Edit`/`MultiEdit`) flashes inside the iframe.

The loop is `.claude/hooks/post-tool-use.sh` → POST `/api/forkshop/agent-activity` → in-memory state → SSE → React provider → visual decorations. All wiring is dev-only.

### Configuring file mapping

The provider needs to know which on-disk file maps to which sidebar entry. Add `sourcePath` (project-relative) to each `inline-react` Node and `iframe-component` Node in your board entries:

```ts
// inline-react Node for agent activity:
{
  id: "primitive:button",
  kind: "inline-react",
  x: 0, y: 0, width: 0, height: 0,
  render: () => <Button />,
  sourcePath: "components/ui/button.tsx",   // drives agent pulse
}

// iframe-component Node for agent activity:
{
  id: "block:hero",
  kind: "iframe-component",
  x: 0, y: 0, width: 1200, height: 800,
  path: "/",
  sourceFile: "components/marketing/hero.tsx",
  sourcePath: "components/marketing/hero.tsx",
}
```

Pages (`iframe-route` Nodes) are filesystem-routed — no `sourcePath` needed. Files without a configured mapping fall back to a "site-wide" indicator in the sidebar header.

### Consumer hooks

```ts
import {
  useAgentActivePages,       // pages currently being edited
  useAgentActiveBlocks,      // blocks (iframe-component Nodes) being edited
  useAgentActivePrimitives,  // inline-react Nodes being edited
  usePageActiveFallback,     // true when edit can't be attributed to a specific block
  useSiteWideActivity,       // { active, recentBasename } for unmapped file edits
  useAgentSubstringsForPage, // substring list scoped to a page path
  useAgentSubstringsForBlock,// substring list scoped to a block slug
  useAllAgentSubstrings,     // all active { oldString?, newString? } records
  useAgentSeenPagePaths,     // sticky set of every page touched this session
} from "@forkshop/engine"
```

The Claude Code producer pack (the `post-tool-use.sh` hook and the activity POST protocol) ships in spec #5. The consumer hooks above are live; the producer side is a no-op shell until spec #5 wires it.

### Silent synthetic routes

When the agent edits a page whose route isn't in the sidebar's `routes` prop, the sidebar adds that path to the tree silently — no badge, just a clickable row. These come from `useAgentSeenPagePaths()`, unioned with declared routes. The set is sticky for the React-component lifetime and clears on browser reload.

### Production behavior

`/api/forkshop/agent-activity` (POST) and `/stream` (GET) both return 403 when `NODE_ENV === "production"`. The `AgentActivityProvider`'s `EventSource` never opens in production. The `.claude/hooks/post-tool-use.sh` script's `curl --max-time 1` fails silently if no dev server is running.

---

## Update this file when you customize Forkshop

Every time you:
- Add a new Board or change what a Board receives as props
- Add or remove a custom NodeType
- Add a new API route or extend an existing one
- Change the file layout

...update this `{{srcPrefix}}app/forkshop/CLAUDE.md` to reflect it. Future Claude Code sessions in `{{srcPrefix}}app/forkshop/` load this file and will work from stale information if it drifts.
