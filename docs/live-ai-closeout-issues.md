# Live-AI install-path closeout — issues found

Captured during the cold-fixture verification described in the live-AI design spec
(`docs/superpowers/specs/2026-05-13-forkshop-live-ai-design.md`, validation step 8).
Method: scaffolded a fresh `create-next-app@14` fixture, ran `npx forkshop init`
against the local docs registry, walked the setup skill in Claude Code.

Each issue links to the commit that resolved it (one commit per fix).

---

## Issue 1 — `forkshop init` crashes installing the skill bundle

**Symptom.** Running `npx forkshop init` against a fresh Next.js fixture exits
immediately with:

```
Cannot resolve destination for @forkshop/skill/live-editing (no matching alias prefix)
```

No files are written; the fixture stays clean.

**Cause.** `packages/cli/src/manifest-builder.ts` only sets a `destOverride` for
`@forkshop/skill/setup`. Every other skill file (currently only `live-editing.md`)
falls through to `resolveDestination`, which looks for a matching namespace alias
in the `namespaceMap` — but `@forkshop/skill` isn't in the map. The throw is
correct (catches typos); the missing override is the bug.

The `skill` bundle is auto-populated from every `@forkshop/skill/*` address it
finds in the registry, so any new skill file silently joins the install — and
silently breaks the install — until an override is added.

**Fix.** Pattern-based destOverride in `manifest-builder.ts`: every address that
starts with `@forkshop/skill/` gets `.claude/skills/forkshop-<name>.md` written
into its manifest entry. The explicit `@forkshop/skill/setup` line in the
`overrides` map becomes redundant and is removed.

Resolved by commit `fix(cli): install every @forkshop/skill/* file under .claude/skills/`.

---

## Issue 2 — Templates import from `@forkshop/registry`, which doesn't exist in a user install

**Symptom.** The mount page and every board template in
`packages/registry/src/skill/setup.md` import from `@forkshop/registry`:

```tsx
import { ForkshopCanvas, PageTree, responsiveFrameStageDimensions } from "@forkshop/registry"
```

But `@forkshop/registry` is the workspace package (`"private": true` in
`packages/registry/package.json`); it's never published to npm. The CLI's
`forkshop init` copies files into the user's project and rewrites every
`@forkshop/<components|kits|hooks|lib|api|tailwind>/*` alias to the user's
local paths (`copy-files.ts` → `rewriteImports`) — but `@forkshop/registry` is
**not** in the rewriter's alias map. It's also not declared as a runtime dep
in the `primitives` bundle's `deps`.

Result: the user's mount page (written by Claude following Template 5) has
`from "@forkshop/registry"` and there is nothing to resolve it. The dev server
errors with `Module not found: Can't resolve '@forkshop/registry'` on the first
page render.

The reason the playground works: `apps/playground/package.json` has
`"@forkshop/registry": "workspace:*"` and `next.config.mjs` adds
`transpilePackages: ["@forkshop/registry"]` — both monorepo-only mechanisms. A
real user installation has neither.

**Fix sketch.** Either:

- Add `@forkshop/registry` to the CLI's rewriter alias map, pointed at a
  user-side barrel (e.g. `@/components/forkshop`), and have `forkshop init`
  copy `packages/registry/src/index.ts` into the user's project so the barrel
  exists. The manifest builder currently excludes that file ("not consumed by
  users"); that comment is wrong — the templates actively rely on it.
- Or rewrite every template in `setup.md` to import each symbol from its
  specific local path (e.g. `@/components/forkshop/sidebar/forkshop-sidebar`,
  `@/components/forkshop/canvas/forkshop-canvas`, …). More verbose but
  closer to "the user owns every line."

The choice is a design call: re-export-via-barrel keeps the user's mount page
short and matches what the playground does; per-symbol imports make the
"every file is yours, no magic" claim from CLAUDE.md literally true.

---

## Issue 3 — Template's tailwind import path doesn't match create-next-app's default tsconfig

**Symptom.** Template 1 in `setup.md` writes `forkshop.config.tsx` with:

```tsx
import tailwindConfig from "@/../tailwind.config"
```

With the create-next-app v14 default `tsconfig.json` (`"paths": { "@/*":
["./*"] }`), `@/..` resolves *above the project root*. The dev server fails
with `Module not found: Can't resolve '@/../tailwind.config'`.

The setup.md template has a footnote acknowledging that `@/*` mapping varies,
but the default Template 1 still ships the broken form. The playground works
because the playground's `forkshop.config.tsx` (handwritten) uses
`@/tailwind.config`, not the template's `@/../tailwind.config`.

**Fix sketch.** Change Template 1 in `setup.md` to default to
`@/tailwind.config`. Keep the footnote for cases where the user's `@/*` maps
somewhere other than the repo root. Update the matching docs in
`packages/registry/templates/user-claude-md.md` if they show the same pattern.

---

## Status — stopping per the "2-3 issues" budget

The original brief said: *"If you find more than 2-3 issues, stop and report
back before continuing — that's a signal the spec needs adjustment, not just
bug fixes."* I'm at 3, and 2 + 3 both stem from the same root cause: the
setup.md templates were validated against the playground's monorepo /
workspace setup, not against a real `npx forkshop init` install on a fresh
create-next-app. Fixing them is a coordinated edit across the templates, the
CLI rewriter, possibly the manifest's `topLevelBarrel` exclusion, and a doc
sync — not a one-line fix per issue. Recommend pausing for design alignment
before I continue.
