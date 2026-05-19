# Forkshop — Maintainer Guide

Forkshop is an OSS Figma-style canvas + sidebar tool for Next.js App Router projects. Tailwind is the most common styling layer but not required — Forkshop's Design System Board works with any styling system that compiles tokens to `:root` CSS variables (Tailwind v4 `@theme`, Panda CSS, Vanilla Extract, Stitches with `--token`, plain hand-written CSS). See strategy v2 refinement #17. This file is for contributors and future-Jakub.

> **Lineage:** Forkshop was extracted from **Ravineo's in-house Fogma** tool (in the `ravineo-web` monorepo). Where this guide mentions "Ravineo's Fogma" or "the in-house Fogma," it's referring to that upstream tool — not to Forkshop itself. Both names live on independently: Ravineo's Fogma stays internal under its original name; Forkshop is the public OSS extraction.

---

## Repo layout

```
packages/
  cli/          The published `forkshop` npm CLI. Commands: `forkshop init`,
                `forkshop update`, `forkshop add`, `forkshop diff`.
                See "packages/cli" section below.

  engine/       The source. All components, hooks, lib utilities, API routes,
                and layouts live here. Published as @forkshop/engine.
    src/
      components/   Primitives — canvas, sidebar, icon, etc.
      hooks/        iframe hooks, draggable-node hook
      lib/          Utilities — token-registry, system-graph, system-layout,
                    system-snap, node-positions, sitemap-tree, file-to-selection,
                    edit-mode, inspect-element, spacing-classes, agent-activity-state
      layouts/      Engine-shipped Layout components (DesignSystemView, Gallery,
                    ResponsiveFrameView, Tree)
      node-types/   Engine-shipped NodeType definitions
      api/          Next.js route handlers (re-exported by user's app/api/forkshop/)
        edit/
        positions/
        agent-activity/
          stream/
      skill/        Skill markdown files shipped via the registry
    templates/      Scaffold templates dropped during `forkshop init`
      api-stubs/    Route stub templates (edit, positions, agent-activity, stream)
      user-claude-md.md — auto-loaded by Claude Code in user's app/forkshop/
    fonts/
      raveo/        RaveoVF.woff2 — binary shipped to user's project on init

apps/
  demo/         Renamed from playground. Rich showcase that mounts a Forkshop
                installation. Hand-maintained dev surface with 4 boards
                (Design System, Components, Blocks, Sitemap). Runs under
                `pnpm dev`. Consumes engine helpers (useDiscoveredPrimitives,
                useDiscoveredBlocks, auto-mounted iframe registry).

  test/         Pre-init fixture with curated content (4 primitives in
                components/ui/, 4 blocks, 4 routes, MDX, non-default tailwind
                theme). User runs `pnpm reset-test && cd apps/test && claude`,
                then "set up Forkshop" to validate the full init + setup-skill
                flow against realistic project signals. Post-init artifacts are
                gitignored.

  docs/         Deployed at https://forkshop.dev. Serves the marketing
                landing (`/`) and the static registry (`/r/registry.json`,
                `/r/fonts/*.woff2`). See "apps/docs" section below.

tests/
  smoke/        Real-install fixture exercising the CLI against a fresh Next.js
                skeleton. Validates init output matches expected-files.txt.
```

---

## `packages/cli`

The published `forkshop` npm CLI. Commands:

- `forkshop init` — drops a thin scaffold layer (~8 files + 1 binary: skill files, route
  stubs, font, CLAUDE.md) into the user's project, appends the CSS import to `globals.css`,
  merges `@forkshop/engine` into `package.json`, runs `<pm> install` via the detected
  package manager (skip with `--no-install`), and writes a slim `forkshop.json` lock
  recording the engine version and scaffold file checksums. Does not copy engine source —
  engine ships from npm.
- `forkshop update` — bulk-refreshes the scaffold layer (skill files, CLAUDE.md, route
  stubs) with a single confirm-all consent prompt. Soft-offers an `@forkshop/engine` pin
  bump. Supports `--check` (dry-run diff) and `--force` (skip consent).
- `forkshop add <bundle>` — 1.0 placeholder. Returns "not yet available" and links to the
  roadmap. Kits were dropped as a first-class concept (refinement #14 in strategy v2; setup
  skill v2 took over project-aware scaffolding). `forkshop add` stays as a stub for future
  community-contributed bundle support; no near-term spec.
- `forkshop diff <path>` — shows a unified diff of a scaffold file vs the upstream
  version, using the v2 lock schema.

Bundled with esbuild into a single ESM file at `dist/index.js`. Tests in
`packages/cli/src/**/*.test.ts`. The placeholder substituter (`src/rewrite.ts`) replaces
`{{snake_case}}` tokens in scaffold templates with project-specific values at init time.

Build: `pnpm --filter forkshop build`. Test: `pnpm --filter forkshop test`.

---

## Scaffold templates location

Files dropped by `forkshop init` / `forkshop update` are stored in the engine package
under `packages/engine/` and served via the manifest:

- **Skill files:** `packages/engine/src/skill/{setup,live-editing,doc-sync}.md`
- **User CLAUDE.md template:** `packages/engine/templates/user-claude-md.md`
- **Route stub templates:** `packages/engine/templates/api-stubs/{edit,positions,agent-activity,agent-activity-stream}-route.ts.template`
- **Font binary:** `packages/engine/fonts/raveo/RaveoVF.woff2`

When editing any of these files, remember to run `pnpm --filter docs validate-registry`
to catch template placeholder leaks.

---

## `apps/docs`

The deployed Next.js app at https://forkshop.dev. Two surfaces:

- **Marketing landing at `/`** — hand-written Tailwind one-pager (hero, three
  feature cards, footer). No Forkshop primitives mounted on the landing itself.
- **Static registry at `/r/registry.json`** + binary assets under `/r/fonts/*.woff2`.
  The CLI's hardcoded `DEFAULT_REGISTRY_URL` (`packages/cli/src/manifest-builder.ts`,
  `packages/cli/src/commands/init.ts`) points here — do not move.

The registry route handler at `apps/docs/app/r/registry.json/route.ts` calls
`buildManifest()` (exported from the CLI package's `manifest-builder.ts`), which
walks `packages/engine/{src,tailwind,templates}` and emits the manifest.

A pre-build validator (`apps/docs/scripts/validate-registry.ts`) ensures every
`@forkshop/...` import in registry source resolves to a known canonical address.
It also confirms every bundle's items exist in the files map. Run via
`pnpm --filter docs validate-registry`. Wired into `next build` automatically.

**Deploy config:** `apps/docs/vercel.json` pins the install + build commands
(`cd ../.. && pnpm install --frozen-lockfile --filter docs...` and
`pnpm --filter docs build`). The filtered install avoids needing
`CENTRAL_LICENSE_KEY` in Vercel — apps/docs consumes the CLI workspace, not the
engine. Cache headers on the registry: `s-maxage=300, stale-while-revalidate=86400`
(5-min CDN freshness); on fonts: `max-age=31536000, immutable`.

**Docs and demo routes (`/docs`, `/demo`)** are not built yet — 404 by design.
Their shape is sketched in `docs/strategy/2026-05-17-forkshop-dev-website-shape.md`.

---

## Canonical-alias convention

Every cross-file import inside `packages/engine/src/**` must use the `@forkshop/*`
alias (e.g., `import { foo } from "@forkshop/lib/edit-mode"`), never a relative path.
A lint check at `packages/engine/scripts/check-canonical-imports.ts` enforces it as
part of `pnpm --filter @forkshop/engine lint`.

The engine's own `tsconfig.json` maps `@forkshop/*` → `./src/*` so local typecheck
and Vitest resolve correctly. The demo (`apps/demo`) needs additional
per-subdir webpack/turbopack alias entries in `next.config.mjs` to resolve those
imports across the workspace boundary.

Note: engine-internal aliases are `@forkshop/*` (subpath of the source tree). User
projects import from the npm package using `@forkshop/engine` or
`@forkshop/engine/<subpath>` — these are distinct from the internal aliases and do
not require path-rewriting at init time.

---

## Commands

```bash
pnpm dev          # Start demo dev server (apps/demo)
pnpm reset-test   # Wipe Forkshop scaffold artifacts from apps/test/ for re-init
pnpm build        # Build all packages
pnpm typecheck    # tsc --noEmit across the workspace
pnpm lint         # ESLint across the workspace
pnpm check        # typecheck + lint in parallel (run before claiming a task done)
```

Run `pnpm check` from the repo root before marking any task complete.

---

## First-time setup for engine builds

The engine pulls icons from `@central-icons-react/square-outlined-radius-0-stroke-2` (Central Icon Set from iconists.co), which validates a license key at install time via a `preinstall` script. Without the key, `pnpm install` fails the moment the engine workspace's deps install.

Setup:

1. Copy `.envrc.example` → `.envrc` and fill in the key:
   ```
   export CENTRAL_LICENSE_KEY=<your-key>
   ```
   (Env var name confirmed against `node_modules/@central-icons-react/.../license-check.js` — `process.env.CENTRAL_LICENSE_KEY`.)
2. `direnv allow .` (install [direnv](https://direnv.net) if you don't have it).
3. `pnpm install` — should now succeed.

Only the engine workspace needs the key. If you're contributing to CLI, docs, demo, or test without touching `packages/engine/src/`, you can scope install to skip engine:

```
pnpm install --filter '!@forkshop/engine'
```

The published `@forkshop/engine` artifact bundles the icon SVG markup at engine-build time (per `docs/specs/2026-05-16-engine-packaging-design.md`) — downstream users of Forkshop never need an iconists key.

---

## How to add a new primitive

Primitives live in `packages/engine/src/components/` or `packages/engine/src/hooks/`.

Placement:
- Canvas primitives (nodes, overlays, iframes) → `components/canvas/`
- Sidebar primitives → `components/sidebar/`
- Standalone UI (icon, inspect panel) → `components/`
- Browser-side hooks → `hooks/`

Naming:
- File: `kebab-case.tsx` (or `.ts` for hooks/utils)
- Export: named export matching PascalCase (`export function ForkshopCanvas`)
- Client-only components: add `"use client"` at the top

After adding a primitive, export it from `packages/engine/src/index.ts`. Keep exports grouped logically — canvas primitives together, hooks together, lib together, layouts and node-types last.

Example:

```tsx
// packages/engine/src/components/canvas/my-overlay.tsx
"use client"

export interface MyOverlayProps {
  // ...
}

export function MyOverlay({ ... }: MyOverlayProps) {
  // ...
}
```

```ts
// packages/engine/src/index.ts
export { MyOverlay, type MyOverlayProps } from "./components/canvas/my-overlay.js"
```

Note the `.js` extension in the import path — required for ESM compatibility with `moduleResolution: "bundler"`.

---

## How to add a new Layout or NodeType

**Vocabulary (v2 model — 4 concepts after refinement #14):**
- **Node** — a single iframe-backed tile on the canvas. Has a `nodeType` key and a `sourceFile`.
- **NodeType** — a named configuration (viewport size, label style, aspect ratio) for a Node.
- **Layout** — an engine-shipped React component that arranges one or more NodeTypes into
  a named board shape (e.g., `ResponsiveFrameView`, `Gallery`, `Tree`, `DesignSystemView`).
- **Board** — user's mounted canvas; composed from NodeTypes + Layouts.

`Kit` was the 5th concept in the original strategy v2; dropped at 1.0 (refinement #14) when
the setup skill became the project-aware layer. The setup skill scaffolds 1-5 Boards from a
fixed recipe set (Design System, UI Components, Blocks, Sitemap, Reference) — no kit picker.

**Engine-shipped Layouts** live in `packages/engine/src/layouts/`. Each is a named React
component + typed `*Props` interface exported from `packages/engine/src/index.ts`.

**Engine-shipped NodeTypes** live in `packages/engine/src/node-types/`.

**User-side custom NodeTypes** live in `app/forkshop/node-types/` in the user's project
(scaffolded by `forkshop init`). Users compose Boards directly — no `forkshop add` needed.

**Live-mirror discovery (since polish spec 2026-05-17):** UI Components and Blocks Boards
auto-discover via barrel imports. The user's `components/{ui,blocks}/index.ts` barrels
re-export each primitive/block; the engine's `useDiscoveredPrimitives` /
`useDiscoveredBlocks` hooks reflect over the imported namespace. Adding a primitive is two
steps: create the file + add a line to the barrel. The `forkshop-live-editing` skill teaches
Claude to maintain the barrel automatically.

See `docs/specs/2026-05-17-cli-rework-design.md`, `docs/specs/2026-05-17-setup-skill-v2-design.md`,
`docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md`, and the strategy v2 doc
(`docs/strategy/2026-05-14-forkshop-strategy-v2-design.md`) for the full model.

---

## Live text editing

Shipped 2026-05-16. Forkshop's defining feature: hover text in an iframed page → blue ring if editable, gray dashed ring if locked. Click editable text → contenteditable + Save/Discard popover. ⌘↵ saves to the TSX file (Next.js HMR picks up the change). Esc discards. Multi-viewport boards (`ResponsiveFrameView`) live-sync edits across all viewports as you type.

**Architecture (internal):**
- `packages/engine/src/lib/use-iframe-edit-controller.ts` — controller hook. Owns edit state machine (`editingElement`, `isSaving`, `error`, generation counter), composes `useIframeEditWiring`, POSTs to the edit API on save.
- `packages/engine/src/components/canvas/iframe-edit-overlay.tsx` — thin wrapper. Composes the controller + `EditPopover`. Tree-shakes in production via `process.env.NODE_ENV === "production"` early-return.
- `packages/engine/src/lib/extract-string-literals.ts` — pure function. Builds the per-iframe "editable Set" from a TSX source file. Captures quoted literals, simple template literals, AND JSX text children with HTML entity decoding + whitespace normalization. Also exports `resolveJsxTextSpan` for the save flow.
- `packages/engine/src/hooks/use-iframe-edit-wiring.ts` — listener machinery inside the iframe document. Carries an optional `editableSet` parameter; without it, falls back to "all text editable" (back-compat).
- `packages/engine/src/components/canvas/edit-popover.tsx` — floating Save/Discard widget. Tracks the edited element through canvas pan/zoom via a `requestAnimationFrame` loop.
- `packages/engine/src/api/edit/route.ts` — dev-only POST (save) + GET (read source) handlers. Path-escape checked, 403 in production.
- `packages/engine/src/lib/edit-mode.ts` — `PREVIEW_EDIT_CSS` (hover/editing/locked outlines), `isTextElement`, `computeDomPath`.

**Safety model:** each Node carries `sourceFile?: string`. The controller GETs that file at iframe load, extracts its string literals + JSX text into a `Set<string>`, and the hover handler gates editing on `set.has(textContent.trim())`. Sub-component internals never enter the set, so you cannot accidentally edit shared components from a page board. Production builds tree-shake the entire wiring.

**Cross-viewport refetch:** when one viewport saves, the controller dispatches a `forkshop:source-changed` CustomEvent on `window`. Every controller listening for the same sourceFile refetches its editable Set. This is needed because Next.js HMR updates iframe DOM in place without firing the iframe `load` event, so the load-listener alone wouldn't reach sibling viewports.

**Locator.js (Option-click open-in-editor):** opt-in during `forkshop init` setup skill. The `@locator/webpack-loader` (or its turbopack equivalent in Next 15+) runs over every JSX file at compile time in dev, attaching `__source` props. `LocatorInit` mounts the runtime UI inside iframed pages whose parent path starts with `mountPath`. Option-click reads the `__source` data, constructs a `vscode://file/...:line:col` URL, and navigates the top window so the OS opens VS Code.

**Spec / plan:**
- `docs/specs/2026-05-16-live-text-editing-design.md`
- `docs/superpowers/plans/2026-05-16-live-text-editing.md`
- Both reflect v0 design + 13 planned tasks; the implementation grew 8 in-session bug fixes + 2 post-v0 features (JSX text editing, cross-viewport live sync). The spec carries an "Implementation deviations" addendum at the bottom.

**User-facing docs** are in the registry's `templates/user-claude-md.md`, which auto-loads in user Claude Code sessions after `forkshop init`. Keep that file in sync when changing user-visible behavior.

---

## Branding decoupling

All Forkshop-internal styling must be decoupled from any host project's brand.

Rules:
- All CSS tokens must be `forkshop-*`-namespaced (e.g. `forkshop-fg`, `forkshop-canvas-bg`, `forkshop-accent`). **Never** `text`, `background`, or any other non-namespaced token that collides with Tailwind defaults.
- Icons via `<ForkshopIcon icon={X} />` from `@forkshop/engine`. Never import raw Iconoir or any other icon library directly in registry code.
- Font via Raveo only. Loaded by the demo via `next/font/local`. The registry itself does not load fonts — it assumes the host has loaded them.
- CSS variables are defined in `packages/engine/tailwind/forkshop.css`. The tailwind preset (`forkshop.config.ts`) references them.
- The `forkshop-*` Tailwind preset is configured in `packages/engine/tailwind/`. Users add it to their `tailwind.config.ts`.

When in doubt: would this style break if the host project uses a different design system? If yes, it needs a `forkshop-` namespace.

---

## What NOT to port from ravineo-web

This is the most important section for future PRs. Forkshop was extracted from **Ravineo's in-house Fogma** tool, which lives in `ravineo-web` (the Ravineo marketing site + internal tools monorepo) at `app/(tools)/fogma/`, `lib/fogma/`, `app/api/fogma/`. Many things in ravineo-web — including parts of Ravineo's Fogma itself — must **never** be ported to this repo.

Do not port:
- **Auth**: Clerk, iron-session, any gating logic
- **Marketing content**: marketing-playbook, marketing-copy, blog MDX, guide content, reports content
- **Block registries that ship Ravineo brand**: `block-registry.tsx`, `nav-registry.tsx` — these are Ravineo-specific
- **Navigation registries** that ship Ravineo's actual nav components
- **Route groups**: `(marketing)`, `(reports)`, `(reports-public)`, `(guide)`, `(content-search)`, `(tools)` — these are Ravineo-specific route group segments
- **Specific page implementations**: any page under `app/(marketing)/`, `app/(reports)/`, etc.
- **ravineo.com branding tokens**: color names like `deep-green`, `cobalt`, etc.

What IS safe to port (already done):
- All primitives: canvas, sidebar, hooks, utilities
- API routes (generalized, Ravineo-specific logic stripped)
- Layouts and NodeTypes (generalized, data feeds are props, not hardcoded)
- The agent-activity plumbing (no-op shell)
- Locator.js wiring

### Route group handling

The `filePathToRoute` and `fileToSelection` utilities in `lib/file-to-selection.ts` strip Next.js route group segments via regex. A user's routes like `app/(marketing)/about/page.tsx` become `/about`. This handles the generic stripping — no Ravineo-specific logic required.

When porting any path-related code from ravineo-web, verify there are no hardcoded route-group strings like `(marketing)` or `(reports)`. The regex in `file-to-selection.ts` covers them generically.

---

## Registry build + manifest format

Shipped. The manifest is generated dynamically by `buildManifest()` in
`packages/cli/src/manifest-builder.ts`, served by `apps/docs` at
`/r/registry.json`, and consumed by the CLI's `init` / `add` / `diff` commands.

Schema lives in `packages/cli/src/manifest-schema.ts`. Bundles enumerate files
plus their runtime deps; the builder reads `packages/engine/package.json` for
version pins.

---

## Release cadence

No schedule. Manual. `v0.1.0` shipped 2026-05-18.

1. Bump versions in `packages/engine/package.json` and `packages/cli/package.json`
   in lockstep. The CLI's `manifest-builder.ts` reads engine's `version` at CLI
   build time and embeds it as the install pin — bump engine *then* rebuild CLI.
2. Run `pnpm regen-api-snap` if engine's public surface changed.
3. `git tag v0.x.y && git push && git push --tags`.
4. `.github/workflows/release.yml` triggers on `v*.*.*`, builds engine + CLI,
   publishes engine first then CLI, creates a GitHub release with auto-generated
   notes.

Required secrets (already set on `jakubfoglar/forkshop`):
- `NPM_TOKEN` — npm Classic Automation token (bypasses 2FA).
- `CENTRAL_LICENSE_KEY` — iconists.co license for engine preinstall.

Pre-release: use `0.x.y` versions. No stability guarantees until `1.0.0`.

---

## Doc sync convention

Every change that affects user-facing primitives or kits must also update:

```
packages/engine/src/templates/user-claude-md.md
```

This file is the CLAUDE.md that gets auto-loaded into a user's Claude Code session when they're working in `app/forkshop/`. If it drifts from the actual API, future agents will work from wrong information.

Changes that require a doc sync:
- New primitive exported from `index.ts`
- New Layout or NodeType exported from `index.ts`
- Changed API route contract (request/response shape)
- Changed file layout after init
- Changed behavior of edit, spacing, or locator wiring

## Public docs site (`forkshop.dev/docs`)

The 9 MDX pages live at `apps/docs/app/docs/<slug>/page.mdx`. When you edit them, follow `docs/forkshop-voice.md` — it's the style guide and was written deliberately. Cliché openings, marketing superlatives, and meta-narration are out. Verb-first, concrete, short paragraphs are in.

When you add or rename a docs page, update the hardcoded nav array in `apps/docs/components/docs-sidebar.tsx` — there's no auto-discovery.

Facts in the docs must match `packages/engine/` source. Common drift points worth grepping before claiming anything:
- The CSS export is `@forkshop/engine/forkshop.css` (not `styles.css`)
- The 11 `--forkshop-*` CSS variables live in `packages/engine/tailwind/forkshop.css`
- There is no `defineNodeType` function — a NodeType is a plain object `{ id, match, render, agentMatch? }`
- `init` does not invoke a package manager and does not scaffold `app/forkshop/page.tsx` (the setup skill does)
- The locator uses `data-locatorjs` attributes, not React's `__source`
- Live AI activity is HTTP POST to `/api/forkshop/agent-activity`, not a socket

---

## Maintaining `packages/engine/src/skill/setup.md`

The setup skill is one of three markdown skills shipped via the registry (`setup.md`, `live-editing.md`, `doc-sync.md`). Only `setup.md` requires extensive structure — the other two are short reference cards.

### Anatomy

- YAML frontmatter — `name`, `description`. The description's natural-language triggers must not overlap with the sibling skills.
- 8 phases (Phase 0 through Phase 7) — fixed order, each a numbered `## Phase N` subsection.
- Adjust mode, Edge cases, "What this skill never does" — guardrails after the phases.
- `## Scaffolding templates` — the bottom section, contains 11 templates (Templates 1-9 + 4a/4b + 10/11) with `{{snake_case}}` placeholders. Template 12 (root CLAUDE.md cadence note) was removed in the polish spec — cadence guidance now ships only via the auto-loading `forkshop-live-editing.md` skill and the `app/forkshop/CLAUDE.md` dir-loaded note.

### Phase 5 uses the `AskUserQuestion` tool

Phase 5 has exactly **one** opt-in after the polish spec: Locator (Option-click → editor — adds `@locator/webpack-loader` to devDeps and merges a webpack/turbopack rule into `next.config.*`). The cadence-note opt-in that previous versions had is gone — appending to root `CLAUDE.md` violated strategy v2's "zero edits to user's project CLAUDE.md" promise. The Locator opt-in uses the `Yes / No / Show me` panel (Show me prints the planned diff, then re-asks Yes/No only).

If you edit Phase 5, preserve this contract — the skill's UX depends on the single-panel consent flow.

### Updating

- **Activation triggers** — in the `description:` field of the frontmatter. Test by invoking with each trigger phrase against `apps/test/` (the canonical pre-init fixture; see `pnpm reset-test` workflow) or any fresh Next.js fixture.
- **Phase content** — the phases are read top-to-bottom by Claude at invocation time. Treat the file as a prompt: terse, imperative, no fluff. Refer the reader to `app/forkshop/CLAUDE.md` in the user's repo for Board / NodeType / Layout API details rather than duplicating them.
- **Templates** — every template MUST be inside a fenced code block in the `## Scaffolding templates` section. The `validateSkillPlaceholders` check in `apps/docs/scripts/validate-registry.ts` enforces this.
- **Placeholders** — use `{{snake_case}}` only. Lowercase, underscores. Document any new placeholder in the substitution-rules block at the top of the templates section.

### What NOT to add

- Long explanations or rationale — those live in the specs at `docs/specs/2026-05-17-setup-skill-v2-design.md` and `docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md`. The skill file is for runtime instruction, not background.
- Ravineo-specific examples or paths. Examples should use generic placeholder names ("Foundations", "Hero") that any project would recognize.
- Direct skill-to-skill cross-talk. The setup skill mentions sibling skills by name but doesn't invoke them. Each skill stays self-contained.

### Testing changes

1. Edit `packages/engine/src/skill/setup.md`.
2. Run `pnpm --filter docs validate-registry` — catches placeholder leaks (any `{{...}}` outside the `## Scaffolding templates` section, unless inside a fenced or inline code block).
3. Sync into a fixture project's `.claude/skills/forkshop-setup.md` for fast local iteration. The marketing fixture at `~/Desktop/ravineo_dev/forkshop-fixtures/marketing-fixture/` (if present) is a known-good test bed; otherwise `pnpm create next-app` a fresh one and add a stub `forkshop.json` + `app/forkshop/CLAUDE.md`.
4. Open Claude Code in the fixture and exercise the affected phase by invoking *"set up Forkshop"*.
5. For changes that affect detection: run against fixtures representing different project types (marketing, SaaS, hybrid, monorepo).

---

## License + contribution posture

FSL-1.1-Apache-2.0. See `LICENSE` at the repo root.

Drive-by PRs welcome. No review SLA. If you're fixing a bug or adding a clearly useful primitive, open the PR — it'll get reviewed.

For substantial recipe additions or engine API changes: open an issue first to align on scope.

---

## Deferred — separate specs

These are **not** in v0 and should not be built until there's a dedicated spec:

| Deferred item             | Notes |
|---------------------------|-------|
| Compose mode              | Page composer (drag-to-reorder sections). Deferred from v0. |
| Flow-graph                | Node-and-edge flow diagrams. Deferred from v0. (Originally "flow-graph kit"; renamed since Kit is no longer a concept — refinement #14.) |
| `/docs` site content      | The `/docs` route on forkshop.dev is a 404 — no marketing-facing reference docs yet. Needs its own brainstorm (scope, structure, MDX vs Fumadocs/Nextra, search, versioning). |
| `/demo` site content      | The `/demo` route on forkshop.dev is a 404 — no public interactive demo yet. Shape sketched in `docs/strategy/2026-05-17-forkshop-dev-website-shape.md` (curated boards, optional session-mode editing). |
| Engine `Tree.autoDiscover` | Polish spec referenced this as if shipped — it isn't. Tree currently requires explicit `entries: TreeEntry[]`. Templates work around by hand-rolling routes. Real auto-discovery is a server-component fs read + manifest build step. |
| `DesignSystemView` parameterless variant | Polish spec promised `<DesignSystemView />` with no props would auto-discover tokens/primitives. Engine still requires explicit `tokens` + `primitives`. Templates work around by building them inline from `forkshopConfig.ui` + `tailwindConfig`. |
| ~~Live AI awareness~~ | **Shipped 2026-05-18** — `docs/specs/2026-05-18-live-ai-protocol-design.md`. Engine derives element-level signals server-side via post-hoc diff; Claude Code producer pack is a bash hook + `.claude/settings.json` merge dropped during `forkshop init`. Multi-agent stacking, per-agent colors, read-activity breathing pulse. |
| ~~Tailwind v4 token support~~ | **Shipped 2026-05-18** via `parseTokenRegistryFromCssVars` (engine) + scaffolded CSS-vars-read in Template 2b (user's design-system.tsx). Works for any framework emitting tokens to `:root` (refinement #17). |
| ~~GitHub Actions publish~~ | **Shipped 2026-05-18** — `.github/workflows/release.yml` triggers on `v*.*.*`, publishes engine then CLI. |
| ~~Production deploy (forkshop.dev, npm)~~ | **Shipped 2026-05-18** — see `docs/specs/2026-05-18-production-deploy-design.md`. Public repo, Vercel deploy, `@forkshop/engine@0.1.0` + `forkshop@0.1.0` on npm. |

Do not start work on deferred items without a dedicated spec.
