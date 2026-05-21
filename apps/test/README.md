# Forkshop release-test fixture

A real Next.js app with placeholder content + stress-test blocks. The
`package.json` pins `@forkshop/engine` and `forkshop` to specific npm
versions (not workspace links), so installs here exercise the same path
real users get from `npx forkshop init`.

## Release-test loop

After cutting a Forkshop release (tag + CI publish):

```
pnpm test-release       # from repo root: reset + repin + install
cd apps/test
claude                  # → "set up Forkshop"
pnpm dev                # → eyeball http://localhost:3001/forkshop
```

`pnpm test-release` runs three steps:
1. `pnpm reset-test` — wipe `app/forkshop/`, `forkshop.json`, scaffold artifacts
2. `node scripts/bump-test-pins.mjs` — repin `@forkshop/engine` + `forkshop` to current engine version
3. `(cd apps/test && pnpm install)` — pull pinned versions from npm (install-path regression check)

## What this catches

- **npm install path** (publish / token / dep-resolution bugs)
- **Setup skill against fresh state** (scaffold drift, template bugs)
- **Setup skill produces a working app** (engine API regressions in the canonical pattern)
- **Edge-case rendering** via two stress-test blocks:
  - `viewport-hero` (uses `min-h-screen`) — regression-tests the engine's CSS injection that neutralizes viewport-height classes inside iframes
  - `tall-feature` (20 vertical sections) — regression-tests Gallery's auto-growth chain past `DEFAULT_INITIAL_HEIGHT`

## Why stress-test blocks instead of full WAVECLASH content

WAVECLASH lives at forkshop.dev/demo and stays hand-controlled as the
marketing surface. apps/test is QA-focused: targeted blocks that
exercise the bug classes that have bitten releases. Both surfaces evolve
independently. If you ever need full-WAVECLASH realism, run `npx
create-next-app` in a scratch dir and paste content there — but for
catching the regressions we've actually seen, the stress-test fixture
is sufficient.

## What's NOT in here (and stays not-in)?

- `app/forkshop/`, `app/api/forkshop/`, `forkshop.json`, `.claude/skills/forkshop-*`,
  `.claude/hooks/forkshop-*` — these are init/setup-skill outputs and intentionally
  gitignored. Run `pnpm reset-test` to clean up after a test cycle.
