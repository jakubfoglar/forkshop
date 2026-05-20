# Engine contract + Board API redesign

**Date:** 2026-05-20
**Target release:** `@forkshop/engine` and `forkshop` CLI `0.4.0`
**Status:** Design approved; plan-writing next.

## Why

When Forkshop is installed into a real project today, Claude tends to produce
weird results: hand-rolled iframes that lack lazy-loading, wheel forwarding,
and edit overlay; mismatched styles (mixing `forkshop-*` tokens into user UI);
Boards that don't follow the expected file shape; sidebar entries that don't
route to a detail view. The fixes we've shipped so far have been surgical
(stale field names, missing exports, height-cap bugs) but the structural
cause is consistent: **the engine accepts whatever Claude types as long as it
compiles, and the setup skill carries 1409 lines of prose backfilling
contracts that the type system and runtime don't enforce.**

This spec redesigns the user-facing contract so that:

- The engine refuses wrong shapes loudly at config-import time, not silently
  at render time.
- The setup skill collapses from 1409 lines to roughly 400. Templates and
  placeholder substitution mostly disappear.
- Engine updates (new Layout features, rulers, resizable breakpoints) push
  to existing installs without wrapper churn — because there *is no* wrapper
  layer.
- Boards become a typed configuration (`defineBoard()`) instead of a 20-line
  React component the user has to maintain. Custom Boards remain possible via
  a documented raw-component escape hatch.
- `forkshop verify` becomes possible, catching shape drift statically instead
  of letting it surface as runtime weirdness.

This is a pre-1.0 breaking change. Jakub is the only existing user; he will
delete `app/forkshop/` from existing installs and re-run `npx forkshop init`.
No migration mechanism is needed.

## What stays

The architecture and mental model are mostly right and survive intact:

- **The four-concept vocabulary — Node, NodeType, Layout, Board.** Still
  the way to talk about Forkshop. Board changes meaning slightly (a typed
  config that the engine renders, not a user-written component), but the
  vocabulary holds.
- **Recipe-selection algorithm in the setup skill.** Five recipes (Design
  System, UI Components, Blocks, Sitemap, Reference), thresholds, composition
  rules. The algorithm is good. What changes is what each recipe *produces*
  (a `defineBoard()` call instead of a templated component).
- **Narrative-first project reading in Phase 1.** The skill's "read the
  project's own docs first, then signals" approach is correct and stays.
- **Phase 5 consent for next.config and `.claude/settings.json`.** Right
  discipline; keep.
- **Discovery via barrel modules.** `useDiscoveredPrimitives`,
  `useDiscoveredBlocks`. Right pattern.
- **`forkshop.json` as the install's source of truth.** Schema bumps to
  `2.1.0` for the new shape; existing fields preserved.
- **`forkshop diff` and `forkshop update`.** Drift detection is the moat.
  Stays as-is; gains awareness of the new Board files.
- **Token-source detection** (Tailwind v3, Tailwind v4, Panda, Vanilla
  Extract, generic CSS vars) — survives. Renders into the new Design
  System Board's tokens prop.

## The new mental model

```
Node       — data, kind-discriminated
NodeType   — plugin that renders a Node (built-in or user-registered)
Layout     — engine-shipped arrangement strategy. Two ship: gallery, tree.
             Custom layouts via defineLayout() are a typed protocol.
Board      — a typed configuration via defineBoard() that returns a
             React component. The engine owns canvas wiring, positions
             persistence, sidebar registration, validation.
```

Boards are no longer something the user writes as a React component. They're
a typed config object that **becomes** a React component via `defineBoard()`.
The engine renders them through a top-level `<BoardRegistry>` mount.

## The `defineBoard()` contract

