# Forkshop

Forkshop is a Figma-style canvas + sidebar tool installed into your Next.js App Router project. It shows the real thing — your actual components and pages rendered in live iframes. Edit in place. Drag to arrange. Works with whatever styling system you use (Tailwind, Panda CSS, Vanilla Extract, plain CSS — the Design System Board reads tokens from `:root` CSS variables at runtime).

This file is auto-loaded by Claude Code when working in `{{srcPrefix}}app/forkshop/`. Everything in that directory is yours to customize.

---

## Self-containment posture

Forkshop is a drop-in install. Every file Forkshop creates lives under a `forkshop` namespace:

- `{{srcPrefix}}app/forkshop/` — Board scaffolds + the mount + the auto-managed block preview route
- `{{srcPrefix}}app/api/forkshop/` — API route stubs
- `{{srcPrefix}}public/fonts/forkshop/` — font binary
- `.claude/skills/forkshop-*.md` — skill files
- `forkshop.json` — lock file

Modifications to your existing files are limited to three additive items:

1. One import line in `app/globals.css`
2. (Opt-in) A `@locator/webpack-loader` rule in `next.config.*` — only if you said yes to Option-click → editor during setup
3. `@forkshop/engine` (always) + `@locator/webpack-loader` (if Locator opt-in accepted) in `package.json`

Nothing else. No injection into `components/`, `lib/`, or route groups.

To remove Forkshop cleanly: delete the namespaced directories, revert the three mutations, uninstall the deps. Done.

---

## Mental model

Four concepts compose the whole system.

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

---

## File layout

After `forkshop init`, your installation lives at:

```
{{srcPrefix}}app/forkshop/
  page.tsx                          mounts ForkshopCanvas + ForkshopSidebar
  forkshop.config.tsx               data: primitives, blocks, sitemap, reference
  design-system.tsx                 Design System Board (single leaf)
  ui-components.tsx                 UI Components parent (Gallery overview)
  ui-components/
    button.tsx                      variant grid — authored
    badge.tsx
    …                               one file per primitive
  blocks.tsx                        Blocks parent (Gallery overview)
  sitemap-board.tsx                 Sitemap parent (Tree) — named -board to avoid Next.js reserved sitemap route
  reference.tsx                     Reference parent (Tree) — MDX projects only
  block/[slug]/page.tsx             auto-managed block preview route
  node-types/                       (optional) custom NodeType definitions — see spec for shape
  CLAUDE.md                         this file
{{srcPrefix}}app/api/forkshop/      route stubs (re-exports from @forkshop/engine)
```

The API routes are thin re-exports — the logic lives in `@forkshop/engine`. You shouldn't need to edit them unless you're customizing edit behavior.

---

## Per-primitive variant authoring

By default, each discovered primitive renders with default props as a single tile on the UI Components Board. If you want a richer variant grid for a specific primitive (Button: all variants × sizes × states laid out in a grid), drop a file at `ui-components/<slug>.tsx`. If no override file exists, the primitive renders as a single tile on the parent.

The grid lives in a `<Gallery>` from `@forkshop/engine`. Each entry is a Node that imports your primitive and renders an instance with specific props:

```tsx
// ui-components/button.tsx
"use client"

import { Button } from "@/components/ui/button"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

export default function ButtonBoardView() {
  const entries = [
    { id: "primary-sm", label: "Primary / SM", node: { id: "primitive:button-primary-sm", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <Button variant="primary" size="sm">Click me</Button> } },
    { id: "primary-md", label: "Primary / MD", node: { id: "primitive:button-primary-md", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <Button variant="primary" size="md">Click me</Button> } },
    // … etc., one entry per variant × size × state combination
  ]
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={240} />
    </ForkshopCanvas>
  )
}
```

If your primitive uses `class-variance-authority` (cva), the setup skill scaffolds these entries by enumerating the cva variants. Otherwise it scaffolds three default instances and you fill in the variants manually.

These files render your *real* primitive component — they're not duplicates. Edit `components/ui/button.tsx` and the grid re-renders with the new visuals via HMR.

---

## Adding components

Forkshop auto-discovers primitives and blocks via barrel modules. Adding a new primitive is two steps:

1. Create the file: `components/ui/select.tsx` with a named PascalCase export
2. Add an export to the barrel: open `components/ui/index.ts` and add `export { Select } from "./select"`

That's it. Reload `/forkshop` and the new primitive appears on the UI Components Board.

Same pattern for blocks (`components/blocks/index.ts`).

**Why the barrel?** It's how Forkshop discovers components without a build-time codegen step. If you create a primitive or block but forget to add the barrel line, the file exists on disk but won't render on any Board. Forkshop will still surface its edit activity on the floating "Claude · &lt;filename&gt;" chip, so you'll see *something* happen — it just won't have a per-Node outline until the barrel catches up.

---

## Adding a new Board (Layout + data)

A Board is the unit of extension for Forkshop. When you want a new sidebar section:

1. Write a board component in `{{srcPrefix}}app/forkshop/<name>.tsx`. Choose a Layout from the four built-ins and pass your data as Nodes.
2. Register it in `{{srcPrefix}}app/forkshop/forkshop.config.tsx` — add a sidebar section entry.
3. Wire the route in `{{srcPrefix}}app/forkshop/page.tsx` — render the board when that section is selected.

```tsx
"use client"
// {{srcPrefix}}app/forkshop/docs.tsx
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

**When to add a Board vs a Layout:**
- Board = always (it's just configuration — new section, new data).
- Layout = rarely (requires an engine contribution; only if the spatial math doesn't fit Gallery/Tree/DesignSystemView/ResponsiveFrameView). Custom Layout / NodeType extension is a contribution path; see maintainer docs.

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
  useAllAgentHunks,          // all active { oldString?, newString? } hunks (renamed from useAllAgentSubstrings)
  useAgentSeenPagePaths,     // sticky set of every page touched this session
  useAgentColorByFile,       // per-file resolved agent color (edit OR read)
  useAgentReadingByFile,     // per-file read-only entries with { color, agentLabel }
} from "@forkshop/engine"
```

The Claude Code producer pack (the `post-tool-use.sh` hook and the activity POST protocol) is live. The hook is opt-in during `forkshop init` (Phase 5 question) and forwards Read/Edit/Write/MultiEdit tool calls to the dev server's `/api/forkshop/agent-activity` endpoint. Multiple agent identities are color-coded from an 8-slot OKLCH palette server-side; Claude defaults to orange.

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
