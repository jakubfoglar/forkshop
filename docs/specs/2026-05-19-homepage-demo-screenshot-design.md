# Homepage demo screenshot — design

Date: 2026-05-19
Status: Approved — draft v0
Downstream of: `docs/strategy/2026-05-17-forkshop-dev-website-shape.md`

## Goal

Put a framed screenshot of `apps/demo` on the `forkshop.dev` homepage so visitors immediately see what Forkshop looks like, without deploying any new routes or running interactive iframes.

After this spec:

- `forkshop.dev/` shows a mac-style browser-chrome-framed product shot between the hero block and the feature cards.
- The image lives in `apps/docs/public/` and is captured by the maintainer from a local `apps/demo` dev server.
- `forkshop.dev/demo` remains a 404 — deliberately out of scope. The strategy doc's deeper website shape (deployed demo, embedded mini-canvases, Remotion compositions) is still deferred.

## Non-goals

- Deploying `apps/demo` anywhere — local-only.
- Building a `/demo` route on forkshop.dev.
- Interactive embed (`<ForkshopCanvas size="small">`) on the homepage.
- Session-mode editing in the browser.
- Adding `Image` optimization configuration or new dependencies beyond Next.js defaults.
- Dark-mode variants of the homepage — the page stays light/cream.

## Architecture

One edit to one file, plus one image asset:

```
apps/docs/
├── app/page.tsx                          ← inline a new <ScreenshotFrame> block
│                                            between <header> and the feature <section>
└── public/homepage-screenshot.png        ← committed image (2x retina capture)
```

The "screenshot frame" is plain Tailwind JSX written inline — no new component file, no new dependency. The mac-style chrome is three coloured dots + a small URL label inside a dark bar above a `next/image`. Total scope is ~25 lines of JSX.

## Visual spec

- **Placement:** between `<header>` and the `<section className="grid">` feature cards. Spacing: `mt-14 mb-20`.
- **Width:** stays inside the existing `max-w-3xl` text column. No bleed.
- **Frame:** rounded outer container (`rounded-md`), `shadow-xl` resting on the cream `bg-canvas` page background.
- **Chrome bar:** `bg-[#2a2a2a]` (matches the dark Forkshop chrome), `px-3 py-2`, contains:
  - Three `size-2.5` dots: red `#ff5f57`, yellow `#febc2e`, green `#28c840`.
  - URL label `localhost:3000/forkshop` in `text-[11px] text-white/40`, left-padded after the dots.
- **Image:** `next/image` with `priority` (above-the-fold), `width={1536}`, `height={1024}` (~3:2 aspect; image source captured at 2x). Crops via `object-cover` if intrinsic aspect drifts.
- **Alt text:** `"Forkshop running in a Next.js project — sidebar with boards on the left, canvas with stacked iframe viewports on the right."`
- **No caption** below the screenshot. The feature cards immediately follow.

## Implementation sketch

```tsx
// apps/docs/app/page.tsx — inserted between <header> and <section>
<div className="mt-14 mb-20 overflow-hidden rounded-md shadow-xl">
  <div className="flex items-center gap-1.5 bg-[#2a2a2a] px-3 py-2">
    <span className="size-2.5 rounded-full bg-[#ff5f57]" />
    <span className="size-2.5 rounded-full bg-[#febc2e]" />
    <span className="size-2.5 rounded-full bg-[#28c840]" />
    <span className="ml-3 text-[11px] text-white/40">localhost:3000/forkshop</span>
  </div>
  <Image
    src="/homepage-screenshot.png"
    alt="Forkshop running in a Next.js project — sidebar with boards on the left, canvas with stacked iframe viewports on the right."
    width={1536}
    height={1024}
    priority
    className="block w-full"
  />
</div>
```

`Image` is the standard `next/image` default export — already available in this Next.js app, no install needed.

## Image asset

- **Source:** captured locally from `pnpm dev` (which runs `apps/demo`), at a 2x display density / `devicePixelRatio === 2`.
- **Path in repo:** `apps/docs/public/homepage-screenshot.png`.
- **Format:** PNG. WebP/AVIF generation is handled automatically by `next/image`.
- **Capture state:** the maintainer chooses which board and what visual state to feature when taking the shot. Suggested: a board that conveys the product story in one glance (e.g. Components or Blocks board, with multiple viewports visible).
- **Placeholder:** ship as a small placeholder PNG initially so the page compiles and renders; replace with the real capture in a follow-up commit before merging to main.

## Open questions

None — URL bar text, framing, width, placement, and chrome details are all locked.

## What this design explicitly does NOT do

- Does not touch `apps/demo`.
- Does not register a `/demo` route.
- Does not add any new component file.
- Does not affect the existing hero, the install command block, the GitHub button, or the feature cards.
- Does not change `apps/docs`'s deploy config, Vercel settings, or `vercel.json`.
