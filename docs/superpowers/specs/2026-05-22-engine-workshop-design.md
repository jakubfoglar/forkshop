# Engine Workshop — Design Spec

Date: 2026-05-22
Topic: Dev surface for iterating on Forkshop engine chrome

## Goal

A dedicated surface inside apps/demo for visual iteration on Forkshop engine
chrome — sidebar, canvas frame, agent indicators, edit popover — and the
engine's own design tokens. Optimized for "see all states side-by-side"
comparison with HMR-driven feedback. Not deployed; a dev tool only.

## Why apps/demo, why inside the Forkshop mount

apps/demo is already a real Forkshop installation against a real Next.js
skeleton. The engine is workspace-linked, so edits to packages/engine/src
trigger HMR in apps/demo automatically. Living inside the existing Forkshop
mount also means we reuse the real canvas (zoom, pan, position persistence),
the real sidebar nav, and the real AgentActivityProvider — no parallel
infrastructure.

The trade-off: workshop boards render *inside* the chrome being iterated on,
which is unavoidably meta. We accept this because (a) the chrome iteration
loop still works — HMR updates both the outer chrome and the inner variants,
(b) for components that can only be exercised through real canvas interaction
(canvas frame, edit popover), being inside a real canvas is the *only* way to
see them at all.

## What gets shown, and how

Chrome falls into two categories:

**Mockable as variant gallery** — the component is a self-contained React
node and you can render N copies with different props side-by-side:
- ForkshopSidebar (mock SidebarSection arrays per variant)
- AgentReadIndicator, AgentSelectionChip (props alone surface every state)
- Engine design tokens (ColorGraph, TypographyShowcase, icons — already
  designed as galleries)

**Only renders inside a real canvas** — chrome is rendered *by* the canvas
when it places a node, so it can't be posed independently. You iterate by
exercising the canvas naturally and watching HMR:
- Canvas frame (NodeFrame / CanvasLabel / hover & selection styling)
- EditPopover, FloatingControls (only appear when you select + edit)

The workshop ships boards for both categories. Variant-gallery boards use
Gallery layout with inline-react nodes. Real-canvas-only boards use curated
content designed to surface the chrome states naturally.

## v1 Boards

Five boards, surfaced as five top-level sidebar sections at the bottom of
apps/demo's existing sidebar (after "Sitemap"). Each is its own
`SidebarSection` with `{ id, title, icon }` and a render branch in
apps/demo/app/forkshop/page.tsx, matching how "design-system" is wired today.

### 1. `engine-design-system` — Engine's own tokens

Title: "Engine design system". Sibling to the user-app design system board.

- ColorGraph for the 11 `--forkshop-*` CSS vars defined in
  packages/engine/tailwind/forkshop.css
- TypographyShowcase for engine type rules (Raveo font, sidebar/canvas type
  scales)
- Icon grid: every entry in `forkshopIcons` rendered via `<ForkshopIcon />`

Uses existing public exports (ColorGraph, TypographyShowcase, ForkshopIcon,
forkshopIcons). Reads engine CSS vars via getComputedStyle on
document.documentElement — apps/demo already imports
`@forkshop/engine/forkshop.css`, so the vars are present.

### 2. `engine-sidebar` — Mock sidebar variants

Title: "Sidebar".

Gallery of ~5 inline-react nodes, each rendering
`<ForkshopSidebar entries={...} />` with curated mock SidebarSection /
SidebarEntry arrays. Variants:
- idle (no selection)
- with-active-page (selection points into the mock tree)
- with-hover-state (one entry surfaces hover styling — exact mechanism TBD
  during impl; may need a forced-class wrapper)
- with-agent-reading-page (paired with a mock AgentActivityProvider entry
  so an indicator appears on one entry)
- deeply-nested-tree (stress test for indentation / collapse chrome)

These mock sidebars are visible alongside the *real* sidebar driving
navigation on the left of the canvas. Each variant card has a clear label
("Active page", "Agent reading", etc.) so the user can tell variants from
the real one.

### 3. `engine-agent-indicators` — Standalone agent UI

Title: "Agent indicators".

Gallery of inline-react nodes rendering AgentReadIndicator and
AgentSelectionChip across sizes, colors, positions. Wrapped in a local
AgentActivityProvider with curated mock ActivityEntry data so each variant
has the right "reading" / "selecting" state without depending on a real
agent. Uses the public `recordActivity` / `subscribe` API or direct mock
state.

### 4. `engine-canvas-frame` — Natural-state playground

Title: "Canvas frame".

