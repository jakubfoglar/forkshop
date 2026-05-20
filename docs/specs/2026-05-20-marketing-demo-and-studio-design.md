# `/demo` showcase and `/studio` marketing canvas — design

Status: design. Brainstormed 2026-05-20. Not yet planned or implemented.

Builds two new things in `apps/docs` that together produce marketing
screenshots and videos of Forkshop with a polished fake app inside:

- `/demo` — public, interactive showcase. Visitor experience.
- `/studio` — hidden internal marketing canvas. Frames are iframes of `/demo`
  in varying URL-driven states. Where shots are composed.

Both share one body of fake-app content built from a pencil design.

Builds on the architecture sketched in
`docs/strategy/2026-05-17-forkshop-dev-website-shape.md` (public demo,
embedded mini-Forkshops, Remotion compositions). This spec turns that sketch
into a concrete plan.

---

## Goals

- A visitor landing on `forkshop.dev/demo` sees a real, designed app inside
  a real Forkshop instance — Design System, UI Components, Blocks, Sitemap
  all populated with meaningful content from a fake brand.
- Marketing screenshots and short videos can be produced from `/studio`
  without bespoke per-shot setup — varying URL params on the frames' iframes
  is enough to get different page selections, AI activity states, and
  viewport profiles on one canvas.
- The fake app is a real Next.js + Tailwind setup (components, tokens,
  pages), so Forkshop's existing auto-discovery (`discoverPrimitives`,
  `discoverBlocks`, `parseTokenRegistryFromCssVars`) lights up out of the
  box. Nothing fake about the wiring — only the content.
- The three layers (fake app, `/demo`, `/studio`) are independently
  maintainable. Replacing the iframe path with inline React for a future
  Remotion workflow touches `/studio` only.

## Non-goals (v1)

- Remotion compositions. The three-layer split keeps the door open;
  building the Remotion path is its own spec.
- Embedded mini-Forkshops on the public landing (`/`). Separate concern,
  noted in the strategy doc.
- Session-mode editing on `/demo`. Strategy doc covers the half-day shape;
  not bundled here. `/demo` ships read-only — `POST /api/forkshop/edit`
  already 403s in prod.
- A second fake-brand. One designed app, one set of tokens.
- A "render to PNG/MP4" pipeline. Screenshots are taken via the
  browser/OS; videos are out of scope for v1.

---

## Architecture

Three layers, each with one job:

```
apps/docs/
  app/
    (marketing)/                       # existing marketing + docs + /r
      page.tsx                         # /
      docs/...                         # /docs/*
      r/...                            # /r/*
    demo/                              # Layer 2 — public showcase
      page.tsx                         # /demo
      layout.tsx                       # demo's globals.css, Tailwind scope
      forkshop.config.tsx              # mounts ForkshopSidebar+Canvas
      _components/
        ui/                            # Layer 1 — primitives
          button.tsx, badge.tsx, ...
        blocks/                        # Layer 1 — blocks
          hero.tsx, pricing.tsx, ...
      site/                            # Layer 1 — fake-app pages (no chrome)
        page.tsx                       # /demo/site
        pricing/page.tsx               # /demo/site/pricing
        ...
      tailwind.config.ts               # demo brand tokens
    studio/                            # Layer 3 — internal marketing canvas
      page.tsx                         # /studio
      frames.tsx                       # frame definitions (iframe URLs)
```

CSS isolation: the existing `apps/docs/app/layout.tsx` becomes a minimal
root (html/body, fonts), and the marketing/docs styling moves into a
`(marketing)/layout.tsx`. `demo/layout.tsx` imports the demo's own
`globals.css` + Tailwind. `studio/layout.tsx` similarly imports a minimal
canvas-friendly globals. Marketing CSS never bleeds into demo or studio,
and vice versa.

### Layer 1 — fake-app pages

Real Next.js + Tailwind setup, designed from the pencil source. Built in
passes:

1. **Tokens** — sample the pencil palette, group into scales
   (`primary-50…900`, `neutral-50…900`), name semantically (`surface`,
   `border`, `muted-foreground`). Same for typography (family, scale, line
   heights). Wire into `tailwind.config.ts` + CSS vars so
   `parseTokenRegistryFromCssVars` picks them up for the Design System
   board.
2. **Primitives** — anything appearing 2+ times in the design becomes
   `_components/ui/*`: button (variants + sizes), badge, input, card,
   link, headings. These light up the UI Components board.
3. **Blocks** — section-level repeats: hero, feature-grid, pricing,
   testimonial, CTA, footer. These light up the Blocks board.
4. **Pages** — `site/*` route tree composing blocks + primitives. These
   light up the Sitemap board.
