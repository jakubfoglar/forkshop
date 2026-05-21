# Release-test loop — design

> Brainstormed 2026-05-21 between v0.4.0 ship and v0.4.1 cycle. Captures
> the three-surface model and the concrete work to make per-release QA
> a one-command flow.

## Problem

After shipping v0.4.0 we have one surface that's good at three jobs and bad at all of them:

- `apps/demo/` (workspace-linked engine) — useful for local dev, but masks any
  bug that only appears when Forkshop is installed from npm.
- `apps/docs/app/demo/` (WAVECLASH at forkshop.dev/demo) — needs to stay polished
  and hand-controlled; not a regression target.
- `apps/test/` (release-test fixture) — has placeholder pages and three trivial
  blocks; doesn't surface content-shaped bugs (the h-screen / fixed-viewport
  class of bug that took most of an afternoon to diagnose during v0.4.0).

Result: cutting a release means manually orchestrating multiple checks across
multiple surfaces, none of which faithfully exercises "what does a real user
get from `npx forkshop init`."

## The three surfaces

| Name | Purpose | Engine binding | Lifecycle |
|------|---------|----------------|-----------|
| `apps/demo/` | Local dev surface while editing engine source | Workspace-linked (`workspace:*`). HMR via root `pnpm dev`. | Long-lived. Whatever you point it at while iterating. |
| `apps/docs/app/demo/` | Public WAVECLASH marketing demo at forkshop.dev/demo | Workspace-linked (inherits from docs site). | Hand-maintained. Custom canvas placements live in `positions.json` (git-tracked) and survive engine updates. Engine API breakages surface via `pnpm check` and get patched manually — same flow we used during Phase F. |
| `apps/test/` | Release-test fixture — does the published Forkshop install + scaffold correctly against realistic content? | **Pinned to npm** (`@forkshop/engine: ^X.Y.Z`, not `workspace:*`). | Wiped + reinited per release via setup skill. Content is a one-time copy of WAVECLASH; the two surfaces diverge naturally after that. |

Names stay as-is — refactor cost outweighs the readability win, and the role
discipline (what each is *for*) is what actually changed.

## The release loop

After cutting a release (tag + CI publishes engine + CLI to npm):

```
pnpm test-release        # one new repo-root script
cd apps/test
claude                   # → "set up Forkshop"
pnpm dev                 # → eyeball localhost:3000/forkshop
```

`pnpm test-release` runs three steps internally:

1. `pnpm reset-test` — existing script, wipes `apps/test/app/forkshop/` etc.
2. `node scripts/bump-test-pins.mjs` — reads `packages/engine/package.json`'s
   `version`, rewrites `apps/test/package.json` so `@forkshop/engine` and
   `forkshop` both pin to `^<version>`.
3. `(cd apps/test && pnpm install)` — pulls those pinned versions from npm.
   This is the install-path regression check.

The interactive `claude` step then validates the setup skill against
realistic content (WAVECLASH). `pnpm dev` + eyeball validates that the
scaffold actually renders correctly under that content.

## Work to land

1. **Copy WAVECLASH content into `apps/test/`** (one-time, ~22 files):
   - `apps/test/components/blocks/*` ← `apps/docs/app/demo/_components/blocks/*`
     (14 block files + `index.ts` barrel)
   - `apps/test/components/ui/*` ← `apps/docs/app/demo/_components/ui/*`
     (7 UI primitive files + `index.ts` barrel; **replaces** the current
     generic button/badge/input)
   - `apps/test/app/page.tsx` ← `apps/docs/app/demo/site/page.tsx`
     (WAVECLASH home — the page Forkshop's Boards visit)
   - `apps/test/app/globals.css` — merge in WAVECLASH typography rules
   - Drop `apps/test/app/{about,contact,pricing}/` (or keep one for Sitemap
     coverage — decide during implementation)
   - Update `apps/test/package.json` deps if WAVECLASH pulls in new font /
     icon packages (audit during implementation)
2. **`pnpm test-release` script** at repo root.
3. **`scripts/bump-test-pins.mjs`** — small Node script, deterministic rewrite
   of `apps/test/package.json`'s two pinned deps.
4. **`apps/test/README.md`** — three-line documentation of the loop.

After this lands, every future Forkshop release exercises:
- ✓ npm install path (catches publish / token / dep-resolution bugs)
- ✓ Setup skill against fresh state (catches scaffold drift / template bugs)
- ✓ Setup skill produces working app (catches engine API regressions in the
  canonical pattern)
- ✓ Eyeball under realistic content (catches behavior bugs like the v0.4.0
  `h-screen` / `fixed inset-0` chain — the kind of bug only real content
  surfaces)

## Non-goals for this spec

- **Automated visual regression / CI screenshot diffing.** Eyeball-once-per-release
  is the right cost ceiling for a side-income project. Revisit if release
  frequency goes up.
- **Syncing apps/test ↔ WAVECLASH on an ongoing basis.** One-time copy.
  Surfaces diverge as you tweak each for its own purpose; that's the point.
- **Renaming `apps/docs/` → `apps/web/`.** Naming is slightly misleading but
  refactor cost (package.json names, internal imports, deploy config) outweighs
  the gain. Defer.

## Related (separate v0.4.1 items, not in this spec)

- **Scope `--forkshop-*` CSS vars off `:root`** — currently leak globally
  via `packages/engine/tailwind/forkshop.css`. Move to
  `[data-forkshop-mount], .forkshop-scope { ... }`. Audit portaled overlays
  (e.g. `EditorLink`) for `.forkshop-scope` className. Tailwind utility
  classes are already namespaced; this is the one remaining leak vector.
- **Update `apps/docs/app/(marketing)/docs/extending/page.mdx`** — flagged
  during v0.4.0 release as still referencing the deleted `DesignSystemView` /
  `ResponsiveFrameView` API. Rewrite for the new contract.
- **Repo root `README.md`** — quick refresh for v0.4.0 state.
