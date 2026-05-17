# Setup skill v2 — multi-Board scaffolding (implementation spec)

Date: 2026-05-17
Status: Approved — draft v0
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` (replaces roadmap item #4)
Prerequisites:
- `docs/specs/2026-05-15-nodetype-layout-extraction-design.md` (shipped)
- `docs/specs/2026-05-16-engine-packaging-design.md` (shipped)
- `docs/specs/2026-05-17-cli-rework-design.md` (shipped)

## Goal

Replace strategy v2's "kits" prescription with a signal-aware setup skill that scaffolds a multi-Board Forkshop installation tailored to the user's project.

After this spec ships:

- `forkshop init` is unchanged — kit-independent stubs only (closed by spec #3).
- `forkshop add` stays as a 1.0 placeholder. No kits ship; no add bundles ship.
- The setup skill (`packages/engine/src/skill/setup.md`) is rewritten to scaffold 1-5 Boards based on detected signals.
- `app/forkshop/` after setup uses a hybrid file layout: per-section parent files + per-primitive files + data-driven leaves.
- `forkshop.config.tsx` becomes the data store for blocks, route filters, and reference paths.
- The engine ships a small `forkshop-sidebar.tsx` extension (a third `entryKind` for routes); no Layout changes at 1.0.

## Strategy deviation

Strategy v2's "Kits at 1.0" section prescribed three audience-specific kits (`marketing`, `saas`, `default`) with detection heuristics. This spec amends that decision after re-examination during the CLI rework brainstorm.

Three findings drove the change:

1. **The marketing/saas Board lineups are 80% the same.** Strategy v2's marketing kit shipped Foundations + Blocks + Pages + Navigation; saas shipped Design System + Components + Layouts + Public Pages. The real semantic differences (auth-filtering on Pages, mobile-flag on Galleries, MDX-aware Reference) are signal-driven settings, not kit identities.
2. **The setup skill already does project-aware work that kits would duplicate.** Phase 1 of the current skill produces a narrative description ("This is a hybrid: marketing + auth'd app"). With richer recipe-driven scaffolding, the skill produces the same per-project tailoring that a kit picker would — without the static kit abstraction.
3. **Three permanent kit identities is a maintenance commitment misaligned with the side-project posture.** Strategy v2 said "three free starter kits stay free forever." Every engine API change touches three places. Recipes encoded in one skill markdown file are cheaper to keep current.

**The 5-concept model collapses to 4:** Node / NodeType / Layout / Board. "Kit" is removed as a first-class concept at 1.0. Pro Kits (`@forkshop-pro/compose-mode`, `@forkshop-pro/collab`) remain conceptually plugins that ship NodeTypes + hooks; the "Kits" branding survives in their package names without requiring a Kit concept in OSS.

A refinement entry will be added to strategy v2 at the bottom (refinement #14) recording this deviation.

## The sidebar lineup

Every sidebar entry is a Board. Parents have their own content **and** expand to children.

```
Sidebar (final shape):
  Design System          (board — DesignSystemView: tokens + typography + spacing + radii + shadows)
  UI Components          (board — Gallery, one variant per primitive)
    ├ Button             (board — variant grid: variant × size × state)
    ├ Badge
    ├ Input
    └ …
  Blocks                 (board — Gallery, one viewport per block)
    ├ Hero               (board — ResponsiveFrameView at 3 viewports)
    ├ CTA
    └ …
  Sitemap                (board — Tree visualization of routes)
    ├ /                  (board — ResponsiveFrameView)
    ├ /about
    └ …
  Reference              (board — Tree over content paths, if MDX detected)
    ├ <article>          (board — ResponsiveFrameView)
    └ …
