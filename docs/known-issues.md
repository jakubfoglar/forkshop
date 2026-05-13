# Known issues

Bugs and rough edges discovered during real-world testing of the setup skill against a production project (Spotato). Each is **kit-level** — the setup skill correctly detects, proposes, consents, and writes; these are issues in how the rendered kits behave inside the user's `/fogma` route.

None of these block shipping the setup skill itself. They each warrant their own follow-up spec when the kits get a polish pass.

---

## 1. `fogma-*` tokens leak into the Design System board

**Where:** `components/fogma/kits/design-system-board.tsx`

**What happens:** The kit reads all colors from `tailwind.config.{ts,js}` and renders them as swatches. The setup skill wires the `fogma-preset` into the user's Tailwind config so Fogma's UI styles itself — but those `fogma-*` tokens (`fogma-accent`, `fogma-canvas`, `fogma-fg`, `fogma-surface`, `fogma-border`, etc.) then show up in the user's Design System view alongside their own tokens.

**Why it matters:** The whole point of the `fogma-*` namespace (per the OSS strategy spec) is isolation between Fogma's chrome and the user's design system. Leaking them defeats the namespace.

**Fix sketch:** In the design-system-board's color extractor, filter out keys whose path includes `fogma-`. Make it overridable via a kit prop (`hideFogmaTokens?: boolean`, default `true`).

**Related:** Tailwind's *default* palettes (`amber-*`, `blue-*`, `cyan-*` etc.) also show up alongside the user's custom tokens because most projects extend rather than replace `theme.colors`. A similar filter pattern — *"hide tokens not explicitly named in this project's config"* — could clean both up. Lower priority than the `fogma-*` leak since defaults are at least real Tailwind tokens; the `fogma-*` ones are foreign to the user.

---

## 2. Page tile cropped in Pages overview

**Where:** `components/fogma/kits/page-tree.tsx` + `components/fogma/canvas/use-iframe-preview.ts`

**What happens:** In the Pages overview board, each route renders as an iframe-thumbnail tile. Tiles are sized small (correct for overview) but the inner iframe shows only the top portion of the page, not the full scrolled content scaled into the tile.

**Why it matters:** The tile becomes ambiguous — you can't tell which page is which from a header crop alone. Production Fogma (`app/(tools)/fogma/` in ravineo-web) handles this with `body.scrollHeight` measurement + CSS scaling.

**Fix sketch:** Port the full `use-iframe-preview.ts` body-scroll-height measurement into the OSS kit. The ravineo-web version handles this correctly; the OSS extraction probably ported a partial version.

---

## 3. Next.js dev chrome visible inside iframe previews

**Where:** Same as above — `use-iframe-preview.ts` / `use-iframe-edit-wiring.ts`

**What happens:** The Next.js dev-mode floating circle ("N" badge bottom-left) is visible inside the iframe previews, obscuring page content.

**Why it matters:** Designers want to see *their* design, not Next.js's diagnostic UI. Production Fogma injects a CSS override to hide it.

**Fix sketch:** The CSS injection happens via `PREVIEW_EDIT_CSS` in production. The OSS port appears to be missing this or applying it incompletely. Likely a single-CSS-string addition.

---

## 4. Sidebar route single-click doesn't open responsive view

**Where:** `components/fogma/sidebar/` + canvas selection state

**What happens:** Clicking a route name in the PAGES sidebar (e.g., "Home") shows a small tile preview rather than the full three-viewport (Desktop / Tablet / Mobile) responsive frame view. Double-clicking the same tile *does* open the responsive view.

**Why it matters:** Single-click in the sidebar is the natural primary action. Forcing double-click for the most common operation is friction.

**Fix sketch:** Wire sidebar row single-click to set selection to `{ kind: "page", path }` instead of `{ kind: "sitemap" }`. Production Fogma does this; the OSS port likely has the sidebar pointing at the overview instead of the per-page view.

---

## When to address these

These are all small surface bugs in the ported kits. None require new design work — production Fogma (`app/(tools)/fogma/` in `ravineo-web`) already solves each one correctly. The fix is mostly *"port the missing logic from production Fogma to the OSS kit equivalent."*

Recommended bundling: one polish spec called `fogma-kits-v0-polish` that addresses all four together. Probably a half-day's work once started.

Tracking status:

- [ ] `fogma-*` token filter in design-system-board
- [ ] iframe-preview body-scroll-height measurement
- [ ] Hide Next.js dev chrome in iframe previews
- [ ] Sidebar single-click → responsive view