```tsx
// app/forkshop/ui-components-board.tsx
import { defineBoard, useDiscoveredPrimitives, forkshopIcons } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "ui-components",
  label: "UI Components",
  icon: forkshopIcons.components,
  match: (selection) => selection.kind === "section" && selection.sectionId === "ui-components",
  layout: "gallery",
  layoutOptions: { columns: 3, gap: 24 },

  useEntries: () => {
    const primitives = useDiscoveredPrimitives(forkshopConfig.ui)
    return primitives.map((p) => ({
      id: p.slug,
      node: {
        kind: "inline-react",
        render: () => <p.Component />,
        filePath: p.sourcePath,
      },
    }))
  },

  useSidebarChildren: () => {
    const primitives = useDiscoveredPrimitives(forkshopConfig.ui)
    return primitives.map((p) => ({
      selection: { kind: "primitive", slug: p.slug },
      label: p.name,
      icon: forkshopIcons.component,
    }))
  },
})
```

### Return type

`defineBoard()` returns a typed React component carrying a non-enumerable
`__config` property with the original config object. The engine reads
`__config` at runtime for the registry; `forkshop verify` reads it at
static-analysis time.

### `match`

Decides when this Board is the active one given a sidebar selection.
Replaces the explicit `switch` statement in the current `page.tsx` template.
If `match` returns true, the Board renders. Engine warns in dev when two
Boards' `match` returns true for the same selection (first wins).

### `layout`

Either a string discriminator (`"gallery" | "tree"`) selecting a built-in
Layout, or a `Layout` object from `defineLayout()` (user-side custom). The
type system enforces that `layoutOptions` matches the selected Layout's
option schema.

### `useEntries`

A React hook that returns the entries to render. The hook can:
- Call other hooks (`useDiscoveredPrimitives`, `useSelection`,
  `useAgentActivity`).
- Read from `forkshopConfig`.
- Return an empty array.

It's a hook (not a static array) because real Boards need runtime data:
selection, discovery, agent activity. The `use` prefix signals the
convention.

### `useSidebarChildren`

Optional hook returning sidebar sub-entries. Each entry includes a
`selection` object that fires when clicked. A separate Board with a
matching `match` function handles the detail view.

**Default: no children.** This is a deliberate choice. Sidebar bloat
(50 colors as sub-entries, 47 routes auto-flowing) is a real UX cost, and
the user knows which items deserve drill-down. If a user wants
canvas-entries to mirror sidebar-children exactly, they write it in one
line: `useSidebarChildren: () => useEntries().map(toSidebarChild)`.

### Icon resolution

Three-tier fallback:

1. Board's explicit `icon` field — highest priority.
2. The Layout's default `icon` field — every Layout (built-in or
   `defineLayout()` result) carries a default.
3. Engine fallback (generic board icon) — last resort, prevents broken
   sidebars when nothing else is specified.

Custom Layouts must declare an icon in `defineLayout()` (TypeScript-
enforced).

## Layouts: gallery + tree

Two engine-shipped Layouts. Everything previously specialized
(`DesignSystemView`, `ResponsiveFrameView`) decomposes into Gallery
configurations + small specialized renderers.

### `gallery`

```ts
type GalleryOptions = {
  columns?: number               // grid mode if set; stack mode if 1 or absent
  rowGap?: number
  columnGap?: number
  rulers?: boolean               // ruler overlay on the canvas
  rulerUnit?: "px" | "rem"
}
```

Mode selection by entry shape:
- If entries set `row`/`column` → grid placement (explicit).
- Else if `node.x` / `node.y` are set → freeform placement (absolute).
- Else → auto-flow (left-to-right, top-to-bottom) using `columns`.

The auto-flow default fixes the polish-backlog "Gallery grid auto-flow"
issue at the same time: undeclared entries get sequential placement, not
`(0, 0)` stacking.

### `tree`

```ts
type TreeOptions = {
  connectors?: "stepped" | "curved" | "straight"
  rowHeight?: number
}
```

Hierarchical arrangement with connector lines. Parent-child relationships
derived from entry path shape (e.g., `/about/team` is a child of `/about`).
Used by Sitemap and Reference Boards.

### Drag behavior across Layouts

Positions are a typed overlay on Layout-computed positions:

- Layout computes initial positions from entries.
- `nodePositions[id]` overrides if present.
- Drag updates `nodePositions[id]` and POSTs to `/api/forkshop/positions`.
- Layouts always own metadata (stage size, container behavior). Drag
  never "detaches" a Board from its Layout.
- If a user wants pure absolute positioning, that's a Gallery freeform
  mode (entries set `node.x`/`node.y`), not a state the Board falls into.

