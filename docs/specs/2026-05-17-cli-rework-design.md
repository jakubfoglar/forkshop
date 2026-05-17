# CLI rework — implementation spec

Date: 2026-05-17
Status: Approved (brainstorming) — ready for plan
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` (spec #3)
Prerequisites:
- `docs/specs/2026-05-15-nodetype-layout-extraction-design.md` (shipped)
- `docs/specs/2026-05-16-engine-packaging-design.md` (shipped)

## Goal

Close out the gate left by engine packaging. After this spec:

- `forkshop init` works end-to-end against a fresh Next.js + Tailwind project — installs `@forkshop/engine` from npm instead of copying engine source.
- Drops a thin scaffold layer (~8 files + 1 binary) into the user's project, recorded in a slim `forkshop.json` lock.
- `forkshop update` bulk-pulls scaffold-layer updates with a single confirm-all consent and soft-offers an engine version bump.
- `forkshop diff <path>` adapts to the new lock schema.
- `forkshop add <bundle>` becomes a 1.0 placeholder, reactivated by the kits rewrite spec (#4).
- The manifest schema bumps to v2 (~30KB instead of ~250KB — only scaffolds, no engine source).
- `packages/engine/src/skill/setup.md` is rewritten for stub-only mode + strategy v2's 5-concept model (Node / NodeType / Layout / Board / Kit).
- `packages/engine/templates/user-claude-md.md` is rewritten for the same vocabulary + current dep names.
- `live-editing.md` and `doc-sync.md` get mechanical cleanup (stale dep names removed).
- `apps/playground/` is rebuilt as a clean, hand-maintained dev surface — no Ravineo legacy content.
- `tests/smoke/` is added as a real-install fixture exercising the CLI against a fresh Next.js skeleton.

## Scope edges

**In scope:**
- New `forkshop init` flow: detect PM → run `<pm> add @forkshop/engine` → drop kit-independent thin files (skill, route stubs, font, CLAUDE.md) → append CSS import → write slim `forkshop.json` lock.
- New `forkshop update` command: bulk-pull scaffold updates with single confirm-all consent; soft-offer engine version bump.
- `forkshop diff <path>` adapted to v2 lock schema.
- `forkshop add <bundle>` reduced to a 1.0 placeholder (prints "kits arrive in spec #4"; exits 0).
- Manifest schema v2 (slim ~30KB): scaffolds + font binary, no engine source.
- Slim `forkshop.json` schema: `{ schemaVersion, installedAt, registryUrl, engineVersion, mount, srcPrefix, installedBundles, files }`.
- Full rewrite of `packages/engine/src/skill/setup.md` for stub-only mode + 5-concept model.
- Full rewrite of `packages/engine/templates/user-claude-md.md` for 5-concept model + current dep names.
- Mechanical cleanup of `live-editing.md` and `doc-sync.md` (vocabulary swap, stale dep references gone).
- `apps/playground/` rebuild as a hand-maintained dev surface (workspace-linked engine, generic non-Ravineo content).
- New `tests/smoke/` fixture exercising real CLI install path against a fresh Next.js skeleton.

**Out of scope (other downstream specs own these):**
- Kit identities (`marketing`, `saas`, `default`), kit configs, project-type heuristics — kits rewrite (#4).
- Setup skill's kit-picker logic and audience-specific phases — folded into kits rewrite (#4).
- Producer protocol for live AI, `@forkshop/agent-claude-code` package — live AI (#5).
- Docs site content, install guide, NodeType API docs — docs refresh (#6).
- Engine source changes — locked by engine packaging.
- License-key infrastructure for Pro Kits — Pro launch.

## The new install flow (`forkshop init`)

### Responsibility split

`forkshop init` is the **non-interactive bootstrap**. The setup skill (run interactively via Claude Code as a second step) is the **wiring layer** — it creates `app/forkshop/page.tsx`, `forkshop.config.tsx`, and Board files based on project scans. This division keeps the CLI deterministic and the project-aware scaffolding in Claude's hands.

### What init drops

```
.claude/skills/
  forkshop-setup.md             (from manifest: @forkshop/skill/setup)
  forkshop-live-editing.md      (from manifest: @forkshop/skill/live-editing)
  forkshop-doc-sync.md          (from manifest: @forkshop/skill/doc-sync)

app/api/forkshop/
  edit/route.ts                 one-line re-export from engine
  positions/route.ts            one-line re-export
  agent-activity/route.ts       one-line re-export
  agent-activity/stream/route.ts one-line re-export

app/forkshop/
  CLAUDE.md                     (from manifest: @forkshop/templates/claude-md)

public/fonts/forkshop/
  RaveoVF.woff2                 (from manifest binary: @forkshop/fonts/raveo/RaveoVF)