Not a posed gallery — selection and edit state are global per canvas, so
each node cannot be forced into a different frame state. Instead, a curated
set of nodes exercises every frame feature:
- with label / without label
- inline-react node / iframe-route node
- big content / small content
- one node permanently tagged with mock agent attention (so the
  agent-attention frame styling is always visible)

Iteration: click / hover nodes to surface selection and hover chrome; edit
packages/engine/src/components/canvas/* and let HMR update the rendering.

### 5. `engine-edit-popover` — Trigger-and-iterate playground

Title: "Edit popover".

Same shape as the canvas-frame board but smaller and focused on chrome that
only appears once a node is selected and edit mode is entered. A handful of
representative nodes; user selects one to surface the popover and floating
controls. Not a gallery — a station.

## File layout

```
apps/demo/app/forkshop/
  engine-workshop/
    design-system.tsx       # Board 1
    sidebar.tsx             # Board 2
    agent-indicators.tsx    # Board 3
    canvas-frame.tsx        # Board 4
    edit-popover.tsx        # Board 5
    mock-data.ts            # Shared mock SidebarSection/SidebarEntry, mock ActivityEntries
```

apps/demo/app/forkshop/page.tsx gets:
- 5 new entries appended to the inline `sections` array
- 5 new render branches in the selection-dispatch JSX

No new exports from `@forkshop/engine` — workshop is implemented entirely
against the existing public API. Internal chrome (NodeFrame, EditPopover,
FloatingControls) stays internal and is exercised through real
ForkshopCanvas / ForkshopSidebar mounts, not directly imported.

## Mock data strategy

`mock-data.ts` defines:
- 1-2 mock site trees as SidebarSection arrays (one realistic shape, one
  deeply nested)
- A small library of mock ActivityEntry arrays representing distinct agent
  states (reading file X, editing block Y, selecting primitive Z)
- A small set of mock NodePositions to give workshop boards stable layout
  without writing through to apps/demo/positions.json

Everything is static — no network, no fs, no live agent feed.

## Sidebar section ordering and icons

The 5 workshop sections go *after* the existing user-app sections
(design-system, ui-components, blocks, sitemap). Order within the workshop
group: design-system → sidebar → agent-indicators → canvas-frame →
edit-popover (broad to narrow).

Icon picks (resolved during impl, all from `forkshopIcons`): something that
visually distinguishes workshop sections from user-app sections so the
sidebar doesn't read as one undifferentiated list. Candidate: a
"settings" / "wrench" style icon for all 5, or per-board icons that hint at
the chrome being iterated on.

If visual separation between user-app sections and workshop sections needs
to be stronger than icon choice alone, defer to a follow-up — adding a
visual separator would touch ForkshopSidebar's public API.

## Out of scope (v1)

- Live editing of engine source via Forkshop's agent pipeline. HMR is
  sufficient for visual iteration; routing the agent at packages/engine/src
  is a separate question that touches the live-edit mount-path contract.
- Per-component interactive control panels (state toggles). The "state grid
  + HMR" loop is the iteration model.
- Deployment. Workshop lives in apps/demo, which is not deployed.
- Component documentation, prop tables, or any docs-site presence. This is
  iteration scaffolding, not user-facing reference material.
- Coverage of every chrome component. Five boards cover what the user
  flagged; further boards added when actual iteration needs surface.

## Acceptance

- `pnpm dev` boots apps/demo
- apps/demo sidebar shows 5 new sections after the existing 4 (8 total
  selectable items at top level once expanded)
- Each workshop board renders without console errors
- Editing CSS in packages/engine/tailwind/forkshop.css or a component file
  in packages/engine/src/components/ triggers HMR and updates visible
  variants on at least one workshop board
- `pnpm check` passes (canonical-alias convention preserved; engine
  internals not deep-imported from apps/demo)

## Open questions to resolve during implementation

- Hover-state variant for the sidebar mock: ForkshopSidebar doesn't take a
  "forced hover" prop. Options: wrap with a CSS class that forces `:hover`,
  use `data-attribute` if one exists, or skip the hover variant and rely on
  manually hovering. Decide when wiring board 2.
- Agent-attention frame state for board 4 needs a mock ActivityEntry that
  tags a *specific* node ID. Confirm the engine's color-by-X hooks
  (`useAgentColorByFile`, `…ByPage`, `…ByBlock`, `…ByPrimitive`) can drive
  the frame styling we want to surface, or whether we need a different
  trigger path.
- Whether to use `Gallery` layout (uniform grid) or `PlaygroundBoard` with
  manual positions for each workshop board. Gallery is simpler; manual
  positions let you cluster related variants. Default to Gallery; switch
  per-board if the layout feels constrained.
