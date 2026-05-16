# Engine Packaging + Compiled CSS Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `packages/registry/` into the publishable `@forkshop/engine` npm package: tsup build with `"use client"` preservation, compiled Tailwind CSS, Central Icons React bundled at build-time, font binaries in dist, FSL license, playground migration to consume built dist.

**Architecture:** Single-barrel exports + asset/route subpaths. `tsup` bundles JS+DTS with sourcemaps and a directives-preserving plugin. A separate Tailwind CLI run compiles engine-source utilities into `dist/forkshop.css`. The Central icon set ships as a build-time devDep; tsup bundles imported icons into the output so consumers need no license key. The playground stops using `transpilePackages`/aliases and consumes `node_modules/@forkshop/engine/dist/`.

**Tech Stack:** TypeScript, ESM, Next.js 14 (peer dep), React 18 (peer dep), tsup, esbuild-plugin-preserve-directives, Tailwind v3, execa, tsx, Vitest. Workspace: pnpm. Path alias `@forkshop/*` resolves to `packages/engine/src/*`.

**Spec:** `docs/specs/2026-05-16-engine-packaging-design.md`

---

## File Structure

**Renames:**
- `packages/registry/` → `packages/engine/` (whole directory)

**Adds** (all paths relative to `packages/engine/`):
- `LICENSE` — full FSL-1.1-Apache-2.0 text
- `LICENSE-icons.md` — Central icon attribution
- `README.md` — short; points at forkshop.dev
- `tsup.config.ts` — entry config with directive preservation
- `.gitignore` — adds `dist/` and `.tmp/`
- `tailwind/build.config.cjs` — engine-build Tailwind config (private)
- `src/styles/forkshop.entry.css` — CSS entry imported by Tailwind CLI
- `scripts/build.ts` — orchestrator: tsup → verify-directives → compile-css → copy-assets → verify-tarball
- `scripts/compile-preset.ts` — emits `.tmp/forkshop-preset.cjs` for Tailwind CLI consumption
- `scripts/compile-css.ts` — runs Tailwind CLI
- `scripts/copy-assets.ts` — copies fonts into `dist/fonts/`
- `scripts/verify-directives.ts` — asserts `"use client"` survival
- `scripts/verify-tarball.ts` — asserts published-tarball contents
- `scripts/check-no-icon-libs.ts` — lint guard against re-introducing external icon libs
- `scripts/verify-directives.test.ts`, `verify-tarball.test.ts`, `check-no-icon-libs.test.ts` — vitest unit tests
- `apps/playground/scripts/copy-engine-fonts.mjs` — playground's post-install font copy

**Modifies** (after rename → all under `packages/engine/`):
- `package.json` — name, license, exports, files, sideEffects, engines, publishConfig, deps
- `tailwind/forkshop-preset.ts` — simplify font stack (drop `--font-raveo` override)
- `src/lib/icons.ts` — swap `lucide-react` → `@central-icons-react/...`
- `src/components/sidebar/help-modal.tsx` — use `forkshopIcons.close` instead of `lucide-react`
- `src/components/canvas/edit-popover.tsx` — same pattern
- `src/components/sidebar/forkshop-sidebar.tsx` — same pattern
- `scripts/_utils.ts` — rename `REGISTRY_ROOT` → `ENGINE_ROOT`
- `scripts/check-canonical-imports.ts` — update import path

**Workspace updates:**
- Root `package.json` — `pnpm.onlyBuiltDependencies` adds iconists; `scripts.dev` runs engine + playground in parallel
- Root `CLAUDE.md` — path-string updates + new "First-time setup for engine builds" section
- Root `LICENSE` — multi-license notice

**Playground updates:**
- `apps/playground/package.json` — `@forkshop/registry` → `@forkshop/engine`; drop `lucide-react`; add postinstall
- `apps/playground/next.config.mjs` — drop `transpilePackages`, drop forkshop aliases
- `apps/playground/tailwind.config.ts` — drop preset import + engine glob
- `apps/playground/app/globals.css` — `@import "@forkshop/engine/forkshop.css"`
- `apps/playground/app/layout.tsx` — drop `next/font/local` Raveo; import `LocatorInit` from `@forkshop/engine`
- `apps/playground/app/forkshop/page.tsx`, `apps/playground/app/forkshop/playground-board.tsx`, `apps/playground/app/forkshop/use-forkshop-positions.ts`, all four `apps/playground/app/api/forkshop/*/route.ts`, `apps/playground/tsconfig.json` — package name updates

**CLI / docs updates:**
- `apps/docs/app/r/registry.json/route.ts` — `REGISTRY_ROOT` path string update
- `apps/docs/app/r/fonts/[...path]/route.ts` — `REGISTRY_FONTS_ROOT` path string update
- `apps/docs/scripts/validate-registry.ts` — alias resolver base path update
- `packages/cli/src/__fixtures__/*` — fixture path strings
- `packages/engine/templates/user-claude-md.md` — package name find/replace only (content redesign owned by CLI rework spec)
- `packages/engine/src/skill/{setup,live-editing,doc-sync}.md` — package name find/replace only

---

## Task 1: `git mv packages/registry packages/engine` and minimal `package.json` updates so install resolves

**Why:** The workspace package symlink `node_modules/@forkshop/registry` won't resolve after the rename until the `name` field is updated. Without this fix, `pnpm install` errors. The remaining ripples are addressed in Task 2.

**Files:**
- Move: `packages/registry/` → `packages/engine/`
- Modify: `packages/engine/package.json` (the moved file) — `name` field
- Modify: `apps/playground/package.json` — dependency name

- [ ] **Step 1: Move the directory and update the `name` field**

```bash
git mv packages/registry packages/engine
```

Then edit `packages/engine/package.json`:

```jsonc
{
  "name": "@forkshop/engine",   // was "@forkshop/registry"
  // ...everything else unchanged for now
}
```

- [ ] **Step 2: Update the playground's dependency name**

Edit `apps/playground/package.json`:

```jsonc
{
  "dependencies": {
    "@forkshop/engine": "workspace:*",   // was "@forkshop/registry"
    // ...other deps unchanged
  }
}
```

- [ ] **Step 3: Reinstall to refresh workspace symlinks**

Run: `pnpm install`
Expected: `Done` with no resolution errors. `node_modules/@forkshop/engine` exists and points at `packages/engine/`. (Run `ls -la node_modules/@forkshop/` to confirm.)

- [ ] **Step 4: Commit**

```bash
git add packages/engine apps/playground/package.json pnpm-lock.yaml
git commit -m "chore(engine): rename packages/registry → packages/engine

Mechanical rename of the workspace directory and the npm package name
from @forkshop/registry to @forkshop/engine. Subsequent commits update
the remaining path-string references."
```

---

## Task 2: Update all remaining path-string references to engine

**Why:** After Task 1, `pnpm install` works but `pnpm typecheck`/`lint`/`test` and `pnpm dev` are broken because dozens of files still reference the old name or path. This task is a mechanical sweep through every file with a stale string.

**Files (modify all):**
- `apps/playground/next.config.mjs` — `transpilePackages`, `registrySrc` const
- `apps/playground/tailwind.config.ts` — preset import, content glob
- `apps/playground/tsconfig.json` — paths config if any
- `apps/playground/app/globals.css` — `@import` path
- `apps/playground/app/layout.tsx` — `LocatorInit` import + the `next/font/local` source path
- `apps/playground/app/forkshop/page.tsx`, `playground-board.tsx`, `use-forkshop-positions.ts` — engine imports
- `apps/playground/app/api/forkshop/edit/route.ts`, `positions/route.ts`, `agent-activity/route.ts`, `agent-activity/stream/route.ts` — engine imports
- `apps/docs/app/r/registry.json/route.ts` — `REGISTRY_ROOT` path string
- `apps/docs/app/r/fonts/[...path]/route.ts` — `REGISTRY_FONTS_ROOT` path string
- `apps/docs/scripts/validate-registry.ts` — alias resolver base
- `packages/cli/src/__fixtures__/*` (any file containing `@forkshop/registry` or `packages/registry`)
- `packages/cli/src/manifest-builder.ts` — verify no hardcoded `packages/registry/` strings (it uses `registryRoot` param, but worth checking comments)
- `packages/engine/templates/user-claude-md.md` — `@forkshop/registry` → `@forkshop/engine` (name only — content stays)
- `packages/engine/src/skill/setup.md`, `live-editing.md`, `doc-sync.md` — same find/replace
- `CLAUDE.md` (root maintainer guide) — every `packages/registry` → `packages/engine`; every `@forkshop/registry` → `@forkshop/engine`
- `docs/known-issues.md`, `docs/live-ai-closeout-issues.md`, `docs/cli-cross-project-polish.md` — active operational docs; update where the new naming applies

Historical docs that should NOT be touched (they describe the past correctly):
- `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md`
- `docs/specs/2026-05-15-nodetype-layout-extraction-design.md`
- `docs/specs/2026-05-16-live-text-editing-design.md`
- `docs/plans/2026-05-15-nodetype-layout-extraction.md`
- `docs/superpowers/plans/2026-05-16-live-text-editing.md`
- `docs/specs/2026-05-16-engine-packaging-design.md` (this spec — uses both names contextually)

- [ ] **Step 1: Repository-wide find-replace for both strings**

Two targeted replacements, scoped to files that should change. Run from repo root:

```bash
# String 1: @forkshop/registry → @forkshop/engine
git grep -l '@forkshop/registry' -- \
  ':!docs/strategy' ':!docs/specs/2026-05-15*' ':!docs/specs/2026-05-16-live*' \
  ':!docs/specs/2026-05-16-engine-packaging-design.md' \
  ':!docs/plans/2026-05-15*' ':!docs/superpowers' \
  | xargs sed -i '' 's|@forkshop/registry|@forkshop/engine|g'

# String 2: packages/registry → packages/engine
git grep -l 'packages/registry' -- \
  ':!docs/strategy' ':!docs/specs/2026-05-15*' ':!docs/specs/2026-05-16-live*' \
  ':!docs/specs/2026-05-16-engine-packaging-design.md' \
  ':!docs/plans/2026-05-15*' ':!docs/superpowers' \
  | xargs sed -i '' 's|packages/registry|packages/engine|g'
```

(On Linux, drop the `''` after `-i`.)

- [ ] **Step 2: Verify no stale references remain in active files**

Run: `git grep -n '@forkshop/registry\|packages/registry' -- ':!docs/strategy' ':!docs/specs/2026-05-15*' ':!docs/specs/2026-05-16-live*' ':!docs/specs/2026-05-16-engine-packaging-design.md' ':!docs/plans/2026-05-15*' ':!docs/superpowers'`

Expected: empty output.

