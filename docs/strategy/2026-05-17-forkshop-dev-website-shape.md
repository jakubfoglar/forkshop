# forkshop.dev website shape — speculative

Status: speculative / brainstorm. Not a spec, not a plan. Captures the architecture direction for forkshop.dev (marketing site, registry, docs, public demo) and the marketing-video / Remotion approach for showcasing the product.

Date: 2026-05-17

---

## Goals on forkshop.dev

- Marketing front door at `/`
- Docs at `/docs/*`
- Registry served at `/r/*` (the CLI hardcodes this, must not move)
- Public, polished, interactive demo (URL TBD: `/demo`, `app.forkshop.dev`, or `demo.forkshop.dev`)
- Internal dev playground stays separate from the public demo
- One GitHub repo, one Vercel project

---

## Repo + deploy shape

- One Vercel project, root directory pointed at `apps/web` (rename from current `apps/docs`).
- `apps/web` serves:
  - `/` marketing
  - `/docs/*` docs
  - `/r/*` registry (stays on apex so the CLI keeps working unchanged)
  - `/demo` public demo
- `apps/playground` stays as the internal dev surface — `pnpm dev` keeps running it locally; Vercel never builds or deploys it. Monorepo-with-undeployed-apps is a normal Vercel pattern.
- URL flavor for the demo (`/demo` vs `app.forkshop.dev` vs `demo.forkshop.dev`) is independent — all three work from one Vercel project. Subdomains need a middleware rewrite to `/demo`. Default to `forkshop.dev/demo` (zero setup); change mind later by adding the subdomain alias.
- Decided NOT to dogfood Forkshop on forkshop.dev itself (no `/forkshop` route). The "forkshop of forkshop" story is cute but adds confusion; a curated `/demo` is a better showcase.

### Why this over alternatives

- Subdomain split (two Vercel projects, `forkshop.dev` + `demo.forkshop.dev`) was the earlier option. Single-project is simpler — one CI, one env, one deploy. The "demo as a route" model wins because Vercel rewrites to a separate project for `/demo` add a "what's routing where" layer that bites on edge cases (cookies, asset paths, iframe behavior Forkshop itself depends on).

---

## Public demo design

- Lives at `apps/web/app/(demo)/` (or wherever fits the routing). Curated, polished boards, its own `app/forkshop/` content separate from `apps/playground`.
- Edit API is dev-only (403s in prod) by design — so the demo is naturally view-only unless extended with session-mode editing (see below).
- Should be designed as the "showcase install," not as the dev surface — different content, different tone, deliberately shaped for first-impression visitors.

### Session-only live editing (feasible, ~half-day)

Goal: let demo visitors try the live-edit UX in their browser, with changes persisting for the session only. Reload → gone.

Architecture already separates the two halves:
- contentEditable in-iframe (the typing) — runs purely client-side
- POST to `/api/forkshop/edit` (the persistence) — the part that needs to be skipped in demo mode

Implementation sketch:
- Add `mode: "session" | "save"` (or `persist: boolean`) flag on `use-iframe-edit-controller.ts`.
- In session mode, the save handler skips the POST, broadcasts the new text+span to sibling viewports in-DOM (instead of the current `forkshop:source-changed` event that triggers a disk refetch), and keeps the contentEditable state.
- Iframes stay mounted while panning/zooming/switching boards, so edits persist for the session.
- Page reload → fresh iframes load fresh HTML from the server → edits gone. No server state, no per-visitor storage.
- Optional "Reset demo" button to clear all session edits without a full reload.

One thing to handle: `ResponsiveFrameView` with 3 viewports of the same page currently syncs via `forkshop:source-changed` → refetch from disk. Session mode needs to broadcast the actual text+span payload to siblings instead.

---

## Embedded mini-Forkshops on marketing pages

- `<ForkshopCanvas>` is a plain React component. Mounting `<ForkshopCanvas size="small" boards={...} />` inside a marketing hero or feature section works.
- Each tile's iframe needs a real URL → add a `/showcase/*` route group in `apps/web` rendering whatever component each tile should show.
- Performance: 3–4 mini-canvases on one page is fine (each iframe = real Chrome context); 20 would tank load.
- Edit overlay either disabled or wired to session-mode.

---

## Remotion compositions for marketing videos

Goal: pixel-perfect captures of Forkshop for marketing videos. Blurs, transitions, 3D tilts, demo text in sidebar, etc. Reuse the real Forkshop primitives.

