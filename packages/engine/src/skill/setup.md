---
name: forkshop-setup
description: Wires Forkshop into a Next.js + Tailwind project after `npx forkshop init`. Detects project type, scans components and routes, proposes a Board layout, asks before mutating next.config.ts / .claude/settings.json / root CLAUDE.md, writes per-board files, populates forkshop.config.tsx. This skill scaffolds an audience-aware Forkshop installation tailored to the project type. Activates on "set up Forkshop", "finish Forkshop setup", "configure Forkshop", "wire up Forkshop", "initialize Forkshop".
---

# Forkshop — first-run setup

You are setting up Forkshop in the user's project. The CLI (`npx forkshop init`) has already dropped Forkshop's source files (components, hooks, lib utilities, fonts, API routes, an empty `forkshop.config.tsx` stub, and a CLAUDE.md). Your job is to scaffold the user-side `{{mount}}/` files — what their Forkshop's Board contains and how Nodes are wired — then populate `forkshop.config.tsx`.

Forkshop's mental model is **Node / NodeType / Layout / Board** (four concepts). This skill leaves the engine alone — it just scaffolds the user-side `{{mount}}/` files. The engine itself lives at `@forkshop/engine` on npm and was installed during `forkshop init`. When describing the project or the proposed scaffold, use this vocabulary: a **Board** is what renders in the sidebar; it contains **Nodes**, each of which has a **NodeType** (`inline-react`, `iframe-component`, or `iframe-route`); **Layout** controls how Nodes are arranged spatially.

You run **once** per project. After this, your work is mostly historical: the user reads `app/forkshop/CLAUDE.md` for ongoing customization, the sibling `forkshop-live-editing` skill auto-applies when Claude edits Forkshop-watched files, and the user-invoked `forkshop-doc-sync` skill refreshes documentation if it drifts.

The user owns every file you produce. They will fork freely. This file (the skill itself) is in their repo too — they can edit it. Lean toward shorter outputs, explicit user consent on every config mutation, and language that frames Forkshop as something they *have*, not something they *use*.

## Phase 0 — Read preconditions

Do **all** of the following before proceeding to Phase 1. If any check fails, exit with the indicated message and stop.

### Check 1 — `forkshop.json` exists at the repo root with v2 schema

Read `forkshop.json` from the working directory. If missing, exit:

> *"Forkshop's source files aren't installed yet. Run `npx forkshop init` first."*