- [ ] **Step 3: Workspace-wide typecheck**

Run: `pnpm typecheck`
Expected: green across all packages. If a path resolution fails, find the missed file and fix it.

- [ ] **Step 4: Workspace-wide lint**

Run: `pnpm lint`
Expected: green. The `check-canonical-imports.ts` script (now under `packages/engine/scripts/`) walks `SRC_ROOT` derived from `__dirname` — works fine after rename even though the constant is still called `REGISTRY_ROOT` (renamed in Task 3).

- [ ] **Step 5: Workspace-wide tests**

Run: `pnpm test`
Expected: all green. The CLI's `__fixtures__` and `manifest-builder.test.ts` reference engine paths; if any test fails because of a missed string, fix and re-run.

- [ ] **Step 6: Smoke-run the playground**

Run: `pnpm --filter playground dev`
Expected: Next.js starts without error. Open `http://localhost:3000/forkshop` — the canvas renders. (Note: this still uses the OLD build pipeline with `transpilePackages` + aliases. That's intentional — this task only does rename ripples; build pipeline switch comes later.)

Kill the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(engine): update all rename ripples (path strings, imports, docs)

Mechanical find-replace of @forkshop/registry → @forkshop/engine and
packages/registry → packages/engine across the workspace. Excludes
historical docs/strategy and prior specs/plans that describe past state.

After this commit pnpm typecheck/lint/test/dev all green."
```

---

## Task 3: Rename internal `REGISTRY_ROOT` constant in engine scripts

**Why:** Cosmetic but worth doing while the rename is fresh. Leaves no "REGISTRY" references inside engine scripts.

**Files:**
- Modify: `packages/engine/scripts/_utils.ts`
- Modify: `packages/engine/scripts/check-canonical-imports.ts`
- Modify: `packages/engine/scripts/normalize-imports.ts` (if it references `REGISTRY_ROOT`)
- Modify: `packages/engine/scripts/normalize-imports.test.ts` (same)

- [ ] **Step 1: Rename the export in `_utils.ts`**

Edit `packages/engine/scripts/_utils.ts`:

```ts
import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const ENGINE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
export const SRC_ROOT = path.join(ENGINE_ROOT, "src")

export async function walkTsFiles(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walkTsFiles(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}
```

- [ ] **Step 2: Update consumers**

In `packages/engine/scripts/check-canonical-imports.ts`, change the named import:

```ts
import { ENGINE_ROOT, SRC_ROOT, walkTsFiles } from "./_utils.js"
```

And replace `REGISTRY_ROOT` with `ENGINE_ROOT` in the function body (the `path.relative(REGISTRY_ROOT, abs)` call).

Do the same in `packages/engine/scripts/normalize-imports.ts` and `normalize-imports.test.ts` if either references the constant.

Run: `git grep -n 'REGISTRY_ROOT' packages/engine/`
Expected: empty.

- [ ] **Step 3: Verify lint still green**

Run: `pnpm --filter @forkshop/engine lint`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/scripts/
git commit -m "chore(engine): rename REGISTRY_ROOT → ENGINE_ROOT in scripts

Internal constant rename for naming consistency after the package move."
```

---

## Task 4: Add engine `LICENSE`, `LICENSE-icons.md`, `README.md`

**Why:** Publishable packages need a `LICENSE` file alongside the SPDX identifier in `package.json`. README becomes the npm page text. LICENSE-icons.md documents the Central icon attribution required by their license.

**Files:**
- Create: `packages/engine/LICENSE`
- Create: `packages/engine/LICENSE-icons.md`
- Create: `packages/engine/README.md`
- Modify: `LICENSE` (workspace root — replace MIT with multi-license notice)

- [ ] **Step 1: Add the engine FSL `LICENSE`**

Create `packages/engine/LICENSE` with the canonical FSL-1.1-Apache-2.0 text. The text is publicly available at `https://fsl.software/FSL-1.1-Apache-2.0.template.md`. Copy verbatim, replacing the two placeholder lines as follows:

- Replace `Licensor:           [Licensor Name]` with `Licensor:           Forkshop`.
- Replace `Software:           [Software Name]` with `Software:           @forkshop/engine`.
- All other text (preamble, permitted-use clause, change-date language, Apache-2.0 conversion) stays as in the FSL template.

If the template can't be fetched at impl time, the canonical version is also mirrored at `https://github.com/Sentry/fsl.software/blob/main/FSL-1.1-Apache-2.0.template.md` (Sentry maintains the canonical mirror).

- [ ] **Step 2: Add `LICENSE-icons.md`**

Create `packages/engine/LICENSE-icons.md`:

```md
# Icon attribution

Forkshop's built-in icons are derived from the Central Icon Set
by Iconists (https://iconists.co/central) — specifically the
@central-icons-react/square-outlined-radius-0-stroke-2 package — used
under license.

The compiled SVG markup embedded in dist/ is included in this package
under the terms of that license, which permits redistribution as part
of a shipped product. Forkshop does not redistribute the
@central-icons-react package itself, nor any source library of icons.

Copyright in the Central Icon Set design remains with Iconists.

To use Central Icons in your own project, visit iconists.co/central
and obtain a license directly from Iconists.
```

- [ ] **Step 3: Add `README.md`**

Create `packages/engine/README.md`:

```md
# @forkshop/engine

The Forkshop canvas + sidebar engine for Next.js + Tailwind projects.

Don't install this package directly — use the Forkshop CLI:

    npx forkshop init

See [forkshop.dev](https://forkshop.dev) for documentation and examples.

## License

FSL-1.1-Apache-2.0 — see `LICENSE`. Icon attributions in `LICENSE-icons.md`.
```

- [ ] **Step 4: Rewrite workspace root `LICENSE`**

Replace the workspace-root `LICENSE` with a multi-license notice:

```
This repository contains components under different licenses.

- packages/engine/                  FSL-1.1-Apache-2.0 (see packages/engine/LICENSE)
- packages/cli/                     MIT
- packages/engine/src/skill/,       MIT (user-surface scaffolds shipped by the CLI)
  packages/engine/templates/
- apps/playground/, apps/docs/      MIT (demo + docs site)

If you've forked this repo, the FSL terms apply to anything derived from
packages/engine/ source. The MIT-licensed pieces remain freely usable.

Forkshop is © 2026 Jakub Foglar.
```

- [ ] **Step 5: Commit**

```bash
git add packages/engine/LICENSE packages/engine/LICENSE-icons.md packages/engine/README.md LICENSE
git commit -m "chore(engine): add LICENSE, LICENSE-icons.md, README.md

Engine ships under FSL-1.1-Apache-2.0 per strategy v2. Workspace root
LICENSE becomes a multi-license notice pointing at per-package terms."
```

---

## Task 5: Drop unused engine deps (`motion`, `@locator/webpack-loader`, `tailwindcss` peer)

**Why:** Strategy v2 explicitly mentions `motion` ("already unused — drop") and removes Tailwind as a peer ("Tailwind no longer required by the engine"). `@locator/webpack-loader` was wrongly in engine devDeps — it's a host-side loader for the user's webpack pipeline.

**Files:**
- Modify: `packages/engine/package.json`

- [ ] **Step 1: Verify these deps are not used in source**

Run: `git grep -n 'from "motion"\|from "framer-motion"' packages/engine/src/`
Expected: empty.

Run: `git grep -n '@locator/webpack-loader' packages/engine/src/`
Expected: empty.

- [ ] **Step 2: Edit `packages/engine/package.json`**

Remove these three entries:

```jsonc
{
  "dependencies": {
    "motion": "^11.0.0",   // ← DELETE this line
    // (keep "@locator/runtime" and "clsx")
  },
  "devDependencies": {
    "@locator/webpack-loader": "^0.5.1",   // ← DELETE this line
    // ...
  },
  "peerDependencies": {
    "tailwindcss": ">=3"   // ← DELETE this line
    // (keep next, react, react-dom)
  }
}
```

Final relevant blocks:

```jsonc
{
  "peerDependencies": {
    "next":      ">=14",
    "react":     ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "@locator/runtime": "^0.5.1",
    "clsx":             "^2.1.1",
    "lucide-react":     "^1.14.0"
  }
}
```

(`lucide-react` stays for now — removed in Task 11 once the icon swap is in place.)

- [ ] **Step 3: Refresh the lockfile**

Run: `pnpm install`
Expected: lockfile updates; no resolution errors. `node_modules/motion` and `node_modules/.pnpm/@locator+webpack-loader*` may stay until pnpm prunes, that's fine.

- [ ] **Step 4: Smoke test**

Run: `pnpm --filter @forkshop/engine typecheck && pnpm --filter @forkshop/engine test`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/package.json pnpm-lock.yaml
git commit -m "chore(engine): drop motion, @locator/webpack-loader, tailwindcss peer

motion is unused; @locator/webpack-loader is host-side; tailwindcss
peer drops because engine ships compiled CSS at build time per
strategy v2."
```

---

## Task 6: Verify `LocatorInit` uses dynamic `import("@locator/runtime")`

**Why:** Strategy v2 says `@locator/runtime` is "dynamic-imported, opt-in." The current source already does this (`void import("@locator/runtime")` inside the `useEffect`). This task is a verification step — if for any reason the code regresses to a top-level static import, fix it.

**Files:**
- Read: `packages/engine/src/components/locator-init.tsx`

- [ ] **Step 1: Confirm there is no top-level static import of @locator/runtime**

Run: `git grep -n 'from "@locator/runtime"' packages/engine/src/`
Expected: empty. Only the dynamic `import("@locator/runtime")` should appear, which is inside the `useEffect`.

Run: `git grep -n 'import("@locator/runtime")' packages/engine/src/`
Expected: one match at `packages/engine/src/components/locator-init.tsx` (inside the effect callback).

- [ ] **Step 2: If a static import is present, refactor to dynamic**

If Step 1 shows a top-level static import of `@locator/runtime`, replace it with the dynamic pattern already in `locator-init.tsx`:

```tsx
"use client"

import { useEffect } from "react"

export function LocatorInit({ mountPath = "/forkshop" }: { mountPath?: string } = {}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    try {
      if (globalThis.window === globalThis.window.parent) return
      const parentPath = globalThis.window.parent.location.pathname
      if (!parentPath.startsWith(mountPath)) return
    } catch {
      return
    }
    let cancelled = false
    void import("@locator/runtime").then((module) => {
      if (cancelled) return
      const setup = module.default
      if (typeof setup === "function") setup({ showIntro: false })
    })
    return () => { cancelled = true }
  }, [mountPath])
  return <></>
}
```

If Step 1 was empty, skip this step.

- [ ] **Step 3: No commit needed if no change was required**

If a fix was applied:

```bash
git add packages/engine/src/components/locator-init.tsx
git commit -m "fix(engine): ensure @locator/runtime is dynamic-imported, not static

