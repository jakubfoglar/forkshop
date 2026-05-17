# Live-mirror Boards + cadence scope — implementation spec

Date: 2026-05-17
Status: Approved — draft v0
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` + `docs/specs/2026-05-17-setup-skill-v2-design.md`
Sequencing: pre-1.0 release-readiness polish; lands before public npm publish + docs-site deployment.

## Goal

Close seven spec gaps surfaced during the manual smoke test of the just-merged setup-skill-v2 branch:

1. **Live-mirror Boards** — UI Components and Blocks Boards auto-discover from the user's filesystem instead of requiring `forkshop setup` re-runs whenever new components land. Matches strategy v2's "always show the real thing, edit in place" principle.
2. **Cadence note scope** — drop the root-CLAUDE.md opt-in that violates strategy v2's "zero edits to user's project CLAUDE.md or settings.json" promise. Cadence guidance stays, but in properly scoped homes.
3. **Locator warning wording** — fix the alarmist "rule would crash dev" phrasing in Phase 7. The dev server runs fine without the loader; what breaks is Option-click → editor.
4. **Block preview route always written** — even when no blocks exist at install time, so a user adding their first block later doesn't have to re-run setup just to get the route file.
5. **fileMap crash fix** — Template 9 emitted `<AgentActivityProvider fileMap={{}}>` which crashes at runtime. Already shipped as hot-fix in `4a08963`; recorded here for completeness.
6. **Locator must actually auto-install** — spec #4 said Option-click is "always-on automatic." The implementation merely *detects* the missing dep and reports it as skipped in Phase 7. The skill should add the devDep + modify next.config during Phase 6.
7. **Phase 7 summary refresh** — current summary is too long, has stale items (skipped block preview / "no source material" entries become irrelevant once auto-discovery lands), and uses alarmist phrasing. Simplify and refresh wording; light use of color/checkmarks where the terminal renders them.

All seven are small individually; bundling them into one pre-release pass keeps the change history focused.

## Strategic motivation

Two contradictions between strategy v2 and what setup skill v2 actually shipped:

| Strategy v2 says | Setup skill v2 ships | Gap |
|---|---|---|
| "Always show the real thing, edit in place" (Mode #4) | Static snapshot — primitives/blocks baked into `forkshop.config.tsx` at install time | Adding a new primitive requires re-running the skill |
| "Zero edits to user's project CLAUDE.md or settings.json" (Live AI section) | Phase 5 opt-in appends a cadence note to root CLAUDE.md | Every agent task in the project — Forkshop-related or not — inherits the cadence rule |

Caught these via Path A smoke test (manual install against a fresh `create-next-app`). The skill ran cleanly, the install works, but the Phase 7 summary surfaces both gaps:

- `Opt-in: ✓ Cadence note (appended to root CLAUDE.md)` ← scope creep made literal
- `Design System / UI Components / Blocks / Reference Boards — no source material yet` ← if the user adds components/, the Boards still won't update without a re-run

The strategy promise needs to hold before public release.

## The four changes

### Change A — Live-mirror discovery for UI Components and Blocks

**What changes:**

- The engine grows an `autoDiscover` mechanism for primitives and blocks, mirroring how `Tree` already supports `autoDiscover: true` for routes.
- `UI Components` Board parent enumerates primitives by scanning a configurable path (default `components/ui/`). Adding `select.tsx` to that dir → new primitive tile appears on next render.
- `Blocks` Board parent enumerates blocks similarly (default scan paths: `components/blocks/`, `components/sections/`, `components/marketing/`, `components/site/`).
- Per-primitive variant-grid files (`ui-components/<slug>.tsx`) become **optional overrides**, not required. If a primitive has no override file, the engine renders it on the parent board with default props (single instance). If the user wants the variant grid, they author a slug-named file.
- Tokens (Design System Board) already auto-update via `buildTokenRegistry(tailwindConfig)`. No change needed there.
- Routes (Sitemap Board) already auto-discover via `Tree.autoDiscover`. No change needed.
- Reference Board auto-discovers MDX content via glob (already shipped per spec #4). No change needed.

**Configuration shape:**

`forkshop.config.tsx` shrinks to settings + paths + optional overrides:

```tsx
import tailwindConfig from "../../tailwind.config"

