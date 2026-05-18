# Polish backlog (post-1.0)

Small, deferrable improvements not blocking 1.0. Filed as they're discovered. Pull from this list when scoping 1.x or later cycles.

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

