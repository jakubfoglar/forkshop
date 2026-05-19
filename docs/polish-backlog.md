# Polish backlog (post-1.0)

Small, deferrable improvements not blocking 1.0. Filed as they're discovered. Pull from this list when scoping 1.x or later cycles.

**Field reports:** see `docs/feedback/` for verbatim session transcripts that drove individual entries here. Skim those before grooming this list — they carry context (which step the user got stuck on, what workarounds they tried) that gets lost in summarization.

- `docs/feedback/2026-05-19-board-building-session.md` — wiring two custom Boards (Dashboard + Charts) in `ravineo-frontend`. Source of entries marked *(board-building feedback)* below.

---

## Gallery grid auto-flow when `entry.row` / `entry.column` are undefined *(board-building feedback)*

**Symptom:** With `<Gallery layout="grid" entries={...} />` and no `row`/`column` on entries, every cell renders at `(0, 0)` and visually overlaps. The natural reading of "grid layout" implies auto-flow; the actual behavior is "all cells pinned to cell (0,0)." Took a wasted iteration in the field session to discover.

**Note:** an earlier hypothesis attributed this to `node.x=0,y=0` semantics. The board-building feedback (doc #2) pins it to `GalleryEntry.row` and `GalleryEntry.column` defaulting to 0 — different field, sharper diagnosis.

**Fix direction:** two cheap interventions, either or both:

1. **Auto-assign sequential `column`** (or `row`) when undefined. Most consumers want left-to-right flow; this matches the implicit default and removes the need to pass `idx` per entry. Single source change in Gallery's layout function.
2. **Dev-only console warning** when multiple entries resolve to the same `(row, column)` cell. Cheap diagnostic that surfaces the bug without changing behavior.

Ship both. Option 1 is the actual fix; option 2 protects against the next analogous footgun (e.g. all entries explicitly set to `column: 0`).

**Sequencing:** TL;DR top-3 in the board-building feedback. First 1.x cycle.

---

## `iframe-route` body-height callback ignores `heightMode: "cap"` *(board-building feedback)*

**Symptom:** A custom Board uses `iframe-route` Nodes with `node.height = 2500` and `heightMode: "cap"`. The iframe wrapper visually clips at 2500px (correct), but Gallery's measured cell height grows past the cap as the embedded page autoloads more content — frames eventually pile on top of each other. Was the single biggest source of friction in the board-building session; the user worked around by abandoning `iframe-route` entirely and reimplementing the iframe lifecycle in `inline-react`, losing live-edit overlay, agent-read indicator, and wheel forwarding in the process.

**Root cause:** `LazyIframe`'s `onBodyHeightSync` callback fires with the **uncapped** measured `body.scrollHeight`, even when `heightMode === "cap"`. Gallery then sizes the cell to that uncapped value. The visual clip and the layout measurement are using different numbers.

**Fix direction:** in `LazyIframe`, cap the callback value when in cap mode:
```ts
const reportedHeight = heightMode === "cap" ? Math.min(measured, height) : measured
onBodyHeightSync?.(id, reportedHeight)
```

Optional further work (lower priority): add a `maxHeight?: number` field on `IframeRouteNode` that bounds both the wrapper *and* the callback — useful when consumers want "render at full height but never exceed N pixels."

**Sequencing:** TL;DR #1 in the board-building feedback. First thing to ship in 1.x — unblocks an entire class of "iframe at a route with explicit framing" boards.

Related: existing "Blocks Board frame heights" entry below — likely the same root cause as observed via `iframe-component` rather than `iframe-route`. Fixing this should subsume that.

---

## Export `LazyIframe` (+ `useForkshopCanvas`, canvas handle/transform/wheel-input types) *(board-building feedback)*

**Symptom:** Custom Boards that want any iframe-shaped content must reimplement what `LazyIframe` already does: `IntersectionObserver` lazy-load, `nextjs-portal` / `min-h-screen` neutralization, wheel forwarding to canvas, body-height sync via `ResizeObserver`, `scrolling="no"` + overflow wrapper, optionally `AgentReadIndicator` + `IframeEditOverlay`. The field session rewrote ~80% of `LazyIframe` by hand.

Smaller analogous gap: `useForkshopCanvas` (which gives consumers `applyWheelInput`, `transformRef`) is referenced from the engine's own NodeTypes but never exported. So custom NodeTypes can't reuse the same wiring.

Smallest: `ForkshopCanvasHandle`, `Transform`, `WheelInput` types appear in the `.d.ts` but aren't in the `export { ... }` block. Consumers have to redeclare them structurally to type a `useRef`. Pure DX paper cut.

**Fix direction:** three separable changes, in increasing scope:

1. **Type exports** (handle / transform / wheel-input). 5-minute fix to `index.ts`. Ship first.
2. **Export `useForkshopCanvas`.** Verify the hook's contract is stable enough for a public API (the engine uses it internally — should be solid). Document the two methods consumers care about.
3. **Export `LazyIframe`** (or wrap it in a thinner public `IframeFrame`) with `maxHeight` + `lockScroll` props. Biggest scope — needs to lock down the iframe primitive's contract for the long term. Combine with the `heightMode: "cap"` callback fix above; same surface.

**Sequencing:** TL;DR #3 in the board-building feedback. Type exports = first cycle, no-brainer. `useForkshopCanvas` = next cycle, needs a quick contract review. `LazyIframe` export = aligned with the cap-callback fix, ship them together.

---

## Portal-rendered tooltips escape canvas zoom *(board-building feedback)*

**Symptom:** Charts board uses visx tooltips, which render via `createPortal(..., document.body)`. The canvas applies `transform: scale(zoom)` on a stage div *inside* the container; anything portaled out of that subtree renders at 100% scale regardless of canvas zoom. Tooltips look comically large when zoomed out.

This will also bite any consumer using Radix Popover / Tooltip / Select / DropdownMenu, all of which portal by default.

**Field workaround:** `MutationObserver` on `document.body` watching for tooltip insertions/style mutations, then applying CSS `scale: <zoom>` + `transform-origin: 0 0` imperatively. Uses CSS `scale` rather than `transform: scale` so visx's own `translate` stays intact.

**Fix direction:** layered options, pick one or stack:

1. **Expose `--canvas-zoom` on `:root`** instead of inline-styling the stage div. Portaled DOM can read it via CSS inheritance. Cheapest fix; consumers opt in via their own CSS.
2. **`ForkshopPortal` context provider.** Descendants of `ForkshopCanvas` get a context with the stage element ref; consumers pass it to Radix's `portalContainer` / Popover's `container` prop / visx's `portalContainer`. Library-friendly; no body portals at all.
3. **Auto-scale opt-in selector.** Any `body > [data-forkshop-portal]` gets the canvas-zoom scale applied automatically by an engine-shipped style block. Brittle in the long run; useful escape hatch for libraries that *don't* expose a portal container.

Option 2 is the durable answer for Radix-shaped libraries (most modern popover stacks). Option 1 is the floor — ship it as part of the same change. Option 3 only if there's real demand.

**Sequencing:** bug #3 in the board-building feedback. Doesn't block any specific Board recipe, but any visualisation library with portaled overlays will hit it. First 1.x cycle.

---

## DesignSystemView persisted positions drift after reload

**Symptom:** On the Design System Board, drag a primitive frame (Popover, Skeleton, etc.) into a new spot. Reload the page. Frames reappear in noticeably different positions — sometimes overlapping the token grid, sometimes way off-canvas. The persisted x/y is being applied, but visually it lands wrong.

**Root cause (hypothesis):** `DesignSystemView` computes its own stage layout (token color graph footprint + primitives section + typography section). Stage origin and dimensions depend on the inputs (token count, primitive count). Persisted positions are stored as absolute pixel coords. On reload, if the stage origin shifts even slightly (e.g. one more token row, one fewer primitive), positions persisted in the old coordinate system land somewhere else visually.

**Fix direction:** options, in increasing order of correctness:

1. **Snap drift to nearest section.** Detect when a persisted position is "implausible" (e.g. negative, off-stage) and clamp into a sensible default. Quick win, masks the underlying issue.
2. **Store positions relative to layout sections.** Each section (`tokens`, `primitives`, `typography`) gets its own coord space. `DesignSystemView` knows how to translate. Survives stage-size shifts. Requires position-storage format to carry a section discriminator.
3. **Version positions per-layout schema.** When `DesignSystemView`'s internal layout shape changes (new section added, primitives count crossing a row boundary), bump a schema version and invalidate old positions. Heavyweight.

Option 2 is the right long-term fix; option 1 is acceptable as a short-term unblock.

**Sequencing:** 1.x. Surface impact is high (first thing users do is drag stuff around; reload showing chaos is a confidence killer), but the bug only bites on the Design System Board specifically — Gallery / Tree / ResponsiveFrameView aren't affected.

---

## User-side CLAUDE.md template — stale field names in "Configuring file mapping"

**Why:** Surfaced during the iframe-primitive-contract code review (2026-05-19). The "Configuring file mapping" subsection (`packages/engine/templates/user-claude-md.md` around lines 480–490) shows code examples that reference fields that don't exist on the engine's Node types:

- `sourcePath: "components/ui/button.tsx"` on an `InlineReactNode` — but `InlineReactNode` has `filePath?: string`, not `sourcePath`.
- `path: "/"` on an `IframeComponentNode` — but `IframeComponentNode` has no `path` field (it has `slug` + `previewSrc`).
- `sourcePath: "..."` on the same `IframeComponentNode` example — also a non-existent field.

Any user who copy-pastes those examples hits a TypeScript error. The 2026-05-19 spec only covered iframe-route's `path` → `routePath` rename in the field-mapping section; this is the same class of bug elsewhere in the same template, scoped out at the time.

**The fix:** audit every code example in `user-claude-md.md` against `packages/engine/src/types/node.ts`. Reconcile field names. Update the surrounding prose if it references the wrong fields.

While in there, also reconcile the prose on agent-activity attribution against what `InlineReactNode` / `IframeComponentNode` actually carry. The current template says "Add `sourcePath` to each `inline-react` Node and `iframe-component` Node" — if the actual attribution field is `filePath` on inline-react and `componentPath` / `sourceFile` on iframe-component, the prose needs to change too.

**Sequencing:** post-1.0. Same first-impression class as the iframe-primitive work just shipped — every fresh install reads this template, and broken examples teach the wrong shape. Pair with any future doc-pass in the next 1.x cycle.

---

## Live-AI hook — dev-port discovery instead of port-range walk

**Why:** The hook script POSTs to `localhost:3000/api/forkshop/agent-activity`. When Next picks an alternate port (3000 already taken), every hook call silently fails — no live indicators, no warning, no recovery. We patched this by walking ports 3000-3009 until one responds, which is robust but burns up to 10 curl invocations per Edit/Write/Read tool call. Acceptable as a stopgap; not what we want long-term.

**The fix:** have the engine's dev-only middleware (or any request handler) write the bound port to a small discovery file on first request — e.g. `~/.forkshop/dev-port.<project-hash>` containing `{ port: 3001, ts: <epoch> }`. The hook reads that file (fast, one fs.read) and POSTs directly. Stale entries auto-prune by checking `ts` freshness. Falls back to port-walk if no file exists yet (first run of the day).

Alternative: write the port file from a Next.js instrumentation hook (`instrumentation.ts`) on dev server boot. Cleaner — runs exactly once per dev session. The engine could ship the instrumentation snippet and the setup skill scaffolds it.

**Sequencing:** 1.x polish. The port-walk works fine for most teams (most stay in 3000-3002 range). Real benefit kicks in when teams routinely run multiple Next projects in parallel and the hook overhead becomes visible in Claude's tool latency.

---

## Setup skill — surface structurally-interesting routes without prescribing Boards

**Why:** The setup skill currently treats every discovered route the same: feeds them into `forkshopConfig.sitemap.routes`, lets them appear under PAGES. That's fine for typical app routes, but flattens the signal on routes that obviously warrant a custom Board — dynamic routes (`/dashboard/[dashboardId]`) iframe blank without a sample ID, high-fanout routes (47 imports, tabs, sidebars) won't show their richness in a thumbnail. Users have to discover the gap themselves and read CLAUDE.md to figure out next steps.

**The fix:** Phase 3's consolidated proposal surfaces observations without scaffolding anything:

- **Dynamic routes:** *"`/dashboard/[dashboardId]` has dynamic params + query strings — won't iframe meaningfully without a sample ID. Want to provide one canonical ID so I can wire a preview, or skip for now?"* If the user provides one, write it as a `previewParams: { dashboardId: "GduBF5JefXZF" }` field on the route entry; the engine's `iframe-route` NodeType uses it to construct the iframe URL.
- **High-fanout routes (top N by import count):** *"Largest internal component graphs: /dashboard/[id] (47), /admin (12), /my (8). These might benefit from custom Boards beyond the default iframe — see `app/forkshop/CLAUDE.md`."*

No auto-scaffolding. Forkshop describes what's there; the user decides what deserves a custom Board. Stays on the right side of "Forkshop scaffolds, user owns content."

**Sequencing:** post-1.0. Real first-impression polish — every team has a hero screen, and the current scaffold doesn't acknowledge it exists. Ship in the first 1.x cycle alongside the compound-primitive empty-state work.

---

## Compound primitives render empty (Dialog, Popover, DropdownMenu, Skeleton)

**Why:** The default per-primitive scaffold emits `<p.Component />` — fine for atomic primitives (Button, Badge, Input) but produces blank white cards for compound primitives that need composition (`Dialog` + `DialogTrigger` + `DialogContent` + `open` state), or zero-dimension primitives (`Skeleton` with no explicit w/h className). Users see "empty boxes" on UI Components and rightly wonder what's broken. Real-installs first impression problem.

**The fix:** two lighter interventions, kept on the right side of "don't pretend to know the user's API":

1. **Scaffold-time richer stubs.** When the setup skill scans a primitive file and detects a Radix-style compound (multiple PascalCase exports sharing a stem, e.g. `Dialog`, `DialogTrigger`, `DialogContent`), emit a stub with the compound skeleton commented in:
   ```tsx
   // Hint: <Dialog open><DialogTrigger>Open</DialogTrigger><DialogContent>...</DialogContent></Dialog>
   ```
   Still a stub, but runnable in 90 seconds instead of staring at a blank board.

2. **Runtime honest empty-state.** When a Gallery / Design System entry renders to an effectively-empty DOM (zero bounding box or only whitespace), engine swaps in a placeholder card: *"Stub — open `ui-components/<slug>.tsx` to add variants."* Click → Locator-style jump to the file. Makes the gap legible.

3. **Skeleton exception.** Single-purpose, no API surface — safe to bake in `<Skeleton className="h-10 w-48" />` as the default scaffold for it.

**Sequencing:** post-1.0. First-impression polish but not blocking. Will hit ~every user who installs Forkshop on a shadcn codebase, so worth shipping in the first 1.x cycle.

---

## Dedupe `/api/forkshop/edit?path=...` fetches across multi-viewport boards

**Why:** Each iframe mount triggers one `GET /api/forkshop/edit?path=<source>` to load the source file for the editable-set. Multi-viewport boards (e.g., `ResponsiveFrameView` rendering the same page at 1440/768/375 widths) trigger N identical fetches — once per viewport. Same response, different timestamps. Costs nothing in correctness but spams dev logs and burns redundant CPU.

**The fix:** add an in-memory module cache or `Promise` map keyed by `sourcePath` inside `useIframeEditController` so concurrent requests for the same source dedupe to one fetch. Cache invalidation: drop the entry when the `forkshop:source-changed` window event fires (already used for cross-viewport live sync).

**Sequencing:** 1.x polish. Real users will see the chatty logs but operationally this is benign.

---

## Replace `apps/playground/` with a CLI-init smoke fixture

**Why:** The current playground inherits Ravineo-flavored host content from the in-house Fogma extraction — hero blocks named "Acme", `bg-forkshop-accent text-forkshop-accent-fg` mixed into host code, "Ship better software, faster" placeholder copy. None of this represents what a real `npx forkshop init` install looks like. Strategy v2 explicitly says hosts shouldn't use `forkshop-*` tokens in their own code, but the playground does.

**The replacement:** during CLI rework (spec #3), build a minimal host that exercises the real install path — essentially `create-next-app` + Tailwind + whatever `forkshop init` scaffolds. Doubles as: (a) the smoke test for the new init flow, (b) the dev playground for ongoing engine work. Single artifact, two uses.

**Sequencing:** Folds into CLI rework. Should land before 1.0 because the playground is the canonical "does it work?" check and the current shape misrepresents the install experience.

**Until then:** existing playground stays as-is. Visual mismatches (e.g., button text rendering black instead of white in iframe pages because `text-forkshop-accent-fg` isn't generated) are artifacts of the old shape; they don't reflect real-user behavior.

---

## Canvas wheel-capture leaks browser zoom

**Why:** Cmd+scroll (or trackpad pinch) inside the Forkshop UI triggers the browser's native page zoom when the gesture happens over a region the canvas isn't intercepting wheel events on — sidebar, header, gaps. The canvas wheel handler only fires when the cursor is over the canvas viewport itself; outside that region, the browser handles the gesture.

**The fix:** in `ForkshopCanvas` (or a sibling wrapper), add a wheel listener at the document level that `preventDefault()`s any `ctrlKey || metaKey` wheel events while Forkshop is mounted in the parent route. Scope to mount path so it doesn't affect the rest of the host's site.

**Sequencing:** 1.x polish. Real users will hit this and it's noticeably wrong.

---

## Iframe content blurs when canvas zoomed in

**Why:** When `ForkshopCanvas` applies a CSS `transform: scale(>1)` to the stage, each iframe inside is rasterized at its natural device pixel ratio then scaled up. Fonts and edges blur.

**The fix:** when canvas scale exceeds 1.0, render iframes at higher intrinsic resolution and CSS-scale-down to compensate. E.g., for scale 2.0: iframe gets `width: 50%; height: 50%; transform: scale(2)` so it rasterizes 2x then displays 1x at the canvas's 2x. Tricky because `body-height-sync` measurements need to account for the inverse transform.

Alternative simpler approach: cap canvas zoom at 1.0 by default, with an opt-in "render-at-higher-DPR" mode for users who explicitly want sharper zoom-in.

**Sequencing:** 1.x polish.

---

## Sitemap (Tree layout) text editing — investigate

**Why:** User reports the Sitemap board (Tree layout of routes) shows "editing disabled" gray rings on text hover, while individual page views (ResponsiveFrameView) work. Both pass `sourceFile` to their iframe nodes per playground config. Hypothesis: the Tree layout's small TILE_WIDTH/HEIGHT iframes may not fully wire `IframeEditOverlay`, or the IframeEditOverlay's hover tracking may not function on heavily-zoomed-out iframes. Needs reproduction + investigation.

**Sequencing:** 1.x polish. The Sitemap is a navigation aid more than a primary edit surface; users typically click into single-page view to edit anyway.

---

## Extend `DesignSystemView` to cover spacing, radii, shadows

**Why:** The setup skill v2 (`docs/specs/2026-05-17-setup-skill-v2-design.md`) promises a Design System Board covering tokens + typography + spacing + radii + shadows. The 1.0 engine's `DesignSystemView` Layout only renders colors + typography + primitive frames. Spacing scale, border-radius samples, and shadow samples are missing — the Board ships honest about its 1.0 content, but the strategy v2 lineup expects more.

**The fix:** extend `packages/engine/src/layouts/design-system-view.tsx` with three new regions: a stacked spacing scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64), a radius sample row (cards at each `borderRadius.*` token), and a shadow sample row (cards at each `boxShadow.*` token). Token discovery via the existing `token-registry` reader. No prop API change — the new regions render automatically when their tokens exist in the Tailwind theme.

**Sequencing:** 1.x polish. Real users will land the 1.0 Design System Board and only ask for spacing/radii/shadows once they're comparing against top-team setups. Filed now so the 1.0 spec's promise is tracked.

---

## Tailwind v4 token registry — **shipped 2026-05-18, commit `0166d1f`**

Added `useTokenRegistryFromCss` + `discoverTokenRegistryFromCss` + `parseTokenRegistryFromCssVars` to the engine. Scans `getComputedStyle(:root)` for `--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--font-size-*`/`--text-*`, `--font-weight-*`, `--container-*` custom properties and builds a `TokenRegistry`. Setup skill Phase 2 Scan D records `tailwindMajor` (3 vs 4); Phase 6 Step 2 picks Template 2a (v3, `buildTokenRegistry`) or Template 2b (v4, `useTokenRegistryFromCss`).

Limitations to revisit later: `classLookup` is empty for v4 (class-name → token resolution needs the prefix table from `token-registry.ts` extended for v4; out-of-scope for 1.0). Only browser-side discovery; SSR returns an empty registry pending hydration.

---

## `ForkshopCanvas` defensive-render — **shipped 2026-05-18, commit `0166d1f`**

`ForkshopCanvas` props `stageWidth`/`stageHeight`/`containerRef`/`stageRef` are now optional with internal defaults (1400×900 stage, internal refs allocated via `useRef`). `<ForkshopCanvas>{children}</ForkshopCanvas>` works as a leaf-board root with no consumer-supplied props — matches the "drop it in a Board file and it just works" expectation from the polish spec.

---

## `Tree.autoDiscover` + `Tree.excludeGroups` — **workaround shipped; engine work still deferred**

**Workaround (shipped 2026-05-18, commit `0de8bd0`):** setup skill emits a hand-rolled `forkshopConfig.sitemap.routes` array from Phase 2 Scan C results. Template 7 maps that array into `TreeEntry[]` at render time. New routes need a config edit (the `forkshop-live-editing` skill teaches Claude to maintain it).

**Engine work still deferred:** `Tree.autoDiscover` + server-side route enumeration would remove the manual maintenance — true filesystem-driven sitemap. Real fs-read in a server component + manifest baking at build time. Not a release blocker now that the workaround is shipped, but the live-mirror promise for Sitemap depends on it.

---

## `DesignSystemView` parameterless variant — **workaround shipped; engine work still deferred**

**Workaround (shipped 2026-05-18, commit `0166d1f`):** Template 2a / 2b build `tokens` + `primitives` inline (v3 from `tailwindConfig`, v4 from `useTokenRegistryFromCss`). The user's `design-system.tsx` is a few lines longer than the original "`<DesignSystemView />` no props" promise, but everything works.

**Engine work still deferred:** parameterless `<DesignSystemView />` would read from a `useForkshopConfig()` context that the skill provides at the page.tsx level. Saves a few lines in `design-system.tsx`. Quality-of-life only — not a release blocker now.

---

## Live AI protocol + Claude Code pack — **shipped 2026-05-18, spec #5**

Vendor-neutral live-AI protocol + Claude Code producer pack. 24 commits between `508080d` and `71f2143`.

What landed:
- Engine-side post-hoc diff via `file-snapshot.ts` + `diff-to-hunks.ts`. RSC consumers POST `{ agent, agentLabel, sessionId, file, action, ts }` to `/api/forkshop/agent-activity`; engine reads disk, diffs against snapshot, emits synthetic hunks for the existing iframe relay.
- 8-slot OKLCH `agent-color-palette.ts` assigns colors server-side keyed on `(agent, sessionId)`. Claude defaults to orange.
- `AgentActivityProvider`'s `ActivityEntry` shape gained `agent`/`agentLabel`/`sessionId`/`color`/`action`/`hunks?`. Map key is the compound `(agent, sessionId, file)` — multi-agent stacking works.
- `AgentSelectionChip` renders multi-agent stack at top-center (up to 3, +N overflow).
- `AgentReadIndicator` component + `LazyIframe.hostFileLabel` attr drives the read-activity breathing pulse on the iframe wrapper.
- Claude Code producer pack: bash hook (`forkshop-post-tool-use.sh`) + `.claude/settings.json` merge, opt-in via Phase 5 of the setup skill.
- Cadence skill (`forkshop-live-editing.md`) retired. Reactive feedback hook dropped entirely. Forkshop has no opinion on how agents save files.
- CLI gained `forkshop-post-tool-use.sh.template` + manifest builder support for `.sh` extension + `settings-merge.ts` for idempotent settings.json updates + `--install-claude-pack` flag + producer pack tracking in `forkshop.json`.

Full design: `docs/specs/2026-05-18-live-ai-protocol-design.md`. Plan: `docs/superpowers/plans/2026-05-18-live-ai-protocol.md`. Strategy refinements: #18, #19, #20.

Manual smoke (T22): user-driven via two Claude sessions editing files in `apps/demo/` simultaneously — verify two chips stack with distinct colors, frame outline + text-pulse fire for edits, breathing pulse fires for reads.

---

## Production deploy v0.1.0 — **shipped 2026-05-18**

First public release. Repo public at https://github.com/jakubfoglar/forkshop. Site
live at https://forkshop.dev (Vercel, root: `apps/docs`, DNS via Vercel
nameservers swapped through Namecheap API). `@forkshop/engine@0.1.0` +
`forkshop@0.1.0` published to npm via the tag-driven
`.github/workflows/release.yml`. Marketing landing replaces the bare placeholder
at `/`; `/docs` and `/demo` remain 404 until their own brainstorms.

In-flight discoveries committed alongside the deploy work (CI fixes uncovered
by actually running the workflow):
- Pinned `pnpm/action-setup@v4` reads pnpm version from `package.json#packageManager`
  — workflow override conflicts with it.
- Bumped CI to Node 22 (pnpm 11.1.2 requires Node 22.13+ for `node:sqlite`).
- `apps/demo/scripts/copy-engine-fonts.mjs` now falls back to the workspace path
  when engine `dist/` doesn't exist (fresh-clone CI scenario).
- `eslint-plugin-react-hooks` declared at root (was implicitly hoisted from
  engine workspace, broken under `--frozen-lockfile`). Three unused-import
  errors fixed in `packages/cli/src/{commands/update,copy-files}.test.ts` and
  `update.ts`. 12 react-hooks/immutability warnings on
  `use-iframe-edit-controller.ts` remain — real code-smell signals worth a
  separate cleanup pass.

Full spec + plan: `docs/specs/2026-05-18-production-deploy-design.md`,
`docs/superpowers/plans/2026-05-18-production-deploy.md`.

---

## Playground rebuild — **shipped 2026-05-18**

Replaced `apps/playground/` with the `apps/demo/` (rich showcase) + `apps/test/` (pre-init fixture) split.

What landed:
- `apps/playground/` → `apps/demo/` (git mv, 51 files, history preserved). Demo rewired to consume engine helpers: drops manual `<AgentIframeRelay />` (auto-mounted now), drops custom `BlocksBoardView` (uses `Gallery + useDiscoveredBlocks` + generous height cap), reverts client-side block-preview workaround (uses new server-safe subpath).
- `apps/test/` new app with curated content: 4 UI primitives (cva-shaped Badge/Button/Input/Select), 4 blocks (Hero/FeatureGrid/CTA/Pricing), 4 routes (home/about/pricing/contact), 2 MDX content files, tailwind theme with non-default colors/font/radii. Designed to exercise the setup skill's signal detection (Design System, UI Components, Blocks, Sitemap, Reference recipes).
- `pnpm reset-test` script wipes Forkshop scaffold artifacts so the user can re-run init cleanly.
- Engine touch-ups:
  - `@forkshop/engine/lib/*` server-safe subpath exports (6 helpers: discover-blocks, discover-primitives, file-to-selection, token-registry, parse-token-registry-from-css-vars, sitemap-tree). Removes the `"use client"` directive trap for RSC consumers.
  - `IframeRegistryProvider` + `AgentIframeRelay` auto-mounted inside `AgentActivityProvider`. Single provider, both behaviors.
  - `LazyIframe.heightMode: "auto" | "cap" | "fixed"` replaces the magic `height ?? heightCap` shape.
  - Tightened `package.json` exports map — deep imports rejected by Node's resolver.
  - Public-API snapshot test at `packages/engine/src/__tests__/public-api.test.ts`. Run `pnpm regen-api-snap` to update intentionally.

Full design: `docs/specs/2026-05-18-playground-rebuild-design.md`. Plan: `docs/superpowers/plans/2026-05-18-playground-rebuild.md`. Strategy refinements: #21, #22.

Deferred from this rebuild:
- CI workflow (`.github/workflows/ci.yml`). No CI exists today; creating one requires `CENTRAL_LICENSE_KEY` secret config. Tracked as a separate "pre-publish prep" item.
- `pnpm verify-publish` (tarball install verification). Worth doing before the first `0.1.0` tag.


---

## Demo polish backlog (post-playground-rebuild, 2026-05-18)

The two-app split (`apps/demo/` + `apps/test/`) landed clean at the architecture level — engine touch-ups (server-safe subpath exports, auto-mount provider, `LazyIframe.heightMode`), public-API snapshot, demo rewiring all green. But smoke testing surfaced three polish-on-content issues in `apps/demo/` that the rebuild didn't address. Each is a self-contained follow-up.

### 1. Blocks Board frame heights — partially fixed; verify after hard refresh

**Symptom:** On `localhost:3000/forkshop#/section/blocks`, the four block frames (CTA, FeatureGrid, Hero, Pricing) were clipping to ~200px tall, showing only the top portion of each block.

**Root cause:** `iframe-component` NodeType used `heightMode="cap"` with the demo's `node.height = 3000`. The `body.scrollHeight` was being measured during initial render before fonts/layout fully settled, the ResizeObserver fired on that partial value (~200px), and the wrapper got stuck there because `cap` mode locks to the measurement.

**Fix shipped (`e3db774`):** changed `iframe-component` NodeType to `heightMode="auto"` — no cap. The wrapper still tracks `body.scrollHeight`, but the auto branch keeps it growing as content fully renders.

**Verification needed:** hard refresh `localhost:3000/forkshop#/section/blocks` and confirm all four blocks render with full content vertically. If still clipped, the underlying issue is `body.scrollHeight` measurement timing — investigate `LazyIframe`'s `onLoad` → `sync()` → `ResizeObserver` chain.

### 2. Frame-level activity indicator not firing on block edits

**Symptom:** When editing `apps/demo/components/blocks/hero.tsx` from a Claude session, the floating "Claude · hero.tsx" chip at top fires (correct), but the per-block frame outline + corner pill don't appear on the Hero frame.

**Diagnosis:** `useSiteWideActivity` produces the chip *only* when `fileToSelection` returns `"site-wide"` (i.e., the file didn't match any configured block / page / primitive). So the chip firing while the outline doesn't = `fileToSelection` is mapping the edit to site-wide, not to a block. That means the `FILE_MAP` slug-to-path match is missing.

**Likely cause:** the Claude session is at the repo root (not in `apps/demo/`), so the hook fires from the root `.claude/hooks/forkshop-post-tool-use.sh`. The root session's `process.cwd()` on the dev server side is `apps/demo/` (because that's where Next dev runs from). The hook sends Claude Code's `file_path` (absolute) → engine route handler resolves against `process.cwd()=apps/demo/` → produces `components/blocks/hero.tsx` (workspace-relative). `FILE_MAP.blocks[].sourcePath = "components/blocks/hero.tsx"` should match. So in theory this should work.

**Next debug step:** while editing, open dev tools Network tab, find the `POST /api/forkshop/agent-activity` request, inspect the body's `file:` field. If it's `"components/blocks/hero.tsx"` it should match; if it's an absolute path or different shape, the mismatch is somewhere in the producer → route resolution chain.

### 3. Button variant text splits into two lines

**Symptom:** On `localhost:3000/forkshop#/primitive/button`, both `default` and `subtle` Button variants render with "Click me" split across two lines because the button itself is rendered very narrow.

**Root cause:** `apps/demo/app/forkshop/ui-components/button.tsx` defines each inline-react node as `width: 240, height: 80`. The wrapper inside is `p-6` (24px padding all sides), so the content area is `192×32px`. The Button's `h-10` (40px tall) doesn't fit in 32px vertical, the cell squishes, and the button's horizontal width also gets constrained by the cell.

**Fix:** bump `height: 80` → `height: 160` (or larger) in the inline-react node, OR reduce the wrapper's `p-6` to `p-3`. Two-character edit. Same issue is potentially present in `apps/demo/app/forkshop/ui-components/badge.tsx` and `input.tsx` — verify and fix consistently.

This is a demo content polish issue, not an engine bug. The engine's `inline-react` NodeType honors whatever dimensions the consumer specifies.

