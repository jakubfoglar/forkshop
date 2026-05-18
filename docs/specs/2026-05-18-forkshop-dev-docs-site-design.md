# forkshop.dev/docs site — v1 design

Status: design. Brainstormed 2026-05-18. Not yet planned or implemented.

Builds the public docs site at `forkshop.dev/docs`. Forkshop shipped `v0.1.0`
on 2026-05-18; the repo is public, npm packages are live, and `forkshop.dev/`
serves a hand-written marketing landing. `/docs` is currently 404 by design.
This design fills that gap with a small, expandable docs surface that
matches Forkshop's "lightweight, public-OSS" posture.

---

## Goals

- A user landing on `forkshop.dev/docs` after running `npx forkshop init`
  can answer "what do I do now?" without leaving the site.
- A developer evaluating Forkshop from the marketing landing can read 2–3
  pages and understand the model (Boards / Layouts / NodeTypes), the core
  features (canvas editing, open-in-editor, live AI agents), and how to
  extend it.
- Adding a new docs page in the future is "create one MDX file + add to
  the nav config." No bespoke per-page wiring.
- The docs surface composes cleanly with the existing marketing landing
  and the future `/demo`, without introducing routing or deploy complexity.

## Non-goals (v1)

- Search. The framework supports adding it later in ~10 lines; v1 ships
  without a search box.
- Versioned docs. Pre-1.0 — readers track `main`.
- API reference auto-generated from `dist/`. Punt until there's demand.
- A `Contributing` page. Link to the GitHub repo's README and `CLAUDE.md`.
- A separate `Community` page. Socials and contact live in the footer.
- Marketing-grade polish (embedded mini-Forkshops, animated transitions,
  rich code playgrounds). That belongs in `/demo`, not `/docs`.
- Renaming `apps/docs` → `apps/web`. The strategy doc floated this; it's
  a refactor that doesn't earn its keep at v1 and would touch
  `vercel.json`, deploy commands, and tsconfig paths. Deferred.

---

## Framework

**Fumadocs** (`fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx`).

Picked over Nextra and roll-your-own MDX because:

- MDX at the file level — content stays portable, no proprietary content
  format.
- Built-in nav tree, table of contents, code blocks with copy buttons,
  callouts. Removes the boilerplate that "roll-your-own MDX" would carry.
- Search is opt-in via `fumadocs-core/search` (local, Orama-backed) or
  Algolia DocSearch. Adding search later is a config change, not a
  re-platform.
- Versioning is supported when needed (`versioned-docs` plugin pattern).
- Next.js App Router native — fits the existing `apps/docs` setup
  without working against the framework.
- Used by Better-Auth, Drizzle, OpenPanel — track record in the OSS
  ecosystem.

Trade-off vs roll-your-own: adds a small dep footprint
(`fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx`, plus their transitive
deps for MDX compilation and syntax highlighting). Acceptable in
exchange for not maintaining a hand-rolled MDX pipeline that would
inevitably need search, TOC, and nav-tree features added later.

---

## Routing and app structure

The docs ship inside the existing `apps/docs` Next.js app. No new
Vercel project, no new build target, no domain changes.

```
apps/docs/
  app/
    layout.tsx                 root layout (Tailwind, fonts, SiteHeader, SiteFooter)
    globals.css                Fumadocs CSS variables overridden to match landing tokens
    page.tsx                   marketing landing (mostly untouched)
    (docs)/
      layout.tsx               Fumadocs DocsLayout (sidebar + TOC)
      [[...slug]]/page.tsx     Fumadocs catch-all renderer
    r/
      registry.json/route.ts   unchanged (CLI hardcodes this path)
      fonts/                   unchanged
  content/
    docs/
      index.mdx                /docs
      getting-started.mdx
      concepts.mdx
      boards.mdx
      canvas-editing.mdx
      open-in-editor.mdx
      live-ai-agents.mdx
      cli.mdx
      extending.mdx
      meta.json                Fumadocs nav order + group labels
  source.config.ts             Fumadocs MDX source config
  components/
    site-header.tsx            shared across landing and docs
    site-footer.tsx            shared across landing and docs
```

**Key decisions:**

- Content lives under `apps/docs/content/docs/`, not `apps/docs/app/`.
  Fumadocs convention. Keeps "MDX content" and "app code" cleanly
  separated and makes future migration (or moving content into the
  engine package, if that ever makes sense) straightforward.
- The `(docs)` route group isolates the Fumadocs layout from the
  landing's layout. The landing remains a single hand-written page.
- The registry at `/r/*` is untouched. The CLI's hardcoded
  `DEFAULT_REGISTRY_URL` keeps working.

**Routes produced:**

