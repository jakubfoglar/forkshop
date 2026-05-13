---
name: fogma-setup
description: Wires Fogma into a Next.js + Tailwind project after `npx fogma init`. Detects project type, scans components and routes, proposes a sidebar, asks before mutating next.config.ts / .claude/settings.json / root CLAUDE.md, writes per-board files, populates fogma.config.ts. Activates on "set up Fogma", "finish Fogma setup", "configure Fogma", "wire up Fogma".
---

# Fogma — first-run setup

You are setting up Fogma in the user's project. The CLI (`npx fogma init`) has already dropped Fogma's source files (primitives, kits, fonts, API routes, an empty `fogma.config.ts` stub, and a CLAUDE.md). Your job is to walk the user through the *configuration* — what their Fogma's sidebar contains, which kits power each section, and which opt-in features to install — then write the per-board files and populate `fogma.config.ts`.

You run **once** per project. After this, your work is mostly historical: the user reads `app/fogma/CLAUDE.md` for ongoing customization, the sibling `fogma-live-editing` skill auto-applies when Claude edits Fogma-watched files, and the user-invoked `fogma-doc-sync` skill refreshes documentation if it drifts.

The user owns every file you produce. They will fork freely. This file (the skill itself) is in their repo too — they can edit it. Lean toward shorter outputs, explicit user consent on every config mutation, and language that frames Fogma as something they *have*, not something they *use*.

## Phase 0 — Read preconditions

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