forkshop.json                   slim v2 lock file
```

### What init mutates

1. **`app/globals.css`** — append `@import "@forkshop/engine/forkshop.css";` at top (idempotent — checks for the literal line before appending). If the file does not exist, init errors with a message asking the user where their root CSS lives.
2. **`package.json`** — merge `@forkshop/engine` into `dependencies` via the existing `mergeDepsIntoPackageJson` logic. Init does **not** invoke the package manager; the summary tells the user to run `pnpm install` / `npm install` / etc.

### What init does NOT touch

- `app/forkshop/page.tsx`, `forkshop.config.tsx`, Board files — owned by the setup skill (so init alone leaves `/forkshop` with no page).
- `tailwind.config.*` — strategy v2 ships no theme preset at 1.0.
- `next.config.*` — Locator loader wiring is the setup skill's job (judgment call across `.js`/`.ts`/`.mjs`/`.cjs` variants and Next 14 vs 15).
- `app/forkshop/layout.tsx` — no Locator runtime mount needed; engine's homegrown `EditorLink` handles Option-click.

### Init flow phases

1. **Preflight** (existing `preflight.ts`): App Router exists, `tsconfig.json` has `@/*`. Unchanged.
2. **Refuse re-install** if `forkshop.json` is present. Existing behavior preserved.
3. **Fetch manifest** from `https://forkshop.dev/r/manifest.json` (overridable via `--registry`).
4. **Detect `src/` convention** (existing `detect-src-dir.ts`) → populates `srcPrefix`.
5. **Detect PM** (existing `detect-pm.ts`) → used for the install-command line in the summary.
6. **Resolve `init` bundle** from manifest (v2 composite — see Manifest schema v2).
7. **Collision check** against destinations (existing `findCollisions`). Same `--force` override.
8. **Copy files** with simplified rewrites (see Path rewrites).
9. **Copy font binary** — fetched from the manifest's `binary` entry. Manifest binary URL is `<registryBaseUrl>fonts/raveo/RaveoVF.woff2`. Fallback: `https://unpkg.com/@forkshop/engine@<engineVersion>/dist/fonts/RaveoVF.woff2` if the registry endpoint 404s.
10. **Append CSS import** to `app/globals.css` if not already present (new step).
11. **Merge `@forkshop/engine`** into `package.json` dependencies (existing `mergeDepsIntoPackageJson`).
12. **Write `forkshop.json`** with v2 schema.
13. **Print summary** — files written, deps added, install command, "next step: open Claude Code and say 'set up Forkshop'".

### Why font is delivered via manifest binary, not via `node_modules`

At `init` time the engine isn't installed yet (init is what merges it into `package.json`). The CLI can't `require.resolve("@forkshop/engine")` until after `pnpm install` runs. Two alternatives — a two-step `init --finish` round trip, or a lazy post-install copy — both add ceremony. Fetching the font once from the manifest in the same network round trip is the simpler path. The font is the only binary in the manifest; everything else is text.

For `forkshop update`, the same fetch path applies — the manifest binary is the source of truth for the font copy on disk.

## Manifest schema v2

The v1 schema carries ~8 bundles totaling ~250KB because it embeds engine source. With engine on npm, the manifest narrows to thin scaffolds + font binary.

### Schema

```ts
// packages/cli/src/manifest-schema.ts (v2)

export const MANIFEST_SCHEMA_VERSION = "2.0.0"

export interface Manifest {
  version: string                  // "2.0.0"
  generatedAt: string
  registryBaseUrl: string
  engineVersion: string            // NEW: pins the engine version this manifest was built against
  bundles: Record<string, Bundle>
  files: Record<string, ManifestFile>
}

export type Bundle =
  | { kind: "scaffold"; items: string[] }            // text files
  | { kind: "asset"; items: string[] }               // binary files (just the font today)
  | { kind: "composite"; includes: string[] }        // referencing other bundles

export type ManifestFile =
  | { kind: "text"; ext: "tsx" | "ts" | "md" | "css"; content: string; destOverride?: string }
  | { kind: "binary"; url: string; destOverride: string }
```

### Bundles

| Bundle | Kind | Items | Purpose |
|---|---|---|---|
| `route-stubs` | `scaffold` | 4 one-line re-exports for `/api/forkshop/{edit,positions,agent-activity,agent-activity/stream}/route.ts` | Always installed by init |
| `skill` | `scaffold` | `@forkshop/skill/{setup,live-editing,doc-sync}` | Always installed by init |
| `claude-md` | `scaffold` | `@forkshop/templates/claude-md` | Always installed by init |
| `font` | `asset` | `@forkshop/fonts/raveo/RaveoVF` (binary) | Always installed by init |
| `init` | `composite` | `["route-stubs", "skill", "claude-md", "font"]` | The entry point |

### Address rules

- `packages/engine/src/skill/<name>.md` → `@forkshop/skill/<name>`
- `packages/engine/templates/<name>.md` → `@forkshop/templates/<basename>` (e.g., `user-claude-md.md` → `@forkshop/templates/claude-md`)
- `packages/engine/templates/api-stubs/<name>-route.ts.template` → `@forkshop/route-stubs/<name>` (NEW: route stubs move from hard-coded inside `manifest-builder.ts` to file templates walked by the manifest builder)
- `packages/engine/fonts/raveo/RaveoVF.woff2` → `@forkshop/fonts/raveo/RaveoVF` (binary)

### Schema version break

Hard break from v1 to v2. No migration path. Rationale: the CLI runtime install flow has been broken since engine packaging shipped (refinement #9), so no v1 installs exist in the wild. The break is free.

Runtime gates:
- CLI receiving a v1 manifest from a stale registry → error: "your CLI is newer than the registry; update the registry."
- CLI receiving a v2 manifest with `forkshop.json` recording v1 schema → refuse `update`: "your installation predates this CLI's manifest schema; back up `app/forkshop/` and rerun `init`."

### `engineVersion` field

The manifest records which engine version it was built against. CLI compares this against the user's installed engine during `update` to drive the soft offer (see `forkshop update`). It is informational, not a constraint — registry can ship updates for engines back to the previous minor version.

### `manifest-builder.ts` changes

The v2 builder strips out all source-walking for `@forkshop/components/*`, `@forkshop/hooks/*`, `@forkshop/lib/*`, `@forkshop/layouts/*`, `@forkshop/types/*`, `@forkshop/node-types/*`. The walker only covers `packages/engine/src/skill/`, `packages/engine/templates/` (text + route stubs), and `packages/engine/fonts/` (binary).

Resulting size: ~80 LOC (down from ~230).

## Path rewrites and `forkshop.json` lock schema

### Slim rewrite layer

With engine on npm, engine imports stay as `@forkshop/engine/...` — no rewriting needed. The only paths left to rewrite are `@/...` placeholders in code-example blocks of markdown files (e.g., `app/forkshop/CLAUDE.md` examples need the user's `srcPrefix` applied).

`rewrite.ts` shrinks from a longest-prefix-match algorithm (~75 LOC) to a single regex pass for `@/...` placeholders (~30 LOC). All `@forkshop/{components,hooks,lib,api,tailwind,kits}` → user-alias mappings are removed.

### `forkshop.json` v2

```ts
export interface ForkshopJson {
  $schema?: string
  schemaVersion: "2.0.0"           // NEW: distinguishes from v1 installs (none in the wild)
  installedAt: string
  registryUrl: string
  engineVersion: string            // NEW: pinned @forkshop/engine version at install time
  mount: string                    // "@/app/forkshop" (or "@/src/app/forkshop" with src/)
  srcPrefix: "" | "src/"           // detected from tsconfig.json @/* mapping
  installedBundles: string[]       // ["init"] after install
  files: Record<string, ForkshopJsonFile>
}

export interface ForkshopJsonFile {
  dest: string                     // workspace-relative path on disk
  sha: string                      // sha256 of content as written (post-rewrite)
}
```

**Gone vs v1:**
- `aliases.components|kits|hooks|lib|api|tailwind` — source-copy destinations, irrelevant now.
- `aliases.base` — the `@/` prefix carrier; most paths are engine subpaths now.
- `registryVersion` → renamed to `schemaVersion` for clarity.

**Kept:**
- `mount` — the one path that varies per project. Default `@/app/forkshop`; future `--mount` flag could let users override for non-standard mount paths.
- `srcPrefix` — controls whether files land under `src/`.
- `files` — sha-tracked managed-files map. Drives `update` and `diff`.

### Sha computation

Identical to v1: sha256 over the post-rewrite content as it lands on disk. Stable across re-runs as long as the rewrite output is deterministic (it is — the rewrites are pure functions of the manifest content + `srcPrefix`).

## `forkshop update`

### Purpose

`forkshop update` is primarily a **prompt/docs refresh tool**. The files it manages are:

| File | Why update matters |
|---|---|
| `.claude/skills/forkshop-setup.md` | The prompt that drives the setup flow. Evolves as the flow is refined. |
| `.claude/skills/forkshop-live-editing.md` | Agent-cadence guidance. Evolves with learned best practices. |
| `.claude/skills/forkshop-doc-sync.md` | User-invoked doc-sync skill. Evolves with the framework. |
| `app/forkshop/CLAUDE.md` | User-facing mental-model doc. Gets new sections as Forkshop grows. |
| `app/api/forkshop/*/route.ts` | One-line re-exports. Rarely churn; refreshed for engine API renames. |
| `public/fonts/forkshop/RaveoVF.woff2` | Font binary. Refreshed on font revisions. |

Engine code itself is **out of scope** — that updates via `pnpm up @forkshop/engine`. The CLI's role is the Claude-facing layer.

### Flow

1. Read `forkshop.json`. Error if absent: "run `forkshop init` first".
2. Fetch manifest from `forkshopJson.registryUrl` (override via `--registry`).
3. **Schema version gate.** If `manifest.version` differs from `forkshopJson.schemaVersion`, error: "Your installation predates the current registry schema. Back up `app/forkshop/` and rerun `forkshop init`."
4. **Compute engine-pin drift.** Read `@forkshop/engine` from user's `package.json`. Compare against `manifest.engineVersion`. Defer the prompt to step 9 — the version difference shows up in the summary as a separate line.
5. For each file in `forkshopJson.files`:
   - Resolve current content from manifest at the same address.
   - Read the file's on-disk content at `forkshopJson.files[address].dest`.
   - Hash manifest content (post-rewrite, same path as install). Compare against lock's `sha`.
   - Hash on-disk content. Compare against lock's `sha`.
   - Classify: `unchanged` / `upstream-drift` / `local-drift` / `both-drift`.
6. For files in the manifest's `init` composite missing from `forkshopJson.files`: classify as `new-upstream`.
7. **Render summary** (sample with both file drift and engine-pin drift):

```
forkshop update — registry@2026-05-17

