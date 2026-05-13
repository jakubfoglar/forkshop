---
name: fogma-setup
description: Wires Fogma into a Next.js + Tailwind project after `npx fogma init`. Detects project type, scans components and routes, proposes a sidebar, asks before mutating next.config.ts / .claude/settings.json / root CLAUDE.md, writes per-board files, populates fogma.config.ts. Activates on "set up Fogma", "finish Fogma setup", "configure Fogma", "wire up Fogma".
---

# Fogma — first-run setup

You are setting up Fogma in the user's project. The CLI (`npx fogma init`) has already dropped Fogma's source files (primitives, kits, fonts, API routes, an empty `fogma.config.ts` stub, and a CLAUDE.md). Your job is to walk the user through the *configuration* — what their Fogma's sidebar contains, which kits power each section, and which opt-in features to install — then write the per-board files and populate `fogma.config.ts`.

You run **once** per project. After this, your work is mostly historical: the user reads `app/fogma/CLAUDE.md` for ongoing customization, the sibling `fogma-live-editing` skill auto-applies when Claude edits Fogma-watched files, and the user-invoked `fogma-doc-sync` skill refreshes documentation if it drifts.

The user owns every file you produce. They will fork freely. This file (the skill itself) is in their repo too — they can edit it. Lean toward shorter outputs, explicit user consent on every config mutation, and language that frames Fogma as something they *have*, not something they *use*.

## Phase 0 — Read preconditions

Do **all** of the following before proceeding to Phase 1. If any check fails, exit with the indicated message and stop.

### Check 1 — `fogma.json` exists at the repo root

Read `fogma.json` from the working directory. If missing, exit:

> *"Fogma's source files aren't installed yet. Run `npx fogma init` first."*

