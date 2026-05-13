# Fogma — Maintainer Guide

Fogma is an OSS Figma-style canvas + sidebar tool for Next.js + Tailwind projects. This file is for contributors and future-Jakub.

---

## Repo layout

```
packages/
  cli/          Stub. CLI implementation lives in a separate future spec.
                When implemented: `fogma init`, `fogma add`, `fogma sync`.

  registry/     The source. All components, hooks, lib utilities, API routes,
                and kits live here. Published as @fogma/registry.
    src/
      components/   Primitives — canvas, sidebar, icon, etc.
      hooks/        iframe hooks, draggable-node hook
      lib/          Utilities — token-registry, system-graph, system-layout,
                    system-snap, node-positions, sitemap-tree, file-to-selection,
                    edit-mode, inspect-element, spacing-classes, agent-activity-state
      kits/         Configurable boards: design-system-board, iframe-gallery, page-tree
      api/          Next.js route handlers (re-exported by user's app/api/fogma/)
        edit/
        positions/
        agent-activity/
          stream/
      templates/    user-claude-md.md — auto-loaded by Claude Code in user's app/fogma/

apps/
  playground/   Minimal Next.js demo that mounts a Fogma installation.
                The canonical "does it work?" check. Mount all three kits here.

  docs/         Skeleton. Content lives in a separate future spec.
```

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
- Export: named export matching PascalCase (`export function FogmaCanvas`)
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

All Fogma-internal styling must be decoupled from any host project's brand.

Rules:
- All CSS tokens must be `fogma-*`-namespaced (e.g. `fogma-fg`, `fogma-canvas-bg`, `fogma-accent`). **Never** `text`, `background`, or any other non-namespaced token that collides with Tailwind defaults.
- Icons via `<FogmaIcon icon={X} />` from `@fogma/registry`. Never import raw Iconoir or any other icon library directly in registry code.
- Font via Raveo only. Loaded by the playground via `next/font/local`. The registry itself does not load fonts — it assumes the host has loaded them.
- CSS variables are defined in `packages/registry/tailwind/fogma.css`. The tailwind preset (`fogma.config.ts`) references them.
- The `fogma-*` Tailwind preset is configured in `packages/registry/tailwind/`. Users add it to their `tailwind.config.ts`.

When in doubt: would this style break if the host project uses a different design system? If yes, it needs a `fogma-` namespace.

---

## What NOT to port from ravineo-web

This is the most important section for future PRs. Fogma is extracted from `ravineo-web` (the Ravineo marketing site + internal tools monorepo). Many things in ravineo-web must **never** be ported to this repo.

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

TBD — see future spec. The manifest will enumerate all exportable primitives and kits for the CLI's `fogma add` command.

---

## Release cadence

No schedule. Manual.

1. Bump versions in `packages/registry/package.json` (and `packages/cli/package.json` when implemented).
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

This file is the CLAUDE.md that gets auto-loaded into a user's Claude Code session when they're working in `app/fogma/`. If it drifts from the actual API, future agents will work from wrong information.

Changes that require a doc sync:
- New primitive exported from `index.ts`
- New kit exported from `index.ts`
- Changed API route contract (request/response shape)
- Changed file layout after init
- Changed behavior of edit, spacing, or locator wiring

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
| CLI implementation        | `packages/cli/` is a stub. `fogma init`, `fogma add`, `fogma sync`. |
| Live AI awareness         | SSE endpoint + Claude Code hook script. The `AgentActivityProvider` shell is wired but the stream is a no-op. |
| Compose mode              | Page composer (drag-to-reorder sections). Deferred from v0. |
| Flow-graph kit            | Node-and-edge flow diagrams. Deferred from v0. |
| Docs site content         | `apps/docs/` is a skeleton. |
| Registry manifest + build | `fogma add` needs a manifest enumerating primitives. |
| GitHub Actions publish    | npm publish workflow. |

Do not start work on deferred items during Tasks 25-27 (docs + release tag pass).