### Custom Layouts via `defineLayout()`

```ts
import { defineLayout, forkshopIcons } from "@forkshop/engine"

export const chartsLayout = defineLayout<{ orbitRadius: number }>({
  id: "force-directed",
  icon: forkshopIcons.flows,
  arrange: (entries, options) => /* return entries with computed x/y */,
  stageSize: (entries, options) => ({ width: 2000, height: 1500 }),
})
```

Custom Layouts are a typed protocol: pure `arrange()` and `stageSize()`
functions, an `icon`, and an option schema via the generic parameter.
They register globally in `forkshop.config.tsx`'s `layouts` array, then
selected by reference in `defineBoard()`.

## Specialized renderers (replacing `DesignSystemView`)

The old `DesignSystemView` Layout (585 LOC) decomposes into three
engine-shipped components used inside `inline-react` Nodes:

```tsx
import { ColorGraph } from "@forkshop/engine"

<ColorGraph tokens={tokens} mode="semantic-aliases-as-edges" />
```

- **`ColorGraph`** — the raw-token → semantic-alias graph with connector
  edges. The actually-distinctive part of the old `DesignSystemView`.
  ~100 LOC.
- **`TypographyShowcase`** — proper line-height / size rendering of font
  tokens. ~50 LOC.
- **`PrimitivesGrid`** — convenience wrapper around `useDiscoveredPrimitives`
  + Gallery. Optional; users can construct equivalent entries by hand.

The Design System Board becomes:

```tsx
export default defineBoard({
  id: "design-system",
  label: "Design System",
  match: (s) => s.kind === "section" && s.sectionId === "design-system",
  layout: "gallery",
  layoutOptions: { columns: 1 },  // stack mode
  useEntries: () => {
    const tokens = useDesignTokens()  // engine helper, picks v3-config vs CSS-vars
    return [
      { id: "colors",     node: { kind: "inline-react", render: () => <ColorGraph tokens={tokens} /> } },
      { id: "typography", node: { kind: "inline-react", render: () => <TypographyShowcase tokens={tokens} /> } },
      { id: "primitives", node: { kind: "inline-react", render: () => <PrimitivesGrid /> } },
    ]
  },
})
```

This collapses Templates 2a and 2b from the current skill into one
`defineBoard()` call. The Tailwind-v3-config vs CSS-vars distinction
moves into the engine helper `useDesignTokens()`, which auto-detects.

## Specialized helpers (replacing `ResponsiveFrameView`)

`ResponsiveFrameView` (449 LOC) dies as a Layout. Its three distinctive
behaviors — synchronized scroll, live-edit text sync across viewports,
shared body-height measurement — already work for any Board with multiple
`iframe-route` Nodes sharing a `routePath`. They're properties of the
engine's iframe registry, not properties of this Layout.

The "single page at multiple viewports" Board becomes:

```tsx
import { defineBoard, responsiveFrameEntries, useSelection } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "single-page",
  match: (s) => s.kind === "page",
  layout: "gallery",
  layoutOptions: { columns: 3, gap: 24 },
  useEntries: () => {
    const selection = useSelection()
    if (selection.kind !== "page") return []
    const route = forkshopConfig.sitemap.routes.find((r) => r.path === selection.path)
    return responsiveFrameEntries(selection.path, {
      viewports: [1440, 768, 375],
      sourceFile: route?.sourceFile,
    })
  },
})
```

`responsiveFrameEntries(path, opts)` returns three `iframe-route` Gallery
entries at three widths sharing a `routePath`. The engine's iframe registry
handles cross-viewport sync because that already works for shared
`routePath`s. New features (rulers, resizable breakpoints) attach as
Gallery `layoutOptions` and push to existing installs via `npm update` with
no wrapper churn.

## Sidebar children

A Board with children declares them via `useSidebarChildren()`. A
*separate* detail Board matches the child selection and renders the
per-item view. Two Boards, one parameterized — not 12.

Today, 12 primitives become 12 files (`ui-components/<slug>.tsx`). In the
new shape:

