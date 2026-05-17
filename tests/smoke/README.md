# Forkshop CLI install smoke fixture

This fixture exercises `forkshop init` against a fresh `pnpm create next-app`
output. It's not a dev surface — touched only by CI and manual smoke runs.

## What it covers

- Packs `packages/cli/` and `packages/engine/` as tarballs.
- Creates `/tmp/forkshop-smoke-<timestamp>/`, runs `pnpm create next-app .`.
- Installs the packed CLI tarball; runs `npx forkshop init`.
- Asserts every file in `expected-files.txt` exists.
- Asserts `package.json` includes `@forkshop/engine`.
- Runs `pnpm install` and `pnpm build`. Build must succeed.

## How to run

    bash tests/smoke/run-smoke.sh

Exits 0 on success, non-zero on any assertion failure.

Set `KEEP_SMOKE=1` in the environment to retain the temp directory after
the run for inspection.

## When does CI run it

CI wiring is deferred until a `.github/workflows/ci.yml` exists for the
repo. When that lands, add a `smoke` job that runs on PRs touching
`packages/cli/` or `packages/engine/`. Until then, run the smoke locally
before cutting a release.