5. **Mobile** — responsive breakpoints from the desktop pencil applied
   with sensible defaults (single-column stacks, smaller type scale at
   `sm`/`md`). If the pencil provides mobile, use it.

Each pass is user-reviewed before the next starts — catches direction
issues early. Pencil design is the visual reference, not the code shape;
extraction is a normal design-to-code translation.

**Standalone viewing**: because chrome-mounting happens in `/demo/page.tsx`
(not in `/demo/layout.tsx`), the fake-app pages under `/demo/site/*` are
directly viewable in a browser without any Forkshop UI around them.
`forkshop.dev/demo/site` looks like a real product page; `forkshop.dev/demo`
is the same content with Forkshop chrome wrapped around it.

Open question on URL shape: keep `/demo/site/*` (predictable, namespaced
under demo) or, once the pencil reveals the fake brand's name, move the
fake-app pages to a top-level `/[brand]/*` for "this looks like a real
product at a real URL" feel. The marketing pitch leans toward the latter;
the implementation cost is the same either way (one folder move). Decide
when the brand name is known.

### Layer 2 — `/demo` showcase

`app/demo/page.tsx` mounts `<ForkshopSidebar>` + canvas-orchestrating
boards (`DesignSystemBoard`, `UIComponentsBoard`, `BlocksBoardView`,
`SitemapBoard`) around the Layer 1 content. Pattern is exactly what
`apps/demo/app/forkshop/page.tsx` does today — copy it, point at
`(demo)/_components/*` and `(demo)/site/*` via a new `forkshop.config.tsx`.

State surface added beyond what `apps/demo/app/forkshop/page.tsx` already
exposes:

- **Hash-based selection** — already present (`parseSelection` /
  `serializeSelection`). Reuse unchanged.
- **Agent activity seed** — new query param, e.g.
  `?agents=block:hero,page:/pricing,primitive:button`. Decoded into
  `AgentActivityProvider`'s initial state via a small `seedFromUrl` prop
  added to the provider. Lets `/studio` frames show forkshop in
  "Claude is touching hero.tsx and the pricing page right now" state.
- **Viewport profile** — new query param `?viewport=responsive|mobile|single`
  controls the page-level frame view (already supported by `viewportProfile`
  in `forkshopConfig`; we just need to read it from the URL at mount time
  instead of from the config object).
- **Agent label** — optional `?agent-label=Claude · content-search/page.tsx`
  for the pill at the top of the canvas, if/when we add a pill component.
  Punt to a later pass if the existing UI doesn't already render this.

Edit mode: ships read-only in prod. `POST /api/forkshop/edit` already 403s
outside dev, so the iframes inside `/demo` will see the edit overlay but
saving fails silently. Acceptable for v1. Session-mode is a separate spec.

### Layer 3 — `/studio` marketing canvas

`/studio` is itself a full Forkshop installation — same pattern as Layer 2,
just pointing at marketing-shot content instead of design-system content.
`app/studio/page.tsx` mounts `<ForkshopSidebar>` + `<ForkshopCanvas>` with
a sidebar that lists marketing **boards**. Each board is its own canvas
with a set of iframe frames pointing back at `/demo` with specific URL
params.

Initial sidebar config (room to grow):

```
Boards
  - hero-with-ai           (hero block, agent active)
  - pricing-responsive     (3 viewports of /pricing)
  - design-system          (tokens + components, agent reading)
  - blocks-overview        (block gallery, no agent)
  ...add more as you iterate
```

Each board is declared as a TypeScript file in `app/studio/boards/*.ts`:

```ts
// app/studio/boards/hero-with-ai.ts
export const HERO_WITH_AI: StudioBoard = {
  id: "hero-with-ai",
  title: "Hero block, AI actively editing",
  frames: [
    {
      id: "main",
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      demoState: {
        selection: { kind: "block", slug: "hero" },
        viewport: "responsive",
        canvas: { zoom: 0.8, pan: { x: -100, y: -50 } },
        agents: [{ kind: "file", path: "components/blocks/hero.tsx" }],
      },
    },
  ],
}
```

Each `demoState` field maps deterministically to URL params on the iframe's
`src`. A small `buildDemoUrl(demoState): string` helper does the encoding;
`/demo`'s page reads the params back into provider state, canvas state,
and selection.

Authoring workflow: edit `app/studio/boards/<name>.ts`, hot-reload picks it
up, the frame in `/studio` updates instantly. Screenshot when satisfied.

Frames are positioned on the canvas via the existing positions
infrastructure (`useForkshopPositions` posts to
`/api/forkshop/positions`); per-frame `x`/`y` in the board file is the
initial position, the user can also drag and that gets saved via the
existing positions API. Hidden from the public — not linked from any nav,
no SEO indexing (`robots: { index: false }` in metadata). Lives in prod,
harmless.

