# Known issues

Tracked from real-world testing of the setup skill against a production project (Spotato). All five v0 issues have been resolved as of 2026-05-13.

---

## ✅ 1. `forkshop-*` tokens leaked into the Design System board

**Status:** Fixed in `0d5292a` (token-registry filter).

**What it was:** The Forkshop preset wires `forkshop-*` tokens (`forkshop-accent`, `forkshop-canvas`, `forkshop-fg`, etc.) into the user's Tailwind config so Forkshop's UI styles itself. The `design-system-board` kit read every color from the merged config and showed them as user-facing tokens. The whole point of the `forkshop-*` namespace was isolation.

**Fix:** `buildTokenRegistry` in `packages/engine/src/lib/token-registry.ts` now filters out `forkshop-*` names by default across every category (colors, spacing, radii, etc.). Opt back in with `{ includeForkshopTokens: true }` if needed.

---

## ✅ 2. Page tiles cropped in Pages overview

**Status:** Fixed in `8cc14eb` (LazyIframe desktop scaling).

**What it was:** Page-tree tiles loaded the iframe at 400px width and showed only the top 280px, so each tile looked like a phone-narrow header crop.

**Fix:** `LazyIframe` accepts an optional `desktopWidth` prop. When set, the iframe loads at that width and CSS-scales down to fit the requested `width × heightCap`. The page-tree kit passes `desktopWidth={1440}` so tiles render as desktop thumbnails.

---

## ✅ 3. Next.js dev chrome visible inside iframe previews

**Status:** Fixed in `8cc14eb` (LazyIframe dev-chrome hiding).

**What it was:** Next.js's "N" badge and dev-overlay elements showed inside every iframe preview.

**Fix:** `LazyIframe`'s onLoad handler now injects a `<style>` element hiding `nextjs-portal`, `[data-nextjs-toast]`, `[data-nextjs-dev-overlay]`, `#__next-build-watcher`. Matches the same selector list used by `responsive-frame-view`.

---

## ✅ 4. Sidebar route single-click didn't open responsive view

**Status:** Fixed in `aba73bf` (templates ported from playground).

**What it was:** Clicking a route name in the PAGES sidebar (e.g., "Home") rendered the small tile preview instead of the three-viewport responsive view. Double-clicking the tile worked. The wiring gap was in the *generated* `app/forkshop/page.tsx` — the mount page didn't manage selection state, so sidebar selections went nowhere.

**Fix:** The setup skill's mount page template (Template 5) now tracks `useState<ForkshopSelection>`, derives `isolatedPath` from page selections, and passes it to `PagesBoardView`. The pages-board template (Template 4) accepts `isolatedPath` + `onBack` and forwards them to the `PageTree` kit's `isolatedPath` prop. Matches the `apps/playground` reference implementation.

---

## ✅ 5. Typography sizes rendered uniformly (display-* hardcoded)

**Status:** Fixed in `aba73bf` (typography reads from tailwind config).

**What it was:** The `typography-frame` defaulted to class names `text-display-3xl`, `text-display-2xl`, etc. If the user's Tailwind config didn't define those exact keys, all the "Type Sample" rows rendered at base size.

**Fix:** The setup skill's design-system-board template now passes `tailwindConfig={forkshopConfig.tailwindConfig}` to the kit. The kit reads fontSize tokens dynamically from the user's actual config, so display sizes always reflect the real design system.

---

## Applying these fixes to an already-installed Forkshop

These fixes ship via the OSS registry. New installs (`npx forkshop init` against the updated registry) get the corrected templates automatically. For an existing install, the easiest path is to re-run the setup skill — when `forkshop.config.tsx` is non-empty, adjust mode kicks in; tell it to "rescan and regenerate" and it'll update the board files and `page.tsx` to the new shape.

Alternative: hand-port the diff from `apps/playground/app/forkshop/` into your install's `app/forkshop/`. Five small files; ~20 minutes of careful editing.

---

## Next polish pass

These were the v0 surface bugs. The next quality bar is harder things: per-block fixture inference (so blocks don't all use the homepage as their `iframeSrc`), customizable stage dimensions per project, and the broader UX of the iteration loop. Out of scope for now; warrants its own spec when the time comes.