```tsx
// One file replaces 12
import { defineBoard, useSelection, useDiscoveredPrimitive, enumeratePrimitiveVariants } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "primitive-detail",
  match: (s) => s.kind === "primitive",
  layout: "gallery",
  layoutOptions: { columns: 4 },
  useEntries: () => {
    const selection = useSelection()
    if (selection.kind !== "primitive") return []
    const primitive = useDiscoveredPrimitive(forkshopConfig.ui, selection.slug)
    return enumeratePrimitiveVariants(primitive)
  },
})
```

`enumeratePrimitiveVariants()` is a new engine helper: detects cva, walks
variants, falls back to a stub of three default instances. Replaces
Templates 4a and 4b. Per-primitive overrides survive — if the user creates
`ui-components/<slug>.tsx`, it's auto-detected and used in place of the
default enumeration.

### Selection union

```ts
type ForkshopSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "block"; slug: string }
  | { kind: "primitive"; slug: string }
  | { kind: "page"; path: string }
  | { kind: "custom"; namespace: string; data: unknown }
```

`"custom"` is the escape hatch for exotic Boards (charts dashboards,
data-explorer views) that need their own selection scheme. Custom Boards
match against `selection.kind === "custom" && selection.namespace === "..."`
and pull from `selection.data`.

## `page.tsx` collapses

```tsx
"use client"
import { ForkshopSidebar, BoardRegistry } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"
import designSystemBoard from "./design-system-board"
import uiComponentsBoard from "./ui-components-board"
import blocksBoard from "./blocks-board"
import sitemapBoard from "./sitemap-board"
import singlePageBoard from "./single-page-board"
import primitiveDetailBoard from "./primitive-detail-board"

export default function ForkshopPage() {
  return (
    <BoardRegistry
      config={forkshopConfig}
      boards={[
        designSystemBoard,
        uiComponentsBoard,
        primitiveDetailBoard,
        blocksBoard,
        sitemapBoard,
        singlePageBoard,
      ]}
    />
  )
}
```

About 20 lines instead of the current 80-line templated mount with switch
statements and selection plumbing. `<BoardRegistry>` owns:

- Selection state (hash-routed, persisted across reloads).
- Sidebar rendering (consumes each Board's `label`, `icon`,
  `useSidebarChildren`).
