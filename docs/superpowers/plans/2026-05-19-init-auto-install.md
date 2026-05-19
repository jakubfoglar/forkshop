# `forkshop init` auto-installs the engine — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `forkshop init` run `<pm> install` itself after merging `@forkshop/engine` into `package.json`, eliminating the friction step before the user runs "set up Forkshop" in Claude Code.

**Architecture:** One new step in `packages/cli/src/commands/init.ts` (step 13: spawn the detected package manager). One new CLI flag (`--no-install`) in `packages/cli/src/index.ts` for CI / scripted use. Tests mock `node:child_process.spawnSync` so they don't run real installs. Doc updates in `CLAUDE.md`, two docs MDX pages, and the setup skill preface.

**Tech Stack:** Node.js `child_process.spawnSync`, vitest with `vi.mock`, commander.

**Spec:** `docs/specs/2026-05-19-init-auto-install-design.md`

---

### Task 1: Add `spawnSync` mock infrastructure to existing test file

This is a pre-step. The CLI doesn't currently call `spawnSync`, but every subsequent task assumes a mock is in place so the suite stays hermetic. Adding the mock now (returning `{ status: 0 }` by default) is a no-op for existing tests.

**Files:**
- Modify: `packages/cli/src/commands/init.test.ts:1-7` (imports) and `:78-90` (beforeEach/afterEach)

- [ ] **Step 1: Add `spawnSync` mock at the top of the test file**

Add after the existing imports (around line 6):

```ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runInit } from "./init.js"
import type { Manifest } from "../manifest-schema.js"

// Hoisted so the factory runs before `runInit` imports child_process.
const spawnSyncMock = vi.hoisted(() =>
  vi.fn().mockReturnValue({ status: 0, stdout: "", stderr: "", pid: 0, output: [], signal: null })
)

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process")
  return { ...actual, spawnSync: spawnSyncMock }
})
```

Then update the existing `beforeEach` block (currently lines 78-85) to reset the mock:

```ts
beforeEach(() => {
  // Mock fetch for the font binary
  const payload = new Uint8Array([0x77, 0x4f, 0x46, 0x32])
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => payload.buffer,
  } as unknown as Response)
  spawnSyncMock.mockClear()
  spawnSyncMock.mockReturnValue({ status: 0, stdout: "", stderr: "", pid: 0, output: [], signal: null })
})
```

- [ ] **Step 2: Run the existing test suite to confirm it still passes**