export const forkshopConfig = {
  paths: {
    primitives: "components/ui",            // optional; defaults to this
    blocks: ["components/blocks", "components/sections"],
    contentMdx: "content/**/*.mdx",         // optional; only used if MDX detected
  },
  // Optional per-primitive overrides — only entries the user wants to override
  primitiveOverrides: {
    button: { exampleProps: { children: "Get started" } },
  },
  // Optional per-block fixture props
  blockFixtures: {
    hero: { props: { title: "Welcome", subtitle: "Build fast." } },
  },
  sitemap: {
    excludeGroups: ["(authenticated)"],
  },
  viewportProfile: "responsive" as "responsive" | "mobile",
  tailwindConfig,
} as const

export type ForkshopConfig = typeof forkshopConfig
```

Compare with the spec-#4 shape (which baked the full registry inline) — this drops from ~40 lines to ~20 for a typical project. The config becomes the *settings* file, not the *inventory*.

**Position handling on auto-discovered nodes:**

Position persistence is already per-ID. `positions.json` stores `{ "primitive:button": {x, y}, ... }`. New auto-discovered primitives don't have a saved position, so they fall through to the Layout's auto-layout (Gallery's grid flow). Manually-positioned items keep their spots; new items flow into the next auto-layout slot.

**Notification of new auto-discovered items:**

Subtle and zero-popup:

- Sidebar entry shows a small dot next to its name when a new child has appeared since the last interaction (sticky for the session; clears on user click).
- No popup, no modal, no "discovered new component!" message.
- Matches strategy v2's posture: the component is real and the user added it; Forkshop's job is to *show it*, not announce itself.

**Garbage collection on deleted items:**

If the user deletes `components/ui/select.tsx`, the `primitive:select` entry in `positions.json` becomes orphaned. On the next save (or on a debounced sweep), entries whose node IDs no longer match any discovered item get dropped. No user-visible UI for this; just cleanup.

**Discovery mechanism (implementation choice — see open questions):**

The engine needs to enumerate `.tsx` files in the configured paths. Three viable approaches:

1. `require.context` (webpack-native) — `require.context('@/components/ui', false, /\.tsx$/)`. Works with webpack; Turbopack support is recent.
2. Build-time codegen — a small Next.js plugin walks the configured paths at build time and emits a virtual module the engine imports.
3. Server-side filesystem read + dynamic import — RSC reads `fs.readdirSync` then maps to `import("@/components/ui/" + slug)` calls, relying on webpack's static analysis to bundle all candidates.

Decision deferred to implementation. Approach #1 is simplest if Turbopack support holds; #2 is most portable but adds a build step; #3 is most server-component-idiomatic but has bundling subtleties.

### Change B — Cadence note scope correction

**What changes:**

- **Phase 5 of the setup skill loses its only opt-in.** The "Append the cadence note to root CLAUDE.md?" prompt is removed.
- The Phase 5 section becomes informational only: a one-line note that cadence guidance ships via the auto-loading skill + dir-CLAUDE.md, and the user can verify by reading them.
- Phase 7 summary's `Opt-in:` line is removed (no opt-ins remain).

**Cadence guidance still ships — just in the right places:**

| Mechanism | Where | Scope | Status |
|---|---|---|---|
| `.claude/skills/forkshop-live-editing.md` | `.claude/skills/` | Activates by Claude Code description-trigger; only matches Forkshop-related work | ✓ Already shipped via `forkshop init` |
| Cadence section in `app/forkshop/CLAUDE.md` | `app/forkshop/CLAUDE.md` | Auto-loads only when Claude is in `app/forkshop/` | ✓ Already in the user-claude-md template |
| ~~Root `CLAUDE.md` opt-in~~ | ~~Repo root~~ | ~~Every agent task in the project~~ | ❌ Dropped by this spec |

**Why this matters:** the root-CLAUDE.md note influences every agent operating in the project — Forkshop-related or not. Refactors get harder, wholesale rewrites get fought, other tools/agents inherit a cadence constraint Forkshop has no right to impose globally. The two scoped mechanisms cover the legitimate cases.

**Existing installs:**

Users who already opted in (cadence note appended to root CLAUDE.md from the setup-skill-v2 install) will still have the note. They can delete the marked block manually. A future doc-sync skill enhancement could detect and offer to remove it, but that's not in this spec.

### Change C — Locator warning wording fix

**Current Phase 7 wording (alarming):**

> *next.config.ts loader rule — `@locator/webpack-loader` isn't installed. Install it (`pnpm add -D @locator/webpack-loader`) and re-run setup to enable Option-click → editor. **Without it the rule would crash dev.***

The bold sentence is wrong — the loader rule is what depends on the package being installed. The dev server runs fine without the loader; you just lose Option-click → editor.

**New wording:**

> *next.config.ts loader rule — `@locator/webpack-loader` isn't installed. Install it (`pnpm add -D @locator/webpack-loader`) and re-run setup to enable Option-click → editor. The dev server runs fine without it; only Option-click open-in-editor is unavailable.*

**Where the change lives:**

Phase 7 summary template in `packages/engine/src/skill/setup.md` (the conditional Locator-skip line).

### Change E — fileMap crash fix (already hot-fixed)

**Discovered:** during the manual Path A smoke test. `forkshop init` ran clean, the setup skill produced the multi-Board scaffold, then `/forkshop` 500'd on first load with `Cannot read properties of undefined (reading 'map')`.

**Root cause:** Template 9 (the user-facing `page.tsx` template) passed `<AgentActivityProvider fileMap={{}}>`. The engine's hooks (`useAgentActiveBlocks`, `useAgentActivePrimitives`) read `fileMap.blocks.map(...)` / `fileMap.primitives.map(...)`. Empty-object fileMap → undefined access → crash.

**Hot-fix shipped** in commit `4a08963` on main: changed `fileMap={{}}` → `fileMap={{ primitives: [], blocks: [] }}` in the template + the user's smoke fixture. Spec records the fix for completeness.

**Follow-up in this spec:** when the live-mirror config shape (Change A) lands, the fileMap should be derived from `forkshopConfig.primitives` and `forkshopConfig.blocks` so agent-activity routing works for real components. Template 9 will use `useForkshopFileMap()` helper or equivalent that maps discovered primitives → their source file paths.

### Change F — Locator must actually auto-install

**Spec #4 said:** Option-click is always-on automatic. The setup skill's Phase 6 should add `@locator/webpack-loader` as a devDependency and modify `next.config.*` to wire the loader rule. No opt-in question.

**What ships today:** Phase 6 does neither. Phase 7 instead reports the missing dep as a skipped item with the alarmist note "Without it the rule would crash dev" — making the install feel half-broken and asking the user to do manual work after the skill claims to be done.

**Required Phase 6 behavior:**

1. Detect whether `@locator/webpack-loader` is in the host's `package.json` devDependencies.
2. If absent, merge it in (same mechanism as the engine merge). Print `✓ Added @locator/webpack-loader to package.json devDependencies`.
3. Detect which `next.config.*` shape exists (`.ts` / `.js` / `.mjs` / `.cjs`).
4. Read it, identify the right place to add the webpack/turbopack rule, write the merged config. Print `✓ Added Locator rule to next.config.<ext>`.
5. Tell the user once at the end of Phase 6 (not in skipped): `"Run pnpm install before pnpm dev — Locator was just added."`

If the next.config shape is too unusual for a clean automated edit (very rare), fall back gracefully: print `! Couldn't merge Locator rule into <file> automatically — here's the snippet to paste in manually:` followed by the rule. This is the only legitimate "skipped" path, and it should be loud (not buried in a "skipped" list).

The Phase 7 summary stops carrying any Locator-related skipped entries unless the manual-paste fallback fired.

### Change G — Phase 7 summary refresh

**Current state:** the Phase 7 summary is long, lists items that won't exist post-Change-A (skipped block preview route, "no source material" Boards), uses alarmist wording (Change C / D / F territory), and surfaces an "Opt-in" line that becomes empty after Change B.

**Refreshed shape:**

```
✓ Forkshop is set up.

  /forkshop          → http://localhost:3000/forkshop
  Boards             → Sitemap (3 routes)
  Live-mirroring     → Add a primitive to components/ui/ and it'll show up

