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

## Tailwind v4 token registry (`buildTokenRegistryFromCss`)

**Why:** `buildTokenRegistry` accepts only a Tailwind v3 `Config` object. v4 projects use `@theme` in CSS and ship no `tailwind.config.*` file. `create-next-app` defaults to v4 in 2026 — the polish smoke against a fresh Next.js project hit `Cannot find module '../../tailwind.config'` from `forkshop.config.tsx`'s import. Template 1 currently assumes v3.

**The fix:** add `buildTokenRegistryFromCss(cssText: string)` that parses `@theme { --color-*: ...; --spacing-*: ... }` blocks and returns the same `TokenRegistry` shape `buildTokenRegistry` does. Setup skill's Phase 2 Scan D detects v3 vs v4 and writes Template 1 accordingly — either importing the config file (v3) or pointing at `app/globals.css` (v4).

**Sequencing:** Blocks fresh-install support for any 2026+ Next.js project. Should ship before the next public smoke pass. Real release blocker.

---

## `Tree.autoDiscover` + `Tree.excludeGroups` props

**Why:** Polish spec (`docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md`) referenced these as if shipped — they aren't. The engine's `Tree` Layout requires explicit `entries: TreeEntry[]`. Template 7 (sitemap-board.tsx) emits `<Tree excludeGroups={...} autoDiscover />` which doesn't compile. Setup skill works around by hand-rolling a routes list into `forkshopConfig.sitemap.routes` and passing entries explicitly.

**The fix:** add `autoDiscover: boolean` and `excludeGroups: string[]` props to `Tree`. Server-side route enumeration via filesystem read (Node `fs.readdirSync(app/**/page.tsx)`) + a manifest-build step that bakes the discovered route list at build time. Client component then receives the routes as a prop derived from a server component above it.

**Sequencing:** Same release blocker as Tailwind v4 — without this, Sitemap can't auto-grow as the user adds routes. Live-mirror promise depends on it for Sitemap.

---

## `DesignSystemView` parameterless variant

**Why:** Polish spec promised `<DesignSystemView />` with no props would auto-discover tokens (from Tailwind config) and primitives (from `forkshopConfig.ui`). Engine still requires explicit `tokens: TokenRegistry` and `primitives: PrimitiveGroup[]`. Template 2 emits the parameterless form, which crashes at runtime.

**The fix:** add an internal-discovery code path on `DesignSystemView`. When `tokens` is omitted, read from `useForkshopConfig()` context (new — provided by `ForkshopCanvas` or page.tsx); same for primitives. Falls back to passed props if provided. Pair with the Tailwind v4 token path so token discovery actually works for v4 projects.

**Sequencing:** Release blocker. Design System Board crashes on render without this.

---

## `ForkshopCanvas` defensive-render when context is missing

**Why:** When a Board (e.g., `design-system.tsx`) renders `<ForkshopCanvas>` directly without being wrapped in `AgentActivityProvider` (or other context providers), some internal `useRef`-based hooks fail with `Cannot read properties of undefined (reading 'current')`. The page.tsx provides providers, but leaf-board files don't always have access. Crashes on first render.

**The fix:** add early null-checks / default-context fallbacks in `ForkshopCanvas`'s context consumers. The engine should render a placeholder ("not mounted inside provider tree") instead of crashing. Alternative: require Board files to be wrapped in a `<ForkshopProviders>` shell that the page.tsx renders once.

**Sequencing:** Release blocker. Surfaced when any non-Sitemap Board renders.
