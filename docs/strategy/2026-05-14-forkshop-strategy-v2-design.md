# Forkshop — Strategy v2 (revised)

Date: 2026-05-14
Status: Approved — strategy only; implementation specs follow
Supersedes:
- `ravineo-web/docs/superpowers/specs/2026-05-13-forkshop-oss-strategy-design.md`
- `ravineo-web/docs/superpowers/specs/2026-05-13-forkshop-cli-registry-design.md`

This v2 supersedes the 2026-05-13 strategy after a thorough product/architecture review. The cross-cutting decisions changed materially:

| # | Topic | v1 (2026-05-13) | v2 (this doc) |
|---|---|---|---|
| 1 | Commercial path | None | Free engine + optional Pro Kits (1.x+) |
| 2 | Distribution | Pure shadcn-style (no engine package) | Hybrid: engine as `@forkshop/engine` npm package; surface as files |
| 3 | License | MIT | FSL-1.1-Apache-2.0 for engine; MIT for user-surface files |
| 4 | Concepts | kits + primitives + blocks + pages + sections + entries (~8) | Node / NodeType / Layout / Board (4) — _Kit removed; see refinement #14_ |
| 5 | Plugin architecture | None | NodeType plugin contract (formal, user-extensible) |
| 6 | Drill-in | Hardcoded to ResponsiveFrameView | Removed for 1.0; each sidebar leaf is its own board (see "Strategy refinements" at the bottom) |
| 7 | Kits at 1.0 | 3 named board layouts | No OSS kits at 1.0 — setup skill v2 composes Boards from recipes (refinement #14) |
| 8 | Live AI | Ravineo-flavored, single producer | Vendor-neutral protocol; Claude Code pack ships at 1.0 |
| 9 | Styling | User installs Tailwind preset | Engine ships compiled CSS; framework-agnostic at 1.0 (any CSS-vars-emitting system works for Design System — refinement #17) |
| 10 | Sidebar customization | Fixed shape | Fixed shape (intentionally no public customization API) |
| 11 | Icons | `iconoir-react` dep | Built-in SVG set, no external dep |
| 12 | Package name | `@forkshop/registry` (private) | `@forkshop/engine` (published) |

---

## Goal

Open-source Forkshop as a canvas + sidebar tool for visualizing structured sets of React things in Next.js App Router projects. Tailwind is the most common styling layer (and the only one with config-file token discovery shipped at 1.0), but **not a hard requirement** — any styling system that compiles tokens to `:root` CSS variables (Tailwind v4, Panda CSS, Vanilla Extract, Stitches, hand-written CSS) works (refinement #17). Component dev / design systems is the flagship use case; docs sites, marketing sites, and content libraries are explicitly part of the audience.

Every install is conceptually unique — Claude Code helps the user set Forkshop up against *their* project's components and pages, and the user owns the thin surface files afterward. The heavy engine lives as a maintained npm package that updates without manual intervention.

## Mode

Four blended motivations, in priority order:

1. **A real community tool** — actually usable, documented, opinionated defaults. Self-serve setup via Claude Code.
2. **Light maintenance posture** — issues open with no SLA, drive-by PRs welcome, no review obligation. Stingy with named exports; every public engine API is a forever commitment under semver.
3. **A small income from Pro Kits** — paid kits arrive in 1.x once the OSS engine has stabilized. No cloud infrastructure, no hosted features, no team SaaS. Pro Kits ship as paid npm packages.
4. **Portfolio artifact** — demos the "always show the real thing, edit in place" philosophy.

The v1 strategy's *"No commercial path. The shipped artifact is the message"* is revised to: *"No commercial path at 1.0. Pro Kits arrive in 1.x once the engine is stable; the OSS engine stays free forever."* (Refinement #14: the original "three free starter kits" prescription was dropped during spec #4 — the setup skill composes Boards from recipes instead.)

## Audience & positioning

Forkshop is **a canvas + sidebar tool for visualizing structured sets of React things in Next.js App Router projects.**

- Flagship use case: component dev / design systems
- Explicit secondary audiences: docs sites, marketing sites, content libraries
- Locked stack: Next.js App Router + React 18+
- Recommended (most common): Tailwind for styling. Refinement #17: not required — any styling system whose tokens compile to `:root` CSS variables (Tailwind v4, Panda CSS, Vanilla Extract, Stitches with `--token` pattern, hand-written CSS) works for the Design System Board. Non-CSS-vars systems (CSS-in-JS without `:root` emission) still work for every Board except Design System.
- Non-audience: Pages Router, Vite, Remix, non-React, real-time multi-user collab

## Conceptual model

Four concepts replace the previous ~8 (kits, primitives, blocks, pages, sections, entries, canvas nodes, sidebar rows). From atomic to composite. (Originally five — `Kit` was dropped in refinement #14 once the setup skill took over project-aware scaffolding.)

### Node

A positioned instance on the canvas. Has `(x, y)`, a `kind`, and content. The `kind` discriminator selects rendering shape:

- `inline-react` — interactive React rendering inline on the canvas. Used for small primitive showcases (button, badge, input).
- `iframe-route` — full-page iframes of Next.js routes (pages). Wrapped in an iframe-host with wheel forwarding and body-height sync.
- `iframe-component` — component-preview iframes (blocks). Same iframe-host plumbing as `iframe-route`.

### NodeType

A plugin defining a *kind* of node: how it matches, how it renders, and how it ties into the agent-activity system.

Built-in NodeTypes at 1.0:

- `inline-react` — interactive React renders (primitives, variants)
- `iframe-route` — iframes of full Next.js routes (pages)
- `iframe-component` — iframes of component-preview routes (blocks)

User-side NodeTypes can live in `app/forkshop/node-types/`. Community packages (`@forkshop/remotion`, `@forkshop/react-pdf`, etc.) can ship NodeType bundles in 1.x.

**NodeType contract:**

```ts
interface NodeType<T extends AnyNode> {
  id: string
  match: (node: AnyNode) => node is T
  render: (props: RenderProps<T>) => ReactNode
  agentMatch?: (node: T, activity: AgentActivitySnapshot) => AgentMatchResult
}
```

`agentMatch` lets each NodeType declare how it maps to the agent-activity snapshot (which exposes `pages`, `blocks`, and `primitives` sets). It replaces the older `activityKey` field — instead of returning a single string for the engine to look up, the NodeType performs the match itself and returns whether the node is active plus an optional file label.

**Single-node views.** Each sidebar leaf maps to its own board. There is no canvas-double-click "drill-in" mechanism at 1.0 — the engine stays simple, with one source of truth (selection) for what's currently on the canvas. Showing a single block or page in a responsive multi-viewport view is the job of the `ResponsiveFrameView` Layout; kits compose boards out of Layouts. Future versions may add a canvas-level drill-in affordance, but the architecture preserves the option to do this cleanly because Layouts are positioning-only and NodeTypes own their rendering.

### Layout

An engine-shipped React component that arranges multiple nodes on a Board. Four Layouts at 1.0:

| Layout | What it does | Source file |
|---|---|---|
| `Gallery` | Stack or grid of iframe nodes at a single viewport width | `layouts/gallery.tsx` |
| `Tree` | Filesystem-discovered routes as a hierarchical sitemap | `layouts/tree.tsx` |
| `DesignSystemView` | Color tokens as a graph (raw ↔ semantic edges) + primitive frames + typography | `layouts/design-system-view.tsx` |
| `ResponsiveFrameView` | One iframe source rendered at multiple viewport widths (default 1440 / 768 / 375) | `layouts/responsive-frame-view.tsx` |

**Naming convention.** Short evocative names for simple Layouts (`Gallery`, `Tree`); `*View` suffix for compositional Layouts that arrange multiple sub-views around a single concept (`DesignSystemView`, `ResponsiveFrameView`).

Layouts are strict (typed prop interfaces), not user-extensible at 1.0. Custom rendering happens at the NodeType level (inside cells of a Gallery), not the Layout level. If a Layout doesn't fit, the user adjusts via NodeType or accepts the constraint — adding a new Layout is a contribution path, not a user extension point.

### Board

A configured tab in the user's sidebar (e.g., "Components", "Pages", "Foundations"). One Board = one Layout + its data. The user sees Boards in their sidebar; the user's `forkshop init`-chosen kit decides which Boards exist and what they're called.

### Kit (superseded — see refinement #14)

> **Status:** removed at 1.0. The setup skill v2 composes Boards from a recipe set (Design System, UI Components, Blocks, Sitemap, Reference) based on detected project signals. The Kit concept may return in a later release if a real plugin contract emerges. The original Kit definition is preserved below for historical context only.

A project-type starter pack. One kit per project type (`marketing`, `saas`, `default`). A kit ships three things into the user's repo:

1. **A kit config file** (`app/forkshop/<kit>.tsx`) — exports a `KitConfig`: which Layouts to instantiate, default sidebar order, the names of each Board.
2. **A scaffolded `forkshop.config.tsx`** — pre-populated with example primitives (showing variant patterns inline), example blocks, project-type-appropriate defaults.
3. **A scaffolded `page.tsx`** mounting the canvas + sidebar.

**Mental chain:** *"I'm a [project type], I install the [kit] that gives me the right [Boards] of [Nodes], which the engine renders using [NodeTypes]."*

## Engine surface & distribution

Forkshop ships as three artifacts in production.

### 1. `@forkshop/engine` — the npm package

Everything the user shouldn't need to read or modify. ~7,000 LOC.

- Canvas engine: pan, zoom, virtualization, drag-position persistence
- Sidebar shell: fixed shape, selection state
- NodeType plugin contract + built-in NodeTypes (`inline-react`, `iframe-route`, `iframe-component`)
- Layouts: Gallery, Tree, DesignSystemView, ResponsiveFrameView
- Hooks: iframe wiring (edit, spacing, preview, block-dblclick, draggable-node)
- Lib: token-registry, system-graph, system-layout, system-snap, edit-mode, inspect-element, file-to-selection, spacing-classes, sitemap-tree, agent-activity-state
- API route handlers (re-exported by user's `app/api/forkshop/*`)
- Agent-activity SSE plumbing (receive side of multi-agent live AI)
- Locator.js bridge for open-in-editor
- Compiled `forkshop.css` (Tailwind → CSS at engine build time)
- Built-in SVG icon set (~25-40 icons, no external icon dep)
- Raveo font woff2 binaries

Peer dependencies: `react`, `react-dom`, `next`. Tailwind no longer required by the engine.
Runtime dependencies: `clsx`, `@locator/runtime` (dynamic-imported, opt-in).

**Production-mode degradation:** the engine detects `process.env.NODE_ENV === "production"` and gracefully disables editing-specific features (text editing, Locator.js bridge, live AI receive-side endpoints) without breaking the canvas. Production-mode Forkshop is **read-only by default** — canvas, sidebar, navigation, and node rendering all work; editing surfaces and developer-tooling surfaces don't. This is a 1.0 design constraint, not a feature — it makes clean room for future Pro Kits (notably `@forkshop-pro/collab`) to *add* production-side capabilities (comments, presence, suggestions) without requiring engine changes after release.

License: **FSL-1.1-Apache-2.0** (Functional Source License with Apache 2.0 conversion after 2 years per version).

### 2. User surface — copy-paste files

Total ~250-300 LOC across all files. Dropped by `npx forkshop init`:

```
app/forkshop/
  page.tsx                      mounts canvas + sidebar (scaffolded per kit)
  <kit>.tsx                     kit config: Layouts → Boards wiring
  forkshop.config.tsx           user's content: primitives, blocks, pages
  CLAUDE.md                     auto-loaded Forkshop mental model
app/api/forkshop/
  edit/route.ts                 one-line re-export from engine
  positions/route.ts            one-line re-export
  agent-activity/route.ts       one-line re-export
  agent-activity/stream/route.ts one-line re-export
.claude/skills/
  forkshop-setup.md             setup skill (one-time use during install)
  forkshop-live-editing.md      agent cadence guidance (auto-loads on edits)
  forkshop-doc-sync.md          user-invoked when installation drifts
public/fonts/forkshop/
  raveo-*.woff2                 font binaries (kept as files for browser loading)
```

Plus one line added by setup skill to `tailwind.config.ts` (optional preset). Optional: one line added to `next.config.ts` for Locator.js loader (opt-in during setup).

License: MIT (so users can freely modify their installed scaffolds).

### 3. Pro Kits — `@forkshop-pro/*` npm packages

Sold as paid scoped packages. Each Pro Kit ships a Kit + any extra NodeTypes / Layouts it needs. Gated by license key validated at runtime. Users install with their npm auth token after purchase. The free engine never refuses to start due to missing licenses — Pro Kits simply don't activate without a valid key.

License: proprietary / commercial. Not OSS.

### Update flow

- Engine fixes: automatic via `pnpm up @forkshop/engine`.
- Surface fixes (skills, route stubs, kit scaffolds, CLAUDE.md): manual via `npx forkshop update` (bulk) or `npx forkshop diff <file>` (single).
- Pro Kit updates: automatic via npm semver per pro package.

## Kits at 1.0 (superseded — see refinement #14)

> **Status:** the audience-specific kits described in this section did **not** ship at 1.0. The setup skill v2 (`docs/specs/2026-05-17-setup-skill-v2-design.md`) replaced them with a recipe-driven multi-Board scaffold. The section below is preserved for historical context.

Three audience-specific starters + Default fallback. Setup skill uses project-type heuristics (lockfiles, route group patterns, auth library, MDX dirs, viewport meta) to recommend a kit; user picks.

| Kit | Audience | Default Boards | Notes |
|---|---|---|---|
| `marketing` | Public marketing sites, landing pages, blogs | Foundations, Blocks, Pages, Navigation | All routes public, data static. Forkshop's Ravineo heritage. |
| `saas` | Authenticated product apps | Design System, Components, Layouts, Public Pages | Auth'd routes use preview-flag pattern; Pages Board gated to public-only by default. |
| `default` | Generic / hybrid / unrecognized | Components, Pages | Fallback when project type can't be detected. Conservative; user manually adds more Boards. |

**MDX-aware:** if MDX is detected in the user's repo (look for `*.mdx`, `@next/mdx` in `package.json`, a `content/` dir), the setup skill adds a **Reference Board** (Tree layout pointing at MDX paths) to whichever kit is being installed. MDX handling is a parameter of any kit, not a kit identity.

**Mobile-aware:** if `viewport-fit=cover` is detected in the user's viewport meta, the setup skill flags the kit's Gallery Boards to use single-viewport (375px) instead of 3-viewport stack.

Each kit is ~150-300 LOC: kit config file + scaffolding examples. Maintenance load is small because they're configuration data, not algorithms.

## Pro Kits at 1.x and beyond

**Principle:** anything expressible as a composition of existing Nodes + Layouts (variants matrix, responsive 3-viewport view, theme inspection via the token registry) stays **free** — kits scaffold examples. **Pro is reserved for genuinely new capability that requires new engine code.**

### Pro Kit candidates

Two substantial Pro Kits anchor the paid tier vision. Neither ships at 1.0; they're sequenced post-1.x once the engine is stable.

**`@forkshop-pro/compose-mode`** — *Flagship at first Pro launch.*

Drag-to-reorder page sections, commit changes back to TSX source. The long-deferred page composer. Real Framer/Webflow-tier capability. New engine capability (drag-reorder + source-mutation path) — not expressible as a composition of existing nodes. Runs in local dev only.

**`@forkshop-pro/collab`** — *Larger feature; later release.*

Production-mode collaboration layer. Coworkers visit `app.com/forkshop` on the user's deployed app and can:
- Leave **comments** anchored to specific Nodes / DOM paths
- Propose **copy suggestions** that sync back to local dev as applyable diffs
- See **live cursors** of other viewers (presence)
- Trigger **applyable suggestions** in local Forkshop that route through the engine's `edit-mode.ts` codepath to rewrite TSX

The same canvas runs in two modes (already supported by the engine's production-mode degradation):
- **Production mode** — read-only canvas, outbound suggestions/comments, presence
- **Local dev mode** — full editing, inbound suggestions/comments, can apply

**Infrastructure: managed by Forkshop, runs on third-party services under the hood.**

The Pro Kit ships in a "managed backend" mode by default — customer pastes their license key and it just works. No Supabase, no Postgres, no Pusher account to set up on the customer's side. The backend is a thin coordination layer (Cloudflare Worker, ~50-100 LOC) that you operate, with the heavy lifting (real-time + storage) outsourced to a managed service (likely PartyKit + Cloudflare D1/KV).

Realistic ops cost at indie scale: $0-30/mo, growing to ~$50/mo as paid users scale. You don't run servers; Cloudflare and PartyKit do.

A `self-hosted` mode is documented as an escape hatch for regulated industries / data-sovereignty asks, but is not the default.

### Pricing model

Deferred to closer to Pro launch. Either one-time per-project (indie-friendly, share-and-forget energy) or recurring subscription (cleaner scaling economics). To be decided based on Pro Kit cost profile and market signal.

### Domain for managed backend

Likely `collab.forkshop.dev` (sub-domain of the docs site). Deferred to implementation.

### Future Pro Kit candidates

Pro Kit expansion is demand-driven, not pre-committed. Possible additions if demand emerges: responsive matrix layouts (only if Gallery's existing 3-viewport flag isn't enough), theme designer, variants matrix, visual regression snapshots in CI. Don't ship a slate at launch — start with compose-mode, validate the model, then collab, then expand from real signal.

## Live AI awareness (multi-agent)

Core 1.0 capability, not deferred.

### Receive side (in `@forkshop/engine`)

Already partially built as a no-op shell in the registry. Ships activated:

- `AgentActivityProvider` context
- `AgentSelectionChip` visual indicator (per-Node glow + agent badge)
- `AgentIframeRelay` for cross-frame messaging
- `/api/forkshop/agent-activity/stream` SSE endpoint
- `deriveAffectedBlocks` and friends — derive "which Boards / Nodes are affected by file X"

### Producer protocol (new at 1.0, vendor-neutral)

```
POST /api/forkshop/agent-activity
{
  "agent": "claude-code" | "cursor" | "codex" | "custom-...",
  "agentLabel": "Claude" | "Cursor" | ...,
  "color": "#A855F7",                                          // optional, chip color
  "file": "components/ui/button.tsx",
  "action": "read" | "edit" | "create" | "delete",
  "ts": 1747204200000,
  "region": { "startLine": 120, "endLine": 160 }               // optional, attention heatmap
}
```

Any agent that can POST JSON is a producer. Agent identity is just a string in the payload — no per-LLM SDK or special protocol required.

### Producer packs

**Ships in 1.0:**

- **`@forkshop/agent-claude-code`** — drops `.claude/hooks/post-tool-use.sh` snippet and `.claude/settings.json` entry. Forwards Write/Edit tool results to the activity endpoint. Opt-in during `forkshop init`.

**1.x candidates:**

- `@forkshop/agent-cursor` — Cursor rules file + extension or hook
- `@forkshop/agent-codex` — Codex tool-result bridge
- Community packs as needed

### Chunked-editing cadence (also 1.0)

Behavioral guidance to agents: prefer many small Edit operations over wholesale file rewrites; iframe HMR shows the file build up under the user's hands.

Mechanism — **zero edits to user's project CLAUDE.md or settings.json**:

1. **`.claude/skills/forkshop-live-editing.md`** — Forkshop-scoped skill, auto-loaded by Claude Code via description triggers. Self-contained; one-time install via `forkshop init`.
2. **`app/forkshop/CLAUDE.md`** — Forkshop directory CLAUDE.md includes a cadence note (auto-loaded when working in `app/forkshop/`).
3. **Reactive hook feedback** — the activity hook detects large rewrites of Forkshop-watched files and injects a system reminder back to the agent to chunk next time. Self-correcting.

For non-Claude-Code agents: Cursor `.cursorrules` equivalent ships with the Cursor producer pack in 1.x.

## Styling pipeline

**Engine internal Tailwind compiles to plain CSS at engine build time.**

- Engine source uses Tailwind classes ergonomically. Build pipeline (tsup + Tailwind CLI / PostCSS) emits a single `forkshop.css` shipped inside the package.
- User adds one line to root layout: `import "@forkshop/engine/forkshop.css"`. Engine is themed. No Tailwind content-scanning of `node_modules`.
- User's own code (boards, primitives) stays Tailwind-native. Engine and user CSS coexist cleanly (engine classes are `forkshop-*` namespaced).

**No user-facing theme system at 1.0.** Forkshop ships its visual identity as-is. The `forkshop-*` CSS variables stay internal — not a public extension point. If theme customization becomes a real demand, it's a 2.0 feature with proper design.

**Icons:** built-in SVG set inside the engine (~25-40 icons). No `lucide-react`, `iconoir-react`, or other external dep. Each icon is a small React component, fully tree-shaken. Users continue to use any icon library they want in their *own* primitives — Forkshop doesn't impose.

**Font:** Raveo (the bundled default) ships as woff2 binaries copied to `public/fonts/forkshop/` by `forkshop init`. Engine CSS references them via relative URLs. No font override path at 1.0.

**Tailwind v3 vs v4:** compiled CSS is plain CSS — works with any Tailwind version (or none) on the user's side. For users who want `forkshop-*` tokens available in their *own* Tailwind code:

- `@forkshop/engine/tailwind` — Tailwind v3 preset
- `@forkshop/engine/theme.css` — Tailwind v4 `@theme` block

Setup skill picks the right one based on the user's Tailwind major version (detectable in `package.json`).

## Roadmap

The hard rule: **refactor before public release.** 1.0 ships on the new architecture. No public 0.x with the old shape that breaks compat later.

### 1.0 — The launch release (~4-6 weeks focused work)

**Architecture refactor:**

- `@forkshop/engine` npm package (publishable, ESM, sourcemaps, `"use client"` preserved)
- Compiled-CSS pipeline (tsup + Tailwind CLI in the engine build)
- Built-in SVG icon set (replaces `lucide-react` / `iconoir-react`)
- Drop `motion` dependency (already unused)
- NodeType plugin contract + 3 built-in types (`inline-react`, `iframe-route`, `iframe-component`)
- Layouts as engine code (Gallery, Tree, DesignSystemView, ResponsiveFrameView)
- Sidebar shell (fixed shape, no public customization API)

**Engine capabilities (mostly already built, polished + renamed):**

- Canvas pan / zoom / virtualization / drag-position persistence
- Live text editing → save to TSX (dev mode only — production-mode degradation disables it)
- Open-in-editor via Locator.js (opt-in at setup; dev mode only)
- Token registry
- API route handlers (re-exported from user's `app/api/forkshop/*`)
- Production-mode degradation (canvas + sidebar work in production; editing features cleanly disabled)

**Multi-agent live AI:**

- Vendor-neutral producer protocol
- Receive-side plumbing (activate the existing no-op shell)
- `@forkshop/agent-claude-code` producer pack
- Reactive feedback line in the hook (catches full-file rewrites)
- `.claude/skills/forkshop-live-editing.md`

**Setup skill v2 — recipe-driven multi-Board scaffolds at launch** _(replaces the originally planned "Kits at launch" — refinement #14):_

- Recipes: Design System, UI Components, Blocks, Sitemap, Reference
- MDX detection + Reference Board signal
- Mobile detection + single-viewport flag
- Auth library detection + Sitemap public-only filter

**CLI:**

- `init`, `add <kit>`, `diff <path>` (existing design preserved)
- **`update`** — bulk-pull thin user-owned files with consent (new at 1.0)
- Stale-skill prompt on dev server start (small ergonomic touch)

**Skills (shipped via init, in `.claude/skills/forkshop-*`):**

- `forkshop-setup.md`, `forkshop-live-editing.md`, `forkshop-doc-sync.md`

**Docs site (`apps/docs`):**

- Install guide, kit reference, NodeType API reference, customization guide, examples
- Hosts `/r/manifest.json` (thin scaffolds only — engine is on npm)
- Playground deployed as visual demo

### 1.x — Post-launch polish

Demand-driven from real users:

- **Live spacing editing** (deferred from 1.0 to reduce launch scope; the engine code exists, just isn't shipped as an active feature at launch)
- `@forkshop/agent-cursor` and `@forkshop/agent-codex` producer packs
- Community-driven producer packs (light triage)
- Activity timeline panel in the sidebar (if it feels missing in practice)
- Additional free kits (`mobile-app`, `content-library`, `ecommerce`) if real audiences ask
- Polish + bug fixes

### First Pro launch — After 1.x stabilizes

- `@forkshop-pro/compose-mode` — flagship at first Pro launch (local dev only, no backend infra)
- License-key infrastructure (Stripe / Lemon Squeezy / Polar — pick the simplest)
- Pricing decided closer to launch
- Pro docs page added to `apps/docs`

### Second Pro launch — `@forkshop-pro/collab` (later)

Substantial follow-on Pro Kit adding production-mode collaboration. Requires:

- Managed backend (Cloudflare Worker + PartyKit + D1/KV)
- Per-customer data routing via license keys
- Production / local sync (the engine's production-mode degradation makes this clean)
- Documentation for self-host escape hatch

Realistic timing: at least a few months after the first Pro launch. Treat as its own substantial milestone, not a quick follow-up.

### Pro expansion beyond

Demand-driven; one Pro Kit at a time. Don't pre-commit to a slate.

### Deferred indefinitely (OSS-side)

- Cloud sync of canvas state, hosted previews, version history (no near-term plan)
- Multi-user collaboration features as OSS — **comments, live presence, suggestions arrive as paid `@forkshop-pro/collab` (later Pro launch)**, not as OSS features
- Pages Router / Vite / Remix support
- User-facing theme customization
- Custom Layouts as a user extension
- EdgeType plugin contract / flow-graph kit (could promote to 1.x if a real use case surfaces)
- `forkshop eject` (turning Pro Kit npm packages into copy-paste files)
- Telemetry / analytics
- Standalone CLI wizard

### Sequencing within 1.0

Proposed internal build order:

1. **NodeType + Layout extraction** (~2 weeks) — define contracts, port existing canvas/sidebar/iframe primitives into NodeType + Layout shapes.
2. **Engine packaging** (~1 week) — tsup build, compiled CSS, icon set, drop `motion`.
3. **CLI rework** (~1 week) — new init flow (installs engine, scaffolds thin surface). New `update` command.
4. **Setup skill v2** (~1 week) — recipe-driven multi-Board scaffolding (shipped; the kits rewrite was reframed in refinement #14).
5. **Multi-agent protocol + Claude Code pack** (~1 week) — SSE producer side, `@forkshop/agent-claude-code`.
6. **Docs site + playground refresh** (~1 week) — kit reference, NodeType API docs, install guide.

## Repo structure

```
jakubfoglar/forkshop  (single repo, pnpm workspaces)
  packages/
    cli/                       The `forkshop` npm package (CLI binary).
    engine/                    The publishable @forkshop/engine package.
                               Renamed from `registry`. Contains canvas, sidebar,
                               NodeTypes, Layouts, hooks, lib, API routes,
                               compiled CSS, SVG icons, fonts.
    agent-claude-code/         The @forkshop/agent-claude-code producer pack.
                               Small, separate, optional install.
  apps/
    docs/                      Next.js docs site, deployed to forkshop.dev.
                               Hosts /r/manifest.json (thin scaffold manifest).
                               Hosts woff2 binaries.
    playground/                Live demo. Visual-regression target.
                               The only way to demo multi-agent live AI in docs.
  docs/strategy/               Strategy specs (this directory).
  CLAUDE.md                    Maintainer guide.
  LICENSE                      FSL-1.1-Apache-2.0
  README.md                    Short — points at forkshop.dev.
```

Two structural changes from v1:

1. `packages/registry/` → `packages/engine/` — name matches the npm package; stops conflating with the manifest endpoint.
2. New `packages/agent-claude-code/` for the producer pack.

CLI shrinks: installs `@forkshop/engine` + drops thin scaffolds + writes `forkshop.json`. The manifest at `/r/manifest.json` shrinks from ~250KB to ~30KB because the engine is no longer embedded.

## Audience-aware setup

Setup skill heuristics (preserved and refined from v1):

| Signal | Project type | Recommended kit |
|---|---|---|
| Static `page.tsx` files, MDX/blog dir, no auth library | Marketing | `marketing` (+ Reference Board if MDX detected) |
| Clerk / Auth.js / Lucia / iron-session / Auth0 present; `(authenticated)` or `(dashboard)` route groups | SaaS | `saas` (Pages Board gated to public-only by default) |
| `viewport-fit=cover`, mobile-first stylesheet | Mobile flag on any kit | Single-viewport Gallery instead of 3-viewport stack |
| Mixed signals | Hybrid | Present both kit options; user picks |
| Unrecognized | Generic | `default` |

These live in markdown — Claude applies judgment, doesn't strict-match. The user can always override.

**Auth-aware previews** (preserved from v1): same-origin iframes carry cookies automatically, so ~95% of Next.js apps with cookie-based session auth work out of the box for logged-in pages. Edge cases (bearer-token-only auth, per-user state preview) use the `forkshop_preview=...` query flag pattern documented in the docs site. The setup skill prints a one-liner pointer to the auth docs in the final summary.

## License

**Engine + free kits: FSL-1.1-Apache-2.0** (Functional Source License).

- Anyone uses Forkshop in their own projects for free — individual, company, commercial product, internal tool, anything.
- Anyone reads, modifies, and forks the source for their own use.
- Contributions back are encouraged.
- **Restricted:** offering Forkshop *itself* as a commercial product or service (e.g., a hosted "Forkshop as a SaaS" or a competing Pro Kits marketplace) is not permitted for the first 2 years per version.
- After 2 years, each version automatically converts to Apache 2.0 (fully permissive).

**User-surface files: MIT.** So users can freely modify their installed scaffolds without FSL restrictions on their own code.

**Pro Kits: commercial proprietary license.** Users get a usage license per Pro Kit purchase. Not OSS.

This blends real protection (against commercial competing use) with strong adoption-friendliness (any non-competing use is fully permitted).

## Maintenance posture

- **Issues open, no SLA.** Triage when you want.
- **PRs welcome, no review commitment.** Drive-by fixes merge if obviously clean; complex changes may stall.
- **"Be stingy with named exports."** Every public engine API is a forever commitment under semver. Default to letting users compose existing primitives over adding new named exports.
- **Releases on your schedule.** No deploy cadence.

## Documentation

**Three CLAUDE.md files at 1.0, distinct audiences:**

1. **User-project `app/forkshop/CLAUDE.md`** — dropped by `forkshop init`. Documents Forkshop's mental model: the 4 concepts (Node / NodeType / Layout / Board), how to add a Board, how live AI works, the NodeType API reference, common config edits. Auto-loaded by Claude Code when working in that directory. **Highest-leverage adoption item** — means "Claude can help me extend my Forkshop" works on day one without external docs.
2. **Maintainer `CLAUDE.md` at OSS repo root** — documents the monorepo: how to add a Layout, NodeType, kit, producer pack, registry build, conventions, release cadence, what NOT to put in the OSS.
3. **Forkshop-scoped agent skills in `.claude/skills/forkshop-*`** — setup, live-editing cadence, doc-sync.

**Docs site (`apps/docs`):** user-facing browsable docs. Installation, kit reference, NodeType API reference, customization guide, examples, license + commercial info. Not exhaustive; points at the in-repo CLAUDE.md for deep edits.

## Out of scope at 1.0

These are not in 1.0. Some return as paid Pro Kits later (specifically `@forkshop-pro/collab`); the rest stay deferred.

- Cloud sync of canvas state, hosted previews, version history (deferred)
- Comments, live presence, copy suggestions in OSS form — return as **paid `@forkshop-pro/collab`** in a later Pro launch
- Live spacing editing (moved to 1.x — code exists, just not shipped as an active feature at launch)
- Pages Router / Vite / Remix support (deferred)
- User-facing theme customization (deferred)
- Custom Layouts as user extension (deferred)
- EdgeType plugin contract (deferred; could promote if demand surfaces)
- `forkshop eject` (deferred)
- Standalone CLI wizard (skill-driven setup is the only documented path)
- Telemetry (deferred)

## Downstream specs

This strategy answers cross-cutting questions. Implementation is broken into separate specs (to be written next):

1. **NodeType + Layout extraction** — extract the engine surface from the existing registry, define the NodeType plugin contract, refactor `canvas-node.tsx` into a type-dispatcher, port existing primitives into NodeType + Layout shapes, define `RenderProps` TypeScript shapes.
2. **Engine packaging + compiled CSS pipeline** — tsup build, Tailwind compile step, SVG icon set, `"use client"` preservation, sourcemaps, dependency cleanup, exact `package.json` exports map for `@forkshop/engine`.
3. **CLI rework** — new `init` flow (installs engine, scaffolds thin surface, drops kit-specific files), `update` command, updated manifest schema (thin scaffolds only).
4. **Setup skill v2** — recipe-driven multi-Board scaffolding (Design System, UI Components, Blocks, Sitemap, Reference), signal-detection logic, project-type narrative. Shipped — see `docs/specs/2026-05-17-setup-skill-v2-design.md`.
5. **Live AI protocol + Claude Code pack** — vendor-neutral producer protocol, SSE wiring, `@forkshop/agent-claude-code` package, reactive feedback hook.
6. **Docs site refresh** — kit reference, NodeType API docs, install guide, examples; updated manifest endpoint.

## Open questions deferred to implementation specs

- Exact NodeType contract TypeScript shape (`RenderProps` parameter details)
- Manifest schema v2 (thinner — just scaffolds)
- License-key infrastructure choice (Stripe / Lemon Squeezy / Polar) — deferred to Pro launch
- Exact `package.json` exports map for `@forkshop/engine`
- Tailwind v3 vs v4 preset shape

These are implementation details, not strategy. Settled in the downstream specs.

## Strategy refinements after initial drafting

The following decisions were made after the strategy v2 spec was drafted, during the NodeType + Layout extraction implementation and follow-up cleanup. They refine but don't supersede the v2 vision.

**1. Four Layouts at 1.0, not three.** `ResponsiveFrameView` was promoted from a drill-in implementation detail to a standalone Layout because the responsive multi-viewport view is a high-value use case for web pages and benefits from evolving on its own track.

**2. Drill-in removed for 1.0.** The original spec had per-NodeType `drillIn` functions and engine-managed drill-in mechanics. In practice the layering between selection state, drill state, and canvas chrome accumulated complexity without earning its keep. Removed entirely for 1.0; each sidebar leaf is its own board. Future versions can re-introduce canvas-driven drill-in if a use case demands it.

**3. `agentMatch` replaces `activityKey`.** The original NodeType contract had a single-string `activityKey(node) => string` field, with the engine doing the lookup. The new shape gives each NodeType a richer matcher: `agentMatch(node, snapshot) => { active, fileLabel? }`. This lets user-defined NodeTypes plug into the agent-activity system on their own terms.

**4. `NodeType.defaultMode` / `enterMode` removed.** These existed to gate drill-in behavior. Without drill-in they have no consumers.

**5. Layout naming convention.** Short evocative names for simple Layouts (`Gallery`, `Tree`); `*View` suffix for compositional Layouts (`DesignSystemView`, `ResponsiveFrameView`). The `DesignSystemBoard` → `DesignSystemGraph` → `DesignSystemView` evolution converged here.

### Refinements from engine packaging (2026-05-16 → 2026-05-17)

The following decisions emerged while implementing the engine packaging spec (`docs/specs/2026-05-16-engine-packaging-design.md`). They refine the strategy without superseding the v2 vision.

**6. Icon set is paid + bundled, not hand-rolled.** Strategy v2 imagined a hand-rolled ~25–40-icon SVG set as a built-in engine asset with no external dep. Reality: we adopted `@central-icons-react/square-outlined-radius-0-stroke-2` (paid, by iconists.co) as a build-time devDep. Tsup bundles the imported icons' SVG markup into `dist/`, so the published `@forkshop/engine` artifact has zero runtime icon dependency. The license-key cost (`CENTRAL_LICENSE_KEY` env var) lives entirely on the maintainer side; downstream Forkshop users never see it. License attribution lives in `packages/engine/LICENSE-icons.md`.

**7. Locator opt-in flow is gone; Option-click is built in.** Strategy v2 had Locator.js as a runtime opt-in during `forkshop init` (`@locator/runtime` dynamic-imported, user toggles "yes Locator" / "no Locator"). Reality: the engine ships a homegrown `EditorLink` component as a built-in (always available in dev, no opt-in question). It reads `data-locatorjs` DOM attributes that `@locator/webpack-loader` stamps at build time. We kept the upstream loader (build-time only devDep in the host project; doesn't ship in production bundles) and dropped `@locator/runtime` entirely — the part with the solid-js peer-dep landmine and the Locator-branded UI chrome we didn't want. The CLI rework spec's `init` flow has one fewer opt-in question. The 1.x polish backlog still includes a path to replace the upstream loader with a homegrown ~80-line webpack loader if we want to eliminate the last external dep.

**8. pnpm v11 lifecycle config moved to `pnpm-workspace.yaml`.** Strategy v2 referenced `pnpm.onlyBuiltDependencies` in root `package.json` for restricting which deps may run install scripts. pnpm v11 replaced this with `allowBuilds` in `pnpm-workspace.yaml`. We use both for forward-compat. The iconists icon package + `esbuild` are the two entries on the allowlist.

**9. CLI runtime install flow is broken between engine packaging and CLI rework, by design.** Engine packaging committed the engine to dist (`./dist/index.js` instead of `./src/index.ts` resolution), made the engine source import `@central-icons-react/...` (consumers can't resolve without a license key), and dropped the `_debugSource` fiber path. The CLI's existing file-copy `init` would now drop broken files into user projects. This is the documented gate: no public release between engine packaging (#2) and CLI rework (#3). The playground continues to work because it consumes the engine via `workspace:*` symlink, not via the broken CLI flow.

**10. The current `apps/playground/` will be replaced wholesale during CLI rework.** It carries Ravineo-flavored host content (Acme placeholder copy, hero blocks using `bg-forkshop-accent`/`text-forkshop-accent-fg`, employee bios) that pre-dates strategy v2's "no theme system at 1.0" stance. Strategy says hosts should not use `forkshop-*` tokens in their own code; the current playground does. CLI rework rebuilds the playground as a minimal smoke fixture exercising the new `init` flow against a plain Next.js + Tailwind app. See `docs/polish-backlog.md` for the full reasoning.

**11. Setup skill (`setup.md`) and user-CLAUDE.md template are deferred to CLI rework.** They still reference Locator opt-in, `iconoir-react`, `motion`, and old kit names from before NodeType + Layout extraction. Engine packaging deliberately did not touch their content — only mechanical `@forkshop/registry` → `@forkshop/engine` find-replace. CLI rework owns the full rewrite. Until then, no user can run `forkshop init` (the runtime flow is broken per refinement #9), so the stale references don't reach anyone.

**12. Tsup config carries three non-obvious settings.** Documented for future maintainers: (a) `esbuildOptions(o) { o.jsx = "automatic" }` — required to avoid `React is not defined` SSR errors in host apps; (b) `env: {}` — prevents esbuild from baking `process.env.NODE_ENV` into the engine bundle, so the consumer's bundler does the substitution at their build time (production-mode degradation depends on this); (c) `onSuccess: "tsx scripts/post-build.ts"` — runs `inject-directives` + `compile-css` + `copy-assets` after every tsup build, including watch-mode rebuilds, because `clean: true` wipes `dist/` each rebuild and these outputs must regenerate.

**13. Directive injection is post-build, not via the esbuild plugin.** `esbuild-plugin-preserve-directives@^0.0.11` has a known bug where the plugin mutates `file.contents` (Buffer) but tsup writes `file.text` (getter that returns original bytes) — the plugin's mutations are silently discarded. Engine packaging implemented Approach C: a custom `inject-directives.ts` that walks tsup's metafile, identifies dist chunks descended from `"use client"` source files, and prepends the directive at the top of those chunks. This is what makes the published engine actually work as a React Server Components-compatible package.

### Refinements from live-mirror + cadence-scope polish + smoke test (2026-05-17, late)

**15. Polish pass + smoke test.** After spec #4 merged, a manual install smoke against a fresh `create-next-app` surfaced gaps the design hadn't anticipated. The polish spec (`docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md`) bundled seven changes:

- **Live-mirror discovery** for UI Components and Blocks via barrel-import reflection (`useDiscoveredPrimitives` / `useDiscoveredBlocks` hooks). User's `components/{ui,blocks}/index.ts` barrels are the truth; adding a primitive is a 2-step (file + barrel line) operation the `forkshop-live-editing` skill teaches Claude to handle.
- **Cadence note scope** — Phase 5 no longer appends to root `CLAUDE.md` (it violated the "zero edits to user's project CLAUDE.md" promise). Cadence guidance ships only via the auto-loading `.claude/skills/forkshop-live-editing.md` skill and the dir-loaded `app/forkshop/CLAUDE.md` note.
- **Locator opt-in restored** — spec #4's "always-on automatic" Locator install was wrong (silent package.json + next.config edits cross industry norms). Phase 5 now asks Yes/No/Show-me; Phase 6 installs only on accept.
- **`fileMap={{}}` runtime crash fixed** — Template 9 passed an empty object that crashed agent-activity hooks. Hot-fixed; live-mirror config derives the right shape from `forkshopConfig`.
- **Block preview route always written** — no longer gated on "Blocks recipe fired"; supports users adding their first block later.
- **Phase 7 summary refresh** — terse mockup (`✓ Forkshop is set up.` lead, `Boards →`/`Live-mirroring →` lines), no `Mount/Modifiers/Files written/Skipped` debug sections, no ANSI escape codes, `!` reserved for the one urgent attention-grabber.
- **Setup skill wording pass** — softens alarmist phrasing across Phases 3/4/6.

**16. Smoke caught seven remaining bugs.** Running the polish-branch install against a fresh `create-next-app` then ezometr (a real project) revealed the polish-merge was too optimistic — the templates promised engine APIs the engine didn't actually have:

1. `Tree.autoDiscover` / `Tree.excludeGroups` props don't exist.
2. `DesignSystemView` requires explicit `tokens` + `primitives` (no parameterless variant).
3. Template 6 still imported the dropped `getBlockBySlug` helper.
4. Tailwind v4 has no `tailwind.config.*` file — `buildTokenRegistry` only accepts v3 shape.
5. Templates 1/3/5 fail compile when `components/ui/` or `components/blocks/` doesn't exist.
6. Phase 0 reads stale `aliases.mount` instead of v2 schema's `mount` + `srcPrefix`.
7. `ForkshopCanvas` crashes when context providers are missing in a leaf board.

Plus two installer ergonomics fixes during the smoke:
- CLI's `dist/.gitignore` was excluding `dist/index.js` from `pnpm pack` (commit `e9e6b03`).
- CLI bailed when `globals.css` wasn't at one of 4 standard paths; now warns and continues (commit `23b3e59`). Some projects (ezometr-style) use scoped CSS files imported directly from `layout.tsx` with no globals.css at all.

Bugs 1, 2, 3, 5, 6 are template-level fixes (in flight). Bugs 4 and 7 are engine-level work deferred to a follow-up spec.

### Framework-agnostic styling (2026-05-18)

**17. Tailwind dropped from the locked stack.** Strategy v2 originally listed "Next.js App Router + Tailwind + React 18+" as the locked stack. Audit during smoke testing (against fresh `create-next-app` Tailwind v4 + later against ezometr's scoped-CSS layout) showed Forkshop is actually much closer to framework-agnostic than that framing suggested:

- Engine UI (canvas, sidebar, drag, zoom, edit popover, agent activity) ships in `forkshop.css` — pre-compiled, namespaced `forkshop-*` classes that work in any project regardless of styling layer.
- Live text editing, NodeTypes, position persistence, agent-activity protocol, Option-click → editor — none touch Tailwind.
- Sitemap / UI Components / Blocks / Reference Boards just render the user's components — agnostic to styling.
- **Design System Board** was the only Tailwind-coupled piece. Polish work (refinement #15) added the `parseTokenRegistryFromCssVars` pure parser; the user's `design-system.tsx` reads `:root` CSS variables at runtime via a scaffolded `useEffect` + `getComputedStyle`. This works for **any** styling system that compiles tokens to `:root`: Tailwind v4 (`@theme`), Panda CSS, Vanilla Extract, Stitches with the `--token` pattern, plain hand-written CSS, etc.

**Updated locked stack:** Next.js App Router + React 18+. Tailwind is the most common styling layer (and the only one with config-file token discovery shipped at 1.0 via `buildTokenRegistry`), but **not required**. Non-CSS-vars styling systems (CSS-in-JS without `:root` emission) still work for every Board except Design System.

**Setup skill detection:** Phase 2 Scan D records `themeTokens.source` in priority order — `tailwind-v3-config`, `css-vars-tailwind-v4`, `panda-config`, `vanilla-extract`, `css-vars-generic`. Phase 6 Step 2 emits Template 2a (config-import) only for `tailwind-v3-config`; everything else gets Template 2b (universal CSS-vars-read scaffolded into the user's file).

Positioning shifts subtly: Forkshop becomes "a canvas + sidebar tool for Next.js App Router projects" instead of "for Next.js + Tailwind projects." Marketing / docs site copy follows.

### Refinements from setup skill v2 (2026-05-17)

**14. Kits removed for 1.0; setup skill v2 takes over project-aware scaffolding.** Strategy v2 prescribed three audience-specific kits (`marketing`, `saas`, `default`) with detection heuristics. During the spec #4 brainstorm we found the marketing/saas Board lineups were ~80% the same (different names for the same Boards), the setup skill already does the project-aware work kits would duplicate, and three permanent kit identities is a maintenance commitment misaligned with the side-project posture. The 5-concept model collapses to **Node / NodeType / Layout / Board** (4 concepts). The setup skill becomes the project-aware layer; it composes 1-5 Boards from a fixed recipe set (Design System, UI Components, Blocks, Sitemap, Reference) based on detected signals. Pro Kits remain plugins (NodeTypes + hooks) and don't require a Kit concept in OSS. Full design: `docs/specs/2026-05-17-setup-skill-v2-design.md`.

### Refinements from live AI protocol (spec #5, 2026-05-18)

**18. Engine-side post-hoc diff replaces producer chunking.** Strategy v2's live-AI section paired the receive side with two mechanisms intended to shape *agent behavior* — the `forkshop-live-editing.md` cadence skill (auto-loaded to nudge many-small-edits) and a reactive feedback hook (system reminders to the agent on whole-file rewrites). Both were premised on element-level highlights only being possible when the agent emitted per-region edits. Spec #5 replaces that premise: the engine holds in-memory file snapshots, reads disk on each event, diffs against snapshot to produce synthetic hunks. The existing iframe-side `extractStringLiterals` + `findElementContainingSubstring` pipeline runs unchanged. Whole-file `Write` produces the same element-level decoration as small `Edit`. Cadence skill **retired**; reactive feedback hook **dropped entirely**. Forkshop no longer has an opinion on how any agent saves files.

**19. No separate `@forkshop/agent-claude-code` npm package.** Strategy v2 prescribed a separate npm package + `packages/agent-claude-code/` repo entry. In practice the pack is one bash hook script + a `.claude/settings.json` merge — no runtime, no engine dep. The scaffold flow already drops files into `.claude/` for skills; the producer pack rides the same channel. The wire protocol is the public contract; producer "packs" are convenience files distributed via `forkshop init`. Future packs (Cursor, Codex) ship the same way. Full design: `docs/specs/2026-05-18-live-ai-protocol-design.md`.

**20. Color palette owned by Forkshop, not producers.** Spec #5's wire protocol drops the `color` field on the POST payload. Forkshop ships an 8-slot OKLCH palette; assignments keyed on `(agent, sessionId)`. Claude defaults to orange (slot 0). Multi-session and multi-agent both rotate through the palette. Producers send identity (`agent`, `sessionId`); engine attaches resolved color server-side before broadcast.

### Refinements from playground rebuild (2026-05-18)

**21. `apps/playground/` replaced by `apps/test/` + `apps/demo/` split.** The single playground had accumulated cruft that masked real engine bugs (custom `BlocksBoardView` bypassed the iframe-registry pipeline, manual `AgentIframeRelay` mount required, hardcoded `height: 600` clipping content silently, primitive boards rendering with empty default props). The rebuild splits responsibility: `apps/demo/` (renamed playground) is the rich showcase under `pnpm dev`, rewired to consume engine helpers via auto-mounted providers; `apps/test/` is a pre-init Next.js fixture with curated content (4 primitives, 4 blocks, 4 routes, MDX, non-default Tailwind theme) — the user runs `pnpm reset-test && cd apps/test && claude` then "set up Forkshop" to validate the full init + setup-skill flow against realistic signals. Post-init artifacts are gitignored. Closes refinement #10.

**22. Three engine touch-ups shipped alongside the rebuild.** The rebuild surfaced three real engine bugs that the playground had been papering over:
- `@forkshop/engine/lib/*` server-safe subpath exports — pure helpers (`discoverBlocks`, `discoverPrimitives`, `fileToSelection`, `tokenRegistry`, `parseTokenRegistryFromCssVars`, `sitemapTree`) ship as separate dist chunks WITHOUT `"use client"`. RSC consumers can `import { discoverBlocks } from "@forkshop/engine/lib/discover-blocks"` server-side. Removes the workaround on block preview routes.
- `IframeRegistryProvider` + `AgentIframeRelay` auto-mounted inside `AgentActivityProvider`. Single provider, both behaviors. Users no longer need to mount the relay manually; demo's `app/forkshop/page.tsx` drops the explicit `<AgentIframeRelay />` line.
- `LazyIframe.heightMode: "auto" | "cap" | "fixed"` replaces the magic `height ?? heightCap` shape. `auto` = content drives height with no cap (fixes the silent clipping that was hiding block content). `heightCap` kept as deprecated alias.

Plus two isolation guards: tightened `package.json` exports map (every public path explicitly enumerated; deep imports are rejected by Node's resolver) and a public-API snapshot test in `packages/engine/src/__tests__/public-api.test.ts` that fails CI on undeclared export changes. Run `pnpm regen-api-snap` to update intentionally. Full design: `docs/specs/2026-05-18-playground-rebuild-design.md`.

## Supersedes

This document supersedes and consolidates:

- `ravineo-web/docs/superpowers/specs/2026-05-13-forkshop-oss-strategy-design.md`
- `ravineo-web/docs/superpowers/specs/2026-05-13-forkshop-cli-registry-design.md`

The 2026-05-13 specs should be marked as historical at their top with a pointer to this document. Their architectural decisions are reflected here in updated form.
