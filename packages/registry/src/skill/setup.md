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
