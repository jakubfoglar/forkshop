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
| 4 | Concepts | kits + primitives + blocks + pages + sections + entries (~8) | Node / NodeType / Layout / Board / Kit (5) |
| 5 | Plugin architecture | None | NodeType plugin contract (formal, user-extensible) |
| 6 | Drill-in | Hardcoded to ResponsiveFrameView | Per-NodeType `drillIn` function |
| 7 | Kits at 1.0 | 3 named board layouts | 3 audience-specific starters: `marketing`, `saas`, `default` |
| 8 | Live AI | Ravineo-flavored, single producer | Vendor-neutral protocol; Claude Code pack ships at 1.0 |
| 9 | Styling | User installs Tailwind preset | Engine ships compiled CSS; no theme overrides at 1.0 |
| 10 | Sidebar customization | Fixed shape | Fixed shape (intentionally no public customization API) |
| 11 | Icons | `iconoir-react` dep | Built-in SVG set, no external dep |
| 12 | Package name | `@forkshop/registry` (private) | `@forkshop/engine` (published) |

---

## Goal

Open-source Forkshop as a canvas + sidebar tool for visualizing structured sets of React things in Next.js + Tailwind projects. Component dev / design systems is the flagship use case; docs sites, marketing sites, and content libraries are explicitly part of the audience.

Every install is conceptually unique — Claude Code helps the user set Forkshop up against *their* project's components and pages, and the user owns the thin surface files afterward. The heavy engine lives as a maintained npm package that updates without manual intervention.

## Mode

Four blended motivations, in priority order:

1. **A real community tool** — actually usable, documented, opinionated defaults. Self-serve setup via Claude Code.
2. **Light maintenance posture** — issues open with no SLA, drive-by PRs welcome, no review obligation. Stingy with named exports; every public engine API is a forever commitment under semver.
3. **A small income from Pro Kits** — paid kits arrive in 1.x once the OSS engine has stabilized. No cloud infrastructure, no hosted features, no team SaaS. Pro Kits ship as paid npm packages.
4. **Portfolio artifact** — demos the "always show the real thing, edit in place" philosophy.

The v1 strategy's *"No commercial path. The shipped artifact is the message"* is revised to: *"No commercial path at 1.0. Pro Kits arrive in 1.x once the engine is stable; the OSS engine and the three free starter kits stay free forever."*

## Audience & positioning

Forkshop is **a canvas + sidebar tool for visualizing structured sets of React things in Next.js + Tailwind projects.**

- Flagship use case: component dev / design systems
- Explicit secondary audiences: docs sites, marketing sites, content libraries
- Locked stack: Next.js App Router + Tailwind + React 18+
- Non-audience: Pages Router, Vite, Remix, non-React, real-time multi-user collab

## Conceptual model

Five concepts replace the previous ~8 (kits, primitives, blocks, pages, sections, entries, canvas nodes, sidebar rows). From atomic to composite:

### Node

A positioned instance on the canvas. Has `(x, y)`, a `kind`, and content. Three behavior modes:

- `interactive-live` — rendered inline in the canvas's React tree, always interactive. Used for small primitive showcases (button, badge, input).
- `click-into` — rendered in an isolated iframe. Transparent overlay captures pan/select clicks until double-click "enters" the iframe. Used for full pages and component-preview blocks.
- `static` — snapshot/frozen rendering, used as a zoom-far-out optimization. No v1 spec required; engine internal.

### NodeType

A plugin defining a *kind* of node: its rendering, its default mode, and optionally its drill-in renderer.

Built-in NodeTypes at 1.0:

- `inline-react` — interactive-live React renders (primitives, variants)
- `iframe-route` — click-into iframes of full Next.js routes (pages)
- `iframe-component` — click-into iframes of component-preview routes (blocks)

User-side NodeTypes can live in `app/forkshop/node-types/`. Community packages (`@forkshop/remotion`, `@forkshop/react-pdf`, etc.) can ship NodeType bundles in 1.x.

**NodeType contract:**

```ts
interface NodeType<T extends AnyNode> {
  id: string
  match: (node: AnyNode) => node is T
  render: (props: RenderProps<T>) => ReactNode      // small canvas view
  drillIn?: (props: DrillInProps<T>) => ReactNode   // optional drill-in view
                                                     // if absent, engine shows `render` scaled up
  defaultMode?: "interactive-live" | "click-into" | "static"
  enterMode?: "double-click" | "single-click" | "never"
  activityKey?: (node: T) => string                 // for live AI matching
}
```

