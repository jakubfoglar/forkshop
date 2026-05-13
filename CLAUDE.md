# Forkshop — Maintainer Guide

Forkshop is an OSS Figma-style canvas + sidebar tool for Next.js + Tailwind projects. This file is for contributors and future-Jakub.

---

## Repo layout

```
packages/
  cli/          The published `forkshop` npm CLI. Commands: `forkshop init`,
                `forkshop add`, `forkshop diff`. See "packages/cli" section below.

  registry/     The source. All components, hooks, lib utilities, API routes,
                and kits live here. Published as @forkshop/registry.
    src/
      components/   Primitives — canvas, sidebar, icon, etc.
      hooks/        iframe hooks, draggable-node hook
      lib/          Utilities — token-registry, system-graph, system-layout,
                    system-snap, node-positions, sitemap-tree, file-to-selection,
                    edit-mode, inspect-element, spacing-classes, agent-activity-state
      kits/         Configurable boards: design-system-board, iframe-gallery, page-tree
      api/          Next.js route handlers (re-exported by user's app/api/forkshop/)
        edit/
        positions/
        agent-activity/
          stream/
      templates/    user-claude-md.md — auto-loaded by Claude Code in user's app/forkshop/

apps/
  playground/   Minimal Next.js demo that mounts a Forkshop installation.
                The canonical "does it work?" check. Mount all three kits here.

  docs/         Serves the static registry at `/r/registry.json`. See
                "apps/docs" section below. Marketing content TBD.
```

---

## `packages/cli`

The published `forkshop` npm CLI. Commands:

- `forkshop init` — copies the `init` bundle's files into the user's project, rewrites
  `@forkshop/*` imports to the user's project aliases, installs runtime deps via the
  user's detected package manager, writes `forkshop.json` recording what was installed
  and where.
- `forkshop add <bundle>` — installs an additional kit (one of `kits/iframe-gallery`,
  `kits/page-tree`, `kits/design-system-board`) or feature bundle.
- `forkshop diff <path>` — shows a unified diff of the user's local copy vs the
  upstream version, with path rewriting applied so alias-only churn doesn't appear.

Bundled with esbuild into a single ESM file at `dist/index.js`. Tests in
`packages/cli/src/**/*.test.ts` (and `tests/e2e.test.ts` — `.skip`'d, needs docs
dev server). The path-rewriter (`src/rewrite.ts`) is the heart of the install flow:
it does a longest-prefix-match swap from `@forkshop/*` to the user's `forkshop.json` aliases.

Build: `pnpm --filter forkshop build`. Test: `pnpm --filter forkshop test`.

---

## `apps/docs`

