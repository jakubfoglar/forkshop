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

## Phase 3 — Build the consolidated proposal

## Phase 4 — Iterate

## Phase 5 — Consent for config mutations

## Phase 6 — Write the artifacts

## Phase 7 — Final summary

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