Strategy v2 makes Locator opt-in; static import would pull solid-js/web
into every consumer's bundle on first load."
```

If no fix needed, proceed to Task 7.

---

## Task 7: Add `@central-icons-react/...` build-time dep + update workspace `onlyBuiltDependencies`

**Why:** The icon package's `preinstall: node ./license-check.js` validates the maintainer's license key. pnpm's hardening default skips install scripts unless the package is on the `onlyBuiltDependencies` allowlist. Without the allowlist entry the license check never runs (and Central icons aren't legitimately licensed during the build).

**Files:**
- Modify: `packages/engine/package.json`
- Modify: `package.json` (workspace root)
- Create: `.envrc.example` (workspace root)

- [ ] **Step 1: Add the iconists package to engine devDeps**

Edit `packages/engine/package.json`:

```jsonc
{
  "devDependencies": {
    // existing entries kept (without @locator/webpack-loader removed in Task 5)
    "@central-icons-react/square-outlined-radius-0-stroke-2": "^1.1.237",
    // ...
  }
}
```

- [ ] **Step 2: Update the workspace pnpm allowlist**

Edit `package.json` (workspace root):

```jsonc
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "@central-icons-react/square-outlined-radius-0-stroke-2"
    ]
  }
}
```

- [ ] **Step 3: Create `.envrc.example`**

Create `.envrc.example` at the workspace root:

```bash
# Forkshop maintainer environment variables.
# Copy to .envrc (gitignored) and fill in real values, then `direnv allow .`.

# License key for @central-icons-react/* packages (iconists.co Central Icon Set).
# Required for engine rebuilds; without it the preinstall license check
# fails and `pnpm install` aborts.
# Exact env-var name is read from the package's license-check.js — verify
# at impl time by inspecting node_modules/@central-icons-react/.../license-check.js.
export ICONISTS_LICENSE_KEY=
```

- [ ] **Step 4: Ensure `.envrc` is gitignored**

Run: `grep -q '^\.envrc$' .gitignore || echo '.envrc' >> .gitignore`
Then: `cat .gitignore | grep envrc`
Expected: `.envrc` and `.envrc.example` should NOT appear simultaneously — only `.envrc` is ignored (the `.example` is committed).

If `.gitignore` doesn't exist, create it with at least:

```
.envrc
.tmp/
```

- [ ] **Step 5: Set the env var and install**

Export `ICONISTS_LICENSE_KEY=<your-key>` in the current shell (or via direnv). Then:

Run: `pnpm install`
Expected: install completes successfully. The iconists package's preinstall script runs (you'll see its output in the install log). If the license key is wrong, install fails with an error from the preinstall script — get the right key and retry.

Determine the **exact env-var name** by inspecting `node_modules/@central-icons-react/square-outlined-radius-0-stroke-2/license-check.js`. If it differs from `ICONISTS_LICENSE_KEY`, update `.envrc.example` (and the maintainer CLAUDE.md note added in Task 23) to match.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/package.json package.json .envrc.example .gitignore pnpm-lock.yaml
git commit -m "chore(engine): add @central-icons-react/... as build-time dep

Added to engine devDependencies; added to workspace
pnpm.onlyBuiltDependencies so the preinstall license check actually
runs. .envrc.example documents the required ICONISTS_LICENSE_KEY
env var."
```

---

## Task 8: Add `check-no-icon-libs.ts` lint script with test

**Why:** Lock in the no-external-icon-libs invariant. If a future PR re-adds `lucide-react` or imports a different icon library, this lint fails loudly before merge.

**Files:**
- Create: `packages/engine/scripts/check-no-icon-libs.ts`
- Create: `packages/engine/scripts/check-no-icon-libs.test.ts`
- Modify: `packages/engine/package.json` (extend lint script)

- [ ] **Step 1: Write the failing test**

Create `packages/engine/scripts/check-no-icon-libs.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"
import { findIconLibImports } from "./check-no-icon-libs.js"

async function mkdtemp() {
  return fs.mkdtemp(path.join(os.tmpdir(), "engine-iconlibs-"))
}

describe("findIconLibImports", () => {
  it("returns empty list when source uses no banned icon libs", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "a.ts"), `import { foo } from "@forkshop/lib/foo"\n`)
    const violations = await findIconLibImports(dir)
    expect(violations).toEqual([])
  })

  it("flags lucide-react imports", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "a.tsx"), `import { X } from "lucide-react"\n`)
    const violations = await findIconLibImports(dir)
    expect(violations).toHaveLength(1)
    expect(violations[0].match).toContain("lucide-react")
  })

  it("flags iconoir-react, @heroicons, react-icons, phosphor-react", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "a.tsx"), [
      `import { X } from "iconoir-react"`,
      `import { Foo } from "@heroicons/react/24/outline"`,
      `import { Bar } from "react-icons/fa"`,
      `import { Baz } from "phosphor-react"`,
    ].join("\n"))
    const violations = await findIconLibImports(dir)
    expect(violations).toHaveLength(4)
  })

  it("ignores @central-icons-react", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(
      path.join(dir, "a.tsx"),
      `import X from "@central-icons-react/square-outlined-radius-0-stroke-2/X"\n`,
    )
    const violations = await findIconLibImports(dir)
    expect(violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails (module not yet implemented)**

Run: `pnpm --filter @forkshop/engine vitest run scripts/check-no-icon-libs.test.ts`
Expected: FAIL with module-not-found error.

- [ ] **Step 3: Implement `check-no-icon-libs.ts`**

Create `packages/engine/scripts/check-no-icon-libs.ts`:

```ts
import { promises as fs } from "node:fs"
import path from "node:path"
import { SRC_ROOT, walkTsFiles } from "./_utils.js"