#### Shot-state knobs

What you can vary per frame, encoded in `demoState`:

| knob | URL param | maps to |
|---|---|---|
| `selection` | hash (`#section=blocks` / `#page=/pricing` / `#block=hero`) | existing `parseSelection` / `serializeSelection` |
| `viewport` | `?viewport=responsive\|mobile\|single` | overrides `forkshopConfig.viewportProfile` at mount |
| `canvas.zoom` + `canvas.pan` | `?zoom=0.8&panX=-100&panY=-50` | new `initialZoom` / `initialPan` props on `<ForkshopCanvas>` |
| `agents` | `?agents=file:components/blocks/hero.tsx,page:/pricing` | new `initialActivity` prop on `<AgentActivityProvider>` |

**Granularity is file/page/block-level**, matching what Forkshop already
exposes as agent state. Element-level focus inside a file (e.g. "cursor
inside this `<p>`") is not currently a Forkshop primitive and is out of
scope for v1. If marketing visually needs it later, we'd extend
`ActivityEntry` with an optional element selector and the iframe edit
overlay component to honor it.

---

## State surface added to `/demo`

Three engine-side touches, all small and additive:

1. **`<AgentActivityProvider>`** gets an optional
   `initialActivity?: readonly ActivityEntry[]` prop. The page reads URL
   params at mount and passes decoded entries to the provider. Currently
   the provider starts empty and is populated by an EventSource that
   short-circuits in production (`agent-activity-context.tsx:66-67`);
   seeding via prop is the only way to get a non-empty state in prod,
   which is what `/studio` needs.
2. **`<ForkshopCanvas>`** gets optional `initialZoom?: number` and
   `initialPan?: { x: number; y: number }` props. Today the canvas
   computes initial zoom/pan from container size + content; these props
   override that on first paint so `/studio` shots are reproducible at
   pixel level.
3. **Page-level URL params on `/demo`** — small helper that reads
   `?viewport=`, `?zoom=`, `?panX=`, `?panY=`, `?agents=` at mount and
   wires them through to the respective props. Lives in
   `apps/docs/app/demo/page.tsx`, not in engine.

Selection from hash already works (`parseSelection` /
`serializeSelection`); nothing new there.

---

## Open dependencies

- **Pencil design from user** — Layer 1 blocked on this. Once provided,
  I'll read it via the pencil MCP (`open_document`, `get_screenshot`,
  `search_all_unique_properties`, `get_variables`) and start the
  token-extraction pass.
- **Pencil docs read** — `docs.pencil.dev` linked by the user; will read
  before starting extraction.

## Implementation order

1. Layer 1 tokens — Tailwind config + CSS vars from pencil palette (user review)
2. Layer 1 primitives — `_components/ui/*` (user review)
3. Layer 1 blocks — `_components/blocks/*` (user review)
4. Layer 1 pages — `site/*` route tree (user review)
5. Layer 1 mobile — responsive breakpoints (user review)
6. Layer 2 — `/demo` route, `forkshop.config.tsx`, mount
7. Layer 2 state surface — `initialActivity`, `initialZoom`/`initialPan`, URL-param wiring
8. Layer 3 — `/studio` route with `<ForkshopSidebar>` + canvas, `boards/*.ts`
   declarative shots, `buildDemoUrl` helper
9. (Maybe) move fake-app pages from `/demo/site/*` to `/[brand]/*` once
   brand name is locked

Steps 1–5 happen in iterative passes during the Layer 1 phase, gated on
user review of each pass. Steps 6–9 are sequential implementation once
content exists.

## Files affected

- New: `apps/docs/app/(marketing)/` (route group, moves existing pages)
- New: `apps/docs/app/demo/` (tree)
- New: `apps/docs/app/studio/` (tree)
- Modified: `apps/docs/app/layout.tsx` (becomes minimal root)
- Modified: `packages/engine/src/components/agent-activity-context.tsx`
  (add `initialActivity` / `seedFromUrl` to `AgentActivityProvider`)
- Modified: `apps/docs/tailwind.config.ts` (extend `content` to include
  `app/demo/**/*` and `app/studio/**/*`); demo-specific tokens live as CSS
  vars in `demo/globals.css`, surfaced through Tailwind utility names that
  reference `var(--demo-…)`. Marketing tokens stay in
  `(marketing)/globals.css`.
- No change needed: `apps/docs/next.config.mjs` (route-group changes are
  app-router-internal).

Engine package surface adds three optional props (one on
`AgentActivityProvider`, two on `ForkshopCanvas`); no public-API churn
beyond that.