Run: `pnpm --filter forkshop test`
Expected: All 6 existing tests still pass. Mock is in place but inert (init doesn't call spawnSync yet).

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/init.test.ts
git commit -m "test(cli): hoisted spawnSync mock for upcoming init auto-install"
```

---

### Task 2: Implement engine auto-install (happy path)

TDD: write the failing test first, then add step 13 in `init.ts`.

**Files:**
- Modify: `packages/cli/src/commands/init.test.ts` (add test in the existing `describe` block)
- Modify: `packages/cli/src/commands/init.ts:174-195` (replace summary block)

- [ ] **Step 1: Write the failing test**

Add inside the `describe("runInit (v2)")` block, after the existing happy-path test:

```ts
it("runs the detected package manager install after writing scaffold", async () => {
  const root = await setupProject()
  dirs.push(root)
  const result = await runInit({
    projectRoot: root,
    manifest: fakeManifest(),
  })
  expect(result.ok).toBe(true)
  expect(spawnSyncMock).toHaveBeenCalledTimes(1)
  const [cmd, args, opts] = spawnSyncMock.mock.calls[0]
  expect(cmd).toBe("npm") // fixture has no lockfile → detectPackageManager falls back to npm
  expect(args).toEqual(["install"])
  expect(opts).toMatchObject({ cwd: root, stdio: "inherit" })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter forkshop test -t "runs the detected package manager install"`
Expected: FAIL — `spawnSyncMock` was called 0 times.

- [ ] **Step 3: Add `spawnSync` import and step 14 in `init.ts`**

In `packages/cli/src/commands/init.ts`, add a top-level import alongside the existing `node:` imports (after line 2):

```ts
import { spawnSync } from "node:child_process"
```

Then replace lines 174-195 (the existing summary block) with:

```ts
  // 13. Summary
  console.log(pc.green(`\nInstalled ${allPlan.length} files into your project.`))
  if (pack.installed) {
    console.log(pc.dim(`Claude Code live-AI hook installed to .claude/hooks/forkshop-post-tool-use.sh`))
  }

  // 14. Run package manager install (unless --no-install)
  if (addedDeps.length > 0) {
    const pm = await detectPackageManager(projectRoot)
    console.log(pc.dim(`\nInstalling @forkshop/engine via ${pm}...`))
    const result = spawnSync(pm, ["install"], { cwd: projectRoot, stdio: "inherit" })
    if (result.status !== 0) {
      console.error(
        pc.red(
          `\n${pm} install failed. Scaffold files are in place — re-run \`${pm} install\` manually to retry.`
        )
      )
      return { ok: false, reason: `${pm} install exited with status ${result.status ?? "unknown"}` }
    }
  }

  console.log("\nNext steps:")
  console.log("  1. Open Claude Code in this project and type 'set up Forkshop' to finish wiring.")
  console.log("  2. Or read `app/forkshop/CLAUDE.md` to extend Forkshop by hand.")

  return { ok: true }
}
```

The hoisted `vi.mock` from Task 1 intercepts the top-level import — no need for dynamic imports.

- [ ] **Step 4: Run the new test to confirm it passes**

Run: `pnpm --filter forkshop test -t "runs the detected package manager install"`
Expected: PASS

- [ ] **Step 5: Run the full CLI test suite to confirm nothing regressed**

Run: `pnpm --filter forkshop test`
Expected: All existing tests + the new one pass. The existing happy-path test now also indirectly verifies the install step runs without affecting outcomes (because the mock returns `{ status: 0 }`).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/commands/init.test.ts
git commit -m "feat(cli): init auto-runs <pm> install after merging engine into package.json"
```

---

### Task 3: Add `--no-install` flag (skipInstall option)

Adds opt-out for CI / scripted use.

**Files:**
- Modify: `packages/cli/src/commands/init.ts:23-29` (InitOptions interface) and the install block from Task 2
- Modify: `packages/cli/src/commands/init.test.ts` (add test)

- [ ] **Step 1: Write the failing test**

Add inside the same `describe` block:

```ts
it("skips install when skipInstall is true and prints the manual command", async () => {
  const root = await setupProject()
  dirs.push(root)
  const logs: string[] = []
  const originalLog = console.log
  console.log = (msg: string) => { logs.push(String(msg)) }
  try {
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
      skipInstall: true,
    })
    expect(result.ok).toBe(true)
  } finally {
    console.log = originalLog
  }
  expect(spawnSyncMock).not.toHaveBeenCalled()
  expect(logs.some((l) => /run.*npm install/i.test(l))).toBe(true)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter forkshop test -t "skips install when skipInstall"`
Expected: FAIL — either a type error (`skipInstall` not on `InitOptions`) or the mock is called anyway.

- [ ] **Step 3: Add `skipInstall` to InitOptions**

In `packages/cli/src/commands/init.ts:23-29`, change:

```ts
export interface InitOptions {
  projectRoot: string
  manifest?: Manifest                 // injected by tests; production uses fetchManifest
  registryUrl?: string
  force?: boolean
  installClaudePack?: boolean         // opt-in: writes hook + settings.json
  skipInstall?: boolean               // opt-out: skip `<pm> install` (for CI / scripted use)
}
```

And in the destructuring at line 36:

```ts
const { projectRoot, force = false, installClaudePack: cliFlag, skipInstall = false } = options
```

- [ ] **Step 4: Gate the install block on `!skipInstall` and print the manual hint when skipped**

Replace the Task 2 install block with:

```ts
  // 14. Run package manager install (unless --no-install)
  if (addedDeps.length > 0) {
    const pm = await detectPackageManager(projectRoot)
    if (skipInstall) {
      const installCmd =
        pm === "pnpm"
          ? "pnpm install"
          : pm === "yarn"
            ? "yarn"
            : pm === "bun"
              ? "bun install"
              : "npm install"
      console.log(
        pc.dim(`\nAdded \`@forkshop/engine\` to package.json. Run \`${installCmd}\` to fetch it.`)
      )
    } else {
      console.log(pc.dim(`\nInstalling @forkshop/engine via ${pm}...`))
      const result = spawnSync(pm, ["install"], { cwd: projectRoot, stdio: "inherit" })
      if (result.status !== 0) {
        console.error(
          pc.red(
            `\n${pm} install failed. Scaffold files are in place — re-run \`${pm} install\` manually to retry.`
          )
        )
        return { ok: false, reason: `${pm} install exited with status ${result.status ?? "unknown"}` }
      }
    }
  }
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm --filter forkshop test -t "skips install when skipInstall"`
Expected: PASS

- [ ] **Step 6: Run the full CLI suite**

Run: `pnpm --filter forkshop test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/commands/init.test.ts
git commit -m "feat(cli): add --no-install opt-out (InitOptions.skipInstall)"
```

---

### Task 4: Install-failure path returns `{ ok: false }`

**Files:**
- Modify: `packages/cli/src/commands/init.test.ts` (add test)

The implementation is already in place from Task 2. This task just adds a test that exercises the failure branch via the mock.

- [ ] **Step 1: Write the failing test**

Add inside the same `describe` block:

```ts
it("returns {ok: false} when the package manager install exits non-zero", async () => {
  spawnSyncMock.mockReturnValueOnce({
    status: 1,
    stdout: "",
    stderr: "npm error",
    pid: 0,
    output: [],
    signal: null,
  })
  const root = await setupProject()
  dirs.push(root)
  const errors: string[] = []
  const originalError = console.error
  console.error = (msg: string) => { errors.push(String(msg)) }
  try {
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/install exited/i)
  } finally {
    console.error = originalError
  }
  expect(errors.some((l) => /install failed/i.test(l))).toBe(true)
  expect(errors.some((l) => /re-run.*install/i.test(l))).toBe(true)
})
```

- [ ] **Step 2: Run the test to confirm it passes (implementation already exists from Task 2)**

Run: `pnpm --filter forkshop test -t "returns .ok: false. when the package manager install"`
Expected: PASS — the failure check from Task 2 already short-circuits with `ok: false`.

If it fails, double-check that Task 2's install block correctly returns `{ ok: false, reason: ... }` on non-zero exit.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/init.test.ts
git commit -m "test(cli): cover install-failure exit path"
```

