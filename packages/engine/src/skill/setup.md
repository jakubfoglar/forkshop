---
name: forkshop-setup
description: Wires Forkshop into a Next.js App Router project after `npx forkshop init`. Detects the styling system (Tailwind v3/v4, Panda, Vanilla Extract, plain CSS variables, or none), scans components and routes, proposes a Board layout, asks before mutating next.config / package.json, populates forkshop.config.tsx, keeps the scaffold Boards that match fired recipes, registers them in page.tsx, then runs `forkshop verify`. Activates on "set up Forkshop", "finish Forkshop setup", "configure Forkshop", "wire up Forkshop", "initialize Forkshop".
---

# Forkshop — first-run setup

Sets up Forkshop in the user's project. `npx forkshop init` has already dropped the engine source files, an empty `forkshop.config.tsx`, all nine scaffold Board files, and a `CLAUDE.md` under `{{mount}}/`. This skill fills in the config placeholders, deletes the scaffold Boards that don't apply, edits `page.tsx` to register the ones that remain, and runs `forkshop verify`.

Forkshop's vocabulary: a **Board** is one typed config produced by `defineBoard({ id, label?, icon?, match, layout, useEntries, useSidebarChildren? })`; the default export is a React component. A **Node** is a draggable item on the canvas. A **NodeType** is the plugin that renders a Node kind (`inline-react`, `iframe-component`, `iframe-route`, or custom). A **Layout** arranges Nodes — built-ins are `gallery` and `tree`; custom Layouts come from `defineLayout()`. The engine renders Boards through `<BoardRegistry config={forkshopConfig} boards={[…]} />`.

Run once per project. After that the user reads `{{mount}}/CLAUDE.md` for ongoing customization. The user owns every file produced. Lean toward shorter outputs, explicit consent for any config mutation, and language that frames Forkshop as something they *have*.

## Phase 0 — Preconditions

Fail fast. Each check exits with one message.

