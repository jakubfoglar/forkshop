# Forkshop — maintainer guide

For contributors and future-Jakub. Public-facing docs live at
[forkshop.dev/docs](https://forkshop.dev/docs); this file is for working on the
codebase itself.

## Repo layout

```
packages/
  engine/  @forkshop/engine on npm. Canvas, sidebar, layouts, node-types,
           hooks, API routes, lib utilities. Source of truth for everything
           visual. Published with bundled icon markup so consumers don't need
           the iconists license key.
  cli/     forkshop on npm. Commands: init, update, diff, add (stub).
           Manifest builder. Bundled into a single ESM file via esbuild.

apps/
  docs/    forkshop.dev. Route layout:
           - `(marketing)/` — marketing homepage, public docs at /docs/*, and
             the static registry at /r/* (hardcoded by the CLI — do not move).
           - `demo/` — /demo showcase (URL-driven Forkshop chrome over the
             WAVECLASH demo app). Deployed.
           - `studio/` — /studio marketing canvas (ForkshopCanvas + iframe
             boards used for marketing screenshots). Deployed.
  demo/    Internal dev surface mounting a Forkshop installation. Runs under
           `pnpm dev`. Not deployed.
  test/    Pre-init fixture for testing the setup-skill flow end-to-end. Run
           `pnpm reset-test && cd apps/test && claude`, then "set up Forkshop".

tests/
  smoke/   Real-install CLI smoke test against a fresh Next.js skeleton.
```

## First-time setup

The engine pulls icons from `@central-icons-react/...`, which validates a
license key at install time. Without it, `pnpm install` will fail with a
preinstall error.

```
# .envrc
export CENTRAL_LICENSE_KEY=<your-key>
```

Then `direnv allow .` (install [direnv](https://direnv.net) if you don't have
it) and `pnpm install`.

Only the engine workspace needs the key. To work on CLI / docs / demo / test
without touching engine source:

```bash
pnpm install --filter '!@forkshop/engine'
```

The published `@forkshop/engine` artifact bundles the icon SVG markup at engine
build time — downstream users never need the key.

## Commands

```bash
pnpm dev          # boot apps/demo at :3000
pnpm build        # build all packages
pnpm check        # typecheck + lint across the workspace
pnpm test         # run all workspace tests
pnpm reset-test   # wipe apps/test/ scaffold artifacts for re-init
```

Run `pnpm check` before claiming a task done.

## Canonical-alias convention

Every cross-file import inside `packages/engine/src/**` uses the `@forkshop/*`
alias (e.g. `import { foo } from "@forkshop/lib/edit-mode"`), never a relative
path. Enforced by `packages/engine/scripts/check-canonical-imports.ts` as part
of `pnpm --filter @forkshop/engine lint`.

The `@forkshop/*` alias resolves to `./src/*` via tsconfig paths and is engine-
internal. The npm-facing `@forkshop/engine` / `@forkshop/engine/<subpath>` is
distinct — that's what user projects import.

## Adding to the engine

- **Canvas / sidebar components** → `packages/engine/src/components/{canvas,sidebar}/`
- **Hooks** → `packages/engine/src/hooks/`
- **Utility modules** → `packages/engine/src/lib/`
- **Layouts** → `packages/engine/src/layouts/`
- **NodeTypes** → `packages/engine/src/node-types/`

Files are kebab-case. Named exports are PascalCase. Client-only components get
`"use client"`. Export from `packages/engine/src/index.ts` — keep entries grouped
by category. Use `.js` extensions in import paths (ESM with
`moduleResolution: "bundler"`).

After changing any public-facing API surface, run `pnpm regen-api-snap` and
commit the updated snapshot.

## Scaffold templates and the user-side CLAUDE.md

Files that `forkshop init` drops into a user's project come from
`packages/engine/`:

- `src/skill/setup.md` → `.claude/skills/forkshop-setup.md`
- `templates/user-claude-md.md` → `<mount>/CLAUDE.md`
- `templates/api-stubs/*.template` → `app/api/forkshop/*/route.ts`
- `templates/hooks/forkshop-post-tool-use.sh.template` → `.claude/hooks/...`
  (opt-in)
- `fonts/raveo/RaveoVF.woff2` → `public/fonts/forkshop/RaveoVF.woff2`

`templates/user-claude-md.md` is auto-loaded into Claude Code sessions inside
the user's `app/forkshop/`. Treat it as a load-bearing contract — any change to
engine exports, route shapes, or scaffold layout needs that template updated.

After editing any of these, run `pnpm --filter docs validate-registry` to catch
placeholder leaks.

## Public docs site

The MDX pages live at `apps/docs/app/(marketing)/docs/<slug>/page.mdx`. Edits
follow [`docs/forkshop-voice.md`](./docs/forkshop-voice.md) — verb-first, no
marketing superlatives, no meta-narration. When you add or rename a page, update
the hardcoded nav in `apps/docs/components/docs-sidebar.tsx` (no auto-discovery).

Facts on the docs site must match `packages/engine/` source. Common drift
points worth grepping before claiming anything:

- CSS import: `@forkshop/engine/forkshop.css` (not `styles.css`).
- 11 `--forkshop-*` CSS vars in `packages/engine/tailwind/forkshop.css`.
  `--forkshop-surface` defaults to `#fafafa` (gray-50); `--forkshop-surface-2`
  to `#f3f4f6` (gray-100).
- NodeType is a plain object `{ id, match, render, agentMatch? }` — no
  `defineNodeType` factory.
- `init` runs the package manager by default (auto-install — pass `--no-install`
  to skip); the project-aware scaffolding happens in the setup skill.
- Locator uses `data-locatorjs` attributes, not React's `__source`.
- Live AI activity is HTTP POST to `/api/forkshop/agent-activity`.
- `GalleryEntry` has no `id` field — the engine uses `entry.node.id` as the
  cell key. The prop table in boards.mdx must read `{ label?, node, row?,
  column? }`.
- `useForkshopPositions({ mountPath?, boardId? })` is a public hook exported
  from `@forkshop/engine`. `mountPath` drives the `?mount=` query param on
  the positions route; `boardId` namespaces keys within the JSON file.
- Block outlines in page-view iframes require `data-forkshop-block="<slug>"`
  on the outermost element of each block component. Without the attribute the
  engine cannot propagate agent outlines into the iframe.

## Release

Manual. No schedule.

1. Bump versions in `packages/engine/package.json` and
   `packages/cli/package.json` in lockstep. The CLI's `manifest-builder.ts`
   reads engine's `version` at CLI build time and embeds it as the install
   pin — bump engine *then* rebuild CLI.
2. `pnpm regen-api-snap` if engine's public surface changed.
3. `git tag v0.x.y && git push && git push --tags`.

`.github/workflows/release.yml` triggers on `v*.*.*`, builds engine + CLI,
publishes engine then CLI, creates a GitHub release.

Required secrets on the repo:

- `NPM_TOKEN` — npm Classic Automation token.
- `CENTRAL_LICENSE_KEY` — iconists.co license for engine preinstall.

Pre-release: stay on `0.x.y`. No stability guarantees until `1.0.0`.

## License

`packages/engine/` is FSL-1.1-Apache-2.0 (transitions to Apache-2.0 after 2
years). Everything else is MIT. Full breakdown in [LICENSE](./LICENSE).