---

### Task 5: Wire `--no-install` into the CLI entrypoint

**Files:**
- Modify: `packages/cli/src/index.ts:25-44` (init command block)

- [ ] **Step 1: Add `--no-install` option and pass `skipInstall` to `runInit`**

In `packages/cli/src/index.ts`, replace the `program.command("init")` block (lines 25-44):

```ts
program
  .command("init")
  .description("Install Forkshop into the current project.")
  .option("--force", "Overwrite existing files on collision")
  .option("--registry <url>", "Override the registry base URL")
  .option("--install-claude-pack", "Install the Claude Code live-AI hook (default: skip)")
  .option("--no-install", "Skip running your package manager (CI / scripted use)")
  .action(async (opts) => {
    const result = await runInit({
      projectRoot: process.cwd(),
      force: opts.force,
      registryUrl: opts.registry,
      installClaudePack: opts.installClaudePack === true,
      skipInstall: opts.install === false,
    })
    if (!result.ok) {
      console.error(pc.red(result.reason))
      process.exit(2)
    }
  })
```

Commander automatically converts `--no-install` to `opts.install` (boolean, defaults `true`). When `--no-install` is passed, `opts.install === false`, which maps to `skipInstall: true`.

- [ ] **Step 2: Build the CLI and smoke-test the flag is registered**