```

Notes:
- **Design System** has no children (no chevron). Single dense leaf.
- **UI Components / Blocks / Sitemap / Reference** all have content **and** children. Clicking the parent shows the overview board; expanding the chevron drills in.
- The parent overview for UI Components and Blocks uses a single representative variant/viewport per item; per-leaf boards have the full detail.
- The "Overview" leaf that strategy v2 implied under Sitemap is folded into the Sitemap section itself — the section *is* the overview.

## Recipes

A recipe is a *Board pattern + detection signal*. Recipes compose; the skill picks N of them based on what Phase 2 found.

| Recipe | Sidebar shape | Parent Layout | Per-leaf Layout | Trigger |
|---|---|---|---|---|
| **Design System** | Single leaf | `DesignSystemView` (colors + typography at 1.0; spacing + radii + shadows in 1.x) | — | Tailwind theme has non-default `theme.extend.*` OR semantic CSS vars exist |
| **UI Components** | Section with one leaf per primitive | `Gallery` (one representative variant per primitive, inline-react) | `Gallery` of inline-react variant fixtures | `components/ui/` or shadcn-shaped folder with ≥3 primitives |
| **Blocks** | Section with one leaf per block | `Gallery` (single viewport per block, iframe-component) | `ResponsiveFrameView` (1440/768/375) | `components/{blocks,sections,marketing,site}/` exists with composed components |
| **Sitemap** | Section with one leaf per route | `Tree` visualization of routes | `ResponsiveFrameView` per route | Always — every Next.js app has routes |
| **Reference** | Section with one leaf per article | `Tree` over content paths | `ResponsiveFrameView` per article | MDX detected (deps, `*.mdx` files, or `content/` dir) |

**Cross-cutting modifiers (Board-level settings, not Boards):**

- **Auth filter on Sitemap**: when an auth lib is detected (`@clerk/nextjs`, `next-auth`, `lucia`, `iron-session`, `@auth0/nextjs-auth0`, `@workos-inc/authkit-nextjs`, `@supabase/{auth-helpers-nextjs,ssr}`), Sitemap defaults to filtering out `(authenticated|dashboard|app|protected|private)` route groups.
- **Mobile flag on Galleries**: when `viewport-fit=cover` + breakpoint usage stays below `md:` in top files, Gallery + Blocks default to single 375px viewport instead of 3-up.
- **Tailwind v3 vs v4**: changes how Design System scans tokens (config object vs `@theme` block).

### Composition by project shape

The same 5 recipes assemble into convincing per-project results:

| Project shape | Recipes selected | Resulting sidebar |
|---|---|---|
| Design system / component library | Design System + UI Components | `Design System · UI Components` |
| Marketing site | Design System + Blocks + Sitemap | `Design System · Blocks · Sitemap` |
| Marketing + blog | Design System + Blocks + Sitemap + Reference | adds Reference |
| Docs site | Design System + Reference + Sitemap | `Design System · Reference · Sitemap` |
| SaaS product (auth-aware) | Design System + UI Components + Sitemap (auth-filtered) | `Design System · UI Components · Sitemap` |
| Hybrid (saas + marketing) | All five (Sitemap auth-filtered, Reference if MDX) | `Design System · UI Components · Blocks · Sitemap · Reference` |
| E-commerce | Design System + UI Components + Blocks + Sitemap | |
| Internal tool / admin | Design System + UI Components | |
| Minimal (`app/page.tsx` only) | Sitemap only | `Sitemap` |

Typical count: 3-4 Boards. Pure design systems and internal tools land at 2; hybrids reach 5.

## File layout in the user repo after setup

Per-leaf files exist **where leaves have authored content**. Leaves that are boilerplate (`<ResponsiveFrameView src=… />`) are data-driven from `forkshop.config.tsx`.

```
app/forkshop/
  page.tsx                          # mounts ForkshopCanvas + ForkshopSidebar; declares the section tree
  forkshop.config.tsx               # data: primitives, blocks, route filters, reference paths
  design-system.tsx                 # Design System board (single leaf)
  ui-components.tsx                 # UI Components parent board (Gallery overview)
  ui-components/
    button.tsx                      # Button variant grid — authored
    badge.tsx
    input.tsx
    …                               # ~5-15 files, one per discovered primitive
  blocks.tsx                        # Blocks parent board (Gallery overview); leaves auto-render from config
  sitemap.tsx                       # Sitemap parent board (Tree); leaves auto-render from config
  reference.tsx                     # Reference parent board (Tree); leaves auto-render from config (MDX only)
  block/[slug]/page.tsx             # auto-managed — block preview route for iframe leaves
  CLAUDE.md                         # auto-loaded mental-model doc (dropped by `forkshop init`)
