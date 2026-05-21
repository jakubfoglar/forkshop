# Forkshop

Forkshop is a Figma-style canvas + sidebar tool installed into your Next.js App
Router project. It shows the real thing — your actual components and pages
rendered in live iframes. Edit in place. Drag to arrange. Works with whatever
styling system you use (Tailwind v3/v4, Panda CSS, Vanilla Extract, plain
`:root` CSS vars — the Design System Board reads CSS variables at runtime by
default).

This file is auto-loaded by Claude Code when working in
`{{srcPrefix}}app/forkshop/`. Everything in that directory is yours to
customize.

---

## Self-containment posture

Every file Forkshop creates lives under a `forkshop` namespace:

- `{{srcPrefix}}app/forkshop/` — Board scaffolds + the mount + the auto-managed
  block preview route
- `{{srcPrefix}}app/api/forkshop/` — API route stubs
- `{{srcPrefix}}public/fonts/forkshop/` — font binary
- `.claude/skills/forkshop-*.md` — skill files
- `forkshop.json` — lock file

Modifications to your existing files: one import line in `app/globals.css`,
optionally a `@locator/webpack-loader` rule in `next.config.*`, and
`@forkshop/engine` (always) + `@locator/webpack-loader` (if Locator opt-in
accepted) in `package.json`. Nothing else.

---

## Mental model

Four concepts.

- **Node** — a positioned instance on the canvas. `(x, y, width, height)` plus
  a `kind` discriminator: `inline-react`, `iframe-route`, or
  `iframe-component`. `inline-react` carries an optional `filePath`;
  iframe variants carry an optional `sourceFile`.
- **NodeType** — plugin defining how a `kind` matches, renders, and joins the
  agent-activity loop. Three built-ins ship (`inlineReactNodeType`,
  `iframeRouteNodeType`, `iframeComponentNodeType`).
- **Layout** — engine-shipped arrangement strategy. Two built-ins: `gallery`
  (auto-flow grid with freeform overrides) and `tree` (URL-path sitemap).
  Add custom layouts with `defineLayout()`.
- **Board** — typed configuration via `defineBoard()` that becomes a React
  component the engine mounts inside `<BoardRegistry>`. The engine owns
  canvas, sidebar, selection routing, and positions wiring. Boards declare
  `match`, `layout`, and a `useEntries()` hook.

```ts
import type { InlineReactNode } from "@forkshop/engine"

const node: InlineReactNode = {
  id: "primitive:button",
  kind: "inline-react",
  x: 0, y: 0, width: 320, height: 160,
  render: () => <Button>Label</Button>,
  filePath: "components/ui/button.tsx",
}
```

---

## File layout

```
{{srcPrefix}}app/forkshop/
  page.tsx                          <BoardRegistry config={...} boards={[...]} />
  forkshop.config.tsx               defineConfig({...})
  design-system-board.tsx           defineBoard for Design System
  ui-components-board.tsx           defineBoard with sidebar children
  primitive-detail-board.tsx        defineBoard rendering per-primitive variants
  blocks-board.tsx                  defineBoard with sidebar children
  sitemap-board.tsx                 defineBoard layout: "tree"
  single-page-board.tsx             defineBoard with responsiveFrameEntries
  reference-board.tsx               defineBoard layout: "tree" (MDX projects only)
  block/[slug]/page.tsx             auto-managed block preview route
  node-types/                       (optional) custom NodeType definitions
  layouts/                          (optional) custom Layouts via defineLayout
  CLAUDE.md                         this file
```

The API routes under `{{srcPrefix}}app/api/forkshop/` are thin re-exports —
the logic lives in `@forkshop/engine`.

---

## Adding a new Board

```tsx
// {{srcPrefix}}app/forkshop/charts-board.tsx
"use client"
import { defineBoard, forkshopIcons } from "@forkshop/engine"
import { useChartData } from "@/lib/charts"

export default defineBoard({
  id: "charts",
  label: "Charts",
  icon: forkshopIcons.flows,
  match: (s) => s.kind === "section" && s.sectionId === "charts",
  layout: "gallery",
  layoutOptions: { columns: 2 },
  useEntries: () => {
    const data = useChartData()
    return data.map((chart) => ({
      id: chart.slug,
      label: chart.name,
      node: {
        id: `chart:${chart.slug}`,
        kind: "inline-react" as const,
        x: 0, y: 0, width: 600, height: 400,
        render: () => <ChartComponent data={chart} />,
      },
    }))
  },
})
```

Then register in `page.tsx`:

```tsx
import chartsBoard from "./charts-board"
// inside the boards array:
<BoardRegistry config={forkshopConfig} boards={[..., chartsBoard]} />
```

The `match` predicate decides when the Board activates. Use
`isPrimitiveSelection`, `isBlockSelection`, `isPageSelection`, or
`isCustomSelection` from `@forkshop/engine` for typed selections.

---

## Adding sidebar children

```tsx
defineBoard({
  // ...
  useSidebarChildren: () => {
    const items = useMyItems()
    return items.map((item) => ({
      selection: { kind: "custom" as const, namespace: "charts", data: { id: item.id } },
      label: item.name,
    }))
  },
})
```

Pair with a detail Board:

```tsx
import { isCustomSelection, useSelection } from "@forkshop/engine"

defineBoard({
  id: "chart-detail",
  match: (s) => isCustomSelection(s) && s.namespace === "charts",
  layout: "gallery",
  useEntries: () => {
    const sel = useSelection()
    if (!isCustomSelection(sel) || sel.namespace !== "charts") return []
    return [/* …render the selected chart */]
  },
})
```

---

## Adding a custom NodeType