The engine owns drill-in *mechanics* (transition animation, back button, breadcrumbs, escape/browser-back). The NodeType owns drill-in *content*. `ResponsiveFrameView` becomes the default `drillIn` for `iframe-route` and `iframe-component` — a shared engine utility, not a top-level concept.

### Layout

An engine-shipped React component that arranges multiple nodes on a Board. Three Layouts at 1.0:

| Layout | What it does | Maps to current file |
|---|---|---|
| `Gallery` | Stack or grid of iframe nodes; single-viewport or 3-viewport (desktop/tablet/mobile) | `iframe-gallery.tsx` |
| `Tree` | Filesystem-discovered routes as hierarchical sitemap | `page-tree.tsx` |
| `DesignSystemGraph` | Color tokens as graph (raw ↔ semantic edges) + primitive frames + typography | `design-system-board.tsx` + `system-layout.ts` |

Layouts are strict (typed prop interfaces), not user-extensible at 1.0. Custom rendering happens at the NodeType level (inside cells of a Gallery), not the Layout level. If a Layout doesn't fit, the user adjusts via NodeType or accepts the constraint — adding a new Layout is a contribution path, not a user extension point.

### Board

A configured tab in the user's sidebar (e.g., "Components", "Pages", "Foundations"). One Board = one Layout + its data. The user sees Boards in their sidebar; the user's `forkshop init`-chosen kit decides which Boards exist and what they're called.

### Kit

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
- Sidebar shell: fixed shape, drill-in/back stack, selection state
- NodeType plugin contract + built-in NodeTypes (`inline-react`, `iframe-route`, `iframe-component`)
- Layouts: Gallery, Tree, DesignSystemGraph
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

## Kits at 1.0

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
- Per-NodeType `drillIn` (ResponsiveFrameView becomes a default for iframe types, not engine-mandated)
- Layouts as engine code (Gallery, Tree, DesignSystemGraph)
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

**Kits at launch:**

- `marketing`, `saas`, `default`
- MDX detection + Reference Board injection
- Mobile detection + single-viewport flag

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
4. **Kits rewrite** (~1 week) — 3 new kits replacing the current 3.
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

1. **User-project `app/forkshop/CLAUDE.md`** — dropped by `forkshop init`. Documents Forkshop's mental model: the 5 concepts (Node / NodeType / Layout / Board / Kit), how to add a Board, how live AI works, the NodeType API reference, common kit-config edits. Auto-loaded by Claude Code when working in that directory. **Highest-leverage adoption item** — means "Claude can help me extend my Forkshop" works on day one without external docs.
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

1. **NodeType + Layout extraction** — extract the engine surface from the existing registry, define the NodeType plugin contract, refactor `canvas-node.tsx` into a type-dispatcher, port existing primitives into NodeType + Layout shapes, define `RenderProps` / `DrillInProps` TypeScript shapes.
2. **Engine packaging + compiled CSS pipeline** — tsup build, Tailwind compile step, SVG icon set, `"use client"` preservation, sourcemaps, dependency cleanup, exact `package.json` exports map for `@forkshop/engine`.
3. **CLI rework** — new `init` flow (installs engine, scaffolds thin surface, drops kit-specific files), `update` command, updated manifest schema (thin scaffolds only).
4. **Kits rewrite** — three new kits (marketing, saas, default), kit config shape, scaffolding logic, project-type heuristics, MDX-detection logic.
5. **Live AI protocol + Claude Code pack** — vendor-neutral producer protocol, SSE wiring, `@forkshop/agent-claude-code` package, reactive feedback hook.
6. **Docs site refresh** — kit reference, NodeType API docs, install guide, examples; updated manifest endpoint.

## Open questions deferred to implementation specs

- Exact NodeType contract TypeScript shape (`RenderProps`, `DrillInProps` parameter details)
- Manifest schema v2 (thinner — just scaffolds)
- License-key infrastructure choice (Stripe / Lemon Squeezy / Polar) — deferred to Pro launch
- Exact `package.json` exports map for `@forkshop/engine`
- Tailwind v3 vs v4 preset shape

These are implementation details, not strategy. Settled in the downstream specs.

## Supersedes

This document supersedes and consolidates:

- `ravineo-web/docs/superpowers/specs/2026-05-13-forkshop-oss-strategy-design.md`
- `ravineo-web/docs/superpowers/specs/2026-05-13-forkshop-cli-registry-design.md`

The 2026-05-13 specs should be marked as historical at their top with a pointer to this document. Their architectural decisions are reflected here in updated form.