`fogma.json` is the source of truth for the `aliases.mount` path (where Fogma's mount route lives) and the alias map needed to resolve all other paths. Without it, every subsequent step would be guessing.

### Check 2 — Read `{{aliases.mount}}/CLAUDE.md`

Resolve `{{aliases.mount}}` from `fogma.json` (defaults to `app/fogma` if absent). Read the file at `<aliases.mount>/CLAUDE.md`.

If missing, exit:

> *"Fogma's installation seems incomplete — `<aliases.mount>/CLAUDE.md` is missing. Re-run `npx fogma init --force` or restore the file manually."*

That CLAUDE.md documents the kit API (`design-system-board`, `iframe-gallery`, `page-tree`), the selection model, and the conventions you'll write code against. You will rely on it instead of duplicating its content here.

### Check 3 — App Router only

Confirm `app/` exists at the repo root (or under the workspace specified by `aliases.mount` in monorepos). If only `pages/` exists, exit:

> *"Fogma v1 only supports Next.js App Router. Pages Router support is on the roadmap but not shipped."*

If `vite.config.{ts,js,mjs}` exists at the repo root, exit:

> *"This looks like a Vite project. Fogma v1 supports Next.js App Router only."*

If `remix.config.{ts,js}` exists, exit:

> *"This looks like a Remix project. Fogma v1 supports Next.js App Router only."*

If neither `app/` nor `pages/` exists and no framework config is found, exit:

> *"This doesn't look like a Next.js project. Fogma requires App Router."*

### Check 4 — Re-run detection

If `fogma.config.ts` (or `.tsx`) at `<aliases.mount>/` contains a non-empty `config` export — that is, more than the stub the CLI dropped — switch to **Adjust mode** (see the section near the bottom of this file) and skip Phases 1–7.

A "non-empty" config means: any of `designSystem.primitives`, `components.entries`, or `pages.autoDiscover` has been populated past the stub's defaults. The CLI's stub has empty arrays.

Once all four checks pass, continue to Phase 1.

## Phase 1 — Read the project, build understanding

You will gather context *first*, then reason. Produce a narrative description of what kind of project this is — never a category lookup. Two sentences of "this is the marketing site for X" beats any dependency-graph inference.

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
- **Mobile-web signals** — in `app/layout.tsx` or a `viewport` export: `maximumScale: 1` AND `userScalable: false`, plus breakpoint usage in the top-edited TSX files staying under `md:`. If both fire, set a *mobile profile* flag (changes `iframe-gallery` default to single-width 375 px).

### Step 5 — Produce a narrative

Write a 2–3 sentence description of the project. This is what the user sees in Phase 3's proposal — make it concrete and observable.

**Good (concrete, observable):**

> *"This is a hybrid: a `(marketing)` surface (~8 static pages + blog MDX) plus an `(authenticated)` surface using Clerk (~12 routes). Tailwind config is heavily customized with semantic tokens. The README emphasizes the marketing site; CLAUDE.md documents the design system."*

**Bad (categorical, abstract):**

> *"This is a SaaS marketing hybrid."*

The narrative is the proposal's first paragraph. Users correct narratives faster than they correct sidebar trees.

### Step 6 — Carry the narrative forward

Hold the narrative + the raw signals (auth lib name, route-group names, mobile-profile flag, Tailwind v3-vs-v4) as Phase 2's input. Do not show the user the signal list — show the narrative.

## Phase 2 — Scan for primitives, blocks, routes

Three scans, all silent. Output is data for Phase 3 — do not show progress to the user.

### Scan A — Primitives

1. If `components/ui/` exists (the shadcn convention), list its direct `.tsx` files. Filter out filenames that are clearly not primitives (`use-toast.ts`, `index.ts`, `utils.ts`, anything under a `_` prefix).
2. Otherwise, grep `components/**/*.tsx` for filenames matching this canonical set (case-insensitive): `button`, `badge`, `input`, `select`, `card`, `dialog`, `tooltip`, `avatar`, `tabs`, `switch`, `checkbox`, `radio`, `label`, `textarea`, `separator`, `skeleton`, `popover`, `dropdown`, `typography`, `heading`.
3. For each candidate, briefly open the file (head ~30 lines) and confirm there's a default or named export of the same name. This guards against false positives like `button-helpers.ts`, `dialog-context.ts`.
4. Cap at ~12 primitives. If more candidates exist, sort by import-count across `app/**/*.tsx` and keep the top 12. Note the cap in the proposal so the user knows you trimmed.

### Scan B — Blocks

1. Look for any of: `components/blocks/`, `components/sections/`, `components/marketing/`, `components/site/`. If multiple match, prefer `blocks/` over `sections/` over the others.
2. List direct `.tsx` exports of the chosen folder.
3. For each block, find its first usage in `app/**/*.tsx`. Capture the *literal* props passed in that usage — those become the **fixture** the proposal references. If no usage exists, mark the block as "no fixture; will use empty props."
4. If none of the candidate folders exist, skip the Blocks section in the proposal. Note this in the narrative ("I didn't find an obvious blocks folder").

### Scan C — Routes

1. Recurse `app/**` for `page.tsx`. Group by the closest enclosing route group (the nearest parent directory wrapped in parentheses).
2. Static routes (no `[slug]` in the path) → list directly.
3. Dynamic routes (`[slug]`, `[id]`, etc.) → flag as needing an enumeration source. The proposal will offer `autoDiscover: true` with a TODO marker for the user to add explicit enumeration if needed.
4. Surface in the proposal as **counts only** ("8 routes under `(marketing)`"). The per-route list will render in the actual sidebar after install — no need to dump it into the proposal.

### Output shape

After Phase 2, you hold an internal data structure roughly like:

```
narrative: "<2-3 sentence narrative from Phase 1>"
projectFlags: { mobileProfile: false, tailwindMajor: 3, monorepo: false }
primitives: [
  { name: "Button", path: "@/components/ui/button" },
  { name: "Badge", path: "@/components/ui/badge" },
]
blocks: [
  { name: "Hero", path: "@/components/blocks/hero", fixture: "title=\"...\" eyebrow=\"...\"" },
]
routes: [
  { group: "(marketing)", count: 8, hasDynamic: false },
  { group: "(authenticated)", count: 12, hasDynamic: true },
]
```

Do not render this to the user. It is the input to Phase 3.

## Phase 3 — Build the consolidated proposal

Render the proposal in the exact format below. Use box-drawing characters (`┌ ├ └ │ •`) for the sidebar tree. Do **not** improvise a different layout — designers reading this proposal compare it visually across runs.

### Proposal template

```
I've read your project. Here's what I see:

  <narrative paragraph from Phase 1, 2-3 sentences>

Here's the Fogma I'd build for you:

  /fogma sidebar
  ┌─ <Section 1 name>          (<kit name> kit<, layout: "<layout>" if iframe-gallery>)
  │   • <bullet 1>
  │   • <bullet 2>
  ├─ <Section 2 name>          (<kit name> kit)
  │   • <bullet 1>
  └─ <Section N name>          (<kit name> kit)
      • <bullet 1>

Mount path:    <aliases.mount, abbreviated to project-relative>
               (or app/(tools)/fogma/ — say "use tools group" to switch)

Also touching (automatic — required for Fogma to render right):
  • tailwind.config.ts — adds `presets: [require("./lib/fogma/tailwind/fogma-preset")]`
    so Fogma's UI styles itself via `fogma-*` tokens without leaking into your tokens.

Opt-ins (I'll ask before touching each):
  [1] Locator.js for option-click open-in-editor
        Touches: next.config.ts (turbopack rule), <aliases.mount>/layout.tsx (mount)
        Installs: @locator/runtime, @locator/webpack-loader (dev)
  [2] Live-AI awareness hook
        Touches: .claude/settings.json (one hook entry)
        Writes:  .claude/hooks/post-tool-use.sh (new file)
  [3] Live-editing cadence note in root CLAUDE.md
        Appends ~20 lines describing how to break up edits when working on
        Fogma-watched files. Snippet is preserved on doc-sync.

Reply with one of:
  • "looks good" / "accept all"      → I'll proceed with everything above
  • "rename <Section> to <Name>"     → I'll adjust section names
  • "skip <Section>"                 → I'll drop a section
  • "no Locator" / "yes hook"        → I'll toggle opt-ins
  • "tools group" / "different path" → I'll switch mount path
  • "pause"                          → I'll stop and not write anything

You can also push back on the picture: "this is actually a SaaS, the (marketing)
routes are stale" — I'll re-read and re-propose.
```

### Section composition rules

For each scanned input, propose:

- **Foundations** section — `design-system-board` kit — IFF Phase 2 found ≥ 1 primitive OR Tailwind config is non-default. Bullets: "<N> colors found in tailwind.config (<sample names>)" + "<N> primitives: <sample names>". If primitives but no notable colors, omit the colors bullet. If colors but no primitives, omit the primitives bullet.
- **Blocks** section — `iframe-gallery` kit, layout `"stack"` — IFF Phase 2 found ≥ 1 block. Bullets: "<N> blocks: <sample names>" + "Fixtures pulled from <files where fixtures were captured>".
- **Pages** section — `page-tree` kit — always proposed. Bullets: "<N> routes under <group>" per route group, or "<N> routes total" if no groups.

For **hybrid** projects (both marketing and SaaS signals), propose one Foundations section + one Blocks (or Components) section *per surface* + one Pages section per surface. Name them with surface qualifiers: "Marketing Blocks", "Dashboard Components", "Marketing Pages", "App Pages". The user may merge or rename during iteration.

For the **mobile profile** flag from Phase 1: in any Blocks section, append `, layout: "stack" (375px single-width — mobile profile)` after the kit name. The user can override via `"three-viewport"` in iteration.

### Empty-section handling

If a category has zero discovered entries (e.g., no primitives + default Tailwind → empty Foundations), do not propose it. Mention the gap in the narrative paragraph: *"I didn't find any primitives — start by adding a Foundations board later via `npx fogma add kits/design-system-board` and ask me to rescan."*

### After rendering

Wait for user input. Do not proceed to Phase 4 until you receive a reply. If the user is silent, do not write anything — `fogma.config.ts` and the board files stay untouched.

## Phase 4 — Iterate

After rendering the Phase 3 proposal, wait for the user's reply. Loop:

1. Read the user's reply.
2. Classify it as one of:
   - **Full acceptance** ("looks good", "accept all", "yes", "go", "ship it") → exit the loop and proceed to Phase 5.
   - **Section rename** ("rename Foundations to Colors", "call it Tokens instead") → update the section name in the internal proposal state.
   - **Section drop** ("skip Blocks", "remove Pages", "don't include Foundations") → drop the section from the proposal state.
   - **Section add** ("also add a Layouts board", "add a Flows section") → propose a new section. If no scanned data fits, ask: *"I'd add it with what content? An empty starter, or pull from a folder you point me at?"*
   - **Opt-in toggle** ("no Locator", "yes hook", "skip the cadence note") → flip the opt-in flag.
   - **Mount path change** ("tools group", "use app/(tools)/fogma/", "put it under apps/web") → update `mountPath` in the proposal state.
   - **Narrative correction** ("this is actually a SaaS", "the (marketing) routes are stale, don't include them") → return to Phase 1 with the correction as an explicit hint; re-run Steps 1-5; produce a new narrative; re-render.
   - **"explain why you chose X"** → describe the heuristic that produced the choice, briefly. Do not modify state.
   - **"pause"** → stop, write nothing, tell the user how to resume: *"Paused. Type 'set up Fogma' again to resume from the current proposal."* Hold the proposal state if you can; otherwise the next invocation re-runs Phase 1.
   - **Ambiguous** → ask one short clarifying question. Do not assume.
3. Re-render the proposal with the new state. Use the exact Phase 3 template.
4. Go to step 1.

### Rules

- **No writes during iteration.** All changes live in-memory until full acceptance. The user can experiment freely.
- **Narrative pushback restarts Phase 1.** A correction to *what kind of project this is* invalidates downstream choices. Don't try to patch the narrative; re-derive it.
- **Soft cap at 5 iterations.** If you've re-rendered the proposal 5 times without acceptance, ask: *"We've gone back and forth a few times. Want to pause and come back, or keep refining?"* This is a check-in, not a hard stop — if the user says keep going, keep going.

## Phase 5 — Consent for config mutations

Run **after** the user accepts the proposal in Phase 4, but **before** any writes. One prompt per opt-in the user kept after iteration. Each prompt opens with a one-line *why* (what the user gets), then the exact change preview, then a `Proceed?` question.

If the user replies anything other than `y`, treat it as `n`. Each decline is local — declining one opt-in does not cancel the others. After all three prompts (or skips), proceed to Phase 6.

### 5a — Locator.js (only if opt-in [1] kept)

Render verbatim:

```
I'm about to add Locator.js.

Why: lets you Option-click any element in Fogma to jump to its source in
your editor.

Here's what I'll do:

  next.config.ts — append turbopack rule:
    ─────────────────────────────────────────
    + experimental: {
    +   turbopack: {
    +     rules: {
    +       "*.{js,jsx,ts,tsx}": {
    +         loaders: ["@locator/webpack-loader"],
    +       },
    +     },
    +   },
    + },
    ─────────────────────────────────────────

  <aliases.mount>/layout.tsx — add LocatorInit mount:
    ─────────────────────────────────────────
    + import { LocatorInit } from "@/components/fogma/locator-init"
      …
    + <LocatorInit />
    ─────────────────────────────────────────

  package.json — add devDependencies:
    @locator/runtime, @locator/webpack-loader

Proceed? (y / n / show full file diff)
```

**If `next.config.ts` already has `experimental.turbopack.rules`:** instead of an append, show a *merge proposal* — what the merged block looks like with the new loader added to the existing rules object. Do not overwrite existing rules.

**If the file is `.js` or `.mjs`:** convert the snippet to that module format. For `.mjs`, use ESM `export default`. For `.js` (CJS), use `module.exports =`.

**If the user requests "show full file diff":** print a complete unified diff of the existing file + the proposed change.

### 5b — Live-AI hook (only if opt-in [2] kept)

Render verbatim:

```
I'm about to install the live-AI hook.

Why: highlights where Claude is editing right now — sidebar entry pulses,
the rendered block in the canvas glows. Fogma already updates live on
HMR; the hook adds the visual signal showing what's changing and where.

Here's what I'll do:

  .claude/hooks/post-tool-use.sh — create (one new file, ~30 lines)

  .claude/settings.json — add hook entry:
    ─────────────────────────────────────────
      "hooks": {
        "PostToolUse": [
          { "matcher": "Edit|Write|MultiEdit",
    +       "hooks": [{
    +         "type": "command",
    +         "command": ".claude/hooks/post-tool-use.sh"
    +       }]
          }
        ]
      }
    ─────────────────────────────────────────

  If .claude/settings.json already has a PostToolUse hook, I'll append a
  new entry alongside it (not overwrite).

Proceed? (y / n / show full file diff)
```

**If `.claude/settings.json` does not exist:** create it with the minimal hooks block. Surface this in the preview: *"`.claude/settings.json` does not exist — I'll create it with just the hooks entry."*

**If `.claude/settings.json` already has a `PostToolUse` matcher that includes `Edit|Write|MultiEdit`:** show a merge proposal that adds the Fogma hook entry alongside any existing entries in that matcher's `hooks` array.

### 5c — Cadence note (only if opt-in [3] kept)

Render verbatim:

```
I'm about to append a Fogma cadence note to your root CLAUDE.md.

Why: teaches Claude to break edits on Fogma-watched files into many small
Edits instead of one big Write — so you watch the page take shape as the
agent works, instead of a single flash at the end.

Here's the snippet I'd append (~20 lines):
  ## Fogma — editing cadence
  …

  I'll append, not rewrite. The snippet is bracketed with comment markers
  so the fogma-doc-sync skill can refresh it later without touching your
  other content.

Proceed? (y / n / show full snippet)
```

**If root `CLAUDE.md` does not exist:** offer to create it with just the cadence note as a starter file. Surface in the preview: *"No root CLAUDE.md found — I'll create one with the cadence note as a starter."*

**If root `CLAUDE.md` already contains a `<!-- fogma:cadence-note start -->` marker:** skip the prompt, mention in the summary that the note is already in place.

### Cross-prompt rules

- One short *Why* paragraph, never more. Justification, not tutorial.
- Frame each *Why* as the user-visible benefit, not the technical mechanism.
- Don't oversell. Honest opt-outs build trust.
- Default to `n` on parse failure or unrecognized response. Safety over momentum.
- "show full file diff" / "show full snippet" returns a verbatim diff or the full snippet without truncation. After showing, re-prompt `Proceed? (y / n)`.
- The user can hand-edit a file after seeing the diff and reply *"I did it myself, skip this"* — accept and move on.

## Phase 6 — Write the artifacts

Sequential. Failures stop the sequence — no transactional rollback. Order minimizes half-broken states (config before its consumers, kit-supporting writes before opt-in tweaks).

For each step, after a successful write, print a single `✓ <action> <path>` line. After all steps, print a blank line and move to Phase 7.

### Step 1 — `<aliases.mount>/fogma.config.ts` (or `.tsx`)

Render from Template 1 (`## Scaffolding templates` below). Substitute placeholders using the rules in that section. Resolve primitive/block import paths against the user's actual `components/` paths captured in Phase 2.

For the import group, prefer a single `from "@/components/ui"` barrel import if `components/ui/index.ts` exists; otherwise per-file imports.

### Step 2 — Per-board files

For each accepted sidebar section, write `<aliases.mount>/<board-slug>-board.tsx`. The slug is the section name kebab-cased ("Foundations" → `foundations`, "Marketing Blocks" → `marketing-blocks`).

Pick the right template (Template 2 for design-system-board, Template 3 for iframe-gallery, Template 4 for page-tree).

### Step 3 — `<aliases.mount>/page.tsx`

Render from Template 5. Replace any CLI-dropped stub. Import every board file written in Step 2, list them in `sidebar_entries` in the order the user accepted.

### Step 4 — `tailwind.config.ts` (automatic, no opt-in gate)

The strategy spec's "never silently mutate" list covers `next.config.ts`, `.claude/settings.json`, and root `CLAUDE.md`. `tailwind.config.ts` is *not* on that list — it's an automatic write, surfaced in Phase 3's "Also touching" callout.

Read the existing file. If `presets` already exists in `module.exports`/`export default`, append `require("./lib/fogma/tailwind/fogma-preset")` to that array. Otherwise add a new top-level `presets: [require("./lib/fogma/tailwind/fogma-preset")]` property.

For TypeScript configs (`.ts`), use the same syntax inside the `Config` typed object.

If the file's syntax is unusual (heavy comments, dynamic imports, exotic factory patterns) and a clean edit isn't safe, stop and print:

> *"I couldn't safely edit `tailwind.config.ts` — please add this manually: `presets: [require('./lib/fogma/tailwind/fogma-preset')]` to your config's `presets` array."*

Then continue to Step 5.

### Step 5 — `<aliases.mount>/fogma.css`

If the CLI already wrote this file (it likely did during `npx fogma init`), leave it alone. Otherwise write from Template 9 (the CSS template — added below in `## Scaffolding templates`).

The file imports the Raveo `@font-face` declarations and defines `fogma-*` CSS variables. The user-mounted `app/fogma/layout.tsx` is expected to import it (the CLI handles that mount).

### Step 6 — Locator.js wiring (only if opt-in 5a was consented)

Apply Template 7a to `next.config.{ts,js,mjs}`.
Apply Template 7b to `<aliases.mount>/layout.tsx` (create the file if absent).
Detect the package manager from lockfile presence (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, otherwise npm) and run `<pm> add -D @locator/runtime @locator/webpack-loader`. If the install fails, print the install command for the user to retry manually and proceed (files are already wired; the user just needs the dep).

### Step 7 — Live-AI hook installation (only if opt-in 5b was consented)

Write `.claude/hooks/post-tool-use.sh` from Template 6 — make it executable (`chmod +x`).
Apply the matcher-merge logic from Phase 5b to `.claude/settings.json` (create it if absent).

### Step 8 — Root `CLAUDE.md` cadence note (only if opt-in 5c was consented)

Append Template 8 verbatim to root `CLAUDE.md`. Create the file if absent. The template includes start/end comment markers so `fogma-doc-sync` can refresh it later.

### Failure handling

If any step throws (file write error, parse error on existing config, etc.):

1. Print: `✗ <step name> — <one-line reason>`
2. Stop the sequence (do not attempt later steps).
3. Tell the user: *"I stopped at <step>. Earlier steps succeeded and are on disk. After fixing the issue (or asking me what to fix), say 'continue setup' and I'll resume from the failed step."*
4. On a "continue setup" reply, jump back to the failed step.

Steps are idempotent enough that re-running a single step after the user manually fixes the input is safe.

## Phase 7 — Final summary

After Phase 6 completes (or partially completes with failures), render the summary verbatim:

```
Fogma is set up. Here's what you have:

  Mount:   <aliases.mount, abbreviated>  →  http://localhost:3000/fogma
  Config:  <aliases.mount>/fogma.config.ts
  Boards:  <comma-separated section names>
  Opt-ins: <✓ Locator.js | ✗ Locator.js (skipped)>   <✓ Live-AI hook | ✗ Live-AI hook (skipped)>   <✓ Cadence note | ✗ Cadence note (skipped)>

Try this first:
  1. pnpm dev   (or your package manager's dev command)
  2. Open /fogma in your browser
  3. Click any text on a block → edit in place → save
  4. <if Locator opted in:> Option-click any element → opens the file at the right line

Customize Fogma:
  • Rename a board       → edit the section title in fogma.config.ts
  • Add a board          → ask Claude: "add a Layouts board"
  • Restyle the sidebar  → fork components/fogma/sidebar/
  • Change kit defaults  → fork the kit in components/fogma/kits/
  Everything Fogma generated is in your repo. You own all of it.

Sibling skills available:
  • fogma-live-editing  — auto-applies cadence guidance when Claude edits
                          Fogma-watched files (active without invocation)
  • fogma-doc-sync      — invoke when app/fogma/CLAUDE.md drifts:
                          "sync Fogma docs" or "/fogma-doc-sync"

Notes for later:
  • For previewing logged-out / locked / per-user states, see the Auth
    section of <aliases.mount>/CLAUDE.md.
  • Fogma updates aren't automatic. To compare your files against the
    latest upstream: npx fogma diff <path>.
  <if Tailwind v4 detected:> • Tailwind v4 detected — `presets:` wasn't auto-wired. Add the preset manually per <aliases.mount>/CLAUDE.md.
  <if any Phase 6 step failed:> • <list the outstanding manual steps from failed Phase 6 actions>
```

### Rules

- **"You own all of it" is mandatory.** That line lands the share-and-forget posture. Do not paraphrase or skip.
- **Skipped opt-ins are surfaced as `✗ Name (skipped)`** so the user knows what they can opt into later via adjust mode.
- **Sibling skills get named once with their invocation phrasing.** Beats discoverability gaps when the user comes back two weeks later.
- **The Tailwind v4 line and the Phase 6 failure list only appear when relevant.** Drop the entire line if the condition isn't met — don't show empty bullets.

## Adjust mode (re-runs)

## Edge cases

## What this skill never does

This skill never:

- Silently mutates `next.config.ts` (always asks via Phase 5a).
- Silently mutates `.claude/settings.json` (always asks via Phase 5b).
- Silently mutates the root `CLAUDE.md` (always asks via Phase 5c).
- Touches files outside the Fogma surface (`app/fogma/`, `components/fogma/`, `lib/fogma/`, `app/api/fogma/`) without consent.
- Installs npm packages without consent — the always-on deps (`iconoir-react`, `clsx`, `motion`) are installed by `npx fogma init`; the opt-in deps (`@locator/runtime`, `@locator/webpack-loader`) are installed only after Phase 5a consent.
- Reverts user edits — re-runs are additive; if the user edited `fogma.config.ts`, adjust mode proposes deltas, never overwrites.
- Calls out to the network.

## Scaffolding templates
