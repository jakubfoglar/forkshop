# `forkshop init` auto-installs the engine — design

Date: 2026-05-19
Status: Approved — draft v0

## Goal

After `npx forkshop init` finishes, the project is ready for "set up Forkshop" with no manual `pnpm install` step in between.

Today: init adds `@forkshop/engine` to `package.json` and prints a hint telling the user to run install themselves. If they skip that and jump straight into Claude Code, the setup skill correctly bails in Phase 0 with `"Forkshop's engine package isn't installed."` — interrupting the flow that's supposed to feel like a one-shot scaffold.

The fix: init runs `<pm> install` itself after writing scaffold files, matching the `create-next-app` convention and matching what the repo's own `CLAUDE.md` already (incorrectly) claims init does.

## Non-goals

- Workspace / monorepo install nuances. `detectPackageManager` already returns the right PM; we let `<pm> install` handle workspace context.
- Switching from Node's `child_process` to `execa` or `cross-spawn` — no new dep.
- Rolling back scaffold files when install fails. Files stay; user retries install manually.
- Changing the setup skill's Phase 0 bail. It remains as a safety net for the `--no-install` / install-failure cases.
- Auto-installing optional packages (e.g., the Locator loader). Those stay opt-in via the setup skill.

## Architecture

One edit to one file, plus a CLI flag and tests:

```
packages/cli/src/
├── commands/init.ts          ← new step 13 runs `<pm> install`; replaces trailing hint
├── commands/init.test.ts     ← three new cases (mocked spawnSync)
└── (CLI entry parses --no-install into InitOptions.skipInstall)
```

No new files. No new deps. The package-manager detection (`detectPackageManager`) and `addedDeps` tracking are already in place.

## Implementation sketch

In `init.ts`, after step 12 (`writeForkshopJson`) and before the closing summary, add:

```ts
// 13. Install engine deps (unless --no-install)
if (addedDeps.length > 0 && !options.skipInstall) {
  const pm = await detectPackageManager(projectRoot)
  console.log(pc.dim(`\nInstalling @forkshop/engine via ${pm}...`))
  const result = spawnSync(pm, ["install"], {
    cwd: projectRoot,
    stdio: "inherit",
  })
  if (result.status !== 0) {
    console.error(
      pc.red(`\n${pm} install failed. Scaffold files are in place — re-run \`${pm} install\` to retry.`)
    )
    return { ok: false }
  }
}
```

All four detected managers (`npm`, `pnpm`, `yarn`, `bun`) accept `<pm> install` as a no-arg refresh.

Remove the existing trailing hint (lines ~179–192 in `init.ts`):

```ts
if (addedDeps.length > 0) {
  // ... "Run pnpm install to fetch it"
}
```

It's wrong once we install ourselves. The "Next steps" block ("type 'set up Forkshop' in Claude Code") stays.

## CLI surface

- `forkshop init` — auto-installs (new behavior).
- `forkshop init --no-install` — new flag. Skips the install for CI / scripted contexts. Falls back to today's "run install manually" hint.
- `forkshop init --force` — unchanged.

The setup skill's Phase 0 check is unaffected. When someone uses `--no-install`, they're expected to install before invoking the skill, and the existing bail message guides them.

## Ordering and failure modes

File writes (steps 1–12) happen before install. Order matters because:

- If install fails, the scaffold layer is complete; user runs `<pm> install` to recover.
- `forkshop.json` correctly records the scaffold install (it tracks file checksums, not npm state).
- The producer-pack writes (`.claude/hooks/...`, `.claude/settings.json`) finish before the long-running install — keeps file mutations atomic.

Failure exits non-zero so CI / scripts detect it. No rollback — surprising the user with deleted files is worse than a missing `node_modules`.

## Tests

In `packages/cli/src/commands/init.test.ts`, mock `spawnSync` from `node:child_process` and add:

1. **Install is invoked.** After init completes successfully, assert `spawnSync` was called once with the detected PM and `["install"]`, `cwd` = `projectRoot`.
2. **`--no-install` skips it.** Run init with `skipInstall: true`; assert `spawnSync` was not called and the legacy "Run `<pm> install`" hint is printed.
3. **Install failure surfaces.** Mock `spawnSync` to return `{ status: 1 }`; assert `init()` returns `{ ok: false }` and the error message contains the retry command.

Existing tests need a tweak: any test exercising the happy path needs `skipInstall: true` (or a default `spawnSync` mock returning `{ status: 0 }`) so the test suite doesn't try to run a real install in the fixture directory.

## Doc updates

- **Repo `CLAUDE.md` line ~64** — change `runs \`<pm> add @forkshop/engine\`` → `runs \`<pm> install\` after merging \`@forkshop/engine\` into package.json`.
- **`apps/docs/app/docs/cli/page.mdx`** and **`apps/docs/app/docs/getting-started/page.mdx`** — verify they describe init's behavior accurately. If either claims `init` is a no-op for installs, fix it.
- **`packages/engine/src/skill/setup.md` Phase 0** — no change to the bail message itself, but consider a short note in the Phase 0 preface acknowledging that init usually handles the install (so the skill only bails when something genuinely went wrong or when `--no-install` was used).

## Verification

After implementing, the dogfood loop is:

```bash
pnpm reset-test
cd apps/test
npx forkshop init       # should install @forkshop/engine end-to-end
# open Claude Code, say "set up Forkshop"
# Phase 0 should NOT bail; flow should proceed past preconditions
```

Run from the published CLI once shipped — re-test against the real package on npm, not the local workspace fixture, since workspace symlinks may mask install issues.

## Release

Patch bump on the CLI (`forkshop@0.1.1` or whatever the next patch is). Engine version unchanged. No coordinated release with the engine package.