Try it:
  pnpm dev
  → open /forkshop
  → click a route under Sitemap

Sibling skills:
  forkshop-live-editing   auto-applies on Forkshop file edits
  forkshop-doc-sync       invoke when app/forkshop/CLAUDE.md drifts

Everything's in your repo. You own all of it.
```

Specific simplifications:
- **`Boards →` line** lists what's actually wired with counts. No empty placeholders.
- **`Live-mirroring →` line** replaces the long "Customize" section with a single observation that adds/edits propagate automatically. The old "Re-run setup" advice is gone (the skill's no longer the source of truth for inventory).
- **Drop `Mount:` / `Modifiers:` / `Opt-in:` / `Files written:` / `Skipped:`** — those are post-install debugging info. Move them to a verbose mode if needed (`--verbose` flag on the setup skill — out of scope for this spec, but flag for follow-up).
- **Drop the numbered "Try this first" / "Customize" / "Sibling skills" headings.** They visually compete with the boards line.
- **Light visual treatment:** lead with `✓` (works in any terminal). Use `→` for direction. Use indentation for hierarchy. Avoid ANSI escape codes — they don't render reliably across Claude Code's various rendering contexts. The skill is markdown-based instructions; the *output* uses unicode + whitespace.

Failure variant — if Phase 6 hit any non-trivial skip (e.g., Locator next.config couldn't merge automatically):

```
✓ Forkshop is set up. One thing needs your attention:

  ! next.config.* — Locator rule needs manual paste. See below.
  
  <inline snippet>

  /forkshop          → http://localhost:3000/forkshop
  Boards             → Sitemap (3 routes)
  Live-mirroring     → Add a primitive to components/ui/ and it'll show up