```tsx
// {{srcPrefix}}app/forkshop/node-types/storybook-story-node-type.tsx
"use client"
import type { NodeType, AnyNode, RenderProps } from "@forkshop/engine"

type StorybookStoryNode = AnyNode & { kind: "storybook-story"; storyId: string }

export const storybookStoryNodeType: NodeType<StorybookStoryNode> = {
  id: "storybook-story",
  match: (node): node is StorybookStoryNode => node.kind === "storybook-story",
  render: ({ node }: RenderProps<StorybookStoryNode>) => (
    <iframe
      src={`http://localhost:6006/?path=/story/${node.storyId}`}
      title={node.id}
      style={{ width: "100%", height: "100%", border: 0 }}
    />
  ),
  agentMatch: () => ({ active: false }),
}
```

Register in `forkshop.config.tsx`:

```ts
import { BUILTIN_NODE_TYPES, defineConfig } from "@forkshop/engine"
import { storybookStoryNodeType } from "./node-types/storybook-story-node-type"

export const forkshopConfig = defineConfig({
  // ...
  nodeTypes: [...BUILTIN_NODE_TYPES, storybookStoryNodeType],
})
```

To wrap a built-in NodeType (e.g. an `iframe-route` variant), spread the
built-in and override only the parts that differ — that preserves
`agentMatch` so route-level live-AI attribution still works.

---

## Adding a custom Layout

```tsx
// {{srcPrefix}}app/forkshop/layouts/charts-layout.tsx
import { defineLayout, forkshopIcons } from "@forkshop/engine"

export const chartsLayout = defineLayout({
  id: "charts-orbit",
  icon: forkshopIcons.flows,
  defaultOptions: { orbitRadius: 200 },
  render: ({ entries, options, nodePositions, onPositionChange }) => {
    return null /* arrange entries spatially */
  },
  stageSize: () => ({ width: 2000, height: 1500 }),
})
```

Register in `forkshop.config.tsx`:

```ts
import { BUILTIN_LAYOUTS, defineConfig } from "@forkshop/engine"
import { chartsLayout } from "./layouts/charts-layout"

export const forkshopConfig = defineConfig({
  // ...
  layouts: [...BUILTIN_LAYOUTS, chartsLayout],
})
```

A Board references the same object (not its id): `layout: chartsLayout`.

---

## Live text editing, spacing picker, open-in-editor

Dev-only. Production builds tree-shake the overlay and the edit API returns
403.

- **Live text.** Hover text inside any iframe → blue ring if it lives in the
  Node's `sourceFile`, gray dashed ring if it's locked in a sub-component.
  Click → `contenteditable`. `⌘↵` saves; `Esc` discards. Quoted literals and
  JSX text children both work.
- **Spacing picker.** Click any padding/margin ring → picker → POSTs to
  `/api/forkshop/edit`.
- **Open in editor.** Option-click → `vscode://file/…` opens at the source
  line (Cursor / VS Code). Powered by `@locator/webpack-loader` wired by the
  setup skill.

Block outlines in page-view iframes require `data-forkshop-block="<slug>"` on
the outermost element of each block component — without that attribute the
engine cannot propagate agent-activity outlines into the iframe.

---

## Live AI awareness

`BoardRegistry` provides an `AgentActivityProvider` automatically. Consumer
hooks for custom Boards:

```ts
import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
  usePageActiveFallback,
  useSiteWideActivity,
  useAgentSubstringsForPage,
  useAgentSubstringsForBlock,
  useAllAgentHunks,
  useAgentSeenPagePaths,
  useAgentColorByFile,
  useAgentReadingByFile,
} from "@forkshop/engine"
```

The Claude Code hook (`post-tool-use.sh`) is opt-in during setup and forwards
Read/Edit/Write/MultiEdit tool calls to `/api/forkshop/agent-activity`.
Multiple agent identities get color-coded server-side; Claude defaults to
orange. Both POST and `/stream` (GET) return 403 in production.

---

## The raw-component escape hatch

If a Board needs full control beyond what `defineBoard()` exposes, wrap a raw
React component with `withBoardMeta`. The Component owns its canvas; the
metadata exists so `BoardRegistry` can match selection and render a sidebar
entry.

```tsx
"use client"
import { ForkshopCanvas, Gallery, useForkshopPositions, withBoardMeta, forkshopIcons } from "@forkshop/engine"

function ExoticBoard() {
  const { nodePositions, onPositionChange } = useForkshopPositions({ boardId: "exotic" })
  return (
    <ForkshopCanvas>
      <Gallery entries={[/* ... */]} nodePositions={nodePositions} onPositionChange={onPositionChange} />
    </ForkshopCanvas>
  )
}

export default withBoardMeta(ExoticBoard, {
  id: "exotic",
  label: "Exotic",
  icon: forkshopIcons.flows,
  match: (s) => s.kind === "section" && s.sectionId === "exotic",
})
```

Use sparingly — most Boards don't need this. `withBoardMeta` skips the engine's
layout machinery, so you're on the hook for canvas + positions wiring.

---

## How to debug a misbehaving Board

1. Run `npx forkshop verify` — surfaces structural drift before runtime.
2. Look at the canvas — invalid Nodes render as inline error placeholders.
3. Check the dev console — `BoardRegistry` warns about duplicate matches,
   missing layouts, and unregistered NodeTypes.
4. If you see "Board returned a Node with kind 'X' but no NodeType is
   registered", add the NodeType to `forkshopConfig.nodeTypes` and reload.

---

## Update this file when you customize Forkshop

Every time you add or change a Board / NodeType / Layout / API route, or
change the file layout, update this `{{srcPrefix}}app/forkshop/CLAUDE.md`.
Future Claude Code sessions in `{{srcPrefix}}app/forkshop/` load this file
and work from stale information if it drifts.
