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

## Bug D — Setup skill uses Next 14 `experimental.turbopack` syntax, breaks on Next 15+

**Where:** `packages/registry/src/skill/setup.md` — the template that configures the Locator.js webpack-loader rule in the user's `next.config.{js,ts,mjs}`.

**Severity:** High. Any project on Next 15+ (the stable release with the turbopack key promoted out of experimental) will get a config that either no-ops or errors. Next 16 will eventually be the default.

### Symptom

User's project is on Next 16. Skill's template instructs Claude to add:

```ts
const nextConfig = {
  experimental: {
    turbopack: {
      rules: {
        "**/*.{tsx,jsx}": {
          loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
        },
      },
    },
  },
}
```

But in Next 15+, `turbopack` is a top-level key, not under `experimental`. The Claude session in the ravineo-playground/site install correctly recognized this from Next 16's `node_modules/next/dist/docs/01-app/.../turbopack.md` reference and used the new syntax — but **the template still has the old shape**, so any Claude session that follows the template literally will produce a broken config.

### Fix

In the skill's setup template, replace the `experimental.turbopack` block with the version-aware logic. Two options:

**Option 1 (recommended): Auto-detect Next version, write the right shape.**

The skill already reads the project's `package.json` in Phase 0. Add a step in the Locator opt-in phase that reads `dependencies.next` (or `devDependencies.next`), parses the major version, and instructs Claude to use:

- Next 14.x → `experimental: { turbopack: { rules: {...} } }`
- Next 15.x and above → `turbopack: { rules: {...} }` (top-level)

**Option 2: Just use the new syntax everywhere.**

Drop Next 14 support entirely; mention it as a hard constraint in the docs. The strategy spec says "Next.js 14+" but the OSS audience is likely on 15+ already. This is the simpler fix and reduces template branching.

### Verification

Test the install in:
- A `pnpm create next-app@14` fixture (after fix, check that the config uses `experimental.turbopack`)
- A `pnpm create next-app@latest` fixture (Next 15/16; check that the config uses top-level `turbopack`)

Both should produce a working Locator.js wiring with no manual patches needed from the Claude session running the skill.

---

## Bug E — Sibling skill activation triggers don't account for `src/` prefix

**Where:** `packages/registry/src/skill/live-editing.md` and `packages/registry/src/skill/doc-sync.md` — the activation triggers / matching patterns.

**Severity:** Medium. The skill installs successfully but its trigger phrases reference paths that don't match the user's actual install when the project uses `src/` convention. Reported by the Claude session: *"Sibling skill descriptions still reference `app/forkshop/`, `components/forkshop/`, etc. without the `src/` prefix — they'll partially match your paths. If they don't auto-fire, just invoke them by phrase."*

### Symptom