Run: `pnpm --filter forkshop build && node packages/cli/dist/index.js init --help`
Expected: Output includes a line for `--no-install` and a line for `--install-claude-pack`.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat(cli): wire --no-install flag through to runInit"
```

---

### Task 6: Update repo `CLAUDE.md`

The repo's own `CLAUDE.md` already claims init "runs `<pm> add @forkshop/engine`" — which was never true. Make it match reality.

**Files:**
- Modify: `CLAUDE.md` (the line under `packages/cli` describing init)

- [ ] **Step 1: Update the init description**

Find this line in `CLAUDE.md` (around line 64):

```
- `forkshop init` — detects the user's package manager, runs `<pm> add @forkshop/engine`,
  drops a thin scaffold layer (~8 files + 1 binary: skill files, route stubs, font,
  CLAUDE.md) into the user's project, appends the CSS import to `globals.css`, and writes
  a slim `forkshop.json` lock recording the engine version and scaffold file checksums.
  Does not copy engine source — engine ships from npm.
```

Replace with:

```
- `forkshop init` — drops a thin scaffold layer (~8 files + 1 binary: skill files, route
  stubs, font, CLAUDE.md) into the user's project, appends the CSS import to `globals.css`,
  merges `@forkshop/engine` into `package.json`, runs `<pm> install` via the detected
  package manager (skip with `--no-install`), and writes a slim `forkshop.json` lock
  recording the engine version and scaffold file checksums. Does not copy engine source —
  engine ships from npm.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(repo): describe init's auto-install behavior accurately"
```

---

### Task 7: Update public docs (CLI and Getting Started pages)

Both pages currently emphasize "init does **not** install your deps." Flip that.

**Files:**
- Modify: `apps/docs/app/docs/cli/page.mdx:17-42`
- Modify: `apps/docs/app/docs/getting-started/page.mdx:6-8, 25-62`

- [ ] **Step 1: Update `cli/page.mdx` — the "Behavior" list and the flag table**

Replace step 6 and step 7 (lines 28-31) and the table block (lines 34-38) and the post-table line (40-42):

```mdx
6. Merges `@forkshop/engine` into `package.json` `dependencies` and
   runs your detected package manager's install. Pass `--no-install`
   to skip this step in CI / scripted contexts.
7. Optionally installs the Claude Code producer pack (see below).
8. Writes `forkshop.json`.

| Flag                     | Description                                                  |
|--------------------------|--------------------------------------------------------------|
| `--force`                | Overwrite existing files. Use after a half-finished install. |
| `--registry <url>`       | Use an alternate registry URL.                               |
| `--no-install`           | Skip running your package manager. Print the manual command instead. |
| `--install-claude-pack`  | Drop `.claude/hooks/forkshop-post-tool-use.sh` and register it in `.claude/settings.json`. See [Live AI agents](/docs/live-ai-agents). |

After `init`, open Claude Code and say "set up Forkshop" — the
setup skill scaffolds your first Board and wires `next.config.*`
for the locator.
```

- [ ] **Step 2: Update `getting-started/page.mdx` — opening paragraph and "Finish the setup" section**

Replace the opening (lines 6-8):

```mdx
`npx forkshop init` scaffolds the file layer Forkshop needs into an
existing Next.js project and installs `@forkshop/engine` via your
package manager. After it finishes, open Claude Code and say "set up
Forkshop" — that's the only remaining step.
```

Replace the "What it does" list ending (lines 42-47) — change step 6 and remove the trailing "Init does **not** invoke..." paragraph:

```mdx
6. Merges `@forkshop/engine` into your `package.json` `dependencies`
   and runs `<pm> install` (pnpm, npm, yarn, or bun, detected from your
   lockfile). Pass `--no-install` to skip this step.
