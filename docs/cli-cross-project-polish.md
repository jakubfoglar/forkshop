# Forkshop CLI — Cross-Project Install Polish Round

Date: 2026-05-14
Status: Open — needs implementation

## What this is

Bugs surfaced by testing `forkshop init` + `set up Forkshop` against real-world projects (beyond the original cold-fixture `create-next-app` baseline). Each one only manifests outside the simplest possible project shape — the playground monorepo and the bare fixture both pass; real projects expose these.

Two real projects tested so far:

1. **influencers-scrapers** — a pnpm monorepo. Next.js app at `packages/frontend/`.
2. **ravineo-playground/site** — a single-app Next.js project using the `src/` convention (`pnpm create next-app --src-dir` shape).

Both passed the file-drop step. Both broke at later steps for different reasons. This document captures those reasons.

---

## Bug A — Dep-install step is fragile across host pnpm setups

**Where:** `packages/cli/src/` — the post-file-write step that runs `pnpm add 'clsx@^2.1.1' 'motion@^11.0.0' 'lucide-react@^1.14.0' '@locator/runtime@^0.5.1'`.

**Severity:** High. Hit 2 of 2 real-world projects tested. Breaks the "it just works" promise of `npx forkshop init`.

### Symptom 1 (influencers-scrapers)

User's machine has Node 20.16.0 with corepack-managed pnpm. Corepack tries to download a pnpm version to verify signature, hits stale signing keys:

```
Error: Cannot find matching keyid: {"signatures":[{"sig":"...","keyid":"SHA256:..."}], ...}
    at verifySignature (corepack.cjs:21535:47)
    at installVersion (corepack.cjs:21882:7)
```

Files are written successfully ("Installed 57 files into your project."). The dep install command crashes. CLI prints "Package install failed. Files are written. Retry manually:" — but the retry command hits the same error.

### Symptom 2 (ravineo-playground/site)

User's machine has Node 20.16.0 with a globally-installed pnpm@latest (>= 10.32.1). The latest pnpm uses `node:sqlite` which is built into Node 22+ but not Node 20:

```
warn: This version of pnpm requires at least Node.js v22.13
warn: The current version of Node.js is v20.16.0
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
    at Module._load (node:internal/modules/cjs/loader:979:13)
```

Same outcome: 57 files written, dep install crashes.

### Root cause

The CLI blindly invokes `pnpm add ...` with whatever pnpm is globally installed on the user's machine. This couples Forkshop to:

