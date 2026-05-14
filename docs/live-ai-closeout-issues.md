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

**Resolved (per-symbol imports, design call from Jakub).** Templates 2/3/4/5
in `setup.md` and every code-block import in `templates/user-claude-md.md`
were rewritten to import each symbol from its actual user-side destination
(`@/components/forkshop/...`, `@/lib/forkshop/...`). The playground's
`workspace:*` + `transpilePackages` plumbing is no longer load-bearing for a
user install. Resolved by commit
`fix(templates): switch to per-symbol imports + correct tailwind config path for cold-fixture install`.

The four prose mentions of `@forkshop/registry` in `user-claude-md.md` (lines
28, 49, 54–55, 61) were left as-is — they're descriptive narrative, not
imports, and don't break the install. Worth a follow-up doc sweep to align
with the per-symbol model.

---

---

## Issue 4 — `forkshop.css` is dropped but never imported, leaving every `--forkshop-*` variable undefined

**Symptom.** After running through the setup skill, the rendered `/forkshop`
sidebar and canvas have white backgrounds and black borders. The Forkshop UI
markup uses `bg-forkshop-surface`, `border-forkshop-border`, etc. — those
classes are generated by the preset and reference `var(--forkshop-surface)` /
`var(--forkshop-border)`. With nothing defining the variables, backgrounds
fall to transparent (showing the white body underneath) and borders fall to
`currentColor` (black).

**Cause.** The CLI drops `app/forkshop/forkshop.css` (which sets every
`--forkshop-*` variable) at `{aliases.mount}/forkshop.css` via the
`@forkshop/css/forkshop` destOverride, but nothing in the install path
imports it. Template 9 in `setup.md` had a closing line claiming *"The CLI's
mount-page stub imports this file via `import "./forkshop.css"`"* — but the
CLI does **not** drop a page.tsx stub, and Template 5 (the page.tsx the skill
writes) didn't include the import either. The comment was aspirational, not
descriptive.

**Fix.** Add `import "./forkshop.css"` at the top of Template 5 in
`setup.md`. Template 9's footer is rewritten to reflect that Template 5 owns
the import. Verified by inspecting the dev server's emitted page CSS bundle —
`--forkshop-surface`, `--forkshop-border`, and the rest now ship.

Resolved by commit
`fix(templates): import forkshop.css from the mount page so --forkshop-* variables resolve`.

---

## Issue 5 — Raveo font isn't wired (deferred; preset falls back gracefully)

**Symptom.** Even with Issue 4 fixed, the rendered UI uses a system font
rather than Raveo.

**Cause.** Three things conspire:

1. `manifest-builder.ts` has `fonts: { kind: "asset", items: [] }` — the
   `fonts` bundle ships nothing. There's a comment on it: *"intentionally
   empty in v1; will be populated when Raveo woff2 files land in
   packages/registry/fonts/"*. The file actually exists today at
   `packages/registry/fonts/raveo/RaveoVF.woff2`, so the precondition is
   already met — it's just not been hooked up.
2. The setup skill doesn't instruct Claude to wire `next/font/local` for
   Raveo. The playground's `app/layout.tsx` does this in 12 lines; there's
   no analogue in any template.
3. So `--font-raveo` is never set in the user's project, and the preset's
   `forkshop-sans` family falls through to `Inter` → `system-ui` →
   `sans-serif`.

**Why this isn't a regression** — the preset's fallback chain is
*deliberate*; it's the same chain the playground uses for SSR before
hydration. UI doesn't break; it just isn't Raveo. The "you have Forkshop"
result still looks coherent.

**Fix scope (deferred).** Three pieces, all out of scope for the live-AI
closeout: (a) populate the `fonts` bundle and ship the woff2 as a binary
manifest entry, (b) extend the setup skill with a "wire fonts" step in
Phase 6 that adds the `next/font/local` block to the user's root layout
(this is the only mutation outside the Forkshop surface — needs the same
explicit consent pattern as Locator / hook), (c) document the fallback
behavior in `app/forkshop/CLAUDE.md`. Tracked here so we don't lose it.

---

## Re-test result (after Issues 1–3 fixed)

Cold fixture rendered cleanly end-to-end:

- `pnpm dev` → `/forkshop` returns HTTP 200 with 18 KB of Forkshop UI markup
  (`<aside>` sidebar + `forkshop-canvas` stage).
- `Edit` tool on `app/page.tsx` in the fixture fires the hook (`curl status=200`),
  the API records the activity, and the SSE stream broadcasts:
  ```
  event: activity
  data: {"activeFiles":[{"filePath":"app/page.tsx","oldString":"…","newString":"…","lastSeenAt":…}]}
  ```
- The home page `/` re-renders with the new substring, so the iframe DOM
  contains the text the AgentIframeRelay will flash. Visual confirmation
  (sidebar dot + frame glow + text pulse) needs a real browser — not
  executable from this session — but every data-plane step on the path to
  those decorations succeeded.