Serves the static registry at `/r/registry.json` (and binary assets under
`/r/fonts/*.woff2`). The route handler at `apps/docs/app/r/registry.json/route.ts`
calls `buildManifest()` (exported from the CLI package's `manifest-builder.ts`),
which walks `packages/registry/{src,tailwind,templates}` and emits the manifest.

A pre-build validator (`apps/docs/scripts/validate-registry.ts`) ensures every
`@forkshop/...` import in registry source resolves to a known canonical address.
It also confirms every bundle's items exist in the files map. Run via
`pnpm --filter docs validate-registry`. Wired into `next build` automatically.

---

## Canonical-alias convention

Every cross-file import inside `packages/registry/src/**` must use the `@forkshop/*`
alias (e.g., `import { foo } from "@forkshop/lib/edit-mode"`), never a relative path.
The CLI's path-rewriter assumes this. A lint check at
`packages/registry/scripts/check-canonical-imports.ts` enforces it as part of
`pnpm --filter @forkshop/registry lint`.

The registry's own `tsconfig.json` maps `@forkshop/*` → `./src/*` so local typecheck
and Vitest resolve correctly. The playground (`apps/playground`) needs additional
per-subdir webpack/turbopack alias entries in `next.config.mjs` to resolve those
imports across the workspace boundary.

---

## Commands

```bash
pnpm dev          # Start playground dev server (apps/playground)
pnpm build        # Build all packages
pnpm typecheck    # tsc --noEmit across the workspace
pnpm lint         # ESLint across the workspace
pnpm check        # typecheck + lint in parallel (run before claiming a task done)
```

Run `pnpm check` from the repo root before marking any task complete.

---

## How to add a new primitive

Primitives live in `packages/registry/src/components/` or `packages/registry/src/hooks/`.

Placement:
- Canvas primitives (nodes, overlays, iframes) → `components/canvas/`
- Sidebar primitives → `components/sidebar/`
- Standalone UI (icon, inspect panel) → `components/`
- Browser-side hooks → `hooks/`

Naming:
- File: `kebab-case.tsx` (or `.ts` for hooks/utils)
- Export: named export matching PascalCase (`export function ForkshopCanvas`)
- Client-only components: add `"use client"` at the top

After adding a primitive, export it from `packages/registry/src/index.ts`. Keep exports grouped logically — canvas primitives together, hooks together, lib together, kits last.

Example:

```tsx
// packages/registry/src/components/canvas/my-overlay.tsx
"use client"

export interface MyOverlayProps {
  // ...
}

export function MyOverlay({ ... }: MyOverlayProps) {
  // ...
}
```

```ts
// packages/registry/src/index.ts
export { MyOverlay, type MyOverlayProps } from "./components/canvas/my-overlay.js"
```

Note the `.js` extension in the import path — required for ESM compatibility with `moduleResolution: "bundler"`.

---

## How to add a new kit

Kits live in `packages/registry/src/kits/`.

**Kit-worthy criteria:** at least two production projects would use the same board shape with different data. If the layout math, node wiring, and iframe hooks would be identical across projects — only the data feed differs — it's a kit.

**Do not add a kit** if a user could write the board in ~30 lines with primitives. Ship the primitives and let the user compose.

Existing kits:
- `DesignSystemBoard` — color graph + primitive frames + typography
- `IframeGallery` — stack or grid of labeled iframe tiles
- `PageTree` — sitemap tree with 3-viewport isolation

A kit is a React component with a typed `*Props` interface. Export both from `index.ts`.

---

## Branding decoupling

All Forkshop-internal styling must be decoupled from any host project's brand.

Rules:
- All CSS tokens must be `forkshop-*`-namespaced (e.g. `forkshop-fg`, `forkshop-canvas-bg`, `forkshop-accent`). **Never** `text`, `background`, or any other non-namespaced token that collides with Tailwind defaults.
- Icons via `<ForkshopIcon icon={X} />` from `@forkshop/registry`. Never import raw Iconoir or any other icon library directly in registry code.
- Font via Raveo only. Loaded by the playground via `next/font/local`. The registry itself does not load fonts — it assumes the host has loaded them.
- CSS variables are defined in `packages/registry/tailwind/forkshop.css`. The tailwind preset (`forkshop.config.ts`) references them.
- The `forkshop-*` Tailwind preset is configured in `packages/registry/tailwind/`. Users add it to their `tailwind.config.ts`.

When in doubt: would this style break if the host project uses a different design system? If yes, it needs a `forkshop-` namespace.

---

## What NOT to port from ravineo-web

This is the most important section for future PRs. Forkshop is extracted from `ravineo-web` (the Ravineo marketing site + internal tools monorepo). Many things in ravineo-web must **never** be ported to this repo.

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
- Kits (generalized, data feeds are props, not hardcoded)
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
plus their runtime deps; the builder reads `packages/registry/package.json` for
version pins.

---

## Release cadence

No schedule. Manual.

1. Bump versions in `packages/registry/package.json` and `packages/cli/package.json`.
2. `git tag v0.x.y`
3. `git push && git push --tags`
4. GitHub Actions auto-publishes to npm (when Actions workflow is set up).

Pre-release: use `0.x.y` versions. No stability guarantees until `1.0.0`.

---

## Doc sync convention

Every change that affects user-facing primitives or kits must also update:

```
packages/registry/src/templates/user-claude-md.md
```

This file is the CLAUDE.md that gets auto-loaded into a user's Claude Code session when they're working in `app/forkshop/`. If it drifts from the actual API, future agents will work from wrong information.

Changes that require a doc sync:
- New primitive exported from `index.ts`
- New kit exported from `index.ts`
- Changed API route contract (request/response shape)
- Changed file layout after init
- Changed behavior of edit, spacing, or locator wiring

---

## Maintaining `packages/registry/src/skill/setup.md`

The setup skill is one of three markdown skills shipped via the registry (`setup.md`, `live-editing.md`, `doc-sync.md`). Only `setup.md` requires extensive structure — the other two are short reference cards.

### Anatomy

- YAML frontmatter — `name`, `description`. The description's natural-language triggers must not overlap with the sibling skills.
- 8 phases (Phase 0 through Phase 7) — fixed order, each a numbered `## Phase N` subsection.
- Adjust mode, Edge cases, "What this skill never does" — guardrails after the phases.
- `## Scaffolding templates` — the bottom section, contains 9 templates with `{{snake_case}}` placeholders.

### Phase 5 uses the `AskUserQuestion` tool

Consent for the three opt-ins (Locator.js / live-AI hook / cadence note) is collected via a **single `AskUserQuestion` call with three questions**, not inline `y / n` prompts. Each question has three options: Yes / No / Show me. "Show me" renders the full code diff inline and re-asks just that question with Yes / No.

If you edit Phase 5, preserve this contract — the skill's UX depends on the single-panel consent flow.

### Updating

- **Activation triggers** — in the `description:` field of the frontmatter. Test by invoking with each trigger phrase against `apps/playground` (or against any fresh Next.js fixture).
- **Phase content** — the phases are read top-to-bottom by Claude at invocation time. Treat the file as a prompt: terse, imperative, no fluff. Refer the reader to `app/forkshop/CLAUDE.md` in the user's repo for kit API details rather than duplicating them.
- **Templates** — every template MUST be inside a fenced code block in the `## Scaffolding templates` section. The `validateSkillPlaceholders` check in `apps/docs/scripts/validate-registry.ts` enforces this.
- **Placeholders** — use `{{snake_case}}` only. Lowercase, underscores. Document any new placeholder in the substitution-rules block at the top of the templates section.

### What NOT to add

- Long explanations or rationale — those live in the spec at `docs/specs/2026-05-13-forkshop-setup-skill-design.md`. The skill file is for runtime instruction, not background.
- Ravineo-specific examples or paths. Examples should use generic placeholder names ("Foundations", "Hero") that any project would recognize.
- Direct skill-to-skill cross-talk. The setup skill mentions sibling skills by name but doesn't invoke them. Each skill stays self-contained.

### Testing changes

1. Edit `packages/registry/src/skill/setup.md`.
2. Run `pnpm --filter docs validate-registry` — catches placeholder leaks (any `{{...}}` outside the `## Scaffolding templates` section, unless inside a fenced or inline code block).
3. Sync into a fixture project's `.claude/skills/forkshop-setup.md` for fast local iteration. The marketing fixture at `~/Desktop/ravineo_dev/forkshop-fixtures/marketing-fixture/` (if present) is a known-good test bed; otherwise `pnpm create next-app` a fresh one and add a stub `forkshop.json` + `app/forkshop/CLAUDE.md`.
4. Open Claude Code in the fixture and exercise the affected phase by invoking *"set up Forkshop"*.
5. For changes that affect detection: run against fixtures representing different project types (marketing, SaaS, hybrid, monorepo).

---

## License + contribution posture

MIT. See `LICENSE` at the repo root.

Drive-by PRs welcome. No review SLA. If you're fixing a bug or adding a clearly useful primitive, open the PR — it'll get reviewed.

For substantial new kits or API changes: open an issue first to align on scope.

---

## Deferred — separate specs

These are **not** in v0 and should not be built until there's a dedicated spec:

| Deferred item             | Notes |
|---------------------------|-------|
| Live AI awareness         | SSE endpoint + Claude Code hook script. The `AgentActivityProvider` shell is wired but the stream is a no-op. |
| Compose mode              | Page composer (drag-to-reorder sections). Deferred from v0. |
| Flow-graph kit            | Node-and-edge flow diagrams. Deferred from v0. |
| Docs site content         | `apps/docs/` serves the registry but has no marketing content yet. |
| GitHub Actions publish    | npm publish workflow. |

Do not start work on deferred items during Tasks 25-27 (docs + release tag pass).