Try it:
  pnpm install         (Locator dep was just added)
  pnpm dev
  → open /forkshop
  → click a route under Sitemap

Sibling skills:
  forkshop-live-editing   auto-applies on Forkshop file edits
  forkshop-doc-sync       invoke when app/forkshop/CLAUDE.md drifts

Everything's in your repo. You own all of it.
```

The single `!` line is the only urgent attention-grabber. Everything else flows the same.

**Same refresh applies to Phase 3 proposal output, Phase 4 iteration messages, Phase 6 per-step `✓` lines, and the post-success Phase 7 summary.** The whole skill gets a wording pass for tighter, less alarmist phrasing. No new templates needed — just rewording inside existing scaffold lines.

### Change D — Block preview route always written

**Current behavior:** the Phase 6 step list conditionally writes `app/forkshop/block/[slug]/page.tsx` ("if Blocks recipe fired"). For a fresh project with no blocks, the file doesn't exist. Adding a block later requires re-running the skill to get the route — same friction the live-mirror change is trying to remove for primitives/blocks.

**New behavior:** always write `app/forkshop/block/[slug]/page.tsx`. The file is small, dev-gated (404s in production), and harmless to ship in projects without blocks. Auto-discovery (Change A) means a block added later just works — the route is already there to serve it.

**Template update:**

Template 6 in `setup.md` doesn't change shape — only the conditional `(if Blocks recipe fired)` qualifier in Phase 6 Step 6 is removed.

## Engine surface changes

### New exports

- `useAutoDiscoveredPrimitives(config: ForkshopConfig): PrimitiveEntry[]` — engine hook that returns the live list. Implementation depends on discovery mechanism choice.
- `useAutoDiscoveredBlocks(config: ForkshopConfig): BlockEntry[]` — same shape for blocks.
- `Gallery` and `Tree` Layouts accept `entries` from these hooks; no API change to the Layouts themselves.

### Internal additions

- Small filesystem-discovery helper (or webpack/Turbopack-bundled module loader, depending on chosen approach).
- New garbage-collection pass in the position-persistence layer (drop orphan IDs on save).

### What stays the same

- `DesignSystemView`, `Tree`, `Gallery`, `ResponsiveFrameView` Layouts — unchanged signatures.
- `SidebarSection.entryKind` — unchanged.
- `ForkshopSelection` shape — unchanged.
- Position-persistence storage format — unchanged.

## Setup skill changes

### Phase 2 — Scans

No change. The skill still scans at install time to inform Phase 3's *proposal*. The difference is that discovered components no longer get baked into the config — they're only used to populate the narrative ("I see 12 primitives in components/ui/").

### Phase 3 — Proposal

Lightly reworded — the proposal narrative emphasizes that Forkshop will *live-mirror* the user's filesystem, not capture a snapshot. The sidebar tree still shows what will appear; the prose adds "as you add more, they'll show up automatically — no need to re-run me."

### Phase 5 — Consent

**Becomes empty of opt-ins.** No root-CLAUDE.md modification, no Locator opt-in (already always-on from spec #4). The Phase 5 section reduces to ~10 lines noting that cadence guidance ships via the auto-loading skill + dir-CLAUDE.md and listing where to find both.

### Phase 6 — Write artifacts

- Step 1 (`forkshop.config.tsx`) — uses the slimmer settings-only shape.
- Step 3 (UI Components parent) — uses `useAutoDiscoveredPrimitives` from engine.
- Step 4 (per-primitive grids) — written only for primitives where the user wants variant authoring; the skill asks "do you want a variant grid for Button?" or just writes a stub the user can flesh out later.
- Step 5 (Blocks parent) — uses `useAutoDiscoveredBlocks`.
- Step 6 (block preview route) — **always written** per Change D.
- Step 12 (root CLAUDE.md cadence note) — **dropped**.

### Phase 7 — Summary

- `Opt-in:` line removed (no opt-ins).
- Locator-skip wording per Change C.
- "Re-run setup to grow it" caveat replaced with "Add primitives/blocks/routes — they'll appear automatically. Use `forkshop-doc-sync` if `app/forkshop/CLAUDE.md` drifts."
- Skipped-items section drops "Block preview route — no blocks yet" entirely (the route is always written now).

### Templates

- Template 1 (`forkshop.config.tsx`) — replaced with slim settings-only shape.
- Template 3 (UI Components parent) — uses the auto-discovery hook.
- Templates 4a/4b (per-primitive grids) — still authored, but optional. The skill scaffolds only when the user opts in.
- Template 5 (Blocks parent) — uses auto-discovery hook. Also: fix the `src:` → `previewSrc:` typo carried from spec #4.
- Template 6 (block preview route) — unchanged content; only the conditional gate is removed from Phase 6.
- Template 12 (root CLAUDE.md cadence note) — **removed**.

## User CLAUDE.md template changes

`packages/engine/templates/user-claude-md.md` needs:

- The "Per-primitive variant authoring" section reframed: "Per-primitive variant grids are *optional* overrides. Without one, Forkshop shows your primitive with default props. Add a grid when you want to see all variants."
- A new short section "Adding components" explaining that new primitives/blocks/routes appear automatically — no skill re-run needed.
- The Self-containment posture section gets one new line: "Forkshop scans your `components/` directory but never writes there."

## CLI implications

`forkshop init` is unchanged — kit-independent scaffold drop still works exactly as it does today. The CLI doesn't need to know about live-mirror; that's an engine + setup-skill concern.

`forkshop update` may want a small note about migrating existing installs (whose `forkshop.config.tsx` still has the old `primitives: [...]` array). Defer to a follow-up if real users hit it.

## Playground implications

`apps/playground/app/forkshop/forkshop.config.tsx` — migrate to the new slim shape during implementation. Adds another commit to the playground rebuild trail.

`apps/playground/app/forkshop/ui-components.tsx` — switch from explicit `forkshopConfig.primitives` map to `useAutoDiscoveredPrimitives()`.

`apps/playground/app/forkshop/blocks.tsx` — switch to `useAutoDiscoveredBlocks()`.

`apps/playground/app/forkshop/block/[slug]/page.tsx` — minor: read auto-discovered blocks instead of `forkshopConfig.blocks`.

## Risks

**R1. Discovery mechanism doesn't work with Turbopack.** `require.context` is webpack-native; Turbopack support is recent and may be incomplete. Could break Next.js 15+ users with Turbopack enabled.
- *Mitigation:* test against both webpack and Turbopack during implementation. Fall back to build-time codegen if Turbopack fails. Document the constraint in the user CLAUDE.md.

**R2. Existing installs (from setup-skill-v2 just-merged install) have the static `primitives: [...]` shape.** This spec's new config shape isn't backward-compatible.
- *Mitigation:* engine supports BOTH shapes during a transition. If `forkshopConfig.primitives` is an array, use it (snapshot mode). If absent, use auto-discovery. Document the migration in `forkshop-doc-sync` skill (next release).

**R3. Auto-discovery might surface components the user didn't intend as primitives.** E.g., the user adds `components/ui/use-toast.ts` (a hook, not a primitive). It shows up on the UI Components Board.
- *Mitigation:* discovery filter excludes files starting with `use-`, files without a top-level PascalCase named export, and `.test.tsx` / `.stories.tsx` files. Same filter the setup-skill-v2 Scan A already uses.

**R4. Position garbage collection might remove positions for items that are temporarily missing.** E.g., user renames `button.tsx` → `button-v2.tsx`; the rename is two filesystem events. GC fires after the delete but before the create.
- *Mitigation:* debounce the GC sweep (~5s after last change) and only run it on explicit save events, not on every filesystem change.

**R5. Dropping Phase 5 opt-in changes user-flow expectations.** Users who installed via spec-#4's setup expect a Phase 5 consent panel.
- *Mitigation:* none needed — Phase 5 just becomes informational. The setup skill still runs the same overall flow; one fewer prompt.

## Scope edges

**In scope:**

- Engine auto-discovery for primitives + blocks.
- `forkshop.config.tsx` slimmer shape.
- Subtle sidebar new-entry indicator (dot or similar; details deferred to implementation).
- Phase 5 / Phase 6 / Phase 7 updates per Changes B + C + D.
- Phase 6 Template 5 typo fix (`src:` → `previewSrc:`).
- Phase 6 Template 12 removal (root CLAUDE.md cadence note).
- User CLAUDE.md template updates for the new model.
- Playground migration to the new config shape + auto-discovery hooks.

**Out of scope:**

- A doc-sync skill that auto-removes orphan root-CLAUDE.md cadence notes from old installs. Manual cleanup is fine for the rare existing install.
- Turbopack-specific discovery polish if the chosen mechanism falls back to a build-time codegen. The fallback works; Turbopack optimization waits for real demand.
- Components-list editing UI inside Forkshop (the user adds primitives by adding files; no in-canvas "add component" affordance).
- Engine spacing/radii/shadows extensions for DesignSystemView — still 1.x polish (already filed in `docs/polish-backlog.md`).

## Open questions deferred to implementation

**O1. Discovery mechanism choice.** `require.context` vs. build-time codegen vs. RSC fs-read. Benchmark all three against the playground + a real shadcn project; pick the simplest that works in both webpack and Turbopack.

**O2. Visual treatment for new-entry indicators.** Dot vs. pill vs. fade-in highlight. Settled in implementation based on what looks right in the existing sidebar shell.

**O3. Backward compatibility window.** Does the engine support both old (`forkshopConfig.primitives = [...]`) and new (`useAutoDiscoveredPrimitives()`) shapes simultaneously, or do we hard-cut and rely on existing installs upgrading via setup skill re-run? Decision at implementation.

**O4. Garbage-collection cadence for orphan positions.** Debounce window, save trigger, cleanup verbosity. Implementation detail.

## Exit criteria

- Engine exports `useAutoDiscoveredPrimitives` and `useAutoDiscoveredBlocks` (or equivalent named API).
- Playground's UI Components and Blocks boards use the new hooks; adding a primitive to `apps/playground/components/ui/` shows up on next dev reload without code changes elsewhere.
- Setup skill v2's Phase 5 is informational-only (no opt-ins).
- Setup skill v2's Phase 6 always writes `block/[slug]/page.tsx`.
- Setup skill v2's Phase 6 actually installs `@locator/webpack-loader` and merges the next.config rule (Change F).
- Setup skill v2's Template 5 uses `previewSrc:` (not `src:`).
- Template 12 (root CLAUDE.md cadence note) is removed from the skill.
- Template 9 derives a non-empty `fileMap` shape from `forkshopConfig` (Change E follow-up; the hot-fix shipped the literal `{ primitives: [], blocks: [] }`, but live-mirror lets us derive the real shape).
- Phase 7 summary uses the simplified wording (Change G). No "Skipped" section by default. Sibling-skill mentions are 1-line each. `Mount/Modifiers/Opt-in/Files written` lines are gone from the default output.
- Phase 3 / Phase 4 / Phase 6 wording-pass — terse, no alarmist phrasing.
- `forkshop.config.tsx` shape (Template 1 + user-claude-md template) reflects the new slim form.
- A manual smoke test against a fresh `create-next-app` confirms: (a) install runs, (b) `/forkshop` renders without crash on first load, (c) adding `components/ui/button.tsx` shows up on UI Components without re-running the skill, (d) no root-CLAUDE.md modification occurs, (e) `@locator/webpack-loader` was installed and next.config was modified automatically.

## Supersedes

This spec amends `docs/specs/2026-05-17-setup-skill-v2-design.md` (the just-merged spec #4). Specifically:

- **Change A:** adds auto-discovery for primitives + blocks (mirrors what Tree and DesignSystemView's token registry already did).
- **Change B:** removes the root-CLAUDE.md cadence-note opt-in from Phase 5.
- **Change C:** rewords Phase 7's Locator-skip line. (Mostly subsumed by Change F — once Locator auto-installs, no skip line is needed in the common case.)
- **Change D:** removes the conditional gate on Step 6 (preview route always written).
- **Change E:** fixes the `fileMap={{}}` runtime crash in Template 9. Hot-fix `4a08963` shipped on main; this spec records the fix and adds a `forkshopConfig`-derived fileMap as part of the live-mirror change.
- **Change F:** Phase 6 actually installs `@locator/webpack-loader` and merges the next.config rule. Restores spec #4's "always-on automatic Option-click" intent.
- **Change G:** Phase 7 summary refresh — shorter, no stale skipped items, less alarmist phrasing. Same wording pass applied to Phase 3 / 4 / 6 messages.
- **Plus:** fixes Template 5 typo (`src:` → `previewSrc:`).
- **Plus:** removes Template 12 (cadence-note template) entirely.

Strategy v2's "always show the real thing, edit in place" and "zero edits to user's project CLAUDE.md or settings.json" promises are restored.
