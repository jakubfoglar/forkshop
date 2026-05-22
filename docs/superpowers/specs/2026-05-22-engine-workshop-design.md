# Engine Workshop — Design Spec

Date: 2026-05-22
Topic: Dev surface for iterating on Forkshop engine chrome

## Goal

A dedicated Next.js app — `apps/engine-workshop` — that hosts a Forkshop
instance whose only purpose is iterating on Forkshop engine internals:
sidebar, canvas frame, agent indicators, edit popover, and the engine's own
design tokens. Optimized for "see all states side-by-side" comparison with
HMR-driven feedback. Not deployed; a dev tool only.

## Why a new app, not a route in apps/demo or apps/docs

apps/demo exists to dogfood a Forkshop install on a generic SaaS skeleton —
it tests the *user-facing scaffold*. Mixing engine-internal boards into it
would muddy that purpose: which "design system" board is the user app's,
which is the engine's? Why does the dev surface have iteration-only chrome
right next to scaffold tests?

apps/docs ships forkshop.dev. Adding a hidden internal route there means
building deployment-aware route gating and increases the surface area of the
public site.

A dedicated app is the cleanest separation. The whole app *is* the workshop:
one Forkshop mount, all boards are engine-iteration boards, nothing else
competes for attention. It costs one more workspace package; the
maintenance cost is low because the app has no business logic — just board
definitions, mock data, and a mount shell.

## Why "Forkshop within Forkshop" actually works

The workshop is itself a Forkshop installation. Its outer chrome (sidebar,
canvas, frames, edit popover) is rendered by `@forkshop/engine` — the same
package whose internals it exists to iterate on. HMR updates the outer
chrome in real time as engine source changes, and the workshop boards
inside the canvas show the same chrome posed in specific states for
side-by-side comparison. The meta-mirror is the feature.

For chrome that *can only* be rendered by a real canvas (NodeFrame,
EditPopover, FloatingControls), the workshop's own outer canvas is that
canvas — boards 4 and 5 just curate the nodes that exercise those states.

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

Five boards. Each is its own `SidebarSection` in the workshop's sidebar
config: `{ id, title, icon }` plus a render branch in the workshop's
`page.tsx`. There are *only* workshop sections — no user-app sections
competing for space.

### 1. `engine-design-system` — Engine's own tokens

Title: "Engine design system".

- ColorGraph for the 11 `--forkshop-*` CSS vars defined in
  `packages/engine/tailwind/forkshop.css`
- TypographyShowcase for engine type rules (Raveo font, sidebar/canvas type
  scales)
- Icon grid: every entry in `forkshopIcons` rendered via `<ForkshopIcon />`

Uses existing public exports (ColorGraph, TypographyShowcase, ForkshopIcon,
forkshopIcons). Reads engine CSS vars via getComputedStyle on
`document.documentElement` — the workshop's globals.css imports
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
- with-single-agent-reading (one agent on one entry, single-color
  indicator)
- with-multi-agent-activity (3-5 mock agents fanned out across different
  entries, so each agent's distinct color is visible on the sidebar
  simultaneously)
- deeply-nested-tree (stress test for indentation / collapse chrome)

These mock sidebars are visible alongside the *real* sidebar driving the
workshop's own navigation on the left of the canvas. Each variant card has
a clear label ("Active page", "Agent reading", etc.) so the user can tell
variants from the real one.

### 3. `engine-agent-indicators` — Standalone agent UI and multi-agent colors

Title: "Agent indicators".

Gallery of inline-react nodes rendering AgentReadIndicator and
AgentSelectionChip across sizes, positions, and — critically — across
multiple distinct mock agents so the engine's per-agent color assignment is
visible side-by-side.

Variants include:
- Single-agent: one agent reading / selecting (baseline)
- Multi-agent fan-out: 3-5 mock agents each tagged on a different file or
  block, showing every agent's assigned color in one frame
- Same-target collision: two agents tagged on the *same* file/block, so
  the indicator's collision/stacking behavior (whatever the engine does
  today) is visible
- Size / position variants of a single indicator for spacing iteration

Wrapped in a local AgentActivityProvider with curated mock ActivityEntry
data per variant. Uses the public `recordActivity` / `subscribe` API plus
the color hooks (`useAgentColorByFile` / `…ByPage` / `…ByBlock` /
`…ByPrimitive`) to verify each entry point assigns colors consistently.

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
- two or three additional nodes each tagged with a *different* mock agent,
  so the per-agent frame color assignment is visible across nodes
  simultaneously (mirrors the multi-agent variant on board 2 and 3)

Iteration: click / hover nodes to surface selection and hover chrome; edit
`packages/engine/src/components/canvas/*` and let HMR update the rendering.

### 5. `engine-edit-popover` — Trigger-and-iterate playground

Title: "Edit popover".

Same shape as the canvas-frame board but smaller and focused on chrome that
only appears once a node is selected and edit mode is entered. A handful of
representative nodes; user selects one to surface the popover and floating
controls. Not a gallery — a station.

## App layout