7. Writes `forkshop.json` — engine version, scaffold checksums,
   installed bundles.
```

Replace "Finish the setup" (lines 49-61) with:

```mdx
## Finish the setup

Open Claude Code in the project and say **"set up Forkshop."** The
setup skill (dropped by init in step 4) scaffolds your first Board,
wires the locator loader into `next.config.*`, and detects your
existing primitives and routes. It's the part init deliberately
doesn't do.

Then start your dev server and open `/forkshop`.
```

- [ ] **Step 3: Run the registry validator (catches placeholder leaks if you touched skill files later)**

Run: `pnpm --filter docs validate-registry`
Expected: Exit 0, no placeholder warnings. (This step is mostly insurance against accidental edits; the MDX changes shouldn't trigger it.)

- [ ] **Step 4: Commit**

```bash
git add apps/docs/app/docs/cli/page.mdx apps/docs/app/docs/getting-started/page.mdx
git commit -m "docs(site): init auto-installs; document --no-install flag"
```

---

### Task 8: Soften the setup skill's Phase 0 preface

The Phase 0 bail message stays — it's still useful when someone used `--no-install` or hit an install failure — but the preface should acknowledge that init usually handles install now, so this branch is the exception.

**Files:**
- Modify: `packages/engine/src/skill/setup.md` (Phase 0 section, around the "engine not installed" edge case at line ~598)

- [ ] **Step 1: Add a one-line note before the bail message**

Find the section (around line 598):

```markdown
### `@forkshop/engine` missing (engine not installed)

If the engine package isn't found in `node_modules/@forkshop/engine`, exit:

> *"Forkshop's engine package isn't installed. Run `pnpm install` (or your package manager's equivalent) and try again."*
```

Replace with:

```markdown
### `@forkshop/engine` missing (engine not installed)

`forkshop init` runs the user's package manager automatically, so this state usually means init was run with `--no-install` or the install failed. If the engine package isn't found in `node_modules/@forkshop/engine`, exit:

> *"Forkshop's engine package isn't installed. Run `pnpm install` (or your package manager's equivalent) and try again."*
```

- [ ] **Step 2: Run the registry validator**

Run: `pnpm --filter docs validate-registry`
Expected: Exit 0, no placeholder warnings.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "docs(skill): note that init handles install automatically"
```

---

### Task 9: Workspace-wide verification

**Files:** (none modified — verification only)

- [ ] **Step 1: Run typecheck across the workspace**

Run: `pnpm typecheck`
Expected: PASS, no errors.

- [ ] **Step 2: Run lint across the workspace**

Run: `pnpm lint`
Expected: PASS, no errors.

- [ ] **Step 3: Run the CLI tests once more**

Run: `pnpm --filter forkshop test`
Expected: All tests pass, including the three new ones from Tasks 2-4.

- [ ] **Step 4: If anything fails, fix and commit**

If a typecheck or lint error surfaces (e.g., an unused import after removing the trailing hint, or a stale type narrowing), fix it inline and commit:

```bash
git add <changed files>
git commit -m "fix(cli): <specific fix>"
```

If all three pass, no commit needed.

---

## Out of scope

These were considered and explicitly left out per the spec:

- Workspace / monorepo install nuances (e.g., pnpm `--filter`). `detectPackageManager` already returns the right PM; `<pm> install` handles workspace context.
- Switching from `node:child_process` to `execa` / `cross-spawn`. No new dep.
- Rolling back scaffold files on install failure. Files stay; user retries manually.
- Changing the setup skill's bail message itself (only the preface gets a note).
- Auto-installing optional packages like the Locator loader. Those stay opt-in via the setup skill.

## Release

After all tasks: bump `packages/cli/package.json` version to the next patch (e.g., `0.1.1`), tag `v0.1.1`, push tags. The release workflow at `.github/workflows/release.yml` handles npm publish. Engine version unchanged.
