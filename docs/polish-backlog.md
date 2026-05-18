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