`forkshop.json` is the source of truth for the `mount` path (where Forkshop's mount route lives) and the alias map needed to resolve all other paths. Without it, every subsequent step would be guessing.

If `forkshop.json` exists but has `schemaVersion` set to anything other than `"2.0.0"` (or lacks `schemaVersion` entirely, indicating a v1 installation), exit:

> *"This looks like a v1 Forkshop installation. Back up `<mount>/` (your `app/forkshop/` directory), then run `npx forkshop init` to re-initialize against the v2 schema. Your custom board files are safe to restore after init completes."*

### Check 2 — Read `{{mount}}/CLAUDE.md`

Resolve the mount path from `forkshop.json`'s `mount` field (defaults to `app/forkshop` if absent). Read the file at `<mount>/CLAUDE.md`.

If missing, exit:

> *"Forkshop's installation seems incomplete — `<mount>/CLAUDE.md` is missing. Re-run `npx forkshop init --force` or restore the file manually."*

That CLAUDE.md documents the Board and Node API, the selection model, and the conventions you'll write code against. You will rely on it instead of duplicating its content here.

### Check 3 — App Router only

Confirm `app/` exists at the repo root (or under the workspace specified by `mount` in monorepos). If only `pages/` exists, exit:

> *"Forkshop v1 only supports Next.js App Router. Pages Router support is on the roadmap but not shipped."*

If `vite.config.{ts,js,mjs}` exists at the repo root, exit:

> *"This looks like a Vite project. Forkshop v1 supports Next.js App Router only."*

If `remix.config.{ts,js}` exists, exit:

> *"This looks like a Remix project. Forkshop v1 supports Next.js App Router only."*

If neither `app/` nor `pages/` exists and no framework config is found, exit:

> *"This doesn't look like a Next.js project. Forkshop requires App Router."*

### Check 4 — Re-run detection

If `forkshop.config.ts` (or `.tsx`) at `<mount>/` contains a non-empty `config` export — that is, more than the stub the CLI dropped — switch to **Adjust mode** (see the section near the bottom of this file) and skip Phases 1–7.

A "non-empty" config means: any of `designSystem.primitives`, `components.entries`, or `pages.autoDiscover` has been populated past the stub's defaults. The CLI's stub has empty arrays.

Once all four checks pass, continue to Phase 1.

## Phase 1 — Read the project, build understanding

You will gather context *first*, then reason. Produce a narrative description of what kind of project this is — never a category lookup. Two sentences of "this is the marketing site for X" beats any dependency-graph inference.

Use the 4-concept vocabulary throughout: **Board**, **Node**, **NodeType**, **Layout**. When you describe what will appear in the sidebar, say "a Board with N Nodes" — not "a kit section with N items" or "a section with N blocks".

### Step 1 — Read the project's own words

In order, whatever exists:

- Repo-root `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`
- Repo-root `README.md` (first ~150 lines)
- The index file of `docs/` if present (`docs/README.md`, `docs/index.md`, or the alphabetically first `.md`)

**If the project's own docs describe what it is, trust them.** A line like "Ravineo's marketing surface and a few internal tools" is worth more than the entire `package.json`.

### Step 2 — Read structural hints

Five quick reads:

1. `package.json` — dependencies, `name`, `description`, `scripts`.
2. `app/layout.tsx` — fonts loaded, head exports, metadata pattern.
3. `app/page.tsx` if present — is this a landing page or a redirect?
4. `tailwind.config.{ts,js,mjs}` — is the theme defaults-only or heavily customized (many semantic tokens, custom font families)?
5. `next.config.{ts,js,mjs}` — bundler, redirects, output mode, anything unusual.

### Step 3 — Scan two directories one level deep

`ls app/` and `ls components/`. Note route-group names (parentheses), subfolder names. **Do not recurse yet** — Phase 2 will do that.

### Step 4 — Signals to weigh, not rules to fire

The following observations are *inputs to your reasoning*. Let any one of them update your picture; never let one of them decide for you.

- **Auth packages** (any of these) suggests an authenticated surface: `@clerk/nextjs`, `next-auth`, `@auth/core`, `lucia`, `@lucia-auth/*`, `iron-session`, `@auth0/nextjs-auth0`, `@workos-inc/authkit-nextjs`, `@supabase/auth-helpers-nextjs`, `@supabase/ssr`.
- **Authenticated-style route groups**: `(auth)`, `(authenticated)`, `(dashboard)`, `(app)`, `(protected)`, `(private)`.
- **Marketing-style route groups**: `(marketing)`, `(public)`, `(home)`, `(www)`.
- **Both kinds of route groups present** → this is most likely a hybrid project, which is the norm in production codebases, not an edge case.
- **Mobile-web signals** — in `app/layout.tsx` or a `viewport` export: `maximumScale: 1` AND `userScalable: false`, plus breakpoint usage in the top-edited TSX files staying under `md:`. If both fire, set a *mobile profile* flag (changes the Layout default to single-width 375 px Nodes).

### Step 5 — Produce a narrative

Write a 2–3 sentence description of the project. This is what the user sees in Phase 3's proposal — make it concrete and observable. Describe what Boards and Nodes you would wire up, not what "kit" or "section" you would add.

**Good (concrete, observable):**

> *"This is a hybrid: a `(marketing)` surface (~8 static pages + blog MDX) plus an `(authenticated)` surface using Clerk (~12 routes). The Tailwind config is heavily customized with semantic tokens. I'd scaffold two Boards — one with `inline-react` Nodes for the design system, one with `iframe-route` Nodes for the page tree."*

**Bad (categorical, abstract):**

> *"This is a SaaS marketing hybrid."*

The narrative is the proposal's first paragraph. Users correct narratives faster than they correct sidebar trees.

### Step 6 — Carry the narrative forward

Hold the narrative + the raw signals (auth lib name, route-group names, mobile-profile flag, Tailwind v3-vs-v4) as Phase 2's input. Do not show the user the signal list — show the narrative.

## Phase 2 — Scan for primitives, blocks, routes

Three scans, all silent. Output is data for Phase 3 — do not show progress to the user.

### Scan A — Primitives (for `inline-react` Nodes)

1. If `components/ui/` exists (the shadcn convention), list its direct `.tsx` files. Filter out filenames that are clearly not primitives (`use-toast.ts`, `index.ts`, `utils.ts`, anything under a `_` prefix).
2. Otherwise, grep `components/**/*.tsx` for filenames matching this canonical set (case-insensitive): `button`, `badge`, `input`, `select`, `card`, `dialog`, `tooltip`, `avatar`, `tabs`, `switch`, `checkbox`, `radio`, `label`, `textarea`, `separator`, `skeleton`, `popover`, `dropdown`, `typography`, `heading`.
3. For each candidate, briefly open the file (head ~30 lines) and confirm there's a default or named export of the same name. This guards against false positives like `button-helpers.ts`, `dialog-context.ts`.
4. Cap at ~12. If more candidates exist, sort by import-count across `app/**/*.tsx` and keep the top 12. Note the cap in the proposal so the user knows you trimmed.

### Scan B — Blocks (for `iframe-component` Nodes)

1. Look for any of: `components/blocks/`, `components/sections/`, `components/marketing/`, `components/site/`. If multiple match, prefer `blocks/` over `sections/` over the others.
2. List direct `.tsx` exports of the chosen folder.
3. For each block, find its first usage in `app/**/*.tsx`. Capture the *literal* props passed in that usage — those become the **fixture** the proposal references. If no usage exists, mark it as "no fixture; will use empty props."
4. If none of the candidate folders exist, skip the `iframe-component` Nodes section in the proposal. Note this in the narrative ("I didn't find an obvious blocks folder").

### Scan C — Routes (for `iframe-route` Nodes)

1. Recurse `app/**` for `page.tsx`. Group by the closest enclosing route group (the nearest parent directory wrapped in parentheses).
2. Static routes (no `[slug]` in the path) → list directly.
3. Dynamic routes (`[slug]`, `[id]`, etc.) → flag as needing an enumeration source. The proposal will offer `autoDiscover: true` with a TODO marker for the user to add explicit enumeration if needed.
4. Surface in the proposal as **counts only** ("8 routes under `(marketing)`"). The per-route list will render in the actual sidebar after install — no need to dump it into the proposal.

### Scan D — Theme tokens (for Design System Board)

1. Read `tailwind.config.{ts,js,mjs}` if present. Look at `theme.extend.{colors, spacing, fontFamily, borderRadius, boxShadow}`. Count non-empty keys per category.
2. If Tailwind v4 is in use (no config file but `@theme` block in `app/globals.css` or `src/app/globals.css`), parse the `@theme` block for `--color-*`, `--spacing-*`, `--font-*`, `--radius-*`, `--shadow-*` custom properties. Same counting.
3. Output a flag: `themeTokens.hasCustomization = any non-default category has ≥1 entry`. Also expose per-category counts (`hasCustomColors`, `hasCustomTypography`, etc.) for the proposal narrative.
4. If neither config file nor `@theme` block exists, set `themeTokens.hasCustomization = false`.

This signal fires the Design System recipe. It doesn't need to find every token — it just decides whether to scaffold a Design System Board at all.

### Scan E — MDX content (for Reference Board)

1. Check `package.json` dependencies (both `dependencies` and `devDependencies`) for any of: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `next-mdx-remote`, `contentlayer`.
2. Glob for `**/*.mdx` files under `app/` and a top-level `content/` directory (if it exists). Cap at 100 — we only need to know "yes there's MDX" plus a count.
3. Look for an MDX-route pattern: `app/(content)/[...slug]/page.tsx`, `app/blog/[slug]/page.tsx`, or any `page.tsx` whose source imports `next/mdx` / `@mdx-js/react`.
4. Output: `mdxContent = { detected: boolean, articleCount: number, routePattern?: string }`.

The Reference recipe fires only when `detected === true` AND a route pattern is found. If MDX files exist but no route pattern resolves them, the skill notes this in the narrative ("I see MDX content but no route renders it — Reference Board needs a Next.js route to iframe") and skips the recipe.

### Output shape

After Phase 2, you hold an internal data structure roughly like:

```
narrative: "<2-3 sentence narrative from Phase 1>"
projectFlags: { mobileProfile, tailwindMajor, monorepo, authLibrary }
primitives: [
  { name: "Button", sourcePath: "components/ui/button.tsx", hasCva: true, cvaVariants: { variant: ["primary","secondary"], size: ["sm","md","lg"] } }
]
blocks: [
  { name: "Hero", sourcePath: "components/blocks/hero.tsx", fixture: "title=\"...\"", previewRoute: "/" }
]
routes: [
  { group: "(marketing)", paths: ["/", "/about", "/pricing"], hasDynamic: false }
]
themeTokens: { hasCustomization: true, hasCustomColors: true, hasCustomTypography: false, … }
mdxContent: { detected: false, articleCount: 0 }
```

> `sourcePath` is project-relative (no `@/` alias). The live-AI loop uses it to map file edits back to Board entries.

Do not render this to the user. It is the input to Phase 3.

## Phase 3 — Build the consolidated proposal

Run the recipe-selection algorithm against Phase 2 output. Each recipe fires when its signal threshold is met. Compose them into a multi-Board sidebar proposal.

### Recipe selection

```
recipes = []

if themeTokens.hasCustomization:
  recipes.push("design-system")

if primitives.length >= 3:
  recipes.push("ui-components")

if blocks.length >= 1:
  recipes.push("blocks")

# Sitemap always fires — every Next.js app has routes.
recipes.push("sitemap")

if mdxContent.detected and mdxContent.routePattern:
  recipes.push("reference")
```

Cross-cutting modifiers:

- If `projectFlags.authLibrary` is set, mark Sitemap as `authFilter: true` (filters out `(authenticated|dashboard|app|protected|private)` route groups in the default scaffold).
- If `projectFlags.mobileProfile` is true, mark all Galleries + Blocks for single-viewport (375px).
- Tailwind v3 vs v4 affects only the Design System Board's token-scan path (handled in Phase 6 templates).

### Proposal template

Render the proposal using this exact format. Use box-drawing characters (`└ ├ │ • ─`) for the sidebar tree. Use the actual counts from Phase 2; substitute the recipe-driven Board names.

````
I've read your project. Here's what I see:

<narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

/forkshop sidebar
<for each selected recipe, render its line + optional children>
├─ Design System            (DesignSystemView — <N> color tokens, <M> typography styles)
├─ UI Components            (<K> primitives discovered)
│   ├ Button (8 variants via cva)
│   ├ Badge (3 variants)
│   └ …
├─ Blocks                   (<L> blocks discovered)
│   ├ Hero (used on /)
│   ├ CTA  (used on /pricing)
│   └ …
├─ Sitemap                  (<R> routes — public only; <auth-lib> detected)
│   ├ /
│   ├ /about
│   └ …
└─ Reference                (<A> articles)
    ├ <article 1>
    └ …

Mount path:    <mount, abbreviated>
               (or app/(tools)/forkshop/ — say "use tools group" to switch)

Also touching automatically:
  • app/globals.css — @import "@forkshop/engine/forkshop.css"
  • next.config.*   — @locator/webpack-loader rule (Option-click → editor)
  • app/forkshop/block/[slug]/page.tsx — per-block preview route (auto-managed; one file)

One opt-in (I'll confirm after you accept):
  [1] Cadence note — teaches Claude to use small Edits on Forkshop-watched files
````

When a recipe was not selected, omit its line entirely from the sidebar tree. Truncate child lists to 3 entries plus `└ …` when there are more.

### How to ask the user what's next

Same as before: call `AskUserQuestion` with `Accept all / Adjust / Pause`. See the existing Phase 4 for free-form adjustment handling.

### Thin-Board handling

If a recipe fires but the Phase 2 data is thin (1-2 entries), include the Board anyway but render its child count honestly. In the proposal narrative, surface: *"Reference has only 2 articles right now — Board will be lightly populated. You can grow it as you add more content."* Users can decline thin Boards in Phase 4.

### Always-the-real-thing reminder

Every Board scaffolds against the user's existing components — no duplicated content, no placeholder fixtures unless the user's code can't supply them. Block preview routes import the real block component. UI Components variant grids import the real primitive. Sitemap leaves iframe the user's actual `/about` URL. The skill never copies user code; it only references it.

### After rendering

Wait for user input. Do not proceed to Phase 4 until you receive a reply.

## Phase 4 — Iterate

After rendering the Phase 3 proposal, wait for the user's reply. Loop:

1. Read the user's reply.
2. Classify it as one of:
   - **Full acceptance** ("looks good", "accept all", "yes", "go", "ship it") → exit the loop and proceed to Phase 5.
   - **Board rename** ("rename Components to Blocks", "call it Sections instead") → update the board name in the internal proposal state.
   - **Mount path change** ("tools group", "use app/(tools)/forkshop/", "put it under apps/web") → update `mountPath` in the proposal state.
   - **Narrative correction** ("this is actually a SaaS", "the marketing blocks are stale, skip them") → return to Phase 1 with the correction as an explicit hint; re-run Steps 1-5; produce a new narrative; re-render.
   - **"explain why you chose X"** → describe the heuristic briefly. Do not modify state.
   - **"pause"** → stop, write nothing, tell the user how to resume: *"Paused. Type 'set up Forkshop' again to resume from the current proposal."*
   - **Ambiguous** → ask one short clarifying question. Do not assume.
3. Re-render the proposal with the new state. Use the exact Phase 3 template.
4. Go to step 1.

### Rules

- **No writes during iteration.** All changes live in-memory until full acceptance.
- **Narrative pushback restarts Phase 1.** A correction to *what kind of project this is* invalidates downstream choices. Re-derive, don't patch.
- **After every re-render, re-invoke `AskUserQuestion`** with the same `Accept all / Adjust / Pause` options.
- **Soft cap at 5 iterations.** If you've re-rendered 5 times without acceptance, ask: *"A few back-and-forths in — keep going, or pause for now?"* This is a check-in, not a hard stop.

## Phase 5 — Consent for config mutations

The setup skill writes only to Forkshop-namespaced locations by default. Two mutations to existing user files require explicit consent — both gated through `AskUserQuestion`:

1. **`app/globals.css` import line** — always confirmed (added by `forkshop init` when possible; the skill verifies idempotently).
2. **Locator opt-in** — adds `@locator/webpack-loader` to `package.json` devDependencies and merges a webpack/turbopack rule into `next.config.*`. Powers Option-click → editor.

The Locator opt-in is the only `AskUserQuestion` call in Phase 5. Glue text:

````
Two things need your call before I write anything that touches your existing files:

  [1] Option-click → editor — add @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*

Glance at the diff first with "Show me", or pick yes/no.
````

Then `AskUserQuestion`:

````ts
{
  questions: [{
    question: "Enable Option-click → editor (recommended)?",
    header: "Option-click",
    options: [
      { label: "Yes, install", description: "Adds @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*" },
      { label: "No, skip",     description: "Skip Locator wiring — you can install manually later if you change your mind" },
      { label: "Show me",      description: "Print the exact dep + next.config diff first, then re-ask" },
    ],
  }],
}
````

If the answer is `Show me`, render the planned dep + next.config diff inline, then re-call `AskUserQuestion` with only `Yes, install` and `No, skip`.

If the project's `next.config.*` has a shape too unusual for clean automated merging (e.g., functional config that imports from elsewhere), surface that during Phase 6 — for now, take the user's consent at face value.

The cadence-note opt-in that previous setup skill versions had is **removed**. Cadence guidance now ships exclusively via the auto-loading `forkshop-live-editing` skill (in `.claude/skills/`) and the `app/forkshop/CLAUDE.md` dir-loaded note. Both are properly scoped — they don't influence agent behavior outside Forkshop's surface.

## Phase 6 — Write the artifacts

Sequential. Failures stop the sequence — no transactional rollback. Each step prints `✓ <action> <path>` on success.

### Step 1 — `{{mount}}/forkshop.config.tsx`

Render from Template 1 (see Scaffolding templates). **Gate config keys + imports on which recipes fired in Phase 3:**

- **UI Components recipe fired:** write `components/{srcPrefix}ui/index.ts` barrel (one `export { Name } from "./slug"` per discovered primitive), emit `import * as UIPrimitives from "@/components/ui"` + `ui: UIPrimitives,` in the config.
- **Blocks recipe fired:** write `components/{srcPrefix}blocks/index.ts` barrel, emit `import * as Blocks from "@/components/blocks"` + `blocks: Blocks,`.
- **Design System recipe fired:** emit `import tailwindConfig from "../../tailwind.config"` + `tailwindConfig,` in the config. (Tailwind v3 only at 1.0 — v4 path deferred.)
- **Sitemap always fires:** emit `sitemap: { routes: [...] }` populated from Phase 2 Scan C, filtering out auth-flagged route groups when the modifier fires.
- **Reference recipe fired:** emit `reference: { contentPaths: [...] }` from Scan E. Otherwise omit the key.

If neither UI Components nor Blocks fired (e.g., a project with only routes), `forkshop.config.tsx` is just the `sitemap.routes` array plus `viewportProfile`. No broken imports from non-existent `components/ui/` or `components/blocks/` directories.

### Step 2 — `{{mount}}/design-system.tsx` (if Design System recipe fired)

Render from Template 2 — single-leaf Board over `DesignSystemView`.

### Step 3 — `{{mount}}/ui-components.tsx` parent (if UI Components recipe fired)

Render from Template 3 — Gallery over `forkshopConfig.primitives` with one representative instance per primitive.

### Step 4 — `{{mount}}/ui-components/{{slug}}.tsx` (one per primitive)

For each primitive in Phase 2 Scan A:
- If `hasCva` is true, expand `cvaVariants` into a grid of `<Primitive variant="..." size="..." />` instances using Template 4a.
- If `hasCva` is false, render a stub grid using Template 4b (~3 default instances; user fills in real variants).

### Step 5 — `{{mount}}/blocks.tsx` parent (if Blocks recipe fired)

Render from Template 5 — Gallery over `forkshopConfig.blocks` with one iframe-component instance per block at a representative viewport (1440 px or 375 px if mobile profile).

### Step 6 — `{{mount}}/block/[slug]/page.tsx` (auto-managed; always written)

Render from Template 6 — dynamic preview route. Always written, regardless of whether blocks were discovered at install time. Allows users adding their first block later to see it work without re-running setup. Reads `forkshopConfig.blocks` (the barrel module) via `discoverBlocks` from `@forkshop/engine`. `notFound()` gate when `process.env.NODE_ENV === "production"`. File carries a `// forkshop:auto-managed` header comment.

### Step 7 — `{{mount}}/sitemap-board.tsx` parent

Render from Template 7 — Tree visualization over routes from `forkshopConfig.sitemap`. File is named `sitemap-board.tsx` (not `sitemap.tsx`) to avoid Next.js's reserved sitemap route convention — any `sitemap.{ts,tsx}` in `app/` is treated by Next.js as a sitemap.xml generator.

### Step 8 — `{{mount}}/reference.tsx` parent (if Reference recipe fired)

Render from Template 8 — Tree over MDX paths from `forkshopConfig.reference.contentPaths`.

### Step 9 — `{{mount}}/page.tsx`

Render from Template 9 — mounts `ForkshopCanvas` + `ForkshopSidebar`. The sidebar `sections` array is built from the selected recipes; each section's `entryKind` matches its child shape (`primitive` for UI Components, `block` for Blocks, `page` for Sitemap and Reference).

### Step 10 — `app/globals.css` (idempotent)

Check whether `@import "@forkshop/engine/forkshop.css"` is present. If not, prepend it above any existing `@tailwind` directives. For src-dir projects, the file is `src/app/globals.css`.

### Step 11 — `next.config.*` Locator rule (conditional on Phase 5 Locator opt-in)

If the user accepted the Locator opt-in in Phase 5:

1. Merge `@locator/webpack-loader` into `package.json` devDependencies (idempotent — skip if already present). Print `✓ Added @locator/webpack-loader to devDependencies`.
2. Apply Template 10 (Next 14 webpack-only) or Template 11 (Next 15/16 turbopack + webpack) based on the project's Next major. Merge into existing config rather than replace. Print `✓ Merged Locator rule into next.config.<ext>`.
3. Tell the user once at the end of Phase 6: `"Run pnpm install before pnpm dev — Locator dep was just added."`

If the user declined: skip this step entirely. Phase 7 will surface a one-line note: `Option-click: skipped (re-run setup to enable).`

If the next.config.* shape can't be merged cleanly (rare — functional config importing from elsewhere, etc.), fall back to printing the snippet for manual paste with a `!` warning in Phase 6 output.

### Failure handling

If any step throws, print `✗ <step> — <reason>`, stop, tell the user how to resume.

## Phase 7 — Final summary

After Phase 6 completes (or partially completes with failures), render this summary verbatim — drop sections that don't apply, keep the order.

### Default (clean install)

```
✓ Forkshop is set up.

  /forkshop          → http://localhost:3000/forkshop
  Boards             → <comma-separated board names with counts>
  Live-mirroring     → Add a primitive to components/ui/ and it'll show up

Try it:
  pnpm dev
  → open /forkshop
  → click a route under Sitemap

Sibling skills:
  forkshop-live-editing   auto-applies on Forkshop file edits
  forkshop-doc-sync       invoke when app/forkshop/CLAUDE.md drifts
```

The `Boards` line lists what was actually wired (e.g., `Sitemap (3 routes) · UI Components (4 primitives) · Blocks (2 blocks)`).

### With Locator skipped

If the user declined the Phase 5 Locator opt-in, add one line above `Try it:`:

```
Option-click: skipped (re-run setup to enable)
```

### With Phase 6 failure or manual-paste fallback

If a Phase 6 step couldn't complete cleanly (e.g., next.config.* required manual paste), render the failure variant:

```
✓ Forkshop is set up. One thing needs your attention:

  ! next.config.* — Locator rule needs manual paste. Snippet below.

  <inline snippet>

  /forkshop          → http://localhost:3000/forkshop
  Boards             → <comma-separated board names with counts>
  Live-mirroring     → Add a primitive to components/ui/ and it'll show up

Try it:
  pnpm install         (Locator dep was just added)
  pnpm dev
  → open /forkshop
  → click a route under Sitemap

Sibling skills:
  forkshop-live-editing   auto-applies on Forkshop file edits
  forkshop-doc-sync       invoke when app/forkshop/CLAUDE.md drifts
```

### Rules

- **Lead with `✓ Forkshop is set up.`** — single line, immediately readable.
- **`Boards →` line is honest** — lists what's actually wired with counts.
- **`Live-mirroring →` line** is a single observation; no enumerated "Customize" list.
- **No `Mount:` / `Modifiers:` / `Opt-in:` / `Files written:` / `Skipped:`** default sections — they're debug info. If we want them later, add a `--verbose` flag.
- **No ANSI escape codes** — unicode (`✓`, `→`, `!`) renders everywhere.
- **The `!` line is the only urgent attention-grabber.** Use it sparingly; never for non-actionable info.

## Adjust mode (re-runs)

If Phase 0's Check 4 detected a non-empty `forkshop.config.tsx`, you are in adjust mode. Skip Phases 1–7. Render:

```
Looks like Forkshop is already set up. Here's your current config:

  Mount:   <mount>
  Board:   <board name from current forkshop.config.tsx>
  Opt-in:  <state observed: ✓/✗ for cadence note (presence of the marker in root CLAUDE.md)>

What would you like to change?
  • "add nodes"                   → rescan blocks and propose additions
  • "rename board"                → rename the Components board
  • "install cadence note"        → walk Phase 5 again
  • "rescan components"           → re-run Phase 2 and propose a diff
  • "open config"                 → print forkshop.config.tsx path, do nothing

Or describe what you want.
```

### Adjust-mode actions

- **Add nodes** → Run Phase 2 Scan B against the blocks folder. Diff new scan vs current `nodes` in `forkshop.config.tsx`. Show what's new / removed. On accept, patch `forkshop.config.tsx` in place.
- **Rename board** → Update the section title in `page.tsx` and the component name in `components-board.tsx`. Do not rewrite the files from scratch — patch only the affected identifiers.
- **Install cadence note** → Walk Phase 5. On accept, apply Phase 6 Step 6.
- **Rescan components** → Run Phase 2. Diff new scan against current `forkshop.config.tsx`. Show: *"I found 3 new blocks (Hero, CTA, Feature) and 1 missing (Testimonials was removed). Update forkshop.config.tsx to add/remove?"*
- **Open config** → Print the path. Do not modify anything.
- **Free-form** → Interpret as best you can. If unclear, ask one short clarifying question.

### Rules for adjust mode

- **Never re-run Phase 6 wholesale.** Only the specific changes requested.
- **Never re-write `forkshop.config.tsx` from scratch.** Always patch in place. Preserve user edits.
- **For a full reset:** tell the user to delete `forkshop.config.tsx` (or move it aside) and re-run the skill.

## Edge cases

### Empty `components/blocks/` (or equivalent) — no blocks found

Scaffold an empty `nodes: []` array. Mention in the narrative: *"I didn't find a blocks folder — add entries to `forkshop.config.tsx` once you have some."*

### Too many discovered blocks

If Phase 2 Scan B finds more than ~50 blocks, propose the top 20 by import-count. Note in the proposal: *"I capped Nodes at 20 sorted by import-count. Add the rest manually in `forkshop.config.tsx` or ask me to use different criteria."*

### Dynamic-only routes (`[slug]` without statics)

Note in the narrative that dynamic routes were found. The stub Board doesn't use a page-tree section — this is just a heads-up for when the user adds routes manually.

### `@forkshop/engine` missing (engine not installed)

If the engine package isn't found in `node_modules/@forkshop/engine`, exit:

> *"Forkshop's engine package isn't installed. Run `pnpm install` (or your package manager's equivalent) and try again."*

### Engine version pin mismatch

If `package.json` pins `@forkshop/engine` at a version older than what `forkshop.json` was written against (read `forkshop.json`'s `engineVersion` field), surface a soft warning in the Phase 7 summary:

> *"Engine version mismatch detected — your installed `@forkshop/engine` may be out of date. Run `npx forkshop update` to sync."*

Do not block setup — write the artifacts and include the warning in Phase 7.

### `tailwind.config.*` missing (likely Tailwind v4)

Proceed with everything else. The `globals.css` import (Step 4) still applies. Surface in the Phase 7 summary: *"Tailwind v4 detected — the engine CSS is imported via globals.css, which is the correct v4 path. No `tailwind.config.*` changes needed."*

### Monorepo (no repo-root `app/`, but `pnpm-workspace.yaml` or `turbo.json`)

In Phase 0 / 1, ask the user: *"This looks like a monorepo. Which workspace should I scan and mount in?"* Wait for the answer. Adjust every path lookup (Phase 1 docs, Phase 2 scans, `mount`) to that workspace. If the user already has `mount` pointing into a workspace in `forkshop.json`, skip the question.

### `<mount>/` already populated with non-stub content

If Phase 0's re-run check found a populated config, this is the adjust-mode path. But if `<mount>/` has user-written files that don't match Forkshop's expected layout (e.g., the user repurposed the folder), refuse and exit:

> *"`<mount>/` already contains files that aren't from Forkshop. Move them aside or set `mount` in `forkshop.json` to a different path, then re-run."*

### `forkshop.json` present but no `<mount>/CLAUDE.md`

Exit (Phase 0 Check 2). Already handled. Re-state here for completeness.

### Pages Router / Vite / Remix detected

Hard bail. Phase 0 Check 3 handles. Re-state here for completeness.

## What this skill never does

This skill never:

- Silently mutates the root `CLAUDE.md` — always gated by Phase 5 consent.
- Touches files outside the Forkshop surface (`app/forkshop/`, `components/forkshop/`, `lib/forkshop/`, `app/api/forkshop/`) without surfacing the change in the proposal's "Also touching" block.
- Installs npm packages without informing the user — always-on deps are installed by `npx forkshop init`; no additional installs happen during this skill.
- Reverts user edits — re-runs are additive; if the user edited `forkshop.config.tsx`, adjust mode proposes deltas, never overwrites.
- Calls out to the network.

## Scaffolding templates

Templates use `{{snake_case}}` placeholder substitution. Multi-line placeholders (e.g., `{{primitive_entries}}`) expand to comma-separated, indented blocks. Replace every `{{…}}` before writing; if a placeholder has no value, drop the surrounding line.

### Substitution rules

Templates use `{{snake_case}}` placeholder substitution. Multi-line placeholders (e.g., `{{primitive_entries}}`) expand to comma-separated, indented blocks. Replace every `{{…}}` before writing; if a placeholder has no value, drop the surrounding line.

Key placeholders:
- `{{mount}}` — resolved from `forkshop.json`'s `mount`; defaults to `app/forkshop`.
- `{{slug}}` — kebab-case primitive identifier.
- `{{primitive_name}}` — PascalCase primitive component name.
- `{{primitive_imports}}` — named imports, one per line.
- `{{primitive_entries}}` — comma-terminated, 4-space indented config rows.
- `{{block_entries}}` — same pattern for blocks.
- `{{exclude_groups}}` — quoted comma-separated route-group names.
- `{{content_paths}}` — quoted comma-separated MDX glob paths.
- `{{viewport_profile}}` — `"responsive"` (default) or `"mobile"`.
- `{{variant_entries}}` — comma-terminated, 4-space indented Gallery entries.
- `{{primitive_slug}}` — kebab-case slug used inside variant entries (matches `{{slug}}`).
- `{{variant_key}}` — kebab-case identifier for a specific variant combination (e.g., `primary-md`).
- `{{variant_label}}` — human-readable variant label (e.g., `"Primary / MD"`).
- `{{variant_props}}` — JSX attribute string for the variant (e.g., `variant="primary" size="md"`).
- `{{board_imports}}` — Board component imports for `page.tsx`.
- `{{default_section}}` — id of the first selected recipe.
- `{{section_entries}}` — `SidebarSection` objects, comma-separated.
- `{{board_switch}}` — selection-to-Board mapping (inline JSX).

### Template 1 — `{{mount}}/forkshop.config.tsx`

The skill emits imports and config keys conditionally — only when the matching recipe fired in Phase 3. The full shape below is for a hybrid project (all five recipes fire). For a thin project (just Sitemap), omit `ui`, `blocks`, and `tailwindConfig` lines + their imports. For a Tailwind v3 project but no Design System recipe, omit `tailwindConfig`. The user can re-run setup later to grow the config when they add directories.

````tsx
import * as UIPrimitives from "@/components/ui"
import * as Blocks from "@/components/blocks"
import tailwindConfig from "../../tailwind.config"

export const forkshopConfig = {
  ui: UIPrimitives,
  blocks: Blocks,
  paths: {
    primitives: "components/ui",
    blocks: ["components/blocks"],
  },
  sitemap: {
    routes: [
{{sitemap_routes}}
    ],
  },
  reference: {
    contentPaths: [{{content_paths}}],
  },
  viewportProfile: "{{viewport_profile}}" as "responsive" | "mobile",
  tailwindConfig,
} as const

export type ForkshopConfig = typeof forkshopConfig
````

Substitution notes:
- `{{sitemap_routes}}` — one `{ path: "/about", sourceFile: "app/about/page.tsx" },` line per route discovered in Phase 2 Scan C, 4-space indented, comma-terminated. Skill filters out routes whose group matches the auth-filter modifier before emitting. If no routes were discovered (only `app/page.tsx`), emit a single `{ path: "/", sourceFile: "app/page.tsx" },` line. The engine's `Tree` Layout doesn't have built-in auto-discovery (deferred — see polish-backlog), so the routes list lives in config and the user edits it to add/remove entries.
- `{{content_paths}}` — quoted comma-separated MDX glob paths from Scan E, or empty.
- `{{viewport_profile}}` — `"responsive"` (default) or `"mobile"` (mobile flag set).

The skill writes (or updates, if they exist) two **barrel files** at install time:

- `{{srcPrefix}}components/ui/index.ts` — `export { Button } from "./button"`, one line per discovered primitive
- `{{srcPrefix}}components/blocks/index.ts` — one line per discovered block

These barrels are how live-mirror works: the engine's `useDiscoveredPrimitives(forkshopConfig.ui)` and `useDiscoveredBlocks(forkshopConfig.blocks)` hooks reflect over them. Adding a new primitive is two steps: (a) create the `.tsx` file, (b) add a line to the barrel. The auto-loaded `forkshop-live-editing` skill instructs Claude Code to maintain the barrel automatically when the user asks to add a primitive.

If a barrel already exists at one of these paths, the skill **merges** new entries in alphabetical order rather than overwriting.

The old `primitives: [...]` and `blocks: [...]` explicit arrays in `forkshopConfig` are dropped — discovery replaces them.

### Template 2 — `{{mount}}/design-system.tsx`

````tsx
"use client"

import { useMemo } from "react"
import {
  ForkshopCanvas,
  DesignSystemView,
  buildTokenRegistry,
  discoverPrimitives,
  type PrimitiveGroup,
  type InlineReactNode,
} from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function DesignSystemBoardView() {
  const tokens = useMemo(
    () => buildTokenRegistry(forkshopConfig.tailwindConfig),
    [],
  )
  const primitiveGroups = useMemo<PrimitiveGroup[]>(
    () => [
      {
        id: "ui",
        label: "UI Primitives",
        primitives: discoverPrimitives(forkshopConfig.ui).map<InlineReactNode>((p) => ({
          id: `primitive:${p.slug}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 320,
          height: 160,
          label: p.name,
          render: () => <p.Component />,
        })),
      },
    ],
    [],
  )
  return (
    <ForkshopCanvas>
      <DesignSystemView tokens={tokens} primitives={primitiveGroups} />
    </ForkshopCanvas>
  )
}
````

**Tailwind v3 only at 1.0.** `buildTokenRegistry` accepts only a v3 `Config` shape; v4 projects (which use `@theme` in CSS and ship no `tailwind.config.*`) hit a runtime error at the import. The "DesignSystemView parameterless variant" + "Tailwind v4 token registry" follow-up specs in `docs/polish-backlog.md` track this. Until they land, v4 projects either skip the Design System Board or hand-build a token registry inline.

### Template 3 — `{{mount}}/ui-components.tsx`

````tsx
"use client"

import { ForkshopCanvas, Gallery, useDiscoveredPrimitives } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function UIComponentsBoardView() {
  const primitives = useDiscoveredPrimitives(forkshopConfig.ui)
  const entries = primitives.map((p) => ({
    id: p.slug,
    label: p.name,
    node: {
      id: `primitive:${p.slug}`,
      kind: "inline-react" as const,
      x: 0, y: 0, width: 320, height: 200,
      label: p.name,
      render: () => <p.Component />,
    },
  }))
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={320} />
    </ForkshopCanvas>
  )
}
````

### Template 4a — `{{mount}}/ui-components/{{slug}}.tsx` (cva variants enumerated)

````tsx
"use client"

import { {{primitive_name}} } from "@/components/ui/{{slug}}"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

export default function {{primitive_name}}BoardView() {
  const entries = [
{{variant_entries}}
  ]
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={240} />
    </ForkshopCanvas>
  )
}
````

`{{variant_entries}}` — one entry per cva variant combination. Each entry is:

````tsx
    {
      id: "{{primitive_slug}}-{{variant_key}}",
      label: "{{variant_label}}",
      node: {
        id: "primitive:{{primitive_slug}}-{{variant_key}}",
        kind: "inline-react" as const,
        x: 0, y: 0, width: 240, height: 80,
        render: () => <{{primitive_name}} {{variant_props}}>Click me</{{primitive_name}}>,
      },
    },
````

E.g., a Button with variant × size cva (3 × 3 = 9 entries) generates 9 such blocks.

### Template 4b — `{{mount}}/ui-components/{{slug}}.tsx` (fallback stub)

````tsx
"use client"

import { {{primitive_name}} } from "@/components/ui/{{slug}}"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

// TODO: add variants. This file scaffolds three default instances —
// expand the entries array with the variant combinations you care about.
export default function {{primitive_name}}BoardView() {
  const entries = [
    { id: "default-1", label: "Default", node: { id: "primitive:{{slug}}-default-1", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <{{primitive_name}}>Default</{{primitive_name}}> } },
    { id: "default-2", label: "Default", node: { id: "primitive:{{slug}}-default-2", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <{{primitive_name}}>Default</{{primitive_name}}> } },
    { id: "default-3", label: "Default", node: { id: "primitive:{{slug}}-default-3", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <{{primitive_name}}>Default</{{primitive_name}}> } },
  ]
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={240} />
    </ForkshopCanvas>
  )
}
````

### Template 5 — `{{mount}}/blocks.tsx`

````tsx
"use client"

import { ForkshopCanvas, Gallery, useDiscoveredBlocks } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function BlocksBoardView() {
  const viewport = forkshopConfig.viewportProfile === "mobile" ? 375 : 1440
  const blocks = useDiscoveredBlocks(forkshopConfig.blocks)
  const entries = blocks.map((b) => ({
    id: b.slug,
    label: b.name,
    node: {
      id: `block:${b.slug}`,
      kind: "iframe-component" as const,
      x: 0, y: 0, width: viewport, height: 600,
      label: b.name,
      slug: b.slug,
      previewSrc: b.previewSrc,
    },
  }))
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={viewport} />
    </ForkshopCanvas>
  )
}
````

### Template 6 — `{{mount}}/block/[slug]/page.tsx`

````tsx
// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.
// Auto-recreated by re-running the Forkshop setup skill.

import { notFound } from "next/navigation"
import { discoverBlocks } from "@forkshop/engine"
import { forkshopConfig } from "../../forkshop.config"

export function generateStaticParams() {
  // No pre-generated routes — the page is dev-only and resolved dynamically.
  return []
}

export default async function ForkshopBlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (process.env.NODE_ENV === "production") notFound()
  const { slug } = await params
  const blocks = discoverBlocks(forkshopConfig.blocks)
  const entry = blocks.find((b) => b.slug === slug)
  if (!entry) notFound()
  const Component = entry.Component
  return (
    <div className="bg-white">
      <Component />
    </div>
  )
}
````

The block's component renders with its own default props. If the user wants explicit fixture props for preview, they add them in `forkshop.config.tsx`'s `blocks` entry (e.g., as a `fixtureProps` field), then read them here.

### Template 7 — `{{mount}}/sitemap-board.tsx`

````tsx
"use client"

import {
  ForkshopCanvas,
  Tree,
  type TreeEntry,
  type IframeRouteNode,
} from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function SitemapBoardView() {
  const entries: TreeEntry[] = forkshopConfig.sitemap.routes.map((r) => {
    const node: IframeRouteNode = {
      id: `page:${r.path}`,
      kind: "iframe-route",
      x: 0, y: 0, width: 1200, height: 800,
      routePath: r.path,
      sourceFile: r.sourceFile,
    }
    return { id: `page:${r.path}`, label: r.path, path: r.path, node }
  })
  return (
    <ForkshopCanvas>
      <Tree entries={entries} />
    </ForkshopCanvas>
  )
}
````

The engine's `Tree` Layout doesn't auto-discover routes (deferred — see polish-backlog). The routes list lives in `forkshopConfig.sitemap.routes`; the user edits it to add or remove entries. The `forkshop-live-editing` skill teaches Claude to update the list when the user asks to add a route.

### Template 8 — `{{mount}}/reference.tsx`

````tsx
"use client"

import { ForkshopCanvas, Tree } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function ReferenceBoardView() {
  return (
    <ForkshopCanvas>
      <Tree contentPaths={forkshopConfig.reference.contentPaths} />
    </ForkshopCanvas>
  )
}
````

### Template 9 — `{{mount}}/page.tsx`

````tsx
"use client"

import { useState, useEffect } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
} from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"
{{board_imports}}

const DEFAULT_SELECTION: ForkshopSelection = { kind: "section", sectionId: "{{default_section}}" }

export default function ForkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const fromHash = parseSelection(window.location.hash)
    if (fromHash) setSelection(fromHash)
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    window.history.replaceState({}, "", serializeSelection(selection))
  }, [selection, hasHydrated])

  return (
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
      <div className="flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
{{section_entries}}
          ]}
          routes={[]}
        />
        <div className="relative flex flex-1 overflow-hidden">
{{board_switch}}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
````

Substitution notes:
- `{{board_imports}}` — `import DesignSystemBoardView from "./design-system"` etc., one line per selected recipe.
- `{{default_section}}` — id of the first selected recipe (`design-system`, `ui-components`, etc.).
- `{{section_entries}}` — one `SidebarSection` object per selected recipe. Sitemap and Reference use `entryKind: "page"`; UI Components uses `entryKind: "primitive"`; Blocks uses `entryKind: "block"`.
- `{{board_switch}}` — selection → board mapping (`selection.kind === "section" && selection.sectionId === "design-system" && <DesignSystemBoardView />`, etc., one per recipe + per-leaf cases).
- Note: each Board component in `{{board_switch}}` wraps its own `<ForkshopCanvas>` (see Templates 2-8). `page.tsx` itself does not render `<ForkshopCanvas>` — it just mounts the sidebar and the selected Board.

### Template 10 — `next.config.*` webpack-only rule (Next 14)

```js
// next.config.js / next.config.mjs / next.config.ts
// Add inside the config object:
webpack(config) {
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    include: [
      /components\//,
      /lib\//,
      /src\/components\//,
      /src\/lib\//,
    ],
    use: ["@locator/webpack-loader"],
  })
  return config
},
```

If a `webpack` function already exists, append the `config.module.rules.push(...)` call inside it rather than adding a second `webpack` key.

### Template 11 — `next.config.*` Next 15/16 (turbopack + webpack)

```ts
// next.config.ts — Next 15.x or 16.x+
// Top-level turbopack block (promoted out of experimental in Next 15.3):
turbopack: {
  rules: {
    "components/**/*.{js,jsx,ts,tsx}": { loaders: ["@locator/webpack-loader"] },
    "lib/**/*.{js,jsx,ts,tsx}": { loaders: ["@locator/webpack-loader"] },
    "src/components/**/*.{js,jsx,ts,tsx}": { loaders: ["@locator/webpack-loader"] },
    "src/lib/**/*.{js,jsx,ts,tsx}": { loaders: ["@locator/webpack-loader"] },
  },
},
// Plus webpack fallback for non-turbopack runs:
webpack(config) {
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    include: [
      /components\//,
      /lib\//,
      /src\/components\//,
      /src\/lib\//,
    ],
    use: ["@locator/webpack-loader"],
  })
  return config
},
```

If `turbopack.rules` already exists, merge the new glob keys into the existing object. If a `webpack` function already exists, append the `config.module.rules.push(...)` call inside it.