Skills auto-activate based on file-path-matching patterns in their frontmatter or description. The patterns currently look like `app/forkshop/**` or `components/forkshop/**`. In an `src/` project, files actually live at `src/app/forkshop/**` etc. The patterns partially match (or don't match at all), so skills that should auto-fire don't.

### Fix

Two related fixes — Bug B's CLI fix should already help; this is the matching half:

1. **Path-flexible trigger patterns.** Use `**/forkshop/**` or `(src/)?app/forkshop/**` instead of `app/forkshop/**`. Match Forkshop's directory anywhere in the path, not pinned to project-root.
2. **Setup skill writes the actual paths during install.** After Bug B is fixed and the CLI knows whether files landed at `src/app/forkshop/` vs `app/forkshop/`, the setup skill could rewrite the sibling skills' activation triggers to reference the actual paths. More surgical, slightly more code.

Recommend Option 1 — broader patterns are simpler and cover edge cases (monorepos with custom directory names, apps under `packages/web/`, etc.).

### Verification

Install Forkshop in an `--src-dir` project. Edit a file under `src/app/page.tsx`. Confirm `forkshop-live-editing.md` auto-fires (cadence guidance shows up in Claude's context). Run `sync Forkshop docs` to confirm `forkshop-doc-sync.md` activates.

---

## Bug F (minor) — Skill template prescribes `src/app/forkshop/layout.tsx` that's redundant with Template 5's page.tsx

**Where:** `packages/registry/src/skill/setup.md` — Locator.js wiring phase (Template 5 + the layout step that follows it).

**Severity:** Low/cosmetic. The Claude session in the playground/site install skipped this step deliberately because it noticed `<LocatorInit mountPath="/forkshop" />` was already in `page.tsx` (Template 5). A separate layout.tsx is only useful if the user wants Locator to apply to sub-routes under `/forkshop/*` (which Forkshop itself doesn't have today).

### Fix

Either:
- Drop the redundant layout step entirely from the standard skill flow (Template 5's page.tsx is enough for v1)
- Or keep it but make it explicitly optional ("if you plan to add sub-routes under /forkshop/*, also create...")

Lean toward dropping it — fewer install steps, less for the user to wonder about. If sub-routes become a thing later, the layout step can come back as a `forkshop add sub-route-locator` opt-in.

---

## Bug G (limitation, not a bug — capturing for future) — Pages board doesn't auto-handle dynamic routes

**Where:** `packages/registry/src/kits/page-tree.tsx` — and how the setup skill populates the pages list.

**Severity:** Functional limitation, not a blocker. Found in ravineo-playground/site (which has `/cluster/[slug]`, `/segment/[slug]`, `/creator/[username]`, `/taxonomy-v6/[slug]`, etc.).

### Symptom

Dynamic routes get TODO'd in `forkshop.config.tsx`. The Pages board can render static routes by hitting them in an iframe, but dynamic routes need a real slug to render anything meaningful. The setup skill correctly leaves them as TODOs and tells the user to add explicit slugs.

### Future improvement (not for this polish round)

Could be a v0.2 feature: the setup skill scans the dynamic-route file for `generateStaticParams()` exports, picks one or two real slugs, and pre-populates them in the config. Or: the page-tree kit could have a `dynamicSlug?: string` field per entry that the setup skill prompts for. Out of scope for the polish round; capture for a future kit-polish spec.

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

1. **Bug B first** (CLI src/ convention detection). Highest-leverage fix; unblocks proper cross-project testing.
2. **Bug A second** (decouple dep-install from pnpm). Mechanical and isolated.
3. **Bug D third** (Next 15+ turbopack syntax). One-file template edit; do it while you're already in the skill markdown.
4. **Bug E fourth** (path-flexible skill triggers). Same file family as D; cheap to fix at the same time.
5. **Bug C fifth** (Phase 3 narrative leading whitespace). Cosmetic; easy to verify after the others.
6. **Bug F sixth** (drop redundant layout step). Smallest scope; just delete a section.
7. **Bug G — skip.** Future kit-polish work, out of scope here.

**Re-test in all known projects after the polish round**:
- The original `create-next-app --no-src-dir` cold fixture (regression check)
- A fresh `create-next-app --src-dir` fixture (Bugs B + E)
- A fresh Next 15 or Next 16 project (Bug D — try `pnpm create next-app@latest`)
- influencers-scrapers (pnpm monorepo — Bug A blocker)
- ravineo-playground/site (src/ + Next 16 + pnpm-broken — exercises A, B, D, E together)

**Polish round commit messages (one per bug, clean history):**
- `fix(cli): detect src/ convention from tsconfig paths`
- `fix(cli): decouple dep-install from pnpm; write to package.json`
- `fix(skill): use Next 15+ turbopack syntax when project version supports it`
- `fix(skill): path-flexible activation triggers for sibling skills`
- `fix(skill): remove leading whitespace from Phase 3 narrative template`
- `fix(skill): drop redundant layout.tsx step (Template 5 page.tsx is sufficient)`

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