Engine pin:  @forkshop/engine 0.2.5 → 0.3.0  (in package.json)

3 files would update:
  ~ .claude/skills/forkshop-setup.md          (upstream drift)
  ~ .claude/skills/forkshop-live-editing.md   (upstream drift)
  + .claude/skills/forkshop-new-skill.md      (new upstream)

2 files have local edits — skipped:
  ! app/forkshop/CLAUDE.md                    (local drift)
  ! app/api/forkshop/edit/route.ts            (local drift; rerun with --force to overwrite)

Apply 3 file updates and bump engine pin? [y/N]
```

8. On `y`: apply file changes for `~` and `+`. Skip `!` unless `--force`. Update `forkshop.json.files` entries with new shas. If engine pin drift was shown and user accepted: rewrite `package.json` to bump `@forkshop/engine` to `manifest.engineVersion` AND update `forkshop.json.engineVersion`. Does **not** invoke the package manager — print "Run `pnpm install` to fetch the new engine version" at the end.
9. Print summary: `N files updated, engine pin bumped` (or just files if no engine drift, or just engine if no file drift).

### Flags

- `--force` — overwrite local-drift files. Useful for resetting to upstream.
- `--check` — print summary, exit 1 if any drift, no prompt. For CI / git pre-commit hooks.
- `--registry <url>` — override manifest URL.

### Drift detection semantics

Because sha is computed post-rewrite at install time, comparison is straightforward — no fuzzy match needed. The four states:

| State | Lock sha | Manifest sha | Disk sha | Action |
|---|---|---|---|---|
| `unchanged` | X | X | X | Skip |
| `upstream-drift` | X | Y | X | Apply Y (default) |
| `local-drift` | X | X | Z | Skip (use `--force` to overwrite with X) |
| `both-drift` | X | Y | Z | Skip (use `--force` to overwrite local Z with Y) |
| `new-upstream` | (absent) | Y | (absent) | Apply Y (default) |

## `forkshop diff <path>`

Existing UX preserved. Adaptations:

- Reads v2 lock schema.
- Post-rewrite content compared, so diff matches exactly what `update` would apply.
- New mode: `forkshop diff` with no argument lists every file with drift (same shape as `update --check`, no apply prompt).

## `forkshop add <bundle>` (placeholder for 1.0)

The command stays in the CLI binary as a stub:

```
$ forkshop add anything
No add-on bundles ship in 1.0.