- Board activation (calls each Board's `match`, renders the first match).
- The built-in PAGES tree (union of declared routes from
  `forkshopConfig.sitemap.routes` and synthetic routes from
  `useAgentSeenPagePaths()`).
- Canvas mounting (wraps the active Board in `<ForkshopCanvas>`).
- Positions wiring (calls `useForkshopPositions` internally; user-side
  positions hook file is deleted).
- Agent activity provider (wraps `<AgentActivityProvider>`).

The user's `page.tsx` does not import `<ForkshopCanvas>`, does not call
`useState` for selection, does not parse/serialize the URL hash, does not
wire `<AgentActivityProvider>`. All of that moves into the engine where it
can be improved without touching user installs.

## `forkshop.config.tsx` becomes a typed validated config

```tsx
import { defineConfig, BUILTIN_NODE_TYPES, BUILTIN_LAYOUTS } from "@forkshop/engine"
import * as UIPrimitives from "@/components/ui"
import * as Blocks from "@/components/blocks"
import { storybookStoryNodeType } from "./node-types/storybook"
import { chartsLayout } from "./layouts/charts"

export const forkshopConfig = defineConfig({
  mount: "app/forkshop",
  ui: UIPrimitives,
  blocks: Blocks,
  nodeTypes: [...BUILTIN_NODE_TYPES, storybookStoryNodeType],
  layouts: [...BUILTIN_LAYOUTS, chartsLayout],
  sitemap: {
    routes: [
      { path: "/", sourceFile: "app/page.tsx" },
      { path: "/about", sourceFile: "app/about/page.tsx" },
    ],
  },
  reference: { contentPaths: ["content/**/*.mdx"] },
  viewportProfile: "responsive",
})
```

`defineConfig()` runs Zod-shaped validation at import time. Wrong shapes
throw immediately with a clear path:

```
ForkshopConfigError: at sitemap.routes[2].path
  Expected string matching /^\/.+/, got: ""
  Hint: route paths must start with "/" and be non-empty.
```

The React app never mounts with a broken config — the error surfaces in
the terminal during dev-server startup.

## Validation

Three layers, in firing order:

### Layer 1 — TypeScript compile time

The bulk of shape correctness comes from types:
- Discriminated `AnyNode` union with required fields per `kind`.
- `defineBoard<TLayout>` generic constrains `layoutOptions` against the
  selected Layout's option type.
- `defineConfig` parameter type asserts the full config shape.

Most "weird Board" errors fail to compile.

### Layer 2 — Import-time Zod validation

`defineConfig` and `defineBoard` each run a Zod schema at module-import.
Catches what TypeScript misses: out-of-range numbers, malformed paths,
references to missing files, fields bypassed via `as any`.

### Layer 3 — Mount-time runtime check

When `<BoardRegistry>` activates a Board, it validates the entries
returned from `useEntries()`:
- Every Node `kind` has a registered NodeType.
- Every required Node field is present.
- Every `sourceFile` / `filePath` is a string (existence check is left to
  `forkshop verify` to avoid filesystem reads on every render).

Failures render an inline placeholder Node with a useful message instead
of silently rendering nothing. The user gets visible feedback inside the
canvas.

## `forkshop verify`

A new top-level CLI command. Reads the project state and statically
asserts everything the runtime would assert:

```bash
$ npx forkshop verify
Checking forkshop.config.tsx ............................. ✓
Checking 6 board files ................................... ✓
Checking sidebar children resolve to detail Boards ........ ✓
Checking Node kinds registered for all entry shapes ...... ✓
Checking sourceFile / filePath references exist .......... ✓
Checking forkshop-* classes not used outside app/forkshop/ ✓
Checking forkshop.json schemaVersion in sync .............. ✓
✓ Forkshop install is consistent.
```

When it fails, exact-file errors with actionable hints:

```
✗ app/forkshop/charts-board.tsx
    Board returns a Node with kind "storybook-story" but no NodeType
    is registered for it. Add it to forkshopConfig.nodeTypes.
```

Wired into:
- Setup skill's Phase 7 — runs automatically after install.
- `pnpm check` if the user wants — easy to add to CI.
- Dev-server startup banner — engine prints a one-line status on first
  boot ("✓ Forkshop install valid" or "! verify found issues; run
  `npx forkshop verify`").

The same check, run inside the engine's own CI, asserts that every code
example in `templates/user-claude-md.md` parses against the current
`AnyNode` union. **Stale field names in the user-facing template fail
engine CI, not user installs.** This is the structural fix for the
polish-backlog "User-side CLAUDE.md template — stale field names" item.

## The setup skill rewrite

The skill collapses from ~1409 lines to ~400. Mostly because types and
runtime validation do the work that prose used to do.

### Stays

- Phase 0 (preconditions): unchanged.
- Phase 1 (read project, build narrative): unchanged. The narrative-first
  approach is the smart part of the skill; it survives.
- Phase 2 (scans A–E): unchanged. Discovery logic is right.
- Phase 3 (recipe selection + proposal): unchanged at the algorithm level.
  The proposal tree format stays.
- Phase 4 (iterate): unchanged.
- Phase 5 (consent for next.config + Claude pack): unchanged.

### Shrinks

Phase 6 (write artifacts): 12 steps → 4.

1. Write `forkshop.config.tsx` as a single `defineConfig({...})` call.
2. Write one `defineBoard({...})` file per fired recipe (Design System,
   UI Components, Blocks, Sitemap, Reference, plus the always-emitted
   single-page-board and primitive-detail-board).
3. Write `page.tsx` as the ~20-line `<BoardRegistry>` mount.
4. Apply optional next.config (Locator) and Claude-pack changes if opted
   in.

### Templates collapse

- Template 1 (`forkshop.config.tsx`): becomes a small `defineConfig()`
  template.
- Templates 2a, 2b (Design System variants): merge into one
  `defineBoard()` template.
- Templates 3, 5, 7, 8: collapse to ~10-line `defineBoard()` files each.
- Templates 4a, 4b (per-primitive variant boards): **deleted.** One
  `PrimitiveDetailBoard` with `enumeratePrimitiveVariants()` replaces N
  files.
- Template 6 (block preview route): unchanged. Still a Next.js route the
  engine needs.
- Template 9 (page.tsx): becomes the 20-line `<BoardRegistry>` mount.
- Templates 10, 11 (next.config Locator rules): unchanged.
- Template 12 (single-page-board): one `defineBoard()` with
  `responsiveFrameEntries()`.
- Template 13 (use-forkshop-positions hook): **deleted.** Engine owns
  positions wiring.

### Skill prose dropped

- All "There is no `selection.kind === 'leaf'`" disclaimers — TypeScript
  enforces.
- All substitution-rule paragraphs — there's nothing to substitute.
- All field-name reminders ("Use `routePath` not `path`") — types and
  Zod errors handle it.
- All conditional emission rules ("if UI Components recipe fired, emit
  this import") — discovery is runtime, no conditional imports needed.

### Skill prose added

- A "Validation pass" sub-step at the end of Phase 6 that runs
  `forkshop verify` on the freshly-written install.
- One new section explaining how to write a custom Board (the
  `defineBoard()` signature, the raw-component escape hatch) — replaces
  multiple scattered paragraphs in the current skill.

## The user-CLAUDE.md template rewrite

Goes from ~536 lines to ~250.

- "Mental model" section: same four concepts. "Board" now means "a
  `defineBoard()` config that returns a Component."
- "File layout" section: shorter — fewer files generated, no per-primitive
  subdirectory.
- "Adding components" section: barrel-module pattern unchanged.
- "Adding a new Board" section: 20-line `defineBoard()` example replaces
  the current multi-step write-up.
- "Adding a custom NodeType" section: contractually unchanged; example
  uses global `nodeTypes` registration in `forkshop.config.tsx`.
- **Drop:** "Per-primitive variant authoring" — variants are automatic.
- **Drop:** All examples with stale `sourcePath` / `path` fields.
- **Add:** "How to debug a misbehaving Board" — points at
  `forkshop verify` and the runtime placeholder errors.

## Engine API surface diff

### Added

- `defineBoard()` — returns a typed Board component.
- `defineLayout()` — returns a typed custom Layout.
- `defineConfig()` — returns a validated config object.
- `BoardRegistry` component.
- `useSelection` hook.
- `useDesignTokens` hook (auto-picks v3-config vs CSS-vars source).
- `enumeratePrimitiveVariants` helper.
- `responsiveFrameEntries` helper.
- `ColorGraph` component.
- `TypographyShowcase` component.
- `PrimitivesGrid` component (optional convenience).
- `LazyIframe` exported with `maxHeight` and `lockScroll` props and the
  height-cap callback bug fixed (subsumes polish-backlog items).
- `useForkshopCanvas` hook (polish-backlog item).
- `ForkshopCanvasHandle`, `Transform`, `WheelInput` types
  (polish-backlog item).
- `BUILTIN_LAYOUTS` constant — re-exported for global registration.

### Changed

- `<ForkshopSidebar>` — primary surface moves to `<BoardRegistry>`;
  direct usage remains for the raw-escape-hatch path.
- Selection union — gains `{ kind: "custom"; namespace; data }`.
- `forkshop.json` schema bumps to `2.1.0` for the new file layout. The
  CLI's diff/update commands learn the new shape.

### Removed

- `DesignSystemView` — replaced by composition.
- `ResponsiveFrameView` — replaced by `responsiveFrameEntries` + Gallery.
- `iframeRouteNodeType.heightMode: "cap"` callback bug — fixed by
  capping the callback when the cap mode is active (polish-backlog).
- `setActiveTokenRegistry` / `getActiveTokenRegistry` global singleton
  — token registry passes through context now, no singleton state.

### Still exported (raw-escape-hatch path)

- `<ForkshopCanvas>`, `<Gallery>`, `<Tree>`, `useForkshopPositions` —
  for users writing exotic custom Boards that don't fit `defineBoard()`.
  These are still first-class but become the advanced path, not the
  default.

## File layout after a fresh install

```
app/forkshop/
  page.tsx                       ~20 lines (BoardRegistry mount)
  forkshop.config.tsx            defineConfig({...})
  design-system-board.tsx        defineBoard({ layout: "gallery", ... })
  ui-components-board.tsx        defineBoard with useSidebarChildren
  primitive-detail-board.tsx     one Board for all primitive details
  blocks-board.tsx               defineBoard with useSidebarChildren
  sitemap-board.tsx              defineBoard layout: "tree"
  single-page-board.tsx          defineBoard with responsiveFrameEntries
  reference-board.tsx            defineBoard layout: "tree" (if MDX)
  block/[slug]/page.tsx          unchanged (auto-managed preview route)
  CLAUDE.md                      ~250 lines
  node-types/                    (optional, custom NodeTypes)
  layouts/                       (optional, custom Layouts via defineLayout)

app/api/forkshop/                (route stubs, unchanged)
public/fonts/forkshop/           (font binary, unchanged)
forkshop.json                    schemaVersion 2.1.0
.claude/skills/forkshop-setup.md (rewritten, ~400 lines)
```

Compared to the current shape: one file per primitive folder gone, the
positions hook file gone, the design-system file structure simplified.
Roughly half the user-side files of a current install.

## Rollout

Single `0.4.0` release. No 0.3.2 transition release; punch-list items
(stale CLAUDE.md fields, missing exports, iframe-route cap bug) ship as
part of 0.4.0 because the underlying files are being touched anyway.

No migration mechanism for existing installs. Jakub is the only existing
user; he deletes `app/forkshop/` from existing projects and re-runs
`npx forkshop init`. The setup skill's Phase 0 Check 4 (re-run detection)
gracefully handles repeat-init flows for the new shape.

Release sequence:

1. Engine work: add `defineBoard` / `defineLayout` / `defineConfig`,
   build out `BoardRegistry`, add Zod schemas, decompose `DesignSystemView`,
   delete `ResponsiveFrameView`, export `LazyIframe` / `useForkshopCanvas`
   / canvas types, fix the height-cap callback bug.
2. CLI work: bump `forkshop.json` schemaVersion handling to 2.1.0, add
   the `forkshop verify` command, update diff/update to know the new
   file layout.
3. Skill rewrite: collapse the setup skill, update the user-CLAUDE.md
   template, regenerate the public-API snapshot.
4. Tag `v0.4.0`. Release workflow already exists.

## Open questions

- **Should `useEntries` be allowed to throw?** Today's plan: it can
  throw, the engine catches and renders an inline placeholder. Decide
  whether the placeholder is a generic "Board failed to load" or
  surfaces the error message. Lean toward the latter in dev,
  generic in production.
- **Per-Board positions namespacing.** The `useForkshopPositions` hook
  recently gained `boardId` namespacing (commit `a1ac653`). Should
  `BoardRegistry` auto-namespace per Board, or leave that to the user
  config? Lean toward auto-namespace using each Board's `id`.
- **`forkshop verify` exit codes.** Document and lock down: 0 = pass,
  1 = drift, 2 = error. Match the existing `forkshop diff` convention.
- **Layout-time vs render-time icon resolution.** Today the proposal is
  Board's explicit icon → Layout's default icon → engine fallback. If a
  Board doesn't specify and the Layout's default doesn't apply
  contextually (e.g., a custom Layout for charts whose icon doesn't make
  sense for the sidebar entry), should there be a separate `sidebarIcon`
  field? Defer; pick this up in implementation if needed.

## What this does not address

Tracked for later, not blocked by this spec:

- `defineLayout()` custom Layout protocol — included in the spec but the
  exact `arrange()` / `stageSize()` API needs implementation experience
  to lock down. Treat the spec's signature as provisional; refine during
  implementation.
- Push-to-users for the engine's own dev-server middleware (the live-AI
  port discovery file from polish-backlog). Separate concern; not
  affected by this redesign.
- DesignSystemView persisted-position drift — fixed automatically by
  decomposing into Gallery entries; no special handling needed.
- The 12 react-hooks/immutability warnings on
  `use-iframe-edit-controller.ts` — touched but not the focus of this
  spec. Clean up while we're in the file.