```
apps/engine-workshop/
  package.json                # New workspace package
  next.config.mjs
  tsconfig.json               # Extends workspace base
  tailwind.config.ts          # Pulls @forkshop/engine into content paths
  app/
    layout.tsx                # Root layout
    page.tsx                  # Mount: ForkshopSidebar + canvas dispatch (5 boards)
    globals.css               # imports @forkshop/engine/forkshop.css
  src/
    boards/
      design-system.tsx       # Board 1
      sidebar.tsx             # Board 2
      agent-indicators.tsx    # Board 3
      canvas-frame.tsx        # Board 4
      edit-popover.tsx        # Board 5
    mock-data.ts              # Shared mock SidebarSection/SidebarEntry, mock ActivityEntries
    positions.json            # Optional, for stable node layout
```

`package.json` declares dependencies on:
- `@forkshop/engine` (workspace:*)
- `next`, `react`, `react-dom` (matching apps/demo versions)
- `tailwindcss`, `@tailwindcss/postcss` (matching workspace versions)

No `forkshopConfig` UI primitives or blocks — the workshop doesn't host a
user app, so `forkshopConfig.ui` and `forkshopConfig.blocks` either stay
empty or `defineConfig` is skipped entirely. The mount in `page.tsx`
directly defines its sidebar sections inline (same pattern as
apps/demo/app/forkshop/page.tsx).

No new exports from `@forkshop/engine` — workshop is implemented entirely
against the existing public API. Internal chrome (NodeFrame, EditPopover,
FloatingControls) stays internal and is exercised through the real
ForkshopCanvas / ForkshopSidebar mounts.

## Dev workflow

- `pnpm --filter @forkshop/engine-workshop dev` starts the workshop.
  Port is not hardcoded — Next.js defaults to 3000 and auto-increments if
  taken, so the workshop naturally falls onto a free port when apps/demo
  or any other project is already running. Override with
  `pnpm --filter @forkshop/engine-workshop dev -- -p <port>` when you want
  a specific one.
- Top-level `pnpm dev` keeps booting apps/demo as today (no change)
- Optional: add `pnpm workshop` as a top-level script alias for
  `pnpm --filter @forkshop/engine-workshop dev`

## Mock data strategy

`mock-data.ts` defines:
- 1-2 mock site trees as SidebarSection arrays (one realistic shape, one
  deeply nested)
- A roster of mock agent identities (3-5 distinct agents with stable IDs)
  used across boards 2, 3, and 4 so the same agent colors recur and
  multi-agent variants reflect a consistent cast
- Mock ActivityEntry arrays per scenario: single-agent reading,
  multi-agent fan-out across files / blocks / pages, same-target
  collisions
- A small set of mock NodePositions to give workshop boards stable layout

Everything is static — no network, no fs, no live agent feed.

## Sidebar ordering and icons

Order within the workshop: design-system → sidebar → agent-indicators →
canvas-frame → edit-popover (broad to narrow). Icon picks come from
`forkshopIcons` — chosen during impl. Since the workshop sidebar contains
*only* workshop sections, there's no user-app/internal distinction to
visually communicate.

## Out of scope (v1)

- Live editing of engine source via Forkshop's agent pipeline. HMR is
  sufficient for visual iteration; routing the agent at packages/engine/src
  is a separate question that touches the live-edit mount-path contract.
- Per-component interactive control panels (state toggles). The "state grid
  + HMR" loop is the iteration model.
- Deployment. apps/engine-workshop is a dev tool, never pushed to
  forkshop.dev or anywhere public.
- Component documentation, prop tables, or any docs-site presence. This is
  iteration scaffolding, not user-facing reference material.
- Coverage of every chrome component. Five boards cover what the user
  flagged; further boards added when actual iteration needs surface.

## Acceptance

- `pnpm install` succeeds with the new workspace package added
- `pnpm --filter @forkshop/engine-workshop dev` boots the workshop (on
  whatever port Next.js picks — 3000 if free, otherwise the next free
  port)
- The workshop sidebar shows 5 sections (design-system, sidebar,
  agent-indicators, canvas-frame, edit-popover); each renders without
  console errors
- Editing CSS in `packages/engine/tailwind/forkshop.css` or a component
  file in `packages/engine/src/components/` triggers HMR and updates
  visible variants on at least one workshop board
- `pnpm check` passes (canonical-alias convention preserved; engine
  internals not deep-imported from apps/engine-workshop)
- `pnpm build` succeeds for the new app (build is not strictly necessary
  since it's dev-only, but breaking the build means something's wrong)

## Open questions to resolve during implementation

- Hover-state variant for the sidebar mock: ForkshopSidebar doesn't take a
  "forced hover" prop. Options: wrap with a CSS class that forces `:hover`,
  use a data-attribute if one exists, or skip the hover variant and rely
  on manually hovering. Decide when wiring board 2.
- Agent-attention frame state for board 4 needs a mock ActivityEntry that
  tags a *specific* node ID. Confirm the engine's color-by-X hooks
  (`useAgentColorByFile`, `…ByPage`, `…ByBlock`, `…ByPrimitive`) can drive
  the frame styling we want to surface, or whether we need a different
  trigger path.
- Whether to use `Gallery` layout (uniform grid) or a custom layout with
  manual positions for each workshop board. Gallery is simpler; manual
  positions let you cluster related variants. Default to Gallery; switch
  per-board if the layout feels constrained.
- Whether to seed the workshop with `defineConfig` at all. Boards inside
  the workshop don't need `forkshopConfig.ui` / `.blocks`. Probably skip
  `defineConfig` and define sidebar sections inline in `page.tsx`. Confirm
  during impl.