The three starter kits (marketing, saas, default) arrive in the kits
rewrite (https://forkshop.dev/roadmap). Use `forkshop init` to install
the base; run the setup skill (open Claude Code, say "set up Forkshop")
to scaffold app/forkshop/ for now.
```

Exit code 0. No bundle resolution, no manifest fetch — pure print. Reactivated by the kits rewrite spec (#4).

## Setup skill rewrite (`packages/engine/src/skill/setup.md`)

The current skill (1205 lines) carries strategy v1 vocabulary, a Locator opt-in question, references to `iconoir-react` / `motion`, and assumes the source-copy install model. This rewrite covers everything that changed under the skill's feet between v1 and v2 — but keeps the kit picker as a `TODO` placeholder since spec #4 owns it.

### Structural changes

| Phase | Current | After rewrite |
|---|---|---|
| Phase 0 — Read preconditions | Unchanged in shape; v2 `forkshop.json` schema check | Same |
| Phase 1 — Read project, build understanding | Narrative output uses 5-concept vocabulary | Same |
| Phase 2 — Scan for primitives, blocks, routes | Output labels them as `inline-react`, `iframe-component`, `iframe-route` Nodes | Same |
| Phase 3 — Build consolidated proposal | **Stub-only proposal.** One Board (Gallery Layout) over discovered blocks. No kit picker. Marked `<!-- kit picker arrives in kits rewrite spec (#4) -->`. | Single generic stub |
| Phase 4 — Iterate | Same | Same |
| Phase 5 — Consent for config mutations | **Reduces to 1 question.** Locator opt-in gone (Option-click built into engine). Live-AI hook deferred to spec #5. Only the CLAUDE.md cadence note remains as an opt-in. AskUserQuestion call structure stays as single-panel for forward compat. | 1 consent question |
| Phase 6 — Write artifacts | `forkshop.config.tsx` (with discovered primitives + blocks), one Board file (`components-board.tsx` using `Gallery` Layout), `page.tsx` (mounts canvas + sidebar with the one Board), `app/globals.css` gets `@import "@forkshop/engine/forkshop.css"` (idempotent), `next.config.*` patched with `@locator/webpack-loader` rule (automatic, always-on — Option-click is a defining dev feature). CLAUDE.md cadence note step gated by Phase 5 consent. No layout.tsx mutation, no tailwind preset, no separate `forkshop.css`, no `<LocatorInit />` mount. | 4 automatic steps + 1 conditional |
| Phase 7 — Final summary | Same shape, simpler content; points at `app/forkshop/CLAUDE.md` | Same |
| Adjust mode | Same | Same |
| Edge cases | Refreshed: drop iconoir/motion references; add "engine missing — run `pnpm install`"; add "engine version pin mismatch — soft warning" | Updated |
| What this skill never does | Same | Same |
| Scaffolding templates section | 9 templates → 6 templates (drop Locator wiring, live-AI hook, CSS file, tailwind preset; keep `forkshop.config.tsx`, `page.tsx`, Board file; add NodeType import paths) | 6 templates |

### Vocabulary swap

| Old | New |
|---|---|
| "kit" (as in `DesignSystemBoard` kit) | "Layout" (as in `DesignSystemView` Layout) |
| "primitive" (small React render shown on canvas) | "`inline-react` Node" |
| "block" (component-preview iframe) | "`iframe-component` Node" |
| "page" | "`iframe-route` Node" |
| "section" (sidebar category) | "Board" |
| `<CanvasNode>` direct mount | Engine-owned — Nodes render through their NodeType |

### Locator: from opt-in to always-on automatic

Strategy refinement #7 dropped `@locator/runtime` and replaced it with engine's homegrown `EditorLink` component, which reads `data-locatorjs` attributes that `@locator/webpack-loader` stamps at build time. The build-time loader still needs to live in the user's `package.json` + `next.config.*`, but the user-facing toggle is gone — Option-click is a defining dev feature, always on.

The skill's Phase 6 includes an automatic step that:
1. Adds `@locator/webpack-loader` to `package.json` devDependencies (idempotent).
2. Modifies `next.config.*` (any of `.js` / `.ts` / `.mjs` / `.cjs`) to add the webpack rule (and turbopack rule for Next 15+).

The `next.config.*` mutation is done by Claude reading existing content + making a judgment call about the right shape, with the user-visible diff as the safety net. Concrete templates for Next 14 (webpack-only) and Next 15 (turbopack + webpack) live in the scaffolding-templates section.

### Net size

~1205 lines → ~600-700 lines. Kits rewrite (#4) will re-add ~400-500 lines when the kit-picker returns.

### Sibling files

- `live-editing.md` (34 lines) — mechanical sweep: rename `lucide-react` references; swap "block" / "primitive" to NodeType vocabulary. No structural rewrite.
- `doc-sync.md` (204 lines) — mechanical sweep: drop iconoir-react / motion references; update file-layout examples to v2 paths; swap kit vocabulary. No structural rewrite.

## User CLAUDE.md template rewrite (`packages/engine/templates/user-claude-md.md`)

Current template (372 lines) references `<CanvasNode>` as a user-facing primitive, the kit names from v1 (`DesignSystemBoard`, `IframeGallery`, `PageTree`), and `@/components/forkshop/...` import paths.

### Structural changes

| Section | Current | After rewrite |
|---|---|---|
| Header | "Forkshop is a Figma-style canvas + sidebar tool..." | Same opener + one-line note that this file is auto-loaded by Claude Code |
| Adding a new board | `<ForkshopCanvas>` + `<CanvasNode>` wiring | **Rewritten as "Adding a new Board (Layout + data)".** Board = Layout + data + sidebar entry. Code example uses `Gallery` Layout. No raw `<CanvasNode>` — engine internal. |
| Mental model | "Selection state" + "Primitives vs kits" + "Canvas/sidebar collaboration" | **Rewritten around the 5 concepts.** New subsections: Node, NodeType, Layout, Board, Kit. One paragraph + one code example each. |
| File layout | Lists files in `app/forkshop/` + `app/api/forkshop/` | Same structure, v2 paths. Drops kit-specific filenames (`design-system-board.tsx`, etc.) — now generic per-Board. Adds `app/forkshop/node-types/` (user-side custom NodeTypes). |
| How to add a new kit | When to extract a kit | **Renamed "How to add a new Board".** Adding a new Board is the common case. Adding a new Layout is rare (engine contribution path). Adding a new Kit is rarest (only relevant once `forkshop add` reactivates). |
| How to add a new node type | `<CanvasNode>` direct usage | **Rewritten as "Adding a custom NodeType".** Example: Storybook story preview NodeType. Shows `match` / `render` / `agentMatch`. Pointer to `app/forkshop/node-types/`. |
| Edit / spacing / open-in-editor | Three subsections | Lightly updated. Edit + spacing unchanged. Open-in-editor section corrected — built-in `EditorLink`; user needs `@locator/webpack-loader` (wired by setup skill). No `<LocatorInit />` mount step. |
| The three kits | `DesignSystemBoard`, `IframeGallery`, `PageTree` | **Rewritten as "The four Layouts at 1.0":** `Gallery`, `Tree`, `DesignSystemView`, `ResponsiveFrameView`. Each: import path + typed props. |
| Positions persisted | `<CanvasNode>` ids + `layouts/system.json` | Lightly updated. Persistence mechanism unchanged. Examples drop direct `<CanvasNode>` usage. |
| Live AI awareness | Hook → POST → SSE → React provider chain | Mostly kept. Vocabulary swap. Pointer to spec #5 for the producer protocol. Honest note: "live AI plumbing ships at 1.0; the Claude Code producer pack ships in spec #5." |
| Update this file | Reminder to keep doc in sync | Same |

### Import path migration

```diff
- import { ForkshopCanvas } from "@/components/forkshop/canvas/forkshop-canvas"
- import { CanvasNode } from "@/components/forkshop/canvas/canvas-node"
+ import { Board, Gallery } from "@forkshop/engine"
```

This single change ripples through every code block. The setup skill no longer writes `@/...` paths into the user's repo for engine code — only for user-side files (their own primitives, their own page mounts).

### Net length

~372 → ~320 lines.

## `apps/playground/` rebuild

### Purpose

Hand-maintained dev surface for engine development. Where visual regressions show up. The "does it work?" check on every engine change.

### Stays workspace-linked

`"@forkshop/engine": "workspace:*"`. The engine packaging spec already established the dist-driven flow (engine builds to `dist/`, playground resolves symlink, Next.js HMR picks up rebuilds). Unchanged here.

### Content rebuild — drop the Ravineo legacy

Current playground has `Acme` placeholder copy, hero blocks named with `bg-forkshop-accent` host classes, employee bios, "Ship better software, faster" CTA. None of this represents Forkshop the OSS tool.

### Replacement content

A small generic Next.js site — plausible enough to make Forkshop look interesting without branding.

```
components/
  ui/
    button.tsx                generic button primitive
    badge.tsx                 generic badge primitive
    input.tsx                 generic input primitive
  blocks/
    hero.tsx                  generic landing-page hero block
    feature-grid.tsx          generic 3-up feature grid
    cta.tsx                   generic CTA block
    pricing.tsx               generic pricing table
  layout/
    header.tsx                site nav
    footer.tsx                site footer

app/
  layout.tsx                  root layout (no Locator mounting — engine handles it)
  page.tsx                    home page composed from blocks
  about/page.tsx              about page
  pricing/page.tsx            pricing page
  globals.css                 @import "@forkshop/engine/forkshop.css"; @tailwind utilities;

app/forkshop/
  page.tsx                    mounts ForkshopCanvas + sidebar; routes selection to boards
  forkshop.config.tsx         data wiring: primitives + blocks + routes
  foundations-board.tsx       DesignSystemView Layout over the playground's tokens
  components-board.tsx        Gallery Layout over the primitives
  blocks-board.tsx            Gallery Layout over the blocks
  pages-board.tsx             Tree Layout over the routes
```

### Rules

1. **No `forkshop-*` tokens in playground host code.** Strategy v2: hosts don't use Forkshop's design tokens. Playground host code uses neutral Tailwind utilities (`bg-white`, `text-gray-900`, etc.).
2. **One icon library** for the playground's own UI (e.g., `lucide-react`), separate from any engine concern.
3. **No Ravineo names** or Ravineo CTA copy.
4. **Plausibly interesting.** Enough blocks/primitives for `Gallery` to look populated, enough routes for `Tree` to be non-trivial, enough tokens for `DesignSystemView` to render meaningfully.

### `apps/playground/forkshop.json`

Committed to the repo, reflecting v2 schema. Sha values pinned to current scaffold content. Records only the kit-independent files (skill files, route stubs, font, CLAUDE.md). Hand-curated content (`page.tsx`, `forkshop.config.tsx`, Board files) lives outside the lock's `files` map — matching how a real user project looks after the setup skill runs.

### Locator wiring in playground

`apps/playground/next.config.mjs` stays as-is (engine packaging already sorted it). The setup skill writes equivalent config into real users' next.config.

## `tests/smoke/` fixture

### Purpose

Verify the CLI works end-to-end against a fresh Next.js skeleton. Not a dev surface — touched only by CI and manual smoke runs.

### Shape

```
tests/smoke/
  README.md                   how to run, what it covers
  run-smoke.sh                the ephemeral install script (harness)
  expected-files.txt          list of files init should produce
  expected-package-json.json  diff target for the deps merge
```

### `run-smoke.sh` flow

1. Pack `packages/cli/` and `packages/engine/` into tarballs (`pnpm pack`).
2. Create fresh `/tmp/forkshop-smoke-<timestamp>/`.
3. `pnpm create next-app . --typescript --tailwind --app --no-eslint --no-import-alias --use-pnpm` inside it.
4. Install packed CLI tarball: `pnpm add -D <path-to-cli-tarball>`.
5. Run `npx forkshop init` against the fixture.
6. Assert: every file in `expected-files.txt` exists.
7. Assert: `package.json` includes `@forkshop/engine` at the expected version.
8. Install: `pnpm install` (this is where the engine actually lands in `node_modules`).
9. Build: `pnpm build`. Must succeed.
10. (Stretch — depends on setup skill producing `app/forkshop/page.tsx`, which it won't fully until kits rewrite.) Write a minimal `app/forkshop/page.tsx` from the smoke harness; start dev server; hit `/forkshop`; assert 200 OK with no console errors.

### Why not Vitest?

End-to-end shell-out with file-system side effects, PM invocations, network fetches. Vitest can wrap it, but the test body is fundamentally a shell script. Cleaner as `bash`.

### CI gate

Runs on every PR that touches `packages/cli/` or `packages/engine/`. Skipped on docs-only PRs. Time budget: ~60-90s including `pnpm create next-app` and the actual build.

### PM matrix

pnpm only at 1.0. The CLI's PM detection is unit-tested (`detect-pm.test.ts`). Smoke covers the real install path against one PM. Matrix smoke is a 1.x improvement if it ever matters.

## Testing strategy

### Unit tests (Vitest)

| Test file | Status | Coverage |
|---|---|---|
| `detect-pm.test.ts` | Kept | PM detection from lockfiles |
| `detect-src-dir.test.ts` | Kept | `src/` convention from tsconfig |
| `preflight.test.ts` | Kept | App Router + `@/*` checks |
| `forkshop-json.test.ts` | Rewritten for v2 schema | Read/write slim `forkshop.json` |
| `rewrite.test.ts` | Slimmed | Only `@/...` placeholder rewrites in markdown |
| `resolve-bundles.test.ts` | Rewritten | v2 bundle layout |
| `resolve-destination.test.ts` | Light updates | Slim alias map (`mount`, `srcPrefix`) |
| `copy-files.test.ts` | Light updates | Same flow, fewer aliases |
| `manifest-builder.test.ts` | Rewritten | v2 manifest output shape |
| `write-deps.test.ts` | Light updates | Only `@forkshop/engine` to merge |
| `init.test.ts` | Rewritten | New flow (engine merge, font copy, globals.css append) |
| `add.test.ts` | Rewritten | Placeholder behavior — prints message, exits 0 |
| `update.test.ts` | New | 4 drift states, apply, soft offer, `--check`, `--force` |
| `diff.test.ts` | Light updates | v2 lock schema |
| `sha.test.ts` | Kept | Content hashing |
| `unified-diff.test.ts` | Kept | Diff rendering |
| `globals-css-append.test.ts` | New | Idempotent append, `@tailwind` ordering |

### Integration test

`tests/e2e.test.ts` stays `.skip`'d. Replaced by `tests/smoke/run-smoke.sh`.

### Registry validation (`apps/docs/scripts/validate-registry.ts`)

- Existing `validateSkillPlaceholders` keeps applying — every `{{snake_case}}` placeholder in fenced code blocks.
- Existing `validateBundleItems` — bundle items must exist in files map. Catches "removed file but forgot to remove from bundle."
- **New `validateInitDestinations`** — every file the `init` composite produces must land at a known-good destination shape (must start with `.claude/`, `app/api/forkshop/`, `app/forkshop/`, or `public/fonts/forkshop/`). Catches accidental init scope creep.

### Manual smoke checks before declaring done

1. `tests/smoke/run-smoke.sh` passes locally.
2. `pnpm --filter playground dev` renders `/forkshop` with rebuilt content — no Ravineo references visible.
3. `pnpm --filter playground build` succeeds.
4. `npx forkshop diff app/forkshop/CLAUDE.md` against the playground after a deliberate edit — confirms diff renders correctly with v2 lock.
5. `npx forkshop update --check` against the playground after a deliberate edit to a skill file — confirms drift detection.
6. `npx forkshop update` against a fixture where engine version pin is stale — confirms soft offer fires.

## Risks

**R1. Setup skill rewrite regresses against real projects.** The current skill (1205 lines) covers many edge cases (monorepos, mixed tsconfigs, src-dir variants). Compressing to ~600-700 risks dropping something subtle.
- *Mitigation:* the kits rewrite spec (#4) re-enters Phase 1-3 with deeper logic. Edge-case handling can re-grow there. For 1.0 stub-only mode, we accept the smaller surface and the higher dependency on Claude judgment for exotic projects.

**R2. Manifest schema break leaves nobody behind (good) but burns the bridge.** No live v1 installs in the wild, but contributors on stale branches have to re-init.
- *Mitigation:* hard break documented in the spec and as a top-of-file note in `manifest-schema.ts`.

**R3. `next.config.*` mutation by the setup skill is brittle.** Five file extensions (`.js`, `.ts`, `.mjs`, `.cjs`), arbitrary user content, Next 14 vs 15 turbopack-rule differences.
- *Mitigation:* skill phrases it as "read existing config, choose the right approach, ask user to confirm the diff before writing." Claude's judgment + user-visible diff are the safety net. Concrete templates for both common shapes live in the scaffolding-templates section.

**R4. Font copy at `init` time depends on manifest binary delivery.** If `forkshop.dev` is down, init fails.
- *Mitigation:* CLI falls back to `https://unpkg.com/@forkshop/engine@<engineVersion>/dist/fonts/RaveoVF.woff2`. Engine is on npm; unpkg always works.

**R5. `globals.css` append is brittle.** Some users have CSS modules, some don't have globals.css at all, some use `app/styles/globals.css`.
- *Mitigation:* idempotency check before appending. If `@import "@forkshop/engine/forkshop.css"` is already present anywhere in the file, skip. If the file doesn't exist, error with a helpful message asking the user where their root CSS lives. Non-standard locations: user manually adds the import; next `init` run won't re-append.

**R6. `forkshop update` doesn't know about engine breaking changes.** If engine ships an API rename, route stubs become stale. Update refreshes them automatically — but if the user customized a route stub, local-drift detection kicks in.
- *Mitigation:* `--force` exists for the "I want upstream regardless" case. Route stub shape is so minimal (one-line re-export) that local customization is rare.

**R7. Stub-only setup skill produces minimal scaffolds.** A user running through setup in 1.0 sees one Board with whatever blocks the scan turned up. Empty `components/blocks/` → empty Board.
- *Mitigation:* Phase 7 summary explicitly tells the user "kit-aware scaffolding ships in spec #4. Until then, edit `forkshop.config.tsx` to add primitives + blocks + routes." Doc burden, not code burden.

## Open questions deferred to implementation

**O1. Exact wording of the placeholder `forkshop add` message.** Confirmed at impl time.

**O2. Exact next.config templates for Next 14 vs 15.** Engine packaging has the Next 14 template (`apps/playground/next.config.mjs`). Next 15 turbopack rules confirmed at impl time when we sample a Next 15 project.

**O3. `forkshop.dev/r/` deployment status.** The docs site exists but `/r/manifest.json` will need redeployment with v2 content before this spec's release. Owned by docs refresh (#6); the endpoint URL is locked here.

**O4. Engine version bump for this spec's release.** Lock-step with the next published engine version (likely `0.3.0` if engine packaging shipped `0.2.0`). Settled by release spec.

**O5. PM matrix in CI smoke.** Default to pnpm only. Revisit if npm/yarn/bun users surface real issues.

## Exit criteria

- All unit tests pass: `pnpm --filter forkshop test`.
- `tests/smoke/run-smoke.sh` passes.
- `pnpm --filter playground build` succeeds and renders `/forkshop` with no Ravineo references.
- `validateRegistry` passes against `packages/engine/`.
- The three skill files + `user-claude-md.md` use v2 vocabulary throughout (`git grep` for old terms returns zero).
- `git grep -n "@/components/forkshop\|@/lib/forkshop"` returns zero matches in `packages/engine/templates/` and `packages/engine/src/skill/`.
- `forkshop init` against the smoke fixture produces a valid, buildable project.
- `forkshop update` correctly classifies all four drift states against the playground.
- Manifest at `https://forkshop.dev/r/manifest.json` returns v2-shape JSON (or smoke fallback to packaged-CLI manifest documented).

## Supersedes

This spec supersedes the CLI design embedded in `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` (the v2 strategy's CLI section was strategy-level; this is the implementation layer).