| Path                            | Source                              |
|---------------------------------|-------------------------------------|
| `/`                             | `app/page.tsx`                      |
| `/docs`                         | `content/docs/index.mdx`            |
| `/docs/getting-started`         | `content/docs/getting-started.mdx`  |
| `/docs/concepts`                | `content/docs/concepts.mdx`         |
| `/docs/boards`                  | `content/docs/boards.mdx`           |
| `/docs/canvas-editing`          | `content/docs/canvas-editing.mdx`   |
| `/docs/open-in-editor`          | `content/docs/open-in-editor.mdx`   |
| `/docs/live-ai-agents`          | `content/docs/live-ai-agents.mdx`   |
| `/docs/cli`                     | `content/docs/cli.mdx`              |
| `/docs/extending`               | `content/docs/extending.mdx`        |
| `/r/registry.json`              | unchanged                           |
| `/r/fonts/RaveoVF.woff2`        | unchanged                           |

---

## Content — the 9 v1 pages

Each page is one MDX file. The descriptions below are the spec-level
intent, not the page copy. Page copy is written during implementation.

1. **Introduction** (`/docs`)
   - What Forkshop is and what you'd reach for it for.
   - The "in-app Figma alternative" framing — why this exists when
     Figma and Storybook do.
   - Short pointers to: Getting Started, Concepts, Extending.

2. **Getting Started**
   - Prerequisites (Next.js App Router project).
   - `npx forkshop init` flow — what files get scaffolded, what gets
     appended to `globals.css`.
   - Opening the first board (the scaffolded `app/forkshop/` page).
   - Where to go next.

3. **Concepts**
   - The v2 vocabulary on one page: Node, NodeType, Layout, Board.
   - Diagram-free at v1; prose with small code snippets. Diagrams
     can be added later without restructuring the page.
   - Light reference to `app/forkshop/CLAUDE.md` for hands-on details.

4. **Boards**
   - The four engine-shipped Layouts:
     `DesignSystemView`, `Gallery`, `Tree`, `ResponsiveFrameView`.
   - One section per Layout: what it's for, screenshot or example,
     props table.

5. **Canvas editing**
   - The defining feature in user terms: hover any text in the canvas,
     click to edit, ⌘↵ to save, Esc to discard.
   - What "any text" means (string literals, JSX text children).
   - Multi-viewport sync on responsive boards.
   - Production behavior (tree-shaken; dev-only).
   - Brief mention of the safety model (you can only edit text the
     current page actually authored) without engine-internal depth.

6. **Open in editor**
   - The feature: Option-click any text in the canvas to jump to that
     exact line in your editor.
   - Opt-in during `forkshop init`.
   - What gets added to `next.config.*` and `package.json`.
   - Editor support (VS Code default; Cursor / others work via the
     same `vscode://` URL handler).

7. **Live AI agents**
   - The feature: when an agent (Claude or other) edits a file your
     canvas is showing, Forkshop shows live highlights with per-agent
     colors and a heartbeat in the sidebar.
   - Setup: what `forkshop init` adds — the producer-pack bash hook
     and `.claude/settings.json` merge.
   - Multi-agent: what stacking looks like, how to tell sessions
     apart.
   - Brief pointer to the spec at
     `docs/specs/2026-05-18-live-ai-protocol-design.md` for those who
     want the internals or to write a producer for another agent.

8. **CLI**
   - `forkshop init` — flags, what runs, what gets dropped.
   - `forkshop update` — bulk-refresh the scaffold, `--check`,
     `--force`.
   - `forkshop diff <path>` — show upstream-vs-local diff for a
     scaffold file.
   - `forkshop add <bundle>` — 1.0 stub. One paragraph: not yet
     available, links to the roadmap entry.
   - `forkshop.json` lock semantics — engine version pin, scaffold
     checksums.

9. **Extending Forkshop**
   - The platform pitch: Forkshop is a kit, not a closed app. Four
     sub-sections.
   - **Custom NodeTypes** — anything iframable: docs pages, MDX, a
     Storybook frame, an email preview, a design-token board.
     Code example.
   - **Custom Layouts** — flow diagrams, sitemaps, multi-page
     comparisons. It's React arranging NodeTypes.
   - **Ask your agent to build one** — Forkshop is small enough that
     Claude (or another agent) can scaffold a new Layout from a
     paragraph. Brief recipe.
   - **Theming** — the `forkshop-*` namespace, swappable CSS
     variables, how to align Forkshop's chrome with your project's
     brand.
   - **Embedding** — mounting `<ForkshopCanvas>` in your marketing
     pages, dashboards, internal tools.

**`meta.json` nav order:**