`<ForkshopCanvas>` + `<ForkshopSidebar>` render fine inside a Remotion `<Composition>`. Wrap in `<AbsoluteFill>` with CSS `transform: perspective() rotate3d()`, `filter: blur()`, etc. The sidebar text is real React text — animating "demo text appearing in sidebar" is trivial (just props).

**The fork is what fills the canvas tiles:**

### Live-iframe path
Real components rendering at video time.
- Most "true" to the vision.
- Engineering tax: Remotion needs `delayRender`/`continueRender` orchestration per iframe so frame 0 isn't blank.
- Fonts (Raveo) must be preloaded in the Remotion bundle.
- Scripting iframe *state* per frame ("frame 47 has the hover ring on this button") is fiddly because iframes are stateful and Remotion captures frame-by-frame.

### Static-tiles path (recommended)
Screenshot the iframes once via Playwright/Puppeteer, swap iframes for `<img>` in a `mode="static"` variant of the canvas.
- Everything outside the iframes (sidebar, edit popover, hover rings, canvas chrome) stays real Forkshop primitives.
- Deterministic, pixel-perfect by construction.
- Animates trivially because everything is plain React/CSS.
- Standard "product video" approach.

This doesn't make the composition any less "real Forkshop" — canvas, sidebar, overlays, spacing, fonts, tokens are all real primitives. Only the contents of the iframes (which a video viewer can't interact with anyway) are frozen.

For a single "live" hero clip later: record that one separately via OBS/Playwright and layer it in as a video asset.

### Engine surface to add

`<ForkshopCanvas mode="static" tiles={[{img, viewport}, ...]} />` would unlock both the marketing mini-canvases (cheaper than mounting iframes) and the Remotion work. Worth treating as a small dedicated feature.

---

## Showcasing live AI editing in responsive mode

The hero moment: ~4 second loop showing three viewports side-by-side of the same page. A cursor enters the desktop viewport's headline, types a new word, and *simultaneously* the mobile + tablet viewports update. Sidebar shows a pulsing "Claude · editing Hero.tsx" badge.

Two qualities make this work as marketing:
1. The synchronicity proves it's real cross-viewport sync (already shipped on main via `forkshop:source-changed`).
2. The AI presence proves an agent is driving it, not a human.

### How to capture

- **Live capture (start here)**: open `apps/playground`, set a `ResponsiveFrameView` board, run Claude Code in a side window, ask it to change a string. Record with OBS or Cmd-Shift-5. Most honest, cheapest to make, pay in editing time (clean cursor paths, retakes). Drop the MP4 into Remotion as a `<Video>` layer; add callouts/labels/transitions around it.
- **Remotion-native**: model the 3 viewports as styled `<div>`s (no iframes — just the text being animated inside a Tailwind-laid-out frame), drive the headline text from a frame-keyed timeline so all 3 swap at frame N. Pixel-perfect, scrubbable, easy to slow-mo. Trade-off: faithful mockup, not live demo. Fine for marketing.
- **Hybrid live-iframe Remotion**: real iframes loaded once via `delayRender`/`continueRender`, triggered to update via a `forkshop:source-changed` event fired at a known frame. Pixel-perfect *and* live, but a real engineering project.

### The AI presence

The live-AI-awareness sidebar item is currently a no-op shell (deferred per CLAUDE.md). Options for marketing:
- Wire just enough of the SSE feed for video purposes — a static `<AgentActivityProvider>` that emits a hard-coded "editing Hero.tsx" event at a known timestamp. Fully faked, visually identical to the real thing once it ships.
- Mock entirely in Remotion as a styled sidebar row that fades in.

Also film a small Claude Code terminal in the corner showing the actual `Edit` tool call going through — that's the credibility shot, because viewers who've used Claude Code will recognize the tool-call UI. Real Claude Code terminal + real responsive sync + a pulsing sidebar row (real or mocked) is plenty convincing without needing the full live-AI feed shipped.

The marketing video can ship before the agent-activity SSE feed does.

---

## Open questions / not decided

- Whether `/demo` becomes a subdomain later (`app.forkshop.dev` vs `demo.forkshop.dev` vs staying at `/demo`). Punt.
- Whether the `mode="static"` static-tiles variant of `<ForkshopCanvas>` is worth a dedicated spec or rolls into existing primitives.
- Whether `<AgentActivityProvider>` gets a minimal "scripted events for demos/videos" mode in addition to the real SSE feed.