```

The `block/[slug]/page.tsx` route is the only auto-managed file under `app/forkshop/`. It carries a header comment marking it as such; users are free to delete it if they don't have Blocks. URL is `/forkshop/block/<slug>` (or `/<mount>/block/<slug>` for custom mounts). Pattern follows Fogma's precedent (`app/(tools)/fogma/block/[slug]/page.tsx`).

### Why this carving

| Section | Per-leaf files? | Reason |
|---|---|---|
| Design System | No | One leaf, no children |
| UI Components | Yes (one per primitive) | Variant grids are authored content — the kind of thing you'd grep, diff, edit per primitive |
| Blocks | No | Each leaf is `<ResponsiveFrameView src="…" />`. Boilerplate. Better as data |
| Sitemap | No | One file per route × dozens of routes = ceremony. Auto-generated from scanned routes |
| Reference | No | Same as Sitemap — auto-generated from MDX paths |

**Total file count:** ~10-20 for a hybrid project (4-5 section parents + 5-15 per-primitive). Compared to:
- One file per board (40-80+): too many.
- One file per section (5): too dense; primitives share a file and conflict in diffs.
- All dynamic from config (~3 files): no per-primitive file means Button's variant grid isn't a discoverable filesystem thing.

### AI live-editing affordances

The hybrid layout gives three predictable scopes for live-editing agents:

| User says… | Agent edits… | Scope |
|---|---|---|
| "Add a tertiary variant to Button" | `ui-components/button.tsx` | Single primitive |
| "Add a new pricing block" | `forkshop.config.tsx` (blocks list) | Data |
| "Filter admin routes from Sitemap" | `forkshop.config.tsx` (`sitemap.excludeGroups`) | Data |
| "Change Hero block's iframe source" | `forkshop.config.tsx` (block entry's `src`) | Data |
| "Rebuild the Components overview" | `ui-components.tsx` (parent) | Section-scope |
| "Change a theme color" | (outside Forkshop — Tailwind config) | Out of scope |

Three predictable places. Each with a clear blast radius. Matches what the live-editing skill (`forkshop-live-editing.md`) was designed to encourage.

## Self-containment posture

Forkshop is a drop-in install. After setup, every Forkshop-created file lives in a `forkshop`-named location; the only edits to existing user files are four small additive items, all reversible.

### Files Forkshop owns (cleanly namespaced)

| Location | Purpose | Ownership |
|---|---|---|
| `app/forkshop/` | Board scaffolds, mount, config (and the auto-managed `block/[slug]/page.tsx` preview route) | User-owned after scaffold |
| `app/api/forkshop/` | API route stubs (edit, positions, agent-activity) | Auto-managed (one-line re-exports from engine) |
| `public/fonts/forkshop/` | Raveo font binary | Auto-managed |
| `.claude/skills/forkshop-*.md` | Skill files | Auto-managed |
| `forkshop.json` | Lock file at repo root | Auto-managed |

No files land in `components/`, `lib/`, route groups, or anywhere outside the `forkshop` namespace. The `app/forkshop/block/[slug]/page.tsx` preview route is the only host-visible URL added (dev-gated; matches Fogma's `/fogma/block/<slug>` pattern in ravineo-web).

### Existing user files Forkshop modifies (limited, additive)

| File | Change | Why | Reversible? |
|---|---|---|---|
| `app/globals.css` | Append one import line | Engine CSS | Yes — delete the line |
| `next.config.*` | Add `@locator/webpack-loader` rule | Option-click open-in-editor (dev only) | Yes — delete the rule |
| `package.json` | Add `@forkshop/engine` + `@locator/webpack-loader` | Engine + dev tooling | Yes — uninstall |
| Root `CLAUDE.md` | Append cadence note (opt-in, marked with start/end comments) | Agent guidance | Yes — delete the marked block |

Nothing else. No theme-config rewrites, no `layout.tsx` mounting injections, no shared-state files. Setup skill writes are gated on Phase 5 consent for any mutation that goes beyond `app/forkshop/` and the four items above.

### Removing Forkshop

A user wanting a clean uninstall:

1. Delete `app/forkshop/`, `app/api/forkshop/`, `public/fonts/forkshop/`, `.claude/skills/forkshop-*.md`, `forkshop.json`.
2. Remove the `@import "@forkshop/engine/forkshop.css"` line from `app/globals.css`.
3. Remove the `@locator/webpack-loader` rule from `next.config.*`.
4. Remove `@forkshop/engine` and `@locator/webpack-loader` from `package.json`, run package manager install.
5. (If opted in) Delete the `<!-- forkshop:cadence-note start -->`…`end` block from root `CLAUDE.md`.

No lingering state in `components/`, `lib/`, or any user-authored area. This explicit removal procedure is documented in the user's `app/forkshop/CLAUDE.md` so it's recoverable from inside the project.

## `forkshop.config.tsx` shape

The config is the data backbone. Per-primitive variant grids live in their own files (because they're authored JSX); everything else flows through this config.

```tsx
// app/forkshop/forkshop.config.tsx
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// … other primitive imports as needed for the overview tile