1. **`forkshop.json` exists at repo root.** Missing → *"Forkshop's source files aren't installed yet. Run `npx forkshop init` first."* `schemaVersion` not `"2.1.0"` → *"Re-run `npx forkshop init` to upgrade to the v2.1 schema. Move `{{mount}}/` aside first if you want to keep custom Board files."*
2. **`{{mount}}/CLAUDE.md` present.** (Resolve `mount` from `forkshop.json`; default `app/forkshop`.) Missing → *"Forkshop's installation looks incomplete — `{{mount}}/CLAUDE.md` is missing. Re-run `npx forkshop init --force` or restore the file."*
3. **App Router only.** Confirm `app/` exists at repo root (or under the workspace named by `mount`). `pages/` only → *"Forkshop supports Next.js App Router. Pages Router isn't shipped."* `vite.config.*` → *"This looks like a Vite project. Forkshop is Next.js App Router only."* `remix.config.*` → *"This looks like a Remix project. Forkshop is Next.js App Router only."* Neither + no framework config → *"This doesn't look like a Next.js project."*
4. **Re-run detection.** If `{{mount}}/forkshop.config.tsx` contains a populated `defineConfig({…})` (more than the stub's single placeholder, or any of `ui` / `blocks` / `reference` set), switch to **Adjust mode** and skip Phases 1–7.

## Phase 1 — Read the project, build understanding

Gather context first, reason after. Produce a narrative — never a category lookup. Two sentences of "this is the marketing site for X" beats any dependency-graph inference.

**Read the project's own words** (in order, whatever exists): repo-root `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`, `README.md` (first ~150 lines), `docs/` index. Trust them.

**Read structural hints:** `package.json` (deps, name, description, scripts), `app/layout.tsx` (fonts, metadata), `app/page.tsx` if present, the styling-system fingerprint (Tailwind v3/v4, Panda, Vanilla Extract, `:root` vars — see Scan D below), `next.config.*`.

**Scan two directories one level deep:** `ls app/` and `ls components/`. Note route-group names. Don't recurse — Phase 2 does that.

**Signals to weigh, not rules to fire:**

- **Auth packages**: `@clerk/nextjs`, `next-auth`, `@auth/core`, `lucia`, `@lucia-auth/*`, `iron-session`, `@auth0/nextjs-auth0`, `@workos-inc/authkit-nextjs`, `@supabase/auth-helpers-nextjs`, `@supabase/ssr`.
- **Authenticated route groups**: `(auth)`, `(authenticated)`, `(dashboard)`, `(app)`, `(protected)`, `(private)`.
- **Marketing route groups**: `(marketing)`, `(public)`, `(home)`, `(www)`.
- **Both kinds present** → hybrid project (norm, not edge case).
- **Mobile-web signals** — `maximumScale: 1` AND `userScalable: false` in `app/layout.tsx` viewport export, plus breakpoints staying under `md:`. Both → set `mobileProfile` (viewport defaults to 375 px).

**Produce a narrative** — 2–3 sentences, concrete and observable, describing Boards you'd wire.

Good: *"Hybrid: `(marketing)` surface with ~8 static pages and blog MDX plus an `(authenticated)` surface using Clerk (~12 routes). Tailwind theme. I'd scaffold Design System, UI Components, Blocks, and Sitemap."*

Bad: *"This is a SaaS marketing hybrid."*

Carry the narrative + raw signals into Phase 2. Show the narrative, not the signal list.

## Phase 2 — Scan for primitives, blocks, routes, tokens, MDX

Five scans, all silent. Output is data for Phase 3.

### Scan A — Primitives

1. `components/ui/` exists (shadcn convention) → list its direct `.tsx` files. Filter out non-primitives (`use-toast.ts`, `index.ts`, `utils.ts`, `_*`).
2. Otherwise grep `components/**/*.tsx` for filenames matching: `button`, `badge`, `input`, `select`, `card`, `dialog`, `tooltip`, `avatar`, `tabs`, `switch`, `checkbox`, `radio`, `label`, `textarea`, `separator`, `skeleton`, `popover`, `dropdown`, `typography`, `heading`.
3. Head ~30 lines of each candidate; confirm a matching default or named export (guards against `button-helpers.ts`).
4. Cap at 12. If more candidates exist, sort by import-count across `app/**/*.tsx`; note the cap in the proposal.

### Scan B — Blocks

`components/blocks/` → `components/sections/` → `components/marketing/` → `components/site/`, in preference order. List direct `.tsx` exports. For each, find its first usage in `app/**/*.tsx` and capture the literal props. No folder found → skip the Blocks recipe; note in the narrative.

### Scan C — Routes

Recurse `app/**` for `page.tsx`. Group by closest enclosing route group. List static routes directly. Dynamic routes (`[slug]`, `[id]`) need enumeration — surface as a TODO note in the proposal; Sitemap routes are explicit in `forkshop.config.tsx`. Surface counts in the proposal ("8 routes under `(marketing)`"); the per-route list renders in the sidebar after install.

### Scan D — Design tokens

`useDesignTokens()` auto-reads any framework that compiles tokens to `:root` CSS variables. Detect the source in order; record `themeTokens.source`:

1. **Tailwind v3** — `tailwind.config.{ts,js,mjs}` present. Tailwind v3 doesn't emit CSS vars by default; the Board needs `useDesignTokens({ tailwindConfig })`.
2. **Tailwind v4** — `@theme { … }` block in `app/globals.css`.
3. **Panda CSS** — `panda.config.{ts,js}`.
4. **Vanilla Extract** — `*.css.ts` with `createGlobalTheme` / `createTheme` calls.
5. **Generic `:root` CSS variables** — any project CSS file declares `:root { --color-* / --spacing-* / --radius-* / --shadow-* / --font-size-* / --font-weight-* }`.
6. **None** — `themeTokens.hasCustomization = false`. Design System recipe doesn't fire.

The scaffold uses `useDesignTokens()` (no argument) by default. Only on `tailwind-v3-config` does the skill edit the call site to `useDesignTokens({ tailwindConfig })` and add the import.

### Scan E — MDX content

Check `package.json` for `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `next-mdx-remote`, `contentlayer`. Glob `**/*.mdx` under `app/` and top-level `content/` (cap 100). Look for an MDX-route pattern: `app/(content)/[...slug]/page.tsx`, `app/blog/[slug]/page.tsx`, or a `page.tsx` importing `next/mdx` / `@mdx-js/react`. Output `mdxContent = { detected, articleCount, routePattern? }`. Reference recipe fires only when both `detected` and `routePattern` are set; MDX without a route → note in the narrative, skip.

### Output shape

```
narrative: "<2-3 sentence narrative from Phase 1>"
projectFlags: { mobileProfile, monorepo, authLibrary }
primitives:   [{ name, sourcePath, hasCva, cvaVariants }]
blocks:       [{ name, sourcePath, fixture, previewRoute }]
routes:       [{ group, paths, hasDynamic }]
themeTokens:  { hasCustomization, source, hasCustomColors, hasCustomTypography, … }
mdxContent:   { detected, articleCount, routePattern? }
```

Don't render this. It feeds Phase 3.

## Phase 3 — Build the consolidated proposal

### Recipe selection

```
recipes = []
if themeTokens.hasCustomization:  recipes.push("design-system")
if primitives.length >= 3:        recipes.push("ui-components")
if blocks.length >= 1:            recipes.push("blocks")
recipes.push("sitemap")  # always — every Next.js app has routes
if mdxContent.detected and mdxContent.routePattern:
  recipes.push("reference")
```

Cross-cutting modifiers:

- `projectFlags.authLibrary` set → Sitemap defaults filter out `(authenticated|dashboard|app|protected|private)` route groups.
- `projectFlags.mobileProfile` true → set `viewportProfile: "mobile"` (Blocks Board renders at 375 px instead of 1440).

### Proposal template

Use box-drawing characters. Substitute counts from Phase 2.

````
I've read your project. Here's what I see:

<narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

/forkshop sidebar
├─ Design System            (<N> color tokens, <M> typography styles via <source>)
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

Mount path:    <mount>
               (or app/(tools)/forkshop/ — say "use tools group" to switch)

Also touching automatically:
  • app/globals.css — @import "@forkshop/engine/forkshop.css"
  • {{mount}}/forkshop.config.tsx — populated with sitemap + ui/blocks (where they applied)
  • {{mount}}/page.tsx — registers the Boards above

Two opt-ins (I'll confirm after you accept):
  [1] Option-click → editor — @locator/webpack-loader devDep + next.config rule
  [2] Live-AI hook for Claude Code — .claude/hooks/forkshop-post-tool-use.sh + .claude/settings.json entry
````

Omit any recipe line that didn't fire. Truncate child lists to 3 entries plus `└ …` when there are more.

### Ask what's next

Call `AskUserQuestion` with `Accept all / Adjust / Pause`.

### Thin-Board handling

If a recipe fires with 1–2 entries, include it but render counts honestly. Surface in the narrative: *"Reference has only 2 articles right now — Board will be lightly populated."* Users can decline thin Boards.

### Always the real thing

Boards scaffold against the user's existing components — no duplicate content, no placeholder fixtures unless the user's code can't supply them. Block Boards iframe the real block route. UI Components Board reads `forkshopConfig.ui` (which barrel-exports their actual primitives). Sitemap iframes the user's real `/about`. The skill never copies user code; it only references it.

Wait for the user's reply.

## Phase 4 — Iterate

Loop until acceptance:

1. Read the reply.
2. Classify:
   - **Full acceptance** ("looks good", "accept all", "yes", "ship it") → exit loop, proceed to Phase 5.
   - **Board rename** ("rename Components to Blocks") → update label in proposal state.
   - **Mount path change** ("use tools group", "put it under apps/web") → update `mountPath`.
   - **Narrative correction** ("this is actually a SaaS", "the marketing blocks are stale, skip them") → return to Phase 1 with the correction as a hint; re-derive; re-render.
   - **"explain why you chose X"** → describe the heuristic briefly. Don't modify state.
   - **"pause"** → stop, write nothing, tell the user how to resume: *"Paused. Type 'set up Forkshop' again to resume."*
   - **Ambiguous** → one short clarifying question.
3. Re-render the proposal.
4. Re-invoke `AskUserQuestion` with `Accept all / Adjust / Pause`.

Rules:

- **No writes during iteration.** Changes live in-memory until acceptance.
- **Narrative pushback restarts Phase 1.** A correction to what kind of project this is invalidates downstream choices — re-derive, don't patch.
- **Soft cap at 5 iterations.** After 5, ask: *"A few back-and-forths in — keep going, or pause?"* Check-in, not a hard stop.

## Phase 5 — Consent for config mutations

Two opt-ins need consent before Phase 6 touches anything outside Forkshop's namespace. (`app/globals.css`'s `@import "@forkshop/engine/forkshop.css"` line is added by `forkshop init`; the skill only verifies idempotently.)

Glue text:

````
Two things need your call before I touch anything outside Forkshop's namespace:

  [1] Option-click → editor — add @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*
  [2] Live-AI hook for Claude Code — adds .claude/hooks/forkshop-post-tool-use.sh + one entry in .claude/settings.json. Forwards file paths to your dev server so Nodes light up as you work. Reversible.

Glance at the diffs first with "Show me" on either, or pick yes/no.
````

Call `AskUserQuestion` twice in sequence (one per opt-in). Each question has options `Yes, install` / `No, skip` / `Show me`. `Show me` renders the planned diff inline, then re-asks with only `Yes, install` / `No, skip`.

```ts
// Question 1 — Option-click
{ question: "Enable Option-click → editor (recommended)?", header: "Option-click", options: [
  { label: "Yes, install", description: "Adds @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*" },
  { label: "No, skip",     description: "Skip Locator wiring — install manually later" },
  { label: "Show me",      description: "Print the planned dep + next.config diff first, then re-ask" },
]}
// Question 2 — Live-AI hook
{ question: "Install Claude Code live-AI hook (recommended)?", header: "Live-AI hook", options: [
  { label: "Yes, install", description: "Adds .claude/hooks/forkshop-post-tool-use.sh + one entry in .claude/settings.json. Reversible." },
  { label: "No, skip",     description: "Skip Claude Code wiring — install manually later" },
  { label: "Show me",      description: "Print the planned script + settings diff first, then re-ask" },
]}
```

## Phase 6 — Write artifacts

Four sequential steps. Each step prints `✓ <action> <path>` on success. Failures stop the sequence — no transactional rollback.

### Step 1 — Populate `{{mount}}/forkshop.config.tsx`

The CLI dropped this file with placeholders. Fill them based on which recipes fired:

| Placeholder | Substitution |
| --- | --- |
| `{{mount}}` | The resolved mount path, e.g. `app/forkshop`. |
| `{{ui_import}}` | UI Components fired → `import * as UIPrimitives from "@/components/ui"`. Else empty. |
| `{{blocks_import}}` | Blocks fired → `import * as Blocks from "@/components/blocks"`. Else empty. |
| `{{ui_field}}` | UI Components fired → `  ui: UIPrimitives,`. Else empty. |
| `{{blocks_field}}` | Blocks fired → `  blocks: Blocks,`. Else empty. |
| `{{sitemap_routes}}` | One `{ path: "/about", sourceFile: "app/about/page.tsx" },` line per route from Scan C, 4-space indented. Auth-filter removes flagged groups when the modifier fires. Empty fallback: `      { path: "/", sourceFile: "app/page.tsx" },`. |
| `{{reference_field}}` | Reference fired → `  reference: { contentPaths: [<quoted paths from Scan E>] },`. Else empty. |
| `{{viewport_profile}}` | `"mobile"` if `mobileProfile` flag fired, else `"responsive"`. |

The file uses `defineConfig({ … })`, which validates the shape at import time. If a key is wrong, the dev server fails with a Zod error pointing to the bad field — fix the placeholder substitution and re-run.

Also write/merge the **barrel files** powering discovery. The CLI may or may not have left these — verify and merge:

- `components/ui/index.ts` — one `export { Button } from "./button"` per discovered primitive, alphabetical.
- `components/blocks/index.ts` — same shape for blocks.

`useDiscoveredPrimitives(forkshopConfig.ui)` / `useDiscoveredBlocks(forkshopConfig.blocks)` reflect over the barrel exports. Adding a primitive later is two steps — drop the `.tsx` in, add a line to the barrel.

If a barrel already exists, merge in alphabetical order; don't overwrite.

### Step 2 — Keep the Board scaffolds that match fired recipes

The CLI copied all nine scaffold templates into `{{mount}}/`:

- `design-system-board.tsx`
- `ui-components-board.tsx`
- `primitive-detail-board.tsx`
- `blocks-board.tsx`
- `sitemap-board.tsx`
- `single-page-board.tsx`
- `reference-board.tsx`

(plus `forkshop.config.tsx` and `page.tsx`, handled in Steps 1 and 3.)

Delete the ones whose recipe didn't fire:

| Recipe | Keep |
| --- | --- |
| Design System (`themeTokens.hasCustomization`) | `design-system-board.tsx` |
| UI Components (`primitives.length >= 3`) | `ui-components-board.tsx`, `primitive-detail-board.tsx` |
| Blocks (`blocks.length >= 1`) | `blocks-board.tsx` |
| Sitemap (always) | `sitemap-board.tsx`, `single-page-board.tsx` |
| Reference (MDX + route) | `reference-board.tsx` |

Sitemap always fires, so `sitemap-board.tsx` and `single-page-board.tsx` always stay. If UI Components fires, both `ui-components-board.tsx` and `primitive-detail-board.tsx` stay — the primitive-detail Board matches `isPrimitiveSelection` and renders the variant grid when the user clicks a primitive in the sidebar.

If Scan D returned `tailwind-v3-config`, edit `design-system-board.tsx`: add `import tailwindConfig from "../../tailwind.config"`, change `useDesignTokens()` to `useDesignTokens({ tailwindConfig })`. Otherwise leave the file as-shipped (the default `useDesignTokens()` reads `:root` CSS vars).

### Step 3 — Register Boards in `{{mount}}/page.tsx`

The CLI dropped `page.tsx` with `{{board_imports}}` and `{{board_list}}` placeholders. Fill both with one entry per surviving Board, in this canonical order:

```tsx
// {{board_imports}}
import DesignSystemBoard from "./design-system-board"
import UIComponentsBoard from "./ui-components-board"
import PrimitiveDetailBoard from "./primitive-detail-board"
import BlocksBoard from "./blocks-board"
import SitemapBoard from "./sitemap-board"
import SinglePageBoard from "./single-page-board"
import ReferenceBoard from "./reference-board"

// {{board_list}} — 8-space indented inside boards={[…]}
        DesignSystemBoard,
        UIComponentsBoard,
        PrimitiveDetailBoard,
        BlocksBoard,
        SitemapBoard,
        SinglePageBoard,
        ReferenceBoard,
```

Skip any line whose Board was deleted in Step 2. Order in `boards={[…]}` controls sidebar header order; detail Boards (`PrimitiveDetailBoard`, `SinglePageBoard`) match by selection guard (`isPrimitiveSelection`, `isPageSelection`) and have no sidebar header, so their position is cosmetic.

After this step, `page.tsx` is `<BoardRegistry config={forkshopConfig} boards={[…]} />` — no switch, no per-selection routing. The engine owns selection, sidebar, canvas, and positions.

### Step 4 — Optional next.config + Claude pack

**`app/globals.css` (always).** If `@import "@forkshop/engine/forkshop.css"` isn't present in `app/globals.css` (or `src/app/globals.css`), prepend it above any `@tailwind` directives.

**Locator (Phase 5 opt-in).** If accepted:

1. Add `@locator/webpack-loader@^0.5.0` to `package.json` devDependencies (idempotent).
2. Merge a rule into `next.config.*` — Next 14: webpack-only. Next 15/16: top-level `turbopack.rules` plus the same webpack fallback.

```js
// Next 14 — inside the config object:
webpack(config) {
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    include: [/components\//, /lib\//, /src\/components\//, /src\/lib\//],
    use: ["@locator/webpack-loader"],
  })
  return config
},
```

```ts
// Next 15/16 — additionally:
turbopack: {
  rules: {
    "components/**/*.{js,jsx,ts,tsx}": { loaders: ["@locator/webpack-loader"] },
    "lib/**/*.{js,jsx,ts,tsx}":        { loaders: ["@locator/webpack-loader"] },
    "src/components/**/*.{js,jsx,ts,tsx}": { loaders: ["@locator/webpack-loader"] },
    "src/lib/**/*.{js,jsx,ts,tsx}":    { loaders: ["@locator/webpack-loader"] },
  },
},
```

Append to existing `webpack(config)` rather than adding a second key. Merge globs into existing `turbopack.rules`. If the shape can't be merged cleanly (functional config importing elsewhere), print the snippet for manual paste with a `!` warning.

End of Phase 6 reminder: `Run pnpm install before pnpm dev — Locator dep was just added.` Declined → Phase 7 surfaces `Option-click: skipped (re-run setup to enable)`.

**Claude pack (Phase 5 opt-in).** Accepted → run `npx forkshop init --install-claude-pack` (or set `FORKSHOP_INSTALL_CLAUDE_PACK=1`). The CLI writes `.claude/hooks/forkshop-post-tool-use.sh` (mode 0o755) and merges one `PostToolUse` entry into `.claude/settings.json`. Declined → Phase 7 surfaces `Live-AI hook: skipped (re-run setup to enable)`.

## Phase 7 — Verify and report

Run `npx forkshop verify` via Bash from the repo root.

Clean install:

```
✓ Forkshop is set up.

  /forkshop          → http://localhost:3000/forkshop
  Boards             → <comma-separated Board names with counts>
  Verify             → ✓ clean