```json
{
  "title": "Docs",
  "pages": [
    "index",
    "getting-started",
    "concepts",
    "boards",
    "canvas-editing",
    "open-in-editor",
    "live-ai-agents",
    "cli",
    "extending"
  ]
}
```

No nested groups at v1. When the doc set grows past ~12 pages, group
into "Get started," "Features," "Reference," "Extending."

---

## Visual integration with the landing

Three pieces touch both the landing and the docs.

### Shared top navigation

A single `<SiteHeader>` component is used by both the root layout (so
it appears on the landing) and the docs layout. v1 contents:

- Left: wordmark **"Forkshop"** (links to `/`).
- Right: text link **"Docs"** (links to `/docs`).
- Right: external icon link to the GitHub repo.

Deliberately omitted at v1: a `/demo` link (route doesn't exist yet —
adding "Demo (coming soon)" reads as an empty promise). Add it when
`/demo` ships.

Height and padding match Fumadocs's default header so the docs
sidebar slots in beneath cleanly.

### Shared footer with socials and contact

A single `<SiteFooter>` component is used by both layouts.

- Left: existing landing footer content —
  `github.com/jakubfoglar/forkshop · FSL-1.1-Apache-2.0 · Built by
  @jakubfoglar`.
- Right: a small icon row of social and contact links.

Socials list is `TBD` in this spec — Jakub will provide a final list
at implementation time. The placeholder shape:

```
[ GitHub ] [ X / Twitter ] [ Email ]   ← icons only, no labels
```

### Theme

Match the landing's existing CSS variables; accept Fumadocs's layout
structure.

- Override Fumadocs's CSS variables in `globals.css` to map onto the
  existing `forkshop-ink`, `forkshop-canvas`, `forkshop-muted` tokens.
- Keep Raveo as the heading font (already loaded by the landing).
- Body inherits the system font stack — same as the landing.
- Keep Fumadocs's structural defaults: sidebar layout, code-block
  appearance, callouts. Restyling those multiplies effort for marginal
  cohesion gain.

The result: docs and landing feel like one site, with the docs surface
adopting Fumadocs's information density where it earns its keep.

---

## Search, versioning, and future growth

These are deliberately deferred at v1. The framework choice keeps each
of them cheap to add later.

| Future capability         | How it gets added                                         |
|---------------------------|-----------------------------------------------------------|
| Local search              | `fumadocs-core/search` with the Orama backend; ~10 lines |
| Algolia DocSearch         | Standard DocSearch crawl + a `<SearchDialog>` swap        |
| Versioned docs            | `versioned-docs` plugin; rewrite nav with a version key   |
| API reference             | TypeDoc → MDX pipeline; lives at `/docs/api/*`            |
| Recipes / cookbook        | New top-level group in `meta.json`                        |
| Troubleshooting / FAQ     | One MDX page; add to `meta.json`                          |
| Edit-on-GitHub link       | Fumadocs config (`githubUrl`); ~3 lines                   |
| `/demo` cross-links       | Per-page footer component; added when `/demo` exists      |

None of these block v1. None require restructuring v1.

---

## Dev workflow

- `pnpm --filter docs dev` boots the site at `:3001` with hot-reload
  on both the landing and MDX changes.
- Adding a docs page: create an MDX file under `content/docs/`, add
  its slug to `meta.json`.
- `pnpm --filter docs build` continues to run the existing
  `validate-registry` script before `next build`. Fumadocs's MDX
  compilation runs inside `next build`; broken MDX surfaces as a
  build error with the offending file and line.
- No new validation script for v1. If the doc set later carries
  cross-page links that need integrity checking, add a small
  `validate-docs-links` script alongside `validate-registry`.

---

## Deploy

Unchanged from today.

- One Vercel project (`forkshop-docs`), root directory `apps/docs/`.
- `vercel.json` install + build commands stay the same — Fumadocs
  ships as a normal dep of `apps/docs/package.json`.
- The registry route at `/r/registry.json` continues to use its
  existing cache headers (`s-maxage=300, stale-while-revalidate=86400`).
- Docs pages get Vercel's default static caching. No bespoke headers.

---

## Implementation deviations addendum

(Empty. To be filled in by the implementation plan and any in-session
deviations during the build.)

---

## Open questions

- **Socials list** — Jakub will provide the final list of social and
  contact links for `<SiteFooter>` at implementation time. The spec
  treats this as a placeholder.
- **GitHub Discussions vs Issues** — if Discussions get enabled on the
  repo, the docs footer and the introduction page can link to it as a
  "talk to the maintainer" surface. Until then, link to Issues.
- **Where the introduction page's "what is Forkshop" prose lives** —
  there's deliberate overlap with the landing's pitch. Acceptable
  duplication at v1. If the two drift, consider extracting shared
  copy into a single MDX partial both surfaces include.
