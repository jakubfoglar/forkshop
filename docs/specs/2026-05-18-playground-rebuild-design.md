# Playground rebuild — `apps/test/` + `apps/demo/` (implementation spec)

Date: 2026-05-18
Status: Approved — draft v0
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` (closes refinement #10 — "The current `apps/playground/` will be replaced wholesale during CLI rework")
Prerequisites:
- `docs/specs/2026-05-17-cli-rework-design.md` (shipped)
- `docs/specs/2026-05-17-setup-skill-v2-design.md` (shipped)
- `docs/specs/2026-05-18-live-ai-protocol-design.md` (shipped earlier today)

## Goal

Replace `apps/playground/` with a two-app layout that separates "what real users get from `forkshop init`" from "rich showcase content for ongoing development." The current playground has accumulated cruft that obscures real engine-side issues:

- Custom `BlocksBoardView` bypasses the engine's iframe-registry / relay pipeline (the iframe-side decorations from spec #5 never fire).
- `IframeRegistryProvider` is missing entirely (it had to be manually wired during smoke).
- Hardcoded `height: 600` clips block content silently.
- Primitive boards render with empty default props (Badge/Button without text).
- The block preview route needed a `"use client"` workaround because the engine's `dist/index.js` carries a `"use client"` directive that traps pure-helper consumers in RSC contexts.

This spec fixes the structural causes, not just the symptoms.

## Locked-in decisions

From the 2026-05-18 brainstorm:

1. **Two apps replace the single playground:**
   - `apps/test/` — pre-init fixture with curated content. User runs `forkshop init` + the setup skill manually to validate the full flow.
   - `apps/demo/` — renamed from `apps/playground/`. Rich showcase using engine helpers, runs under `pnpm dev`.
2. **No auto-regeneration of `apps/test/`.** No CI invocation of the setup skill. No headless setup mode. The pre-init content is committed; the post-init Forkshop scaffold is gitignored.
3. **`pnpm dev` runs the demo only** (mirrors today's behavior, just under the new app name).
4. **`pnpm reset-test`** wipes any Forkshop scaffold from `apps/test/` so the user can re-run init cleanly.
5. **Engine touch-ups bundled** (the structural fixes the smoke surfaced):
   - `@forkshop/engine/lib/*` server-safe subpath exports for pure helpers — fixes the `"use client"` directive trap.
   - `IframeRegistryProvider` + `AgentIframeRelay` auto-mounted inside `AgentActivityProvider` — one provider, both behaviors.
   - `LazyIframe` gains explicit `heightMode: 'auto' | 'cap' | 'fixed'` — removes the silent clipping bug.
   - Tightened `package.json` exports map — every public path explicitly enumerated.
   - Public-API snapshot test — accidental export changes fail CI.
6. **Demo reuses current playground content** (CTA / Hero / FeatureGrid / Pricing blocks + Badge / Button / Input primitives + about / pricing pages), rewired to consume engine helpers.
7. **CI builds `apps/test/`'s pre-init state only.** Catches broken fixture content. Doesn't try to run init or setup in CI.
8. **`pnpm verify-publish`** (tarball install verification) is deferred to 1.x release prep — not in this spec.

## Two-app layout

### `apps/test/` — init smoke fixture

A pristine Next.js + Tailwind skeleton with curated content. Designed to exercise every signal the setup skill's signal detector checks.

**Curated content (committed):**

```
apps/test/
├── app/
│   ├── layout.tsx               next/font/local for system stack + render <Header /> <Footer />
│   ├── page.tsx                 marketing-shaped homepage using Hero + FeatureGrid + CTA
│   ├── about/page.tsx           prose-only page
│   ├── pricing/page.tsx         Pricing block + marketing copy
│   └── contact/page.tsx         contact form-shaped page
├── components/
│   ├── ui/
│   │   ├── index.ts             barrel — exports Badge, Button, Input, Select
│   │   ├── badge.tsx            cva-shaped (variant, tone)
│   │   ├── button.tsx           cva-shaped (variant, size)
│   │   ├── input.tsx            controlled-component-shaped
│   │   └── select.tsx           cva-shaped (variant)
│   ├── blocks/
│   │   ├── index.ts             barrel — exports Hero, FeatureGrid, CTA, Pricing
│   │   ├── hero.tsx             title/description/cta-label props
│   │   ├── feature-grid.tsx     items: { title, description, icon }[]
│   │   ├── cta.tsx              title/description/cta-label props
│   │   └── pricing.tsx          tiers: { name, price, features }[]
│   └── layout/
│       ├── header.tsx
│       └── footer.tsx
├── content/
│   ├── getting-started.mdx      MDX content for Reference recipe detection
│   └── recipes.mdx
├── public/                       (empty; placeholder)
├── styles/
│   └── globals.css              Tailwind directives + a few CSS variables
├── next.config.ts
├── tailwind.config.ts            non-default theme.extend.{colors, fontFamily} — triggers Design System recipe
├── tsconfig.json                 src-less; not using src/ convention
├── package.json                  next, react, tailwind, no @forkshop/engine yet
└── README.md                     "Run `forkshop init` here to see the setup skill end-to-end"
```

**Absent intentionally** (these are init/setup-skill outputs):
- `app/forkshop/`
- `app/api/forkshop/`
- `forkshop.json`
- `.claude/skills/forkshop-*`
- `.claude/hooks/forkshop-*`

**Gitignored** (so post-init artifacts don't leak):

```
# apps/test/.gitignore additions
.next/
forkshop.json
app/forkshop/
app/api/forkshop/
.claude/skills/forkshop-*.md
.claude/hooks/forkshop-*.sh
```

**Workflow:**

```bash
pnpm reset-test                  # wipes the gitignored Forkshop output from apps/test/
cd apps/test
claude                           # open Claude Code session in this dir
> set up Forkshop                # invokes setup skill — full interactive flow
# Inspect the scaffolded boards. Verify the setup skill detected the
# right recipes from the curated content's signals.
pnpm dev                         # optional: see the result in browser at :3000
```

**`pnpm reset-test` script** (root `package.json`):

```bash
pnpm --filter test exec sh -c '
  rm -rf .next forkshop.json app/forkshop app/api/forkshop
  rm -f .claude/skills/forkshop-*.md .claude/hooks/forkshop-*.sh
  rm -f forkshop-engine-*.tgz
  # Note: leaves package.json / tailwind / next.config alone — those are
  # part of the committed fixture, not Forkshop scaffold artifacts.
  echo "✓ apps/test/ reset to pre-init state"
'
```

### `apps/demo/` — rich showcase (renamed playground)

`git mv apps/playground apps/demo`. After the move:

- Hand-maintained workspace package, same as today.
- Runs under `pnpm dev` at `:3000` (root `package.json`'s `dev` script `pnpm --filter @forkshop/engine dev --filter demo dev`).
- Reuses today's content (CTA / Hero / FeatureGrid / Pricing / Badge / Button / Input + about / pricing pages).
- **Rewired** to use engine helpers properly:
  - `app/forkshop/page.tsx` continues to mount `<AgentActivityProvider>` — but no longer mounts `<AgentIframeRelay>` separately (auto-mounted now).
  - `app/forkshop/blocks.tsx` drops the custom `BlocksBoardView`; uses engine's `Gallery` with `useDiscoveredBlocks(forkshopConfig.blocks)` directly. The `height: 600` becomes `heightMode: 'auto'`.
  - `app/forkshop/block/[slug]/page.tsx` reverts the client-side workaround (commit `a305746`); uses the new server-safe subpath `@forkshop/engine/lib/discover-blocks`.
  - Component boards (`ui-components/{badge,button,input}.tsx`) keep the existing fixture instances — they're a real-content showcase, not signal-detection bait.

## Engine touch-ups

### 1. `@forkshop/engine/lib/*` subpath exports

**Problem:** `packages/engine/dist/index.js` carries a `"use client"` directive (injected by the post-build script for the React Server Components compatibility model). Any RSC consumer importing from `@forkshop/engine` gets client-reference proxies even for pure functions like `discoverBlocks`, `fileToSelection`, or `parseSelection`. Workaround today: make the consumer client-side (lossy, e.g., my `a305746` patch).

**Fix:** tsup build splits pure helpers into separate dist chunks **without** the `"use client"` directive. Engine `package.json`'s `exports` map enumerates them as subpaths:

```jsonc
"exports": {
  ".":                                 "./dist/index.js",
  "./forkshop.css":                    "./dist/forkshop.css",
  "./api/edit/route":                  "./dist/api/edit/route.js",
  "./api/positions/route":             "./dist/api/positions/route.js",
  "./api/agent-activity/route":        "./dist/api/agent-activity/route.js",
  "./api/agent-activity/stream/route": "./dist/api/agent-activity/stream/route.js",
  "./lib/discover-blocks":             "./dist/lib/discover-blocks.js",
  "./lib/discover-primitives":         "./dist/lib/discover-primitives.js",
  "./lib/file-to-selection":           "./dist/lib/file-to-selection.js",
  "./lib/parse-selection":             "./dist/lib/parse-selection.js",
  "./lib/token-registry":              "./dist/lib/token-registry.js"
}
```

`tsup.config.ts` adds these as separate entry points. The `inject-directives.ts` post-build script is updated to **not** inject `"use client"` into chunks whose source files don't have it (today it's overly aggressive — it injects into `dist/index.js` because the file aggregates client + server content, polluting the server-safe helpers).

**Compatibility:** `import { discoverBlocks } from "@forkshop/engine"` continues to work (it's a client-side import then), but RSC consumers use the explicit subpath: `import { discoverBlocks } from "@forkshop/engine/lib/discover-blocks"`.

**Exhaustive subpath sweep.** During implementation, walk `packages/engine/src/lib/` and identify every file that contains zero React hooks and zero JSX — those are server-safe. Add a subpath export for each. The 5 shown above are illustrative; the actual list may include `serialize-selection`, `find-token-for-class`, `system-graph`, etc. Anything that imports React must NOT get a server-safe subpath (it stays under the `.` entry's `"use client"` umbrella).

### 2. `IframeRegistryProvider` + `AgentIframeRelay` auto-mounted

**Problem:** `AgentActivityProvider` and `IframeRegistryProvider` are separate. `AgentIframeRelay` is a third manual mount that ties them together. Demo had to add `<AgentIframeRelay />` explicitly (commit `060c4bd`); without it, the iframe-side decorations never fire. Users would hit the same issue.

**Fix:** `AgentActivityProvider` internally wraps its children with `IframeRegistryProvider` + renders `<AgentIframeRelay />`. One provider mount, both behaviors active.

```tsx
// packages/engine/src/components/agent-activity-context.tsx
export function AgentActivityProvider({ fileMap, children }: ...) {
  const [entries, setEntries] = useState<readonly ActivityEntry[]>([])
  // ... (existing SSE subscribe + prune logic)
  return (
    <Context.Provider value={value}>
      <IframeRegistryProvider>
        <AgentIframeRelay />
        {children}
      </IframeRegistryProvider>
    </Context.Provider>
  )
}
```

**Compatibility:** `<AgentIframeRelay />` and `<IframeRegistryProvider>` continue to be exported (mounting them manually is a no-op since they're nested inside `AgentActivityProvider`). A deprecation comment in the JSDoc steers new users to drop the manual mounts. Real removal can happen at a 0.x major bump.

### 3. `LazyIframe.heightMode: 'auto' | 'cap' | 'fixed'`

**Problem:** today's `LazyIframe` has a magic `height ?? heightCap` shape:
- `height` set → fixed height (ignores content)
- `heightCap` set → grow to content but cap at this value
- Neither set → height = 0 (unhelpful default)

The demo's `height: 600` is *really* a cap, not a fixed height, but the prop name is `height` and the implementation passes it as `heightCap`. Confusing. And capping clips content silently.

**Fix:** explicit mode prop replaces the magic.

```tsx
type LazyIframeProps = {
  // ...
  heightMode?: "auto" | "cap" | "fixed"
  height?: number        // required when heightMode === "fixed" or "cap"
  // (heightCap removed)
}
```

| Mode | Behavior |
|---|---|
| `'auto'` (default) | Grow iframe wrapper to `body.scrollHeight`; no cap. The natural choice for showcase content. |
| `'cap'` | Grow up to `height` then cap. Use when you want predictable Board sizes. |
| `'fixed'` | Always render at `height`. Ignores body scrollHeight. Used by ResponsiveFrameView at its viewport sizes. |

**Compatibility:** existing callers with `heightCap={600}` become `heightMode="cap" height={600}`. A one-version-deprecated alias keeps `heightCap` working with a console warning. Demo migrates to `heightMode="auto"` (no cap, content drives height).

### 4. Tightened `package.json` exports map

The exports map shown in (1) is **exhaustive**: nothing else is importable from outside the package. If `apps/demo/` tries `import { ForkshopCanvas } from "@forkshop/engine/components/canvas/forkshop-canvas"`, Node's resolver rejects the import (not in the map).

Currently the engine's exports map is partial; deep imports work for engine-internal paths because pnpm's symlink permits it. Tightening to "explicit subpaths only" closes this back door.

### 5. Public-API snapshot test

```ts
// packages/engine/src/__tests__/public-api.test.ts
import { describe, expect, it } from "vitest"
import snapshot from "./public-api.snap.json"
import * as root from "@forkshop/engine"
import * as discoverBlocks from "@forkshop/engine/lib/discover-blocks"
// ... import every subpath

describe("public API surface", () => {
  it("root entry exports match snapshot", () => {
    expect(Object.keys(root).sort()).toEqual(snapshot["@forkshop/engine"].sort())
  })

  it("./lib/discover-blocks exports match snapshot", () => {
    expect(Object.keys(discoverBlocks).sort())
      .toEqual(snapshot["@forkshop/engine/lib/discover-blocks"].sort())
  })

  // … one per subpath in the exports map
})
```

The snapshot file `public-api.snap.json` is committed and lists every named export per subpath. Adding/removing/renaming an export updates the snapshot in the same PR — git diff makes intent explicit. CI fails on undeclared API drift.

## Workflow & dev commands

Root `package.json` scripts after the rebuild:

```json
{
  "scripts": {
    "dev":         "pnpm -r --parallel --filter @forkshop/engine --filter demo run dev",
    "build":       "pnpm -r --filter @forkshop/engine --filter forkshop --filter docs --filter demo --filter test run build",
    "typecheck":   "pnpm -r run typecheck",
    "lint":        "pnpm -r run lint",
    "test":        "pnpm -r run test",
    "check":       "pnpm typecheck && pnpm lint",
    "reset-test":  "pnpm --filter test exec sh ./scripts/reset.sh"
  }
}
```

**Daily workflow:**
- `pnpm dev` — demo + engine watch (today's behavior at the renamed app)
- `pnpm reset-test && cd apps/test && claude` — validate the full setup flow

**Pre-commit:**
- `pnpm check` — typecheck + lint across the workspace
- `pnpm test` — runs engine + cli + demo + test unit tests

## CI gates

GitHub Actions workflow runs in this order (engine first; apps last; failures cascade-stop):

1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @forkshop/engine test` — 170+ engine tests
3. `pnpm --filter @forkshop/engine typecheck` — engine TS strict
4. `pnpm --filter @forkshop/engine build` — engine production build
5. `pnpm --filter forkshop test` — CLI tests
6. `pnpm --filter forkshop typecheck`
7. `pnpm --filter docs validate-registry` — registry validator
8. `pnpm --filter demo build` — demo Next.js build
9. **`pnpm --filter test build`** — test fixture build (NEW; verifies the pre-init state compiles)

No CI step runs `forkshop init` or the setup skill against `apps/test/`. Those are manual validation steps. CI's job is "the pre-init fixture is healthy."

## Out of scope

- **Auto-regeneration of `apps/test/`** — explicitly out. User-driven manual validation is the model.
- **Headless setup skill mode** — explicitly out. The skill stays purely interactive.
- **`forkshop scaffold --headless` CLI subcommand** — out (would only exist for headless mode).
- **`pnpm verify-publish` (tarball install verification)** — deferred to 1.x release prep. Adds a `pnpm pack` + install-into-`create-next-app` flow that verifies the publish-path artifact. Worth doing before the first `0.1.0` tag.
- **Engine `Tree.autoDiscover`** — deferred per polish backlog; not affected by this rebuild.
- **`DesignSystemView` parameterless variant** — deferred per polish backlog; not affected by this rebuild.
- **Marketing-style demo content** — out. Reuse existing playground content.
- **Demo embed into `apps/docs/`** — separate spec (#6 in strategy v2).

## Files touched

### Added

- `apps/test/` (entire app tree as enumerated above, ~25-30 source files)
- `apps/test/.gitignore` (Forkshop scaffold artifacts)
- `apps/test/scripts/reset.sh` (or inline in root `package.json` — whichever is cleaner)
- `packages/engine/src/__tests__/public-api.test.ts`
- `packages/engine/src/__tests__/public-api.snap.json`

### Renamed

- `apps/playground/` → `apps/demo/` (`git mv`)

### Modified

- `apps/demo/app/forkshop/page.tsx` — drop manual `<AgentIframeRelay />` mount (auto now)
- `apps/demo/app/forkshop/blocks.tsx` — drop custom BlocksBoardView; use Gallery + `useDiscoveredBlocks` + `heightMode='auto'`
- `apps/demo/app/forkshop/block/[slug]/page.tsx` — revert client-side workaround; import `discoverBlocks` from `@forkshop/engine/lib/discover-blocks` server-side
- `apps/demo/.claude/hooks/post-tool-use.sh` (rename of the playground's hook, no content change)
- `apps/demo/.claude/settings.json` (rename only)
- `apps/demo/package.json` (name field updated from `playground` to `demo`)
- `packages/engine/package.json` — exports map enumerates all subpaths; tightened
- `packages/engine/tsup.config.ts` — add `lib/*` entries
- `packages/engine/scripts/inject-directives.ts` — fix over-aggressive directive injection (don't pollute server-safe chunks)
- `packages/engine/src/components/agent-activity-context.tsx` — wraps children with `IframeRegistryProvider` + auto-mounts `AgentIframeRelay`
- `packages/engine/src/components/canvas/lazy-iframe.tsx` — `heightMode` prop replaces magic
- `packages/engine/src/index.ts` — re-export Hunk + AgentAction types; deprecation JSDoc on AgentIframeRelay export
- Root `package.json` — `dev` script targets `--filter demo`; new `reset-test` script
- Root `.gitignore` — `apps/test/.next/`, etc.
- CI workflow file (GitHub Actions) — add `pnpm --filter test build` step

### Removed

- The 4 workaround commits from the smoke can be reverted as part of this work:
  - `060c4bd` (playground wiring `AgentIframeRelay`) — supersedes via auto-mount
  - `a305746` (client-side block preview workaround) — supersedes via subpath export
  - `ed33617` (NodeFrame agentColor fix) — KEEP, this is real
  - `70c531b` (root hook to new payload) — KEEP, this is real

## Sequencing

Implementation lands in 5 stages, each independently mergeable:

1. **Engine touch-ups: subpath exports + tightened map + snapshot test** (~1.5 days)
   - tsup.config additions
   - inject-directives fix
   - new test files
   - exports map tightening
   - existing tests must pass; snapshot fresh-generated

2. **Engine touch-ups: AgentActivityProvider auto-mounts + LazyIframe.heightMode** (~1 day)
   - Provider rewrite (one file)
   - LazyIframe API rewrite + deprecation shim for `heightCap`
   - update existing engine tests

3. **`apps/playground/` → `apps/demo/` rename + rewiring** (~1 day)
   - `git mv`
   - drop manual AgentIframeRelay mount
   - rewire blocks.tsx
   - revert client-side block-preview workaround
   - smoke against `pnpm dev`

4. **`apps/test/` curated fixture** (~1.5 days)
   - Build the Next.js skeleton from scratch
   - Author the 4 primitives + 4 blocks + 4 pages + 2 MDX + tailwind theme
   - `.gitignore` for Forkshop scaffold artifacts
   - `pnpm reset-test` script
   - Root `package.json` updates

5. **CI workflow update + smoke** (~0.5 day)
   - Add `pnpm --filter test build` step
   - Manual end-to-end smoke: `pnpm reset-test`, `cd apps/test && claude`, run setup skill, inspect output
   - Document any drift between expected and actual setup-skill output

Total: ~5 days focused work.

## Open questions deferred to implementation

- Exact font choice for `apps/test/` (Inter via `next/font/google` is fine; matches what `create-next-app` defaults to).
- Whether the test fixture's `package.json` pins `@forkshop/engine` to `workspace:*` explicitly or relies on the init flow to write it. **Default:** init writes the version (production-shaped); pnpm resolves to workspace transparently.
- Whether `apps/test/` runs in `pnpm install`'s default install set or is `--filter test` opt-in. **Default:** default install set (workspace member). pnpm handles it fine.

These are implementation details, not design choices.