Try it:
  pnpm dev
  → open /forkshop
  → click a route under Sitemap
```

`Boards` lists what was wired, e.g. `Design System · UI Components (4) · Blocks (2) · Sitemap (8) · Reference (5)`.

Issues reported by `forkshop verify` → surface inline and offer to fix interactively. Most issues are placeholder leaks or missing files referenced from `sourceFile`:

```
✓ Forkshop is set up. Verify found a few things:

  ! {{mount}}/blocks-board.tsx references a sourceFile that doesn't exist:
    components/blocks/hero.tsx

Fix them now? (y/n)
```

`y` → patch each issue. `n` → list them and exit. Add `Option-click: skipped` / `Live-AI hook: skipped` above `Try it:` when those Phase 5 opt-ins were declined. Manual-paste fallback for `next.config.*` → render a `!` block with the snippet and add `pnpm install` to the `Try it:` block (Locator dep was just added).

Rules: lead with `✓ Forkshop is set up.`, honest `Boards →` counts, `Verify →` status, no debug sections by default, `✓`/`→`/`!` instead of ANSI escapes.

## Adjust mode

If Phase 0's Check 4 detected a populated config, skip Phases 1–7. Render:

```
Looks like Forkshop is already set up. Here's your current config:

  Mount:   <mount>
  Boards:  <Board ids registered in page.tsx>
  Opt-in:  <✓/✗ Locator, ✓/✗ live-AI hook>