- Whatever pnpm version the user has
- Whether corepack manages it (and whether corepack's signing keys are current)
- Whether the pnpm version is compatible with the user's Node version
- Whether the user even uses pnpm (vs npm, yarn, bun)

Each of these is fragility surface that's not Forkshop's problem to solve but is currently Forkshop's problem to absorb.

### Fix options (preferred → least preferred)

**Option 1 (recommended): Don't invoke `pnpm add` at all.**

Have the CLI write the deps directly into the project's `package.json` (modify `dependencies` and `devDependencies` JSON keys), then print:

```
Forkshop files installed. Run your usual install command to fetch deps:
  pnpm install  (or npm install / yarn / bun install)
```

Simple. Robust. Universally compatible. Loses a small amount of magic (the user has to type one more command); gains a lot of reliability. No coupling to any pm.

**Option 2: Detect package manager from lockfile, try matching install command.**

- `pnpm-lock.yaml` exists → try `pnpm add`
- `package-lock.json` exists → `npm install <deps>`
- `yarn.lock` exists → `yarn add`
- `bun.lockb` exists → `bun add`
- None → fall back to Option 1

More effort, more code paths, more failure modes. Marginal benefit over Option 1.

**Option 3: Try `pnpm add` once, fall back to Option 1 on any failure.**

If `pnpm add` fails for any reason (corepack issue, Node version mismatch, anything), catch the error and fall back to writing deps to `package.json` + printing the manual install command. Doesn't fully escape the coupling but degrades gracefully.

### Recommendation

**Implement Option 1.** The dep install is automation convenience; it's not load-bearing. Writing to `package.json` is universally compatible. The cost is one extra `pnpm install` command for the user; the benefit is zero pm-related install failures.

### Also fix while we're in there

The "Package install failed. Files are written. Retry manually:" prompt is misleading when the retry command hits the same error. Either:

- Drop the retry prompt entirely if we're going with Option 1 (no retry needed)
- Or: detect the root cause (corepack / Node version / missing pm) and suggest a real fix, not just the same broken command

---

## Bug B — CLI assumes flat project layout, breaks on `src/` convention

**Where:** `packages/cli/src/` — the destination resolver (the code that decides where `app/forkshop/`, `components/forkshop/`, `lib/forkshop/`, and `app/api/forkshop/` should land).

**Severity:** High. Will hit any project scaffolded with `pnpm create next-app --src-dir` (a very common Next.js convention). Manifests as broken imports the moment the user tries `pnpm dev`.

### Symptom

In a project where `tsconfig.json`'s `compilerOptions.paths` maps `@/*` to `./src/*`, the CLI installs files at the project root:

```
site/
├── app/forkshop/                   ← installed here (WRONG)
├── components/forkshop/            ← installed here (WRONG)
├── lib/forkshop/                   ← installed here (WRONG)
├── app/api/forkshop/               ← installed here (WRONG)
└── src/
    ├── app/                        ← project's actual app code
    ├── components/                 ← project's actual components
    └── lib/                        ← project's actual lib
```

The project's tsconfig maps `@/*` → `./src/*`, so Forkshop's internal imports like `import { CanvasNode } from "@/components/forkshop/canvas/canvas-node"` resolve to `./src/components/forkshop/canvas/canvas-node` — which doesn't exist because the files actually landed one directory up.

Setup-skill's Phase 0 preconditions check (or wherever the skill scans the project) detects this mismatch and pauses, asking the user whether to move files under `src/` or add a separate alias. The "move files under src/" workaround works but should not be necessary — the CLI should have put them in the right place from the start.

### Root cause

The CLI's destination resolver doesn't read the project's `tsconfig.json` to learn where the `@/*` alias points. It assumes `@/*` is always at the project root.

### Fix

In the CLI's destination resolver (the function that maps registry file paths like `app/forkshop/page.tsx` to user-project paths):

1. Read the user-project's `tsconfig.json`. Parse `compilerOptions.paths`.
2. Find the `@/*` alias. Note its value:
   - If `["./*"]` (or absent) → use the current behavior (install at project root)
   - If `["./src/*"]` → prepend `src/` to all destination paths
   - Anything else → warn and let the user choose
3. Apply the prefix consistently across all 4 destination roots (`app/`, `components/`, `lib/`, `app/api/`).

The CLI may also need to write/update the user's `forkshop.json` to reflect where files actually landed, so subsequent `forkshop add` / `forkshop diff` calls operate on the right paths.

### Bonus check while we're in there

Forkshop's template imports (`@/components/forkshop/canvas/canvas-node`, etc.) should already just-work regardless of `src/` vs flat — the `@/*` alias resolves to whatever the user's project uses. The fix above is purely about putting files where the alias expects to find them. **Verify this assumption during the fix** by running the setup skill in both `--src-dir` and `--no-src-dir` projects after the patch.

### Repro

```bash
TEMPDIR=$(mktemp -d) && cd "$TEMPDIR"
pnpm create next-app@latest test-src --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm
cd test-src

# Run the local CLI (assuming local forkshop docs server at :3001)
node ~/Desktop/ravineo_dev/forkshop/packages/cli/dist/index.js init \
  --registry http://localhost:3001/r/

# Inspect — files should be at src/app/forkshop/, NOT app/forkshop/
ls app/forkshop 2>&1     # should NOT exist
ls src/app/forkshop      # should exist
```

---

## Bug C — Setup skill's narrative output has spurious leading whitespace

**Where:** `packages/registry/src/skill/setup.md`, line 173 onward (the Phase 3 proposal template).

**Severity:** Low-cosmetic, but consistent. Every install renders the project recognition narrative ("This is the Ravineo Creator Clusters Explorer...") with a leading 2-space indent on the first line, looking like a misaligned paragraph in the user's Claude Code session.

### Symptom

User runs `set up Forkshop`. Phase 3 begins with:

```
I've read your project. Here's what I see:

  This is the Ravineo Creator Clusters Explorer — an internal data-exploration
tool (not a marketing site or auth-gated SaaS) for influencer segments, powered
by BigQuery...
```

Note the 2 leading spaces before "This is." Looks like a formatting accident. Same issue applies to the `/forkshop sidebar` tree directly below — also indented two spaces in the template.

### Root cause

The skill's Phase 3 proposal template includes literal indentation as a visual cue:

```markdown
I've read your project. Here's what I see:

  <narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

  /forkshop sidebar
```

The author of the skill likely intended the indentation to mean "this is a quoted example" or "this is the content slot." Claude faithfully reproduces the leading whitespace when it generates its output, so every install sees the misaligned first line.

### Fix

In `packages/registry/src/skill/setup.md`, find the Phase 3 proposal template (around line 173) and remove the 2-space indentation from the narrative placeholder, the sidebar tree, and any other indented content slots. Plain left-aligned text:

```markdown
I've read your project. Here's what I see:

<narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

/forkshop sidebar
```

If the visual separation matters for the skill author's readability, use a different mechanism that Claude won't echo: a markdown blockquote (`> <narrative...>`) or an actual code-block fence won't survive into the output either, but they're at least intentional formatting choices rather than accidental indentation.

While you're in the file, **grep the rest of the skill for similar patterns** — anywhere a template literal has leading whitespace it didn't need. The same problem could be lurking in other phases' output templates.

### Verification

After the fix:

1. Run `set up Forkshop` in any project.
2. Check that the Phase 3 narrative output starts flush-left ("This is..." not "  This is...").
3. Check that the proposed sidebar tree below it is also flush-left.

Easiest visual diff: take a screenshot of Phase 3 before and after the fix in the same project.

---

## Already-fixed bugs (historical context, do not re-fix)

These were surfaced earlier and have been resolved. Listed here so the next Claude doesn't accidentally regress them.

| Bug | Where | Commit |
|---|---|---|
| Manifest builder didn't handle `live-editing.md` skill | `packages/cli/src/manifest-builder.ts` | `11750d2` |
| Templates importing `@forkshop/registry` (workspace-only, doesn't exist in user projects) | `packages/registry/src/skill/setup.md` Templates 2-5 + user-claude-md template | Fixed via per-symbol imports (Option B) |
| Template 1 `import tailwindConfig from "@/../tailwind.config"` (escaped project root) | `packages/registry/src/skill/setup.md` Template 1 | Fixed by changing to `@/tailwind.config` |
| Raveo font fell back to body font in fresh projects (CSS var unset) | `packages/registry/tailwind/forkshop-preset.ts` + `.css` | `f0025a5` — added `Raveo` as inline fallback in `var(--font-raveo, Raveo)` |
| Setup skill stripped synthetic-route surfacing when removing the NEW pill | `packages/registry/src/components/agent-activity-context.tsx` + `index.ts` + `sidebar/forkshop-sidebar.tsx` | `070959d` — restored data plumbing, kept pill removed |
| Doc-sync skill was missing (third skill the strategy spec called for) | `packages/registry/src/skill/doc-sync.md` | `13315f2` |

---

## Recommended fix order

1. **Bug B first.** It's a clearer fix (read tsconfig, prepend `src/` to paths) and unblocks proper cross-project testing.
2. **Bug A second.** The dep-install fix (Option 1) is mechanical and isolated; once Bug B is in place, the install path is cleaner end-to-end.
3. **Bug C last.** Cosmetic, one-file edit in the skill markdown. Easy to verify visually after Bugs A and B are clean. Best done last so the verification runs of A and B can also visually confirm C is fixed.
4. **Re-test in both projects after all three fixes**:
   - influencers-scrapers (pnpm monorepo, dep-install was the blocker)
   - ravineo-playground/site (src/ convention, all three bugs affect it)
   - Plus the original `create-next-app --no-src-dir` cold fixture to confirm no regression there.
5. **Polish round commit message:** `fix(cli): src/ convention, decoupled dep-install, narrative whitespace`

---

## Verification approach

After both fixes land:

```bash
# Fresh test fixture 1: --no-src-dir (the original baseline)
TEMPDIR=$(mktemp -d) && cd "$TEMPDIR"
pnpm create next-app@latest f1 --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --use-pnpm
cd f1
node ~/Desktop/ravineo_dev/forkshop/packages/cli/dist/index.js init \
  --registry http://localhost:3001/r/

# Expected: files at app/forkshop/, components/forkshop/, lib/forkshop/.
# Expected: no pnpm add invocation; instead, deps written to package.json
# and printed "Run pnpm install to fetch deps."
# Run `pnpm install`, then `set up Forkshop`, then `pnpm dev`. /forkshop renders.

# Fresh test fixture 2: --src-dir (new case)
TEMPDIR=$(mktemp -d) && cd "$TEMPDIR"
pnpm create next-app@latest f2 --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm
cd f2
node ~/Desktop/ravineo_dev/forkshop/packages/cli/dist/index.js init \
  --registry http://localhost:3001/r/

# Expected: files at src/app/forkshop/, src/components/forkshop/, src/lib/forkshop/.
# Same package.json + manual-install flow as fixture 1.
# `set up Forkshop` runs. `pnpm dev`. /forkshop renders.
```

Both fixtures must pass cleanly with no manual file-moves and no pnpm-failure detours.

---

## Notes for whoever picks this up

- **This file is a living document.** If you find additional cross-project bugs while testing, add them here.
- **The `docs/known-issues.md` file** in this repo has older issues that may overlap; check there before duplicating.
- **The `docs/live-ai-closeout-issues.md`** file has the specific Issues 1-3 from the live-AI cold-fixture E2E; those are the "Already-fixed bugs" referenced in this doc's table.
- **Don't expand scope** beyond the two open bugs. Both are mechanical fixes with clear repros. If you spot other things while you're in the code, capture them in this file as "Bug C / D / ..." but don't fix them in the same session — keep the polish round focused.