const BANNED_LIBS = [
  /from\s+["']lucide-react["']/,
  /from\s+["']iconoir-react["']/,
  /from\s+["']@heroicons\//,
  /from\s+["']react-icons\//,
  /from\s+["']phosphor-react["']/,
]

export interface Violation {
  file: string
  match: string
}

export async function findIconLibImports(root: string = SRC_ROOT): Promise<Violation[]> {
  const files = await walkTsFiles(root)
  const violations: Violation[] = []
  for (const abs of files) {
    const content = await fs.readFile(abs, "utf8")
    for (const re of BANNED_LIBS) {
      const m = re.exec(content)
      if (m) {
        violations.push({ file: path.relative(root, abs), match: m[0] })
      }
    }
  }
  return violations
}

async function main() {
  const violations = await findIconLibImports()
  if (violations.length > 0) {
    console.error("Found external icon-library imports — use @forkshop/lib/icons (Central Icons) instead:\n")
    for (const v of violations) {
      console.error(`  ${v.file}:  ${v.match}`)
    }
    process.exit(1)
  }
  console.log("OK. No external icon-library imports.")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @forkshop/engine vitest run scripts/check-no-icon-libs.test.ts`
Expected: PASS, 4 tests green.

- [ ] **Step 5: Wire into engine `lint` script**

Edit `packages/engine/package.json`:

```jsonc
{
  "scripts": {
    "lint": "eslint src && tsx scripts/check-canonical-imports.ts && tsx scripts/check-no-icon-libs.ts"
  }
}
```

- [ ] **Step 6: Run lint to confirm wiring**

Run: `pnpm --filter @forkshop/engine lint`
Expected: green (or yellow with a warning about `lucide-react` — that's expected because we haven't swapped icons yet; it should fail at the new check, confirming the lint is hooked).

If lint fails because of existing `lucide-react` imports, that's the intended signal — Task 9 fixes them.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/scripts/check-no-icon-libs.ts packages/engine/scripts/check-no-icon-libs.test.ts packages/engine/package.json
git commit -m "feat(engine): add check-no-icon-libs lint guard

Fails the build if anything under src/ imports lucide-react,
iconoir-react, @heroicons/*, react-icons/*, or phosphor-react.
Currently fails because three call sites still use lucide-react;
they're swapped in the next commit."
```

---

## Task 9: Swap `lucide-react` → Central Icons (`src/lib/icons.ts` + three call sites)

**Why:** Core of the icon strategy. `forkshopIcons` keeps the same external shape; only its imports change. Call sites get updated to use the local `forkshopIcons` map.

**Files:**
- Modify: `packages/engine/src/lib/icons.ts`
- Modify: `packages/engine/src/components/sidebar/help-modal.tsx`
- Modify: `packages/engine/src/components/canvas/edit-popover.tsx`
- Modify: `packages/engine/src/components/sidebar/forkshop-sidebar.tsx`

- [ ] **Step 1: Confirm Central icon component names**

Inspect the installed package to learn the actual exported icon names:

Run: `ls node_modules/@central-icons-react/square-outlined-radius-0-stroke-2/ | head -50`
Expected: directory listing showing per-icon folders (e.g., `ChevronDown/`, `ChevronRight/`, etc.).

If any of the names below differ in Central's vocabulary, substitute the closest match. Likely renames:
- `SwatchBook` may be `Palette`, `ColorSwatch`, or similar.
- `Network` may be `Diagram`, `Connection`, or similar.
- `File` may be `Document`, `Page`, or similar.

Note the actual names; use them in Step 2.

- [ ] **Step 2: Rewrite `src/lib/icons.ts`**

Replace the contents of `packages/engine/src/lib/icons.ts`:

```ts
import ChevronDown  from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronDown"
import ChevronRight from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronRight"
import ChevronLeft  from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronLeft"
import ChevronUp    from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronUp"
import ArrowLeft    from "@central-icons-react/square-outlined-radius-0-stroke-2/ArrowLeft"
import Check        from "@central-icons-react/square-outlined-radius-0-stroke-2/Check"
import Close        from "@central-icons-react/square-outlined-radius-0-stroke-2/Close"
import Plus         from "@central-icons-react/square-outlined-radius-0-stroke-2/Plus"
import Search       from "@central-icons-react/square-outlined-radius-0-stroke-2/Search"
import Info         from "@central-icons-react/square-outlined-radius-0-stroke-2/Info"
import File         from "@central-icons-react/square-outlined-radius-0-stroke-2/File"
import Box          from "@central-icons-react/square-outlined-radius-0-stroke-2/Box"
import Network      from "@central-icons-react/square-outlined-radius-0-stroke-2/Network"
import SwatchBook   from "@central-icons-react/square-outlined-radius-0-stroke-2/SwatchBook"

import type { ForkshopIconComponent } from "@forkshop/components/icon"

/**
 * Preselected icons for Forkshop's known concepts.
 *
 * Sourced from @central-icons-react/square-outlined-radius-0-stroke-2 (Central
 * Icon Set, used under license). Bundled at engine-build time; the published
 * @forkshop/engine artifact has no runtime icon dependency.
 */
export const forkshopIcons = {
  // Section / board defaults
  designSystem:  SwatchBook,
  components:    Box,
  pages:         File,
  sitemap:       Network,
  navigation:    Network,
  flows:         Network,

  // Entity types
  page:          File,
  block:         Box,

  // UI affordances
  info:          Info,
  back:          ArrowLeft,
  close:         Close,
  check:         Check,
  plus:          Plus,
  search:        Search,
  chevronDown:   ChevronDown,
  chevronUp:     ChevronUp,
  chevronLeft:   ChevronLeft,
  chevronRight:  ChevronRight,
} satisfies Record<string, ForkshopIconComponent>

export type ForkshopIconName = keyof typeof forkshopIcons
```

- [ ] **Step 3: Verify prop-shape compatibility with `ForkshopIconComponent`**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: green. If TypeScript complains that the Central icon components are incompatible with `ForkshopIconComponent` (because they don't accept the `strokeWidth` or `size` props in the exact shape), relax the `ForkshopIconComponent` type in `src/components/icon.tsx`:

```tsx
import type { ComponentType, SVGProps } from "react"

// Compatible with Central icons, Lucide, Iconoir, and most SVG-based icon libraries.
export type ForkshopIconComponent = ComponentType<SVGProps<SVGSVGElement>>

type ForkshopIconProps = {
  icon: ForkshopIconComponent
  className?: string
  "aria-label"?: string
  "aria-hidden"?: boolean
}

export function ForkshopIcon({ icon: Icon, className, ...rest }: ForkshopIconProps) {
  return <Icon className={className} aria-hidden={rest["aria-label"] ? undefined : true} {...rest} />
}
```

This drops the explicit `strokeWidth={2}` prop pass-through. Central icons are stroke-2 by design (the package name says so); no override needed.

- [ ] **Step 4: Update `help-modal.tsx`**

Edit `packages/engine/src/components/sidebar/help-modal.tsx`. Replace:

```tsx
import { X } from "lucide-react"
```

with:

```tsx
import { ForkshopIcon } from "@forkshop/components/icon"
import { forkshopIcons } from "@forkshop/lib/icons"
```

Then anywhere the component renders `<X ... />`, swap to `<ForkshopIcon icon={forkshopIcons.close} ... />`.

- [ ] **Step 5: Update `edit-popover.tsx`**

Edit `packages/engine/src/components/canvas/edit-popover.tsx`. Replace:

```tsx
import { Check, X } from "lucide-react"
```

with:

```tsx
import { ForkshopIcon } from "@forkshop/components/icon"
import { forkshopIcons } from "@forkshop/lib/icons"
```

Swap `<Check ... />` → `<ForkshopIcon icon={forkshopIcons.check} ... />` and `<X ... />` → `<ForkshopIcon icon={forkshopIcons.close} ... />`.

- [ ] **Step 6: Update `forkshop-sidebar.tsx`**

Edit `packages/engine/src/components/sidebar/forkshop-sidebar.tsx`. Replace:

```tsx
import { ChevronDown, ChevronRight, Info, File } from "lucide-react";
```

with:

```tsx
import { ForkshopIcon } from "@forkshop/components/icon"
import { forkshopIcons } from "@forkshop/lib/icons"
```

Swap each rendered icon to `<ForkshopIcon icon={forkshopIcons.chevronDown} ... />` etc.

- [ ] **Step 7: Run lint + typecheck + tests**

Run: `pnpm --filter @forkshop/engine lint`
Expected: green. The check-no-icon-libs script now passes (no `lucide-react` imports remain).

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: green.

Run: `pnpm --filter @forkshop/engine test`
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add packages/engine/src/
git commit -m "feat(engine): swap lucide-react → @central-icons-react

forkshopIcons map now sources its icons from the Central Icon Set
(square-outlined, 2px stroke, 0 corner radius). Bundled at engine
build time; consumers of @forkshop/engine need no license key."
```

---

## Task 10: Remove `lucide-react` from engine + playground `package.json`

**Why:** With all call sites swapped in Task 9, `lucide-react` is dead weight in both packages.

**Files:**
- Modify: `packages/engine/package.json`
- Modify: `apps/playground/package.json`

- [ ] **Step 1: Verify no source consumer remains**

Run: `git grep -n "lucide-react" packages/engine/src/ apps/playground/`
Expected: empty.

- [ ] **Step 2: Remove the dep from engine `package.json`**

Edit `packages/engine/package.json`, delete the `"lucide-react": "^1.14.0"` line from `dependencies`.

- [ ] **Step 3: Remove the dep from playground `package.json`**

Edit `apps/playground/package.json`, delete the `"lucide-react": "^1.14.0"` line from `dependencies`.

- [ ] **Step 4: Refresh the lockfile**

Run: `pnpm install`
Expected: lockfile updates; `lucide-react` removed.

- [ ] **Step 5: Smoke**

Run: `pnpm typecheck && pnpm test`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/package.json apps/playground/package.json pnpm-lock.yaml
git commit -m "chore: remove lucide-react after Central Icons swap

No source consumers remain in engine or playground."
```

---

## Task 11: Add `tsup`, `esbuild-plugin-preserve-directives`, `execa`, `tsx` to engine devDeps; create `tsup.config.ts`

**Why:** Foundation of the build pipeline. Adds the tooling without yet wiring a build script.

**Files:**
- Modify: `packages/engine/package.json`
- Create: `packages/engine/tsup.config.ts`
- Create: `packages/engine/.gitignore`

- [ ] **Step 1: Add devDeps**

Edit `packages/engine/package.json`:

```jsonc
{
  "devDependencies": {
    // existing entries kept
    "esbuild-plugin-preserve-directives": "^0.0.11",
    "execa":                              "^9.0.0",
    "tsup":                               "^8.0.0",
    "tsx":                                "^4.21.0"
  }
}
```

(`tsx` may already be present from earlier work — if so, leave the existing version.)

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: deps install successfully.

- [ ] **Step 3: Create `packages/engine/tsup.config.ts`**

```ts
import { defineConfig } from "tsup"
import { preserveDirectivesPlugin } from "esbuild-plugin-preserve-directives"

export default defineConfig({
  entry: {
    "index":                              "src/index.ts",
    "api/edit/route":                     "src/api/edit/route.ts",
    "api/positions/route":                "src/api/positions/route.ts",
    "api/agent-activity/route":           "src/api/agent-activity/route.ts",
    "api/agent-activity/stream/route":    "src/api/agent-activity/stream/route.ts",
  },
  format: ["esm"],
  target: "es2022",
  platform: "neutral",
  dts: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  clean: true,
  // Empty env: prevents esbuild from substituting process.env.NODE_ENV at
  // engine-build time. The consumer's bundler does that substitution at their
  // build time, which is how production-mode degradation is meant to work.
  env: {},
  external: [
    "react", "react-dom",
    "next", "next/headers", "next/server", "next/navigation",
    "@locator/runtime",
    // @central-icons-react/... is deliberately NOT listed — tsup bundles
    // each imported icon's SVG into dist, so the published artifact has no
    // runtime icon dependency.
  ],
  esbuildPlugins: [preserveDirectivesPlugin()],
})
```

- [ ] **Step 4: Create `packages/engine/.gitignore`**

```
dist/
.tmp/
```

- [ ] **Step 5: Verify tsup runs at all**

Run: `pnpm --filter @forkshop/engine exec tsup`
Expected: tsup runs, emits files into `dist/`. It will likely complete with warnings about `"use client"` directives that the plugin should preserve — that's verified in the next task.

Verify some output exists:

Run: `ls packages/engine/dist/`
Expected: `index.js`, `index.d.ts`, `index.js.map`, `api/`, plus some `chunk-*.js` files.

If tsup errors out (e.g., on a missing entry file), fix the entry path in `tsup.config.ts` and retry.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/package.json packages/engine/tsup.config.ts packages/engine/.gitignore pnpm-lock.yaml
git commit -m "chore(engine): add tsup + plugins + initial tsup.config.ts

Tsup runs but is not yet wired into the package's build script.
That happens in the next commit."
```

---

## Task 12: Create initial `scripts/build.ts`; add `build`/`dev` scripts

**Why:** Wire tsup into the engine's `package.json` scripts so `pnpm --filter @forkshop/engine build` actually invokes the pipeline. Verification scripts come in later tasks; this one just runs tsup as the first step.

**Files:**
- Create: `packages/engine/scripts/build.ts`
- Modify: `packages/engine/package.json` (scripts)

- [ ] **Step 1: Create the orchestrator**

Create `packages/engine/scripts/build.ts`:

```ts
import { execa } from "execa"

const isWatch = process.argv.includes("--watch")

async function runTsup() {
  const args = ["tsup"]
  if (isWatch) args.push("--watch")
  await execa("pnpm", ["exec", ...args], { stdio: "inherit", cwd: process.cwd() })
}

async function main() {
  await runTsup()
  if (isWatch) return  // watch mode: tsup keeps running, no further steps
  console.log("✓ tsup complete")
  // verify-directives → compile-css → copy-assets → verify-tarball added in
  // subsequent tasks.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Wire scripts**

Edit `packages/engine/package.json`:

```jsonc
{
  "scripts": {
    "build":     "tsx scripts/build.ts",
    "dev":       "tsx scripts/build.ts --watch",
    "typecheck": "tsc --noEmit",
    "lint":      "eslint src && tsx scripts/check-canonical-imports.ts && tsx scripts/check-no-icon-libs.ts",
    "test":      "vitest run"
  }
}
```

- [ ] **Step 3: Run the build**

Run: `pnpm --filter @forkshop/engine build`
Expected: tsup runs, `dist/` populated, "✓ tsup complete" printed.

- [ ] **Step 4: Spot-check `"use client"` survived**

Run: `head -1 packages/engine/dist/index.js`
The first line MAY be `"use client";` (if the index barrel module is treated as a client module by the bundler) or another statement. Look at the file structure:

Run: `grep -l '"use client"' packages/engine/dist/**/*.js 2>/dev/null | head`
Expected: at least one match (a chunk file containing the canvas or sidebar code).

If zero matches, the directives plugin isn't working — debug `tsup.config.ts` (verify `esbuildPlugins: [preserveDirectivesPlugin()]` is present). Don't proceed to Step 5 until at least one chunk preserves the directive.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/scripts/build.ts packages/engine/package.json
git commit -m "feat(engine): wire scripts/build.ts as build orchestrator

Currently runs tsup only; verify-directives, compile-css, copy-assets,
and verify-tarball are added as separate steps in subsequent commits."
```

---

## Task 13: Add `verify-directives.ts` + test; integrate into `build.ts`

**Why:** Lock down `"use client"` survival deterministically — both that client files keep the directive and that route handlers don't gain it.

**Files:**
- Create: `packages/engine/scripts/verify-directives.ts`
- Create: `packages/engine/scripts/verify-directives.test.ts`
- Modify: `packages/engine/scripts/build.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/engine/scripts/verify-directives.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"
import { runDirectiveChecks } from "./verify-directives.js"

async function mkdtemp() {
  return fs.mkdtemp(path.join(os.tmpdir(), "engine-directives-"))
}

describe("runDirectiveChecks", () => {
  it("passes when at least one dist chunk has 'use client' and no api/* file does", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `"use client";\nexport const X = 1\n`)
    await fs.mkdir(path.join(dir, "api/edit"), { recursive: true })
    await fs.writeFile(path.join(dir, "api/edit/route.js"), `export async function POST() {}\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("fails when no dist chunk has 'use client'", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `export const X = 1\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.join("\n")).toContain("No dist chunk")
  })

  it("fails when an api/* route handler is client-tagged", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `"use client";\nexport const X = 1\n`)
    await fs.mkdir(path.join(dir, "api/edit"), { recursive: true })
    await fs.writeFile(path.join(dir, "api/edit/route.js"), `"use client";\nexport async function POST() {}\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.join("\n")).toContain("api/edit/route.js")
  })

  it("accepts single-quoted 'use client'", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `'use client';\nexport const X = 1\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm --filter @forkshop/engine vitest run scripts/verify-directives.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `verify-directives.ts`**

Create `packages/engine/scripts/verify-directives.ts`:

```ts
import { promises as fs } from "node:fs"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

const USE_CLIENT_RE = /^\s*(['"])use client\1\s*;?/

export interface CheckResult {
  ok: boolean
  errors: string[]
}

async function walkJsFiles(dir: string, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walkJsFiles(full, out)
    else if (entry.name.endsWith(".js")) out.push(full)
  }
  return out
}

async function fileStartsWithUseClient(filePath: string): Promise<boolean> {
  const content = await fs.readFile(filePath, "utf8")
  return USE_CLIENT_RE.test(content)
}

export async function runDirectiveChecks(distDir: string): Promise<CheckResult> {
  const errors: string[] = []
  const allFiles = await walkJsFiles(distDir)

  // Check 1: at least one chunk preserves "use client"
  let foundClient = false
  for (const f of allFiles) {
    if (await fileStartsWithUseClient(f)) {
      foundClient = true
      break
    }
  }
  if (!foundClient) {
    errors.push(`No dist chunk preserves a "use client" directive. The directives plugin likely failed.`)
  }

  // Check 2: no api/* file is client-tagged
  const apiFiles = allFiles.filter((f) => /\/api\//.test(f))
  for (const f of apiFiles) {
    if (await fileStartsWithUseClient(f)) {
      errors.push(`Route handler should not carry "use client": ${path.relative(distDir, f)}`)
    }
  }

  return { ok: errors.length === 0, errors }
}

async function main() {
  const distDir = path.join(ENGINE_ROOT, "dist")
  const result = await runDirectiveChecks(distDir)
  if (!result.ok) {
    console.error("verify-directives FAILED:\n")
    for (const e of result.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log("✓ directives verified")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @forkshop/engine vitest run scripts/verify-directives.test.ts`
Expected: PASS, 4 tests green.

- [ ] **Step 5: Integrate into `build.ts`**

Edit `packages/engine/scripts/build.ts`:

```ts
import { execa } from "execa"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"
import { runDirectiveChecks } from "./verify-directives.js"

const isWatch = process.argv.includes("--watch")

async function runTsup() {
  const args = ["tsup"]
  if (isWatch) args.push("--watch")
  await execa("pnpm", ["exec", ...args], { stdio: "inherit", cwd: process.cwd() })
}

async function main() {
  await runTsup()
  if (isWatch) return
  console.log("✓ tsup complete")

  const dist = path.join(ENGINE_ROOT, "dist")
  const directives = await runDirectiveChecks(dist)
  if (!directives.ok) {
    console.error("verify-directives FAILED:\n")
    for (const e of directives.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log("✓ directives verified")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 6: Run the full build**

Run: `pnpm --filter @forkshop/engine build`
Expected: tsup + directives both pass. Console output ends with `✓ directives verified`.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/scripts/verify-directives.ts packages/engine/scripts/verify-directives.test.ts packages/engine/scripts/build.ts
git commit -m "feat(engine): add verify-directives step to build pipeline

Asserts at least one dist chunk preserves \"use client\" and no
api/* route handler is client-tagged. Build aborts if either check
fails."
```

---

## Task 14: Simplify preset font stack (drop `--font-raveo` override knob)

**Why:** Strategy v2 says "no font override at 1.0." The `var(--font-raveo, Raveo)` wrapper exists only to allow override; the override is going away.

**Files:**
- Modify: `packages/engine/tailwind/forkshop-preset.ts`

- [ ] **Step 1: Update the font stack**

In `packages/engine/tailwind/forkshop-preset.ts`, find the `fontFamily` block:

```ts
fontFamily: {
  "forkshop-sans": ["var(--font-raveo, Raveo)", "Inter", "system-ui", "sans-serif"],
},
```

Replace with:

```ts
fontFamily: {
  "forkshop-sans": ["Raveo", "Inter", "system-ui", "sans-serif"],
},
```

Also remove the long comment block above the `fontFamily` entry that explains the `, Raveo` in-var() fallback — that mechanism no longer exists. Replace the multi-line comment with a one-liner if helpful:

```ts
// "Raveo" resolves via the @font-face declared in forkshop.css.
```

- [ ] **Step 2: Verify the preset still typechecks**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/tailwind/forkshop-preset.ts
git commit -m "refactor(engine): drop --font-raveo override knob from preset

Strategy v2 says no font override at 1.0. Forkshop chrome resolves
Raveo via the @font-face in forkshop.css; no host override path."
```

---

## Task 15: Add CSS compile pipeline (preset compile, build config, entry CSS, compile-css.ts)

**Why:** The output `dist/forkshop.css` is the file the host imports. Today the host scans engine source for utilities; after this task, the engine ships them pre-compiled.

**Files:**
- Create: `packages/engine/scripts/compile-preset.ts`
- Create: `packages/engine/tailwind/build.config.cjs`
- Create: `packages/engine/src/styles/forkshop.entry.css`
- Create: `packages/engine/scripts/compile-css.ts`
- Modify: `packages/engine/scripts/build.ts`

- [ ] **Step 1: Create `scripts/compile-preset.ts`**

This emits `.tmp/forkshop-preset.cjs` from the TS source so Tailwind CLI v3 (CJS) can require it.

```ts
import { build } from "esbuild"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

const presetSrc = path.join(ENGINE_ROOT, "tailwind", "forkshop-preset.ts")
const out = path.join(ENGINE_ROOT, ".tmp", "forkshop-preset.cjs")

await build({
  entryPoints: [presetSrc],
  outfile: out,
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
})

console.log(`✓ wrote ${out}`)
```

- [ ] **Step 2: Create `tailwind/build.config.cjs`**

```js
const forkshopPreset = require("../.tmp/forkshop-preset.cjs")

module.exports = {
  presets: [forkshopPreset.default ?? forkshopPreset],
  content: ["./src/**/*.{ts,tsx}"],
}
```

(The `.default ?? forkshopPreset` handles both CJS-default-export and ESM-shaped output depending on esbuild's wrapping.)

- [ ] **Step 3: Create the CSS entry file**

Create `packages/engine/src/styles/forkshop.entry.css`:

```css
/*
 * Engine CSS entry. Tailwind CLI consumes this file in the build pipeline
 * and emits dist/forkshop.css. Only utilities are emitted — host's own
 * Tailwind handles base/components.
 */
@import "../../tailwind/forkshop.css";   /* :root vars + @font-face */
@tailwind utilities;
```

- [ ] **Step 4: Create `scripts/compile-css.ts`**

```ts
import { execa } from "execa"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

export async function compileCss() {
  // Compile the TS preset → .tmp/forkshop-preset.cjs for Tailwind CLI consumption.
  await execa("tsx", ["scripts/compile-preset.ts"], {
    stdio: "inherit",
    cwd: ENGINE_ROOT,
  })

  await execa(
    "npx",
    [
      "tailwindcss",
      "-c", "tailwind/build.config.cjs",
      "-i", "src/styles/forkshop.entry.css",
      "-o", "dist/forkshop.css",
      "--minify",
    ],
    {
      stdio: "inherit",
      cwd: ENGINE_ROOT,
      env: { ...process.env, NODE_ENV: "production" },
    },
  )

  // Verify the output is sane
  const distCss = path.join(ENGINE_ROOT, "dist/forkshop.css")
  const fs = await import("node:fs/promises")
  const content = await fs.readFile(distCss, "utf8")
  const errors: string[] = []
  if (!content.includes("@font-face")) errors.push("missing @font-face block")
  if (!content.includes(":root")) errors.push("missing :root block")
  if (!content.includes("/fonts/forkshop/RaveoVF.woff2")) errors.push("missing font URL")
  const sizeKB = Buffer.byteLength(content) / 1024
  if (sizeKB > 30) errors.push(`dist/forkshop.css ${sizeKB.toFixed(1)}KB > 30KB budget`)
  if (errors.length > 0) {
    console.error("compile-css verification FAILED:")
    for (const e of errors) console.error(`  - ${e}`)
    throw new Error("compile-css failed")
  }
  console.log(`✓ dist/forkshop.css (${sizeKB.toFixed(1)}KB) verified`)
}
```

- [ ] **Step 5: Integrate into `scripts/build.ts`**

Edit `packages/engine/scripts/build.ts`:

```ts
import { execa } from "execa"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"
import { runDirectiveChecks } from "./verify-directives.js"
import { compileCss } from "./compile-css.js"

const isWatch = process.argv.includes("--watch")

async function runTsup() {
  const args = ["tsup"]
  if (isWatch) args.push("--watch")
  await execa("pnpm", ["exec", ...args], { stdio: "inherit", cwd: process.cwd() })
}

async function main() {
  await runTsup()
  if (isWatch) return
  console.log("✓ tsup complete")

  const dist = path.join(ENGINE_ROOT, "dist")
  const directives = await runDirectiveChecks(dist)
  if (!directives.ok) {
    console.error("verify-directives FAILED:")
    for (const e of directives.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log("✓ directives verified")

  await compileCss()
  // copy-assets + verify-tarball added in later tasks
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 6: Build and inspect output**

Run: `pnpm --filter @forkshop/engine build`
Expected: completes, output ends with `✓ dist/forkshop.css (N.NKB) verified`.

Run: `ls packages/engine/dist/forkshop.css && head -c 200 packages/engine/dist/forkshop.css`
Expected: file exists, content begins with `@font-face` (minified).

- [ ] **Step 7: Commit**

```bash
git add packages/engine/scripts/compile-preset.ts packages/engine/scripts/compile-css.ts packages/engine/tailwind/build.config.cjs packages/engine/src/styles/forkshop.entry.css packages/engine/scripts/build.ts
git commit -m "feat(engine): add CSS compile pipeline

Tailwind CLI runs at engine-build time against src/**/*.{ts,tsx},
emits dist/forkshop.css with utilities + :root vars + @font-face.
Host imports the single CSS file; no source scanning required."
```

---

## Task 16: Add `copy-assets.ts`; integrate into `build.ts`

**Why:** Engine ships Raveo woff2 inside `dist/fonts/` so the install path is self-contained.

**Files:**
- Create: `packages/engine/scripts/copy-assets.ts`
- Modify: `packages/engine/scripts/build.ts`

- [ ] **Step 1: Create `copy-assets.ts`**

```ts
import { mkdir, copyFile, stat } from "node:fs/promises"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

export async function copyAssets() {
  const srcFont = path.join(ENGINE_ROOT, "fonts", "raveo", "RaveoVF.woff2")
  const dstFont = path.join(ENGINE_ROOT, "dist", "fonts", "RaveoVF.woff2")

  await mkdir(path.dirname(dstFont), { recursive: true })
  await copyFile(srcFont, dstFont)

  const srcStat = await stat(srcFont)
  const dstStat = await stat(dstFont)
  if (srcStat.size !== dstStat.size) {
    throw new Error(`Font copy size mismatch: src=${srcStat.size} dst=${dstStat.size}`)
  }
  if (dstStat.size === 0) {
    throw new Error(`Copied font is zero bytes`)
  }
  console.log(`✓ copied RaveoVF.woff2 (${(dstStat.size / 1024).toFixed(1)}KB)`)
}
```

- [ ] **Step 2: Integrate into `build.ts`**

Edit `packages/engine/scripts/build.ts`, add the import and call after `compileCss()`:

```ts
import { copyAssets } from "./copy-assets.js"

// ... in main(), after compileCss():
await copyAssets()
// verify-tarball added in a later task
```

- [ ] **Step 3: Build**

Run: `pnpm --filter @forkshop/engine build`
Expected: output ends with `✓ copied RaveoVF.woff2 (N.NKB)`.

Run: `ls packages/engine/dist/fonts/`
Expected: `RaveoVF.woff2` exists.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/scripts/copy-assets.ts packages/engine/scripts/build.ts
git commit -m "feat(engine): copy RaveoVF.woff2 into dist/fonts/

Engine ships the font binary inside the published tarball; the CLI
(and the playground's postinstall) copies it into the host's
public/fonts/forkshop/ at install time."
```

---

## Task 17: Finalize engine `package.json` (exports, files, sideEffects, engines, publishConfig, license)

**Why:** Now that `dist/` contents are known and stable, lock the published shape in `package.json`.

**Files:**
- Modify: `packages/engine/package.json`

- [ ] **Step 1: Update the package.json fields**

The final `packages/engine/package.json` should look like:

```jsonc
{
  "name": "@forkshop/engine",
  "version": "0.0.0",
  "private": false,
  "license": "FSL-1.1-Apache-2.0",
  "description": "Forkshop's canvas + sidebar engine for Next.js + Tailwind projects.",
  "homepage": "https://forkshop.dev",
  "repository": {
    "type": "git",
    "url": "https://github.com/jakubfoglar/forkshop.git",
    "directory": "packages/engine"
  },
  "bugs": "https://github.com/jakubfoglar/forkshop/issues",
  "publishConfig": { "access": "public" },
  "type": "module",
  "sideEffects": ["**/*.css"],
  "engines": { "node": ">=18.18.0" },
  "files": [
    "dist",
    "LICENSE",
    "LICENSE-icons.md",
    "README.md"
  ],
  "exports": {
    ".":                                 "./dist/index.js",
    "./forkshop.css":                    "./dist/forkshop.css",
    "./api/edit/route":                  "./dist/api/edit/route.js",
    "./api/positions/route":             "./dist/api/positions/route.js",
    "./api/agent-activity/route":        "./dist/api/agent-activity/route.js",
    "./api/agent-activity/stream/route": "./dist/api/agent-activity/stream/route.js"
  },
  "scripts": {
    "build":     "tsx scripts/build.ts",
    "dev":       "tsx scripts/build.ts --watch",
    "typecheck": "tsc --noEmit",
    "lint":      "eslint src && tsx scripts/check-canonical-imports.ts && tsx scripts/check-no-icon-libs.ts",
    "test":      "vitest run"
  },
  "peerDependencies": {
    "next":      ">=14",
    "react":     ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "@locator/runtime": "^0.5.1",
    "clsx":             "^2.1.1"
  },
  "devDependencies": {
    "@central-icons-react/square-outlined-radius-0-stroke-2": "^1.1.237",
    "@types/react":                                            "^18.3.0",
    "@types/react-dom":                                        "^18.3.0",
    "esbuild-plugin-preserve-directives":                      "^0.0.11",
    "eslint-plugin-react-hooks":                               "^7.1.1",
    "execa":                                                   "^9.0.0",
    "next":                                                    "^14.2.0",
    "react":                                                   "^18.3.0",
    "react-dom":                                               "^18.3.0",
    "tailwindcss":                                             "^3.4.0",
    "tsup":                                                    "^8.0.0",
    "tsx":                                                     "^4.21.0",
    "vitest":                                                  "^2.0.0"
  }
}
```

The `main` field that previously pointed at `./src/index.ts` is removed. Only `exports` is consulted.

- [ ] **Step 2: Remove `main` if still present**

Open `packages/engine/package.json` and confirm no `"main"` key remains.

- [ ] **Step 3: Refresh lockfile + smoke**

Run: `pnpm install && pnpm --filter @forkshop/engine build && pnpm --filter @forkshop/engine typecheck && pnpm --filter @forkshop/engine test`
Expected: all green.

- [ ] **Step 4: Sanity check resolution**

Run: `node -e "console.log(require.resolve('@forkshop/engine'))"` from anywhere inside the workspace.
Expected: prints a path ending with `packages/engine/dist/index.js` (not `src/index.ts` anymore).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/package.json pnpm-lock.yaml
git commit -m "feat(engine): finalize package.json for publishability

Switches resolution to dist/, adds files allowlist, sets sideEffects
to preserve CSS imports while tree-shaking JS, declares
engines.node >= 18.18.0 (matches Next 14 minimum)."
```

---

## Task 18: Add `verify-tarball.ts` + test; integrate into `build.ts`

**Why:** Final gate. Catches the most common publish embarrassments (TS sources leaked, tests shipped, missing LICENSE, etc.) before they reach users.

**Files:**
- Create: `packages/engine/scripts/verify-tarball.ts`
- Create: `packages/engine/scripts/verify-tarball.test.ts`
- Modify: `packages/engine/scripts/build.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/engine/scripts/verify-tarball.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { matchTarballContents } from "./verify-tarball.js"

describe("matchTarballContents", () => {
  const okContents = [
    "package/package.json",
    "package/LICENSE",
    "package/LICENSE-icons.md",
    "package/README.md",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/dist/forkshop.css",
    "package/dist/fonts/RaveoVF.woff2",
    "package/dist/api/edit/route.js",
    "package/dist/api/positions/route.js",
    "package/dist/api/agent-activity/route.js",
    "package/dist/api/agent-activity/stream/route.js",
  ]

  it("passes for a clean expected tarball", () => {
    const result = matchTarballContents(okContents)
    expect(result.errors).toEqual([])
  })

  it("flags missing required files", () => {
    const result = matchTarballContents(okContents.filter((f) => !f.endsWith("forkshop.css")))
    expect(result.errors.join("\n")).toContain("forkshop.css")
  })

  it("flags forbidden src/ leak", () => {
    const result = matchTarballContents([...okContents, "package/src/index.ts"])
    expect(result.errors.join("\n")).toContain("src/")
  })

  it("flags forbidden test files", () => {
    const result = matchTarballContents([...okContents, "package/dist/api/edit/route.test.js"])
    expect(result.errors.join("\n")).toContain("test")
  })

  it("flags forbidden templates/, skill/, tailwind/ leaks", () => {
    const result1 = matchTarballContents([...okContents, "package/templates/user-claude-md.md"])
    expect(result1.errors.join("\n")).toContain("templates")
    const result2 = matchTarballContents([...okContents, "package/src/skill/setup.md"])
    expect(result2.errors.join("\n")).toContain("skill")
    const result3 = matchTarballContents([...okContents, "package/tailwind/forkshop-preset.ts"])
    expect(result3.errors.join("\n")).toContain("tailwind")
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm --filter @forkshop/engine vitest run scripts/verify-tarball.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `verify-tarball.ts`**

```ts
import { promises as fs } from "node:fs"
import path from "node:path"
import { execa } from "execa"
import { ENGINE_ROOT } from "./_utils.js"

const REQUIRED = [
  "package/package.json",
  "package/LICENSE",
  "package/LICENSE-icons.md",
  "package/README.md",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/forkshop.css",
  "package/dist/fonts/RaveoVF.woff2",
  "package/dist/api/edit/route.js",
  "package/dist/api/positions/route.js",
  "package/dist/api/agent-activity/route.js",
  "package/dist/api/agent-activity/stream/route.js",
]

const FORBIDDEN_PATTERNS: RegExp[] = [
  /^package\/src\//,
  /^package\/templates\//,
  /^package\/src\/skill\//,
  /^package\/tailwind\//,
  /^package\/scripts\//,
  /^package\/fonts\/raveo\//,
  /^package\/\.tmp\//,
  /^package\/node_modules\//,
  /\.test\.(ts|tsx|js)$/,
  /^package\/tsup\.config\.ts$/,
  /^package\/vitest\.config\.ts$/,
  /^package\/tsconfig\.json$/,
]

export interface CheckResult {
  errors: string[]
}

export function matchTarballContents(entries: string[]): CheckResult {
  const errors: string[] = []
  for (const req of REQUIRED) {
    if (!entries.includes(req)) {
      errors.push(`Tarball missing required file: ${req}`)
    }
  }
  for (const entry of entries) {
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(entry)) {
        errors.push(`Tarball contains forbidden path: ${entry}`)
        break
      }
    }
  }
  return { errors }
}

async function listTarball(tgzPath: string): Promise<string[]> {
  const { stdout } = await execa("tar", ["-tzf", tgzPath])
  return stdout.split("\n").map((s) => s.trim()).filter(Boolean)
}

async function readFromTarball(tgzPath: string, member: string): Promise<string> {
  const { stdout } = await execa("tar", ["-xzOf", tgzPath, member])
  return stdout
}

async function main() {
  // Pack into .tmp/
  const tmpDir = path.join(ENGINE_ROOT, ".tmp")
  await fs.mkdir(tmpDir, { recursive: true })
  await execa("pnpm", ["pack", "--pack-destination", tmpDir], {
    stdio: "inherit",
    cwd: ENGINE_ROOT,
  })

  const tgz = (await fs.readdir(tmpDir))
    .filter((f) => f.endsWith(".tgz"))
    .map((f) => path.join(tmpDir, f))
    .sort()
    .pop()
  if (!tgz) throw new Error("Could not locate packed tarball")

  const contents = await listTarball(tgz)
  const result = matchTarballContents(contents)

  // JS quality assertions
  const indexJs = await readFromTarball(tgz, "package/dist/index.js")
  if (!indexJs.includes("process.env.NODE_ENV")) {
    result.errors.push("dist/index.js: process.env.NODE_ENV got substituted at build time (should be runtime ref)")
  }
  if (indexJs.includes("@central-icons-react")) {
    result.errors.push("dist/index.js: @central-icons-react appears externalized (should be bundled in)")
  }

  // Top-level static import of @locator/runtime → disallowed
  // Match `from "@locator/runtime"` not preceded by `import(` (which is dynamic).
  if (/(?<!import\([^)]*?)\bfrom\s+["']@locator\/runtime["']/.test(indexJs)) {
    result.errors.push("dist/index.js: @locator/runtime has top-level static import (should be dynamic)")
  }

  // Tarball size sanity
  const stat = await fs.stat(tgz)
  const kb = stat.size / 1024
  if (kb > 500) {
    result.errors.push(`tarball is ${kb.toFixed(1)}KB > 500KB budget`)
  }

  if (result.errors.length > 0) {
    console.error("verify-tarball FAILED:")
    for (const e of result.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`✓ tarball verified (${kb.toFixed(1)}KB, ${contents.length} entries)`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Run the unit test to confirm it passes**

Run: `pnpm --filter @forkshop/engine vitest run scripts/verify-tarball.test.ts`
Expected: PASS, 5 tests green.

- [ ] **Step 5: Run verify-tarball end-to-end against current dist**

Run: `pnpm --filter @forkshop/engine exec tsx scripts/verify-tarball.ts`
Expected: PASS, output ends with `✓ tarball verified (N.NKB, NN entries)`.

If anything fails, the actionable errors point at what's wrong (likely a stray file in `dist/` or a missing one). Fix and re-run.

- [ ] **Step 6: Integrate into `build.ts`**

Edit `packages/engine/scripts/build.ts`. After `await copyAssets()`, add a tarball verification step. Since `verify-tarball.ts` has its own `main()` and runs as a child process, just spawn it:

```ts
// After copyAssets()...
await execa("tsx", ["scripts/verify-tarball.ts"], {
  stdio: "inherit",
  cwd: ENGINE_ROOT,
})
```

- [ ] **Step 7: Run the full build pipeline**

Run: `pnpm --filter @forkshop/engine build`
Expected: pipeline completes — tsup → directives → CSS → assets → tarball verify — all green.

- [ ] **Step 8: Commit**

```bash
git add packages/engine/scripts/verify-tarball.ts packages/engine/scripts/verify-tarball.test.ts packages/engine/scripts/build.ts
git commit -m "feat(engine): add verify-tarball gate to build pipeline

pnpm pack + assert published-tarball contents:
- required files present (LICENSE, README, dist/*.{js,d.ts,css,woff2})
- no forbidden leaks (src/, templates/, tests, configs)
- JS quality (NODE_ENV not substituted, icons bundled, locator
  dynamic-imported, tarball < 500KB)

Final gate before publish."
```

---

## Task 19: Update playground `package.json` (drop `lucide-react` reference if any, add postinstall)

**Why:** Playground stops being special. The postinstall script copies the engine's font into the playground's `public/`.

**Files:**
- Modify: `apps/playground/package.json`

- [ ] **Step 1: Update scripts**

Edit `apps/playground/package.json`:

```jsonc
{
  "name": "playground",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "postinstall": "node scripts/copy-engine-fonts.mjs",
    "dev":         "next dev",
    "build":       "next build",
    "start":       "next start",
    "typecheck":   "tsc --noEmit",
    "lint":        "eslint app components lib --ext .ts,.tsx"
  },
  "dependencies": {
    "@forkshop/engine": "workspace:*",
    "clsx":             "^2.1.1",
    "next":             "^14.2.0",
    "react":            "^18.3.0",
    "react-dom":        "^18.3.0"
  },
  "devDependencies": {
    "@locator/webpack-loader": "^0.5.1",
    "@types/node":             "^20.0.0",
    "@types/react":            "^18.3.0",
    "@types/react-dom":        "^18.3.0",
    "autoprefixer":            "^10.4.0",
    "postcss":                 "^8.4.0",
    "tailwindcss":             "^3.4.0"
  }
}
```

(`lucide-react` should already be gone from Task 10; double-check it's absent. `@locator/webpack-loader` stays — it's the playground's host-side loader.)

- [ ] **Step 2: Commit (postinstall script comes in next task; this commit just declares it)**

```bash
git add apps/playground/package.json
git commit -m "chore(playground): declare postinstall + finalize deps

Postinstall script implemented in the next commit; deps trimmed to
exactly what the playground needs after engine packaging."
```

---

## Task 20: Create playground `scripts/copy-engine-fonts.mjs`

**Why:** The playground's `public/` needs the woff2 for the `@font-face` URL to resolve. The script mirrors what `forkshop init` will eventually do for real users.

**Files:**
- Create: `apps/playground/scripts/copy-engine-fonts.mjs`

- [ ] **Step 1: Create the script**

```js
// apps/playground/scripts/copy-engine-fonts.mjs
import { mkdir, copyFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"
import { existsSync } from "node:fs"

const require = createRequire(import.meta.url)

let src
try {
  // Real-user path: read the dist copy. Works after `pnpm --filter @forkshop/engine build`.
  src = require.resolve("@forkshop/engine/dist/fonts/RaveoVF.woff2")
} catch {
  // Fresh-clone fallback: read the workspace source.
  const pkgRoot = dirname(require.resolve("@forkshop/engine/package.json"))
  src = resolve(pkgRoot, "fonts/raveo/RaveoVF.woff2")
}

if (!existsSync(src)) {
  console.error(`copy-engine-fonts: source font not found at ${src}`)
  process.exit(1)
}

const dest = resolve("public/fonts/forkshop/RaveoVF.woff2")
await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
console.log(`✓ copied RaveoVF.woff2 → ${dest}`)
```

- [ ] **Step 2: Run it directly**

Run: `pnpm --filter playground exec node scripts/copy-engine-fonts.mjs`
Expected: prints `✓ copied RaveoVF.woff2 → .../apps/playground/public/fonts/forkshop/RaveoVF.woff2`.

Run: `ls apps/playground/public/fonts/forkshop/`
Expected: `RaveoVF.woff2`.

- [ ] **Step 3: Run a full install to verify the postinstall fires**

Run: `pnpm install`
Expected: install output includes the `✓ copied RaveoVF.woff2 → ...` line.

- [ ] **Step 4: Commit**

```bash
git add apps/playground/scripts/copy-engine-fonts.mjs
git commit -m "feat(playground): copy engine font into public/ on install

Mirrors the real-user install path that forkshop init will use.
Falls back to engine source for fresh clones where dist/ isn't built."
```

---

## Task 21: Update playground `next.config.mjs` (drop `transpilePackages` + forkshop aliases)

**Why:** With engine consumed via npm name + built dist, the source-level aliasing is no longer needed.

**Files:**
- Modify: `apps/playground/next.config.mjs`

- [ ] **Step 1: Replace the contents**

Replace `apps/playground/next.config.mjs` entirely with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @locator/runtime is browser-only (depends on solid-js/web's browser build).
  // Externalize so Next's SSR pass doesn't try to bundle it.
  experimental: {
    serverComponentsExternalPackages: ["@locator/runtime"],
  },
  turbopack: {
    rules: {
      "components/**/*.{js,jsx,ts,tsx}": {
        loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
      },
      "lib/**/*.{js,jsx,ts,tsx}": {
        loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
      },
    },
  },
  webpack: (config, { dev }) => {
    // Locator.js source-loc transform — only in dev. Attaches __source props
    // to playground JSX so Option-click in the iframe opens the file in VS Code.
    if (dev) {
      config.module.rules.push({
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: ["@locator/webpack-loader"],
      })
    }
    return config
  },
}

export default nextConfig
```

What's gone vs prior:
- `transpilePackages: ["@forkshop/engine"]`
- The entire `forkshopAliases` object + per-subdir alias entries (under `webpack.resolve.alias` and `turbopack.resolveAlias`)
- `config.resolve.extensionAlias`
- The two `turbopack.rules` entries for `src/components/**` and `src/lib/**` (those globs were targeting engine source)

- [ ] **Step 2: Smoke-run the playground (won't fully work until Task 22 + 23)**

Run: `pnpm --filter @forkshop/engine build && pnpm --filter playground dev`
Expected: Next starts. The playground may visually be broken until Task 22 (Tailwind config) and Task 23 (globals.css) — that's fine for now.

Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add apps/playground/next.config.mjs
git commit -m "chore(playground): drop transpilePackages + forkshop aliases

Engine is now a real npm-resolved dep via its built dist; the
workspace symlink in node_modules/@forkshop/engine handles resolution.
The remaining loader rules apply only to playground's own files."
```

---

## Task 22: Update playground `tailwind.config.ts` (drop preset + engine glob)

**Files:**
- Modify: `apps/playground/tailwind.config.ts`

- [ ] **Step 1: Replace the contents**

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
}

export default config
```

What's gone:
- The `import forkshopPreset from "@forkshop/engine/tailwind"` (or path-string equivalent)
- `presets: [forkshopPreset as Config]`
- The engine-source content glob

- [ ] **Step 2: Verify Tailwind config typechecks**

Run: `pnpm --filter playground typecheck`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add apps/playground/tailwind.config.ts
git commit -m "chore(playground): drop engine preset + content glob from Tailwind

Engine's forkshop-* utilities now come pre-compiled in
@forkshop/engine/forkshop.css. Playground's Tailwind only generates
utilities for its own source."
```

---

## Task 23: Update playground `globals.css` + `app/layout.tsx`

**Why:** Final wiring — host `@import`s the engine CSS, drops `next/font/local` (no override path), imports `LocatorInit` from the engine.

**Files:**
- Modify: `apps/playground/app/globals.css`
- Modify: `apps/playground/app/layout.tsx`

- [ ] **Step 1: Update `globals.css`**

Replace the contents of `apps/playground/app/globals.css` with:

```css
@import "@forkshop/engine/forkshop.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

(Drops the prior relative-path `@import` of `../../../packages/registry/tailwind/forkshop.css`.)

- [ ] **Step 2: Update `app/layout.tsx`**

Replace `apps/playground/app/layout.tsx` with:

```tsx
import { LocatorInit } from "@forkshop/engine"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-forkshop-sans bg-forkshop-surface text-forkshop-fg">
        <LocatorInit mountPath="/forkshop" />
        {children}
      </body>
    </html>
  )
}
```

(Drops `next/font/local`, the `raveo` const, and the `${raveo.variable}` className. Engine CSS resolves Raveo via its own `@font-face`.)

- [ ] **Step 3: Full smoke run**

Run: `pnpm --filter @forkshop/engine build && pnpm --filter playground dev`
Expected: Next starts; `http://localhost:3000/forkshop` renders the canvas, sidebar, icons, fonts — visually identical to before.

If something's off:
- Blank or unstyled icons: likely the `dist/forkshop.css` import isn't loading. Check browser DevTools → Network for the CSS file.
- Wrong font: confirm `apps/playground/public/fonts/forkshop/RaveoVF.woff2` exists (postinstall must have run).
- Missing engine class (`bg-forkshop-surface` etc. not styled): the `dist/forkshop.css` didn't ship the right utilities. Re-run `pnpm --filter @forkshop/engine build` and inspect output.

Kill the dev server.

- [ ] **Step 4: Run playground production build**

Run: `pnpm --filter playground build`
Expected: builds successfully.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/app/globals.css apps/playground/app/layout.tsx
git commit -m "chore(playground): consume @forkshop/engine via npm name

globals.css @imports the engine's compiled forkshop.css. layout.tsx
drops next/font/local; Raveo resolves via the engine's @font-face.
Playground now exercises the same install path real users will use."
```

---

## Task 24: Update root `pnpm dev` script + root `package.json` deps

**Why:** Root `pnpm dev` needs to run engine watch + playground dev in parallel so the playground gets HMR-style updates as engine source changes.

**Files:**
- Modify: `package.json` (workspace root)

- [ ] **Step 1: Update scripts**

Edit `package.json` (workspace root):

```jsonc
{
  "scripts": {
    "build":     "pnpm -r build",
    "dev":       "pnpm -r --parallel --filter @forkshop/engine --filter playground run dev",
    "typecheck": "pnpm -r typecheck",
    "lint":      "pnpm -r lint",
    "test":      "pnpm -r test",
    "check":     "pnpm typecheck && pnpm lint"
  }
}
```

- [ ] **Step 2: Smoke run**

Run: `pnpm dev` from the workspace root.
Expected: two streams of output interleave — engine `tsx scripts/build.ts --watch` runs tsup in watch mode; playground `next dev` starts on port 3000. The engine writes `dist/` continuously; the playground HMRs off of dist changes.

Edit `packages/engine/src/components/sidebar/forkshop-sidebar.tsx` (add a `console.log` somewhere temporary). Watch the engine rebuild within ~100ms. Refresh the playground; the log should appear.

Revert the temporary edit. Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(workspace): pnpm dev runs engine watch + playground in parallel

Engine rebuilds dist on source change; playground HMRs from the
updated dist. Matches the real-user dev experience exactly."
```

---

## Task 25: Add "First-time setup for engine builds" to maintainer `CLAUDE.md`

**Why:** A new contributor cloning the repo needs to know the iconists license key is a prerequisite for engine rebuilds. Document this once, prominently.

**Files:**
- Modify: `CLAUDE.md` (workspace root maintainer guide)

- [ ] **Step 1: Add the section**

Edit the workspace-root `CLAUDE.md`. Find a sensible location near the top — somewhere between the existing "Repo layout" section and "Commands" section. Add a new section:

```md
## First-time setup for engine builds

The engine pulls icons from `@central-icons-react/square-outlined-radius-0-stroke-2` (Central Icon Set from iconists.co), which validates a license key at install time via a preinstall script. Without the key, `pnpm install` fails the moment the engine workspace's deps install.

Setup:

1. Copy `.envrc.example` → `.envrc` and fill in the key:
   ```
   export ICONISTS_LICENSE_KEY=<your-key>
   ```
   (Exact env-var name is read from `node_modules/@central-icons-react/.../license-check.js` — confirm if it differs.)
2. `direnv allow .` (install [direnv](https://direnv.net) if you don't have it).
3. `pnpm install` — should now succeed.

Only the engine workspace needs the key. If you're contributing to CLI, docs, or playground without touching `packages/engine/src/`, you can scope install to skip engine:

```
pnpm install --filter '!@forkshop/engine'
```

The published `@forkshop/engine` artifact bundles the icon SVG markup at engine-build time (per the engine packaging spec) — downstream users of Forkshop never need an iconists key.
```

- [ ] **Step 2: Verify the rest of CLAUDE.md doesn't conflict**

Skim the maintainer guide for any stale references to `lucide-react`, `motion`, `packages/registry`, or the in-house Fogma "Iconoir → Forkshop icon component" mention. Update the relevant lines to reflect: icons come from Central Icon Set; the engine ships compiled CSS; etc.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add 'First-time setup for engine builds' section

Documents the ICONISTS_LICENSE_KEY env var prerequisite, the
.envrc.example pattern, and the contributor escape hatch for PRs
that don't need an engine rebuild."
```

---

## Task 26: Final verification — `pnpm check` + manual smoke install

**Why:** The whole spec exits when this passes. Documents the smoke-install procedure in the implementing PR.

**Files:** (verification only)

- [ ] **Step 1: Run `pnpm check`**

Run: `pnpm check`
Expected: green.

- [ ] **Step 2: Run the full build + test + tarball verify across the workspace**

Run: `pnpm typecheck && pnpm lint && pnpm --filter @forkshop/engine build && pnpm --filter playground build && pnpm test`
Expected: green.

- [ ] **Step 3: Confirm zero stale references**

Run: `git grep -n '@forkshop/registry\|packages/registry' -- ':!docs/strategy' ':!docs/specs/2026-05-15*' ':!docs/specs/2026-05-16-live*' ':!docs/specs/2026-05-16-engine-packaging-design.md' ':!docs/plans/2026-05-15*' ':!docs/superpowers'`
Expected: empty.

- [ ] **Step 4: Confirm zero icon-library imports**

Run: `git grep -nE "from\s+[\"'](lucide-react|iconoir-react|@heroicons/|react-icons/|phosphor-react)" packages/engine/src/ apps/playground/`
Expected: empty.

- [ ] **Step 5: Manual smoke install in a fresh Next 14 app**

This is documented as the implementing-PR's exit criteria. The exact commands:

```bash
mkdir -p .tmp
pnpm --filter @forkshop/engine pack --pack-destination "$(pwd)/.tmp"
pnpm create next-app .tmp/smoke --typescript --tailwind --eslint --app --no-src-dir --use-pnpm --no-import-alias <<< $'\n\n\n\n\n\n\n'
cd .tmp/smoke
pnpm add "file:../forkshop-engine-0.0.0.tgz"
```

Then add a minimal `app/page.tsx`:

```tsx
"use client"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

export default function Page() {
  return (
    <ForkshopCanvas nodeTypes={[]}>
      <Gallery entries={[]} />
    </ForkshopCanvas>
  )
}
```

And edit `app/globals.css` to start with:

```css
@import "@forkshop/engine/forkshop.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Then:

```bash
pnpm build
```

Expected: builds without error.

Copy the build output summary into the PR description.

- [ ] **Step 6: Clean up the smoke-install tmp**

```bash
rm -rf .tmp/smoke .tmp/forkshop-engine-*.tgz
```

- [ ] **Step 7: Verify the playground still matches reality**

Run: `pnpm dev` from the workspace root.
Expected: engine watch + playground dev both start; `http://localhost:3000/forkshop` renders the canvas as before with no visual regression.

Kill the dev server.

- [ ] **Step 8: Final commit (if any uncommitted polish was needed)**

If anything still needed a fix discovered in Steps 1–7, commit it. Otherwise no commit needed.

- [ ] **Step 9: Open the PR**

PR title: `feat(engine): publishable @forkshop/engine + compiled CSS pipeline`

PR description should include:
- One-line summary: "Renames packages/registry → packages/engine; adds tsup/Tailwind build pipeline; swaps lucide-react → Central Icons; playground consumes built dist."
- Link to the spec: `docs/specs/2026-05-16-engine-packaging-design.md`
- Smoke-install output from Step 5.
- Confirmation: `pnpm check` green, `pnpm --filter @forkshop/engine build` green (with verify-tarball), playground renders without regression.
- Reminder: this spec leaves the CLI's runtime install flow broken until CLI rework (#3) lands. Engine is publishable; `forkshop init` is not.

---

## Spec coverage check

| Spec section | Implementing tasks |
|---|---|
| Directory + package rename | T1, T2, T3 |
| Build pipeline (tsup, plugins, sourcemaps, DTS, env override) | T11, T12 |
| Production-mode degradation / NODE_ENV not inlined | T11 (tsup `env: {}`), T18 (verify-tarball assertion) |
| `@locator/runtime` dynamic import | T6, T18 (verify-tarball assertion) |
| `"use client"` preservation + verification | T11 (plugin), T13 (verify-directives) |
| CSS compile pipeline | T14, T15 |
| Drop preset / theme.css exports | T17 (exports map excludes them) |
| Icon set (Central Icons + lint guard + license) | T7, T8, T9, T10, T17 |
| Font binaries (engine dist + playground postinstall) | T16, T19, T20 |
| Final `package.json` (exports, files, sideEffects, engines, publishConfig) | T17 |
| LICENSE files (engine FSL + root multi-license) | T4 |
| Drop unused deps (motion, locator-webpack-loader, tailwindcss peer) | T5 |
| Playground migration | T19, T20, T21, T22, T23 |
| Rename ripples (CLI, docs, templates, skill, root CLAUDE.md) | T2 |
| Workspace `pnpm.onlyBuiltDependencies` | T7 |
| Testing strategy (verify-directives, verify-tarball) | T13, T18 |
| Maintainer CLAUDE.md "First-time setup" | T25 |
| Final verification + smoke install | T26 |

Every spec commitment has at least one task implementing it.