What would you like to change?
  • "rescan components"     → re-run Phase 2 and propose a diff against config
  • "add board"             → propose a new Board file (custom Layout via defineLayout, or another recipe)
  • "rename board"          → patch the `label` on a defineBoard call
  • "install opt-ins"       → walk Phase 5 again
  • "open config"           → print forkshop.config.tsx path, do nothing

Or describe what you want.
```

### Actions

- **Rescan components** → Run Phase 2 Scans A/B. Diff against current `forkshop.config.tsx` + barrels. On accept, patch in place.
- **Add board** → Ask which selection guard / layout the user wants. Scaffold a new `*-board.tsx` from the closest template; add the import + entry in `page.tsx`.
- **Rename board** → Patch the `label` field on the `defineBoard({…})` call. Don't rewrite the file.
- **Install opt-ins** → Walk Phase 5. Apply the matching Step 4 mutations on accept.
- **Open config** → Print the path. Do nothing.
- **Free-form** → Best-effort. Ask one clarifying question if unclear.

### Rules

- **Never re-run Phase 6 wholesale.** Only the specific changes requested.
- **Never rewrite `forkshop.config.tsx` or a Board file from scratch.** Patch in place. Preserve user edits.
- **Full reset:** tell the user to move `{{mount}}/forkshop.config.tsx` aside and re-run.

## Edge cases

### No blocks folder

`blocks.length === 0` → Blocks recipe doesn't fire, `blocks-board.tsx` deleted in Step 2, no `blocks:` field in `forkshop.config.tsx`, no `Blocks` import in `page.tsx`. Mention in the narrative: *"I didn't find a blocks folder — add one and re-run if you want a Blocks Board."*

### Too many discovered blocks

Scan B finds >50 → propose the top 20 by import-count. Note: *"Capped at 20 sorted by import-count. Add the rest manually in `forkshop.config.tsx`'s barrel or ask me to use different criteria."*

### Dynamic-only routes

Only `[slug]` routes, no statics → note in the narrative. Sitemap Board still scaffolds with `routes: [{ path: "/", sourceFile: "app/page.tsx" }]` and a TODO comment — the user adds explicit paths later.

### `@forkshop/engine` missing

`init` runs the package manager automatically. If `node_modules/@forkshop/engine` isn't there, exit:

> *"Forkshop's engine package isn't installed. Run `pnpm install` (or your package manager's equivalent) and try again."*

### Engine version mismatch

If `package.json`'s `@forkshop/engine` pin is older than `forkshop.json`'s `engineVersion`, surface a soft warning in Phase 7:

> *"Engine version mismatch — your installed `@forkshop/engine` may be out of date. Run `npx forkshop update` to sync."*

Don't block.

### Monorepo without repo-root `app/`

If `pnpm-workspace.yaml` or `turbo.json` is present and no repo-root `app/` exists, ask in Phase 0/1: *"Looks like a monorepo. Which workspace should I scan and mount in?"* Wait for the answer. Adjust every path lookup to that workspace.

### `{{mount}}/` already populated with non-Forkshop files

If `{{mount}}/` has user-written files that don't match Forkshop's scaffold layout (the user repurposed the folder), exit:

> *"`{{mount}}/` already contains files that aren't from Forkshop. Move them aside or set `mount` in `forkshop.json` to a different path, then re-run."*

## What this skill never does

- Silently mutates the root `CLAUDE.md` — always gated by Phase 5 consent.
- Touches files outside the Forkshop surface (`{{mount}}/`, `components/forkshop/`, `lib/forkshop/`, `app/api/forkshop/`) without surfacing the change in the proposal's "Also touching" block.
- Installs npm packages without informing the user — always-on deps are installed by `npx forkshop init`.
- Reverts user edits — re-runs are additive; adjust mode proposes deltas, never overwrites.
- Calls out to the network.