export const forkshopConfig = {
  primitives: [
    { slug: "button", name: "Button", component: Button, exampleProps: { variant: "default", children: "Click me" } },
    { slug: "badge",  name: "Badge",  component: Badge,  exampleProps: { children: "New" } },
    // …
  ],
  blocks: [
    { slug: "hero",     name: "Hero",        src: "/forkshop/block/hero" },
    { slug: "cta",      name: "CTA",         src: "/forkshop/block/cta" },
    { slug: "features", name: "Feature Grid", src: "/forkshop/block/features" },
  ],
  sitemap: {
    excludeGroups: ["(authenticated)", "(dashboard)"],
    autoDiscover: true,
    explicitRoutes: [],  // for dynamic routes the user wants to pin
  },
  reference: {
    contentPaths: ["content/**/*.mdx"],
  },
  viewportProfile: "responsive",  // "responsive" | "mobile" — set by mobile-flag modifier
} as const

export type ForkshopConfig = typeof forkshopConfig
```

Type contracts ship in `@forkshop/engine` as `ForkshopConfigShape`. The user's `forkshopConfig` satisfies it; the engine consumes it via `forkshop.config.tsx`'s default-named export.

**Optional sections.** If a recipe wasn't selected during setup, its config key is omitted entirely. For example, a pure design-system project's config has only `primitives` (and possibly `sitemap` for the minimal route list). The skill never writes empty arrays as placeholders.

**Per-primitive variant authoring.** `exampleProps` is just the single instance used for the UI Components overview tile. The full variant grid lives in `ui-components/<slug>.tsx`, hand-rendered (cva-enumerated or manual). The config doesn't try to encode variant matrices.

## Setup skill v2 — phase-by-phase changes

The current setup skill (`packages/engine/src/skill/setup.md`, ~700 lines after the CLI rework cleanup) operates in stub-only mode. This rewrite restores Phase 3's recipe-driven proposal and lengthens Phase 6 to write multiple Board files.

### Phase 0 — Preconditions (no change)

Same four checks: `forkshop.json` v2 present, `<mount>/CLAUDE.md` present, App Router only, re-run detection.

### Phase 1 — Read project, build understanding (no change)

Same Steps 1-6. Narrative description, auth signals, route-group hints, mobile-profile detection. Output: project narrative + signal flags.

### Phase 2 — Scan for primitives, blocks, routes (extended)

Three scans plus two new:

- **Scan A — Primitives** (existing). Direct-list `components/ui/*.tsx`, filter helpers/contexts, cap at ~12. Cap raised to ~15 to match the per-primitive file budget.
- **Scan B — Blocks** (existing). `components/{blocks,sections,marketing,site}/` discovery + first-usage fixture extraction. If the first-usage call site passes dynamic expressions (`<Hero title={cms.heroTitle} />`), the fixture falls back to **no props** — the block renders with its own default props in the preview route. The "always show the real thing" posture takes precedence over placeholder content; if the block's defaults render blank, the user edits `forkshop.config.tsx` to add explicit fixture props.
- **Scan C — Routes** (existing). `app/**/page.tsx` grouping by route-group; auth-filter sub-flag.
- **Scan D — Theme tokens** (new). Read `tailwind.config.{ts,js,mjs}` `theme.extend.{colors,spacing,fontFamily,borderRadius,boxShadow}`. If Tailwind v4, read `@theme` block from `app/globals.css`. Output: whether to fire the Design System recipe.
- **Scan E — MDX content** (new). Check `package.json` deps for `@next/mdx`/`@mdx-js/*`, glob for `**/*.mdx`, look for `content/` dir. Output: whether to fire Reference recipe + the content path glob.

Output data structure (extended):

```
narrative
projectFlags: { mobileProfile, tailwindMajor, monorepo, authLibrary }
primitives: [{ name, sourcePath, hasCva, cvaVariants? }]
blocks:     [{ name, sourcePath, fixture, previewRoute }]
routes:     [{ group, paths, hasDynamic }]
themeTokens: { hasCustomColors, hasCustomSpacing, hasCustomFonts, hasCustomRadii, hasCustomShadows }
mdxContent:  { detected, contentPaths }
```

### Phase 3 — Build the consolidated proposal (rewritten)

Run detection signals against Phase 2 output. Select recipes. Render multi-Board sidebar in the proposal template:

```
I've read your project. Here's what I see:

<narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

/forkshop sidebar
├─ Design System            (DesignSystemView — N color tokens, M typography styles)
├─ UI Components            (K primitives discovered)
│   ├ Button (8 variants via cva)
│   ├ Badge (3 variants)
│   └ …
├─ Blocks                   (L blocks discovered)
│   ├ Hero (used on /)
│   ├ CTA  (used on /pricing)
│   └ …
└─ Sitemap                  (R routes — public only; <auth-lib> detected)
    ├ /
    ├ /about
    └ …

Mount path:    <aliases.mount, abbreviated>
               (or app/(tools)/forkshop/ — say "use tools group" to switch)

Also touching automatically:
  • app/globals.css — @import "@forkshop/engine/forkshop.css"
  • next.config.*   — @locator/webpack-loader rule (Option-click → editor)
  • app/forkshop/block/[slug]/page.tsx — per-block preview route (auto-managed; one file)

One opt-in (I'll confirm after you accept):
  [1] Cadence note — teaches Claude to use small Edits on Forkshop-watched files
```

### Phase 4 — Iterate (light updates)

Same loop as today. Extensions for the new model:

- **Add/remove a Board** (e.g., "drop the Reference Board"; "I don't want Sitemap auto-filtering auth routes"). Update the recipe selection in proposal state.
- **Re-rendering uses the new multi-Board template.** Same `AskUserQuestion` `Accept all / Adjust / Pause` panel.

### Phase 5 — Consent for config mutations (no change)

Single opt-in for the cadence note. Locator opt-in is still gone (it's automatic from spec #3).

### Phase 6 — Write the artifacts (significantly extended)

Order:

1. `forkshop.config.tsx` — populate `primitives`, `blocks`, `sitemap`, `reference` keys based on selected recipes.
2. `design-system.tsx` — single leaf, if Design System recipe fired.
3. `ui-components.tsx` (parent) — if UI Components recipe fired.
4. `ui-components/<slug>.tsx` — one per primitive, with cva-enumerated variants when detected, fallback fixtures otherwise.
5. `blocks.tsx` (parent) — if Blocks recipe fired.
6. `app/forkshop/block/[slug]/page.tsx` — single dynamic route file that renders block previews (for iframe-component leaves). Reads `forkshopConfig.blocks` and matches by slug.
7. `sitemap.tsx` (parent) — always.
8. `reference.tsx` (parent) — if Reference recipe fired.
9. `page.tsx` — mounts canvas + sidebar; declares the section tree.
10. `app/globals.css` (idempotent) — append `@import "@forkshop/engine/forkshop.css"` if not present.
11. `next.config.*` — add `@locator/webpack-loader` rules (templates from spec #3 unchanged).
12. Root `CLAUDE.md` cadence note (conditional on Phase 5 consent).

Per-step `✓ <action> <path>` lines. Same failure handling as today.

### Phase 7 — Final summary (extended for multi-Board)

```
Forkshop is set up. Here's what you have:

  Mount:       <aliases.mount, abbreviated>  →  http://localhost:3000/forkshop
  Boards:      Design System · UI Components (8) · Blocks (5) · Sitemap (14) · Reference (12)
  Modifiers:   Sitemap filtered to public routes (Clerk detected)
  Opt-in:      ✓ Cadence note

Try this first:
  1. pnpm dev
  2. Open /forkshop in your browser
  3. Click "Button" in the sidebar — see all variants on one canvas
  4. Click any route under Sitemap — see it at 1440/768/375
  5. Option-click any element → opens the file at the right line
  6. Click any text on a block → edit in place → save

Customize:
  • Add or remove primitives  → edit forkshop.config.tsx primitives list
  • Edit Button variants      → edit ui-components/button.tsx
  • Add a new block           → add an entry in forkshop.config.tsx blocks
  • Filter Sitemap routes     → edit forkshop.config.tsx sitemap.excludeGroups

Sibling skills:
  • forkshop-live-editing  — cadence guidance auto-applies on edits
  • forkshop-doc-sync      — invoke when <mount>/CLAUDE.md drifts
```

### Skill file length budget

Current setup.md is ~700 lines after CLI rework cleanup. Adding multi-Board logic:

- Phase 2: +60 lines (Scan D theme tokens, Scan E MDX content)
- Phase 3: +80 lines (recipe selection logic, richer proposal template)
- Phase 6: +200 lines (six new templates: design-system.tsx, ui-components parent, ui-components/[slug].tsx, blocks parent, sitemap parent, preview route)
- Phase 7: minor

Net: ~1000-1100 lines. Comparable to the pre-rewrite skill (~1205 lines), but with much more value per line.

## Engine implications

### `forkshop-sidebar.tsx` — one extension

Current `SidebarSection` supports `entryKind: "block" | "primitive"`. Sitemap and Reference need route children with `entryKind: "page"` so a click emits `{ kind: "page", path: "/about" }`.

Change: extend `entryKind` to `"block" | "primitive" | "page"` and add the corresponding selection-emission branch in the click handler. ~10 LOC. No breaking changes to existing consumers (the playground uses block/primitive today).

### `DesignSystemView` — deferred extensions

Current `DesignSystemView` renders colors as a graph + typography + primitive frames. The Design System Board recipe in this spec promises tokens + typography + spacing + radii + shadows.

For 1.0: ship what `DesignSystemView` does today. The Phase 7 summary's count of "M typography styles" is accurate; spacing/radii/shadows are silently absent.

For 1.x: extend `DesignSystemView` to add spacing scale, radii samples, shadow samples. Tracked as a follow-up backlog item (`docs/polish-backlog.md`).

The skill's Phase 3 proposal language stays accurate either way — "DesignSystemView (tokens + typography + spacing + radii + shadows)" is the eventual content; the 1.0 shipped surface is honest about what the Layout currently renders.

### `Gallery` Layout — no change

UI Components parent and Blocks parent both use Gallery. The per-primitive `<Gallery>` in `ui-components/<slug>.tsx` is the same component as the section-level overview. No engine change needed.

### `Tree` Layout — no change

Sitemap parent and Reference parent both use Tree. Existing Layout handles route hierarchy with route-group flattening (from `file-to-selection.ts`). Reference's MDX paths can be passed as a separate prop or pre-converted to route-shaped paths. Tree's existing `routes` prop accepts both shapes.

### `ResponsiveFrameView` Layout — no change

Already shipped. Per-leaf boards under Blocks, Sitemap, Reference all use it directly.

## CLI implications

### `forkshop init` — no change

Same kit-independent stub drop from spec #3. Setup skill v2 runs as the second step.

### `forkshop add` — stays as placeholder

Same message as spec #3. The `forkshop add <kit>` command exits 0 with a "no add-on bundles at 1.0" message. The kits rewrite item is now done (this spec) without reactivating `add`.

If future Pro Kits or community kits ship as packages, `forkshop add` can be reactivated by a later spec — but it's not load-bearing for 1.0.

### `forkshop update` — minor

`update` is unchanged in mechanics. The setup skill markdown file is one of the files `update` refreshes — so when this spec ships, users running `forkshop update` against existing installs pull the new skill, then re-run setup (in adjust mode) to migrate their `app/forkshop/`.

Adjust mode (existing in setup.md) handles the migration: detect existing non-stub `forkshop.config.tsx`, offer to add new Boards based on rescanning, never destroy user edits.

## Risks

**R1. Setup skill grows to ~1100 lines.** Heavier than the post-cleanup ~700.
- *Mitigation:* the bulk is templates (Phase 6 scaffolding section). Templates compress well in attention; the logic phases (1-3) stay terse. The kits-removed pre-CLI-rework skill was ~1205 lines — we're back near that, but with cleaner separation between recipe-detection logic and template content.

**R2. Per-primitive cva detection is best-effort.** AST parsing across `components/ui/*.tsx` will miss edge cases (cva with non-literal variant objects, components that compose cva from external sources).
- *Mitigation:* fall back to a scaffolded stub with `TODO: add variants` per-primitive. The user fills in variants on demand. The skill's Phase 7 summary surfaces any primitives that fell back.

**R3. The `block/[slug]/page.tsx` dynamic route adds a host-visible route under the mount.** Users might wonder whether `/forkshop/block/hero` should be reachable in production.
- *Mitigation:* follows Fogma's precedent — block preview routes lived at `/fogma/block/<slug>` in ravineo-web for the tool's entire lifetime without conflict. The route is dev-only (gated by `process.env.NODE_ENV !== "production"`); the preview-route template includes the gate and renders `notFound()` in production. The route file carries a header comment marking it as auto-managed; users wanting Forkshop without blocks can delete the `block/` subtree entirely.

**R4. Multi-Board scaffolding can produce visually empty Boards.** E.g., MDX detected but only one `*.mdx` file → Reference Board with one article.
- *Mitigation:* threshold each recipe's trigger conservatively. UI Components fires at ≥3 primitives. Reference fires at ≥3 articles. Blocks fires at ≥1 (a single block is still worth its own Board). The skill's proposal narrative makes counts visible; user can decline thin Boards in Phase 4.

**R5. Tailwind token scanning is fragile across v3/v4 + various theme conventions.**
- *Mitigation:* the skill only needs a *yes/no* signal for whether to fire Design System. The Board content is rendered by `DesignSystemView` at runtime against whatever tokens it can find. False negatives ("user has a heavy theme but we missed it") manifest as "no Design System Board in the sidebar" — the user can `forkshop-setup adjust → add Design System Board` to recover.

**R6. Page sidebar tree assembly in `page.tsx` is dense.** Hybrid projects get a 50-line `sidebarTree` declaration.
- *Mitigation:* the template is generated cleanly with comments per section. AI agents and users both find this readable per the live-editing affordance table above. If line count becomes a real burden, a 1.x helper `buildSidebarTree(forkshopConfig)` could collapse it — but the explicit form is preferred for grep + clarity at 1.0.

**R7. Per-leaf board files for primitives are a maintenance touch-point.** A new primitive added by the user means a new `ui-components/<slug>.tsx` file + an entry in `forkshop.config.tsx`. Setup skill's adjust mode handles initial add; subsequent ones are manual.
- *Mitigation:* document the two-file pattern in `app/forkshop/CLAUDE.md`. The pattern is symmetric and predictable. Manual workflow: copy an existing primitive file, edit variants, add `forkshopConfig.primitives` entry.

## Scope edges

**In scope:**
- Rewrite of `packages/engine/src/skill/setup.md` for multi-Board scaffolding.
- New Phase 2 scans (theme tokens, MDX content).
- New Phase 3 recipe-selection logic.
- Six new templates in the Scaffolding templates section (design-system parent, ui-components parent, ui-components/[slug], blocks parent, sitemap parent, reference parent, preview route).
- Updated `forkshop.config.tsx` shape with `primitives`, `blocks`, `sitemap`, `reference` keys + types.
- `forkshop-sidebar.tsx` extension for `entryKind: "page"`.
- Updated `app/forkshop/CLAUDE.md` template (`packages/engine/templates/user-claude-md.md`) — new sections on the Board lineup, file layout, per-primitive variant authoring.
- Playground rebuild against the new layout (no Ravineo legacy; covers all 5 Boards as the visual-regression target).
- Strategy v2 refinement entry (#14) recording the kits → setup-skill-v2 deviation.

**Out of scope (other downstream specs own these):**
- `DesignSystemView` Layout extensions for spacing/radii/shadows — 1.x.
- Prop-type AST enumeration as a cva fallback for variant discovery — 1.x.
- Producer protocol for live AI, `@forkshop/agent-claude-code` package — spec #5.
- Docs site content, install guide, NodeType API docs — spec #6.
- Pro Kits / extension API for community kits — Pro launch.
- `forkshop add <bundle>` reactivation — no near-term spec (no consumer at 1.0).

## Testing strategy

### Setup-skill integration tests

The skill itself is not test-runnable in isolation (it's a markdown prompt). Coverage strategy:

| Layer | Approach |
|---|---|
| **Recipe detection logic** | Document fixtures in `tests/skill-fixtures/` representing each project shape (marketing, saas, docs, design-system, internal, hybrid). Each fixture is a stub Next.js tree the skill can reason against. Validation is manual until automated. |
| **Template substitution** | Existing `validateSkillPlaceholders` in `apps/docs/scripts/validate-registry.ts` continues to apply — every `{{snake_case}}` placeholder must live inside a fenced code block. |
| **Engine extensions (`entryKind: "page"`)** | Unit test in `packages/engine/src/components/sidebar/forkshop-sidebar.test.tsx` covering the new branch. |
| **Playground smoke** | The rebuilt `apps/playground/` is the visual smoke test — `pnpm dev`, open `/forkshop`, click each Board, verify rendering. |
| **Smoke fixture (`tests/smoke/run-smoke.sh`)** | Existing fixture from spec #3 runs `forkshop init`, then manually drops a minimal `app/forkshop/page.tsx` (since the skill produces the multi-Board scaffold). Update: smoke now runs the skill in non-interactive mode against the fixture project. |

### Manual smoke checks before declaring done

1. Run the setup skill against `apps/playground/` (reset state first) — verify it produces the same Board lineup the playground is hand-curated to show.
2. Run the setup skill against a fresh `pnpm create next-app` fixture with no `components/` folders — verify it produces a Sitemap-only Board.
3. Run against a fixture with shadcn-style primitives but no blocks — verify Design System + UI Components, no Blocks Board.
4. Run against a Clerk-detected fixture with mixed route groups — verify Sitemap auth-filters.
5. Run against an MDX-heavy fixture — verify Reference Board appears.

## Open questions deferred to implementation

**O1. cva parsing library.** Likely `@babel/parser` (already a transitive dep) or `ts-morph`. Decision at impl time when we benchmark + look at false-positive rates on real codebases.

**O2. Exact `app/forkshop/block/[slug]/page.tsx` shape.** Likely mirrors Fogma's pattern: read `forkshopConfig.blocks`, match by slug, render the component inside a minimal wrapper. Concrete template lands at impl time, with the production `notFound()` gate baked in.

**O3. Reference Board's Tree input.** MDX paths aren't filesystem-routed by Next.js — the user may or may not have routes for each MDX file. If routes don't exist, the Tree shows paths but per-article leaves can't iframe. Defer the precise rendering: either the engine grows MDX-route inference, or the Reference Board only fires when the user has a `app/(content)/[…slug]/page.tsx` that resolves MDX. Likely the latter for 1.0.

**O4. Auto-discovery cap on Sitemap routes.** A repo with 500 routes shouldn't produce 500 sidebar entries. Default cap: 30 routes, with the top 30 by `app/`-tree-depth-then-alphabetical-order. Refinement at impl time.

**O5. Adjust mode for existing installs.** Users with a v1-shape `app/forkshop/` running `forkshop update` will pull the new skill; running the skill should *migrate* their install (adding the new Boards) without destroying their custom config. Adjust mode's existing "rescan" path is the entry point; the migration playbook lands at impl time.

## Exit criteria

- `packages/engine/src/skill/setup.md` updated with multi-Board logic. Recipe detection covers all 5 recipes + modifiers.
- `packages/engine/templates/user-claude-md.md` updated with the new file layout, per-primitive pattern, `forkshop.config.tsx` shape.
- `packages/engine/src/components/sidebar/forkshop-sidebar.tsx` supports `entryKind: "page"`. Unit test passes.
- `apps/playground/app/forkshop/` rebuilt to match the new layout. `pnpm --filter playground build` passes; `/forkshop` renders all 5 Boards.
- `apps/docs/scripts/validate-registry.ts` passes against the new skill (no placeholder leaks).
- Manual smoke run through 5 fixture project shapes (marketing, saas, docs, design-system, internal) produces appropriate Board lineups per the composition table.
- Strategy v2 doc has refinement entry #14 noting the kits → setup-skill-v2 deviation.
- `docs/polish-backlog.md` carries the `DesignSystemView` spacing/radii/shadows extension as a tracked 1.x item.

## Supersedes

Within strategy v2, this spec supersedes:
- "Kits at 1.0" section (three audience-specific starters).
- "Pro Kits at 1.x" — only the OSS-side "Kit" concept; Pro Kit naming and feature plan stay.
- Roadmap item #4 ("Kits rewrite"). This spec is item #4.
- Audience-aware setup table — the heuristics survive as Phase 1 signal weights; their consumption changes from "pick a kit" to "select recipes."
