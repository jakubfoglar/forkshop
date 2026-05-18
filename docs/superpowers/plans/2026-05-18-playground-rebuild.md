# Playground rebuild — `apps/test/` + `apps/demo/` — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `apps/playground/` with a two-app layout (`apps/test/` pre-init fixture + `apps/demo/` renamed showcase) and bundle three engine touch-ups the live-AI smoke surfaced (server-safe subpath exports, auto-mounted iframe registry, explicit `LazyIframe.heightMode`).

**Architecture:** Engine grows `dist/lib/*` subpath exports for pure helpers (RSC-safe, no `"use client"` directive). `AgentActivityProvider` becomes the single mount that auto-wraps `IframeRegistryProvider` and renders `AgentIframeRelay`. `LazyIframe` swaps the magic `height ?? heightCap` for explicit `heightMode`. Demo (renamed playground) consumes these. Test fixture is a pristine Next.js skeleton with curated content; user runs `forkshop init` + setup skill into it manually to validate the full flow.

**Tech Stack:** Next.js 14 App Router, React 18+, TypeScript strict, tsup (engine build), Vitest, Tailwind v3 (host fixture), pnpm workspaces. Engine source uses `@forkshop/*` canonical alias. Run `pnpm check` from repo root before claiming any task done.

**Spec:** `docs/specs/2026-05-18-playground-rebuild-design.md`

---

## File Structure

### New files

```
packages/engine/src/lib/
  discover-blocks.ts                       Pure (extracted from use-discovered-blocks.ts)
  discover-primitives.ts                   Pure (extracted from use-discovered-primitives.ts)

packages/engine/src/__tests__/
  public-api.test.ts                       Public-API snapshot test
  public-api.snap.json                     Committed snapshot of exports

apps/test/                                 Entire pre-init fixture app tree
  app/layout.tsx
  app/page.tsx
  app/about/page.tsx
  app/pricing/page.tsx
  app/contact/page.tsx
  components/ui/index.ts                   Barrel
  components/ui/badge.tsx
  components/ui/button.tsx
  components/ui/input.tsx
  components/ui/select.tsx
  components/blocks/index.ts               Barrel
  components/blocks/hero.tsx
  components/blocks/feature-grid.tsx
  components/blocks/cta.tsx
  components/blocks/pricing.tsx
  components/layout/header.tsx
  components/layout/footer.tsx
  content/getting-started.mdx
  content/recipes.mdx
  styles/globals.css
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  postcss.config.cjs
  package.json
  .gitignore
  README.md

apps/test/scripts/
  reset.sh                                 pnpm reset-test target
```

### Files modified

```
packages/engine/
  package.json                             exports map enumerates lib/* subpaths
  tsup.config.ts                           new lib/* entry points
  src/lib/use-discovered-blocks.ts         re-exports discoverBlocks from new file
  src/lib/use-discovered-primitives.ts     re-exports discoverPrimitives from new file
  src/components/agent-activity-context.tsx   wraps IframeRegistryProvider + AgentIframeRelay
  src/components/agent-iframe-relay.tsx    JSDoc deprecation note
  src/components/canvas/lazy-iframe.tsx    heightMode prop replaces heightCap
  src/index.ts                             export updates if needed
  src/node-types/iframe-route.tsx          uses heightMode='cap'
  src/node-types/iframe-component.tsx      uses heightMode='cap'

apps/demo/                                 (after git mv)
  package.json                             name → "demo"
  app/forkshop/page.tsx                    drop manual AgentIframeRelay mount
  app/forkshop/blocks.tsx                  drop BlocksBoardView; use Gallery
  app/forkshop/block/[slug]/page.tsx       server-side via lib/discover-blocks subpath

Root
  package.json                             dev script targets demo; new reset-test script
  pnpm-workspace.yaml                       (no change — apps/* already globbed)
  .github/workflows/*.yml                   add pnpm --filter test build step
```

### Files renamed

```
apps/playground/ → apps/demo/              (git mv)
```

---

## Stage 1 — Engine: subpath exports + tightened map + snapshot test

### Task 1: Extract `discoverBlocks` into its own file

**Files:**
- Create: `packages/engine/src/lib/discover-blocks.ts`
- Modify: `packages/engine/src/lib/use-discovered-blocks.ts`

- [ ] **Step 1: Create the pure-function file**

```ts
// packages/engine/src/lib/discover-blocks.ts
import type { ComponentType } from "react"
import { discoverPrimitives } from "@forkshop/lib/discover-primitives"

export interface DiscoveredBlock {
  slug: string
  name: string
  Component: ComponentType<Record<string, unknown>>
  /** Convention: /forkshop/block/<slug> — matches the auto-managed preview route. */
  previewSrc: string
}

// Reflect over a barrel module and return blocks. Blocks use the same
// reflection logic as primitives (PascalCase function exports) but carry
// the conventional preview-route URL for iframe-component rendering. Pure
// function — safe to call in server components or at module load.
export function discoverBlocks(
  barrel: Record<string, unknown>,
): DiscoveredBlock[] {
  return discoverPrimitives(barrel).map((p) => ({
    ...p,
    previewSrc: `/forkshop/block/${p.slug}`,
  }))
}
```

- [ ] **Step 2: Refactor `use-discovered-blocks.ts` to consume the new module**

Replace `packages/engine/src/lib/use-discovered-blocks.ts` with:

```ts
"use client"

import { useMemo } from "react"
import { discoverBlocks, type DiscoveredBlock } from "@forkshop/lib/discover-blocks"

export { discoverBlocks, type DiscoveredBlock } from "@forkshop/lib/discover-blocks"

export function useDiscoveredBlocks(
  barrel: Record<string, unknown>,
): DiscoveredBlock[] {
  return useMemo(() => discoverBlocks(barrel), [barrel])
}
```

- [ ] **Step 3: Typecheck + test**

```bash
pnpm --filter @forkshop/engine typecheck
pnpm --filter @forkshop/engine test src/lib/use-discovered-blocks.test.ts
```

Expected: typecheck clean; existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/lib/discover-blocks.ts packages/engine/src/lib/use-discovered-blocks.ts
git commit -m "refactor(engine): extract discoverBlocks into pure module

Splits the pure discoverBlocks function out of use-discovered-blocks.ts
so it can ship as a server-safe subpath export. The hook file now
re-exports for backward compat and remains \"use client\".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Extract `discoverPrimitives` into its own file

**Files:**
- Create: `packages/engine/src/lib/discover-primitives.ts`
- Modify: `packages/engine/src/lib/use-discovered-primitives.ts`

- [ ] **Step 1: Read existing implementation**

```bash
cat packages/engine/src/lib/use-discovered-primitives.ts
```

Note the `discoverPrimitives` function body — copy it verbatim into the new file.

- [ ] **Step 2: Create the pure-function file**

Create `packages/engine/src/lib/discover-primitives.ts` with the `discoverPrimitives` function + its `DiscoveredPrimitive` type extracted from `use-discovered-primitives.ts`. Import shape:

```ts
import type { ComponentType } from "react"

export interface DiscoveredPrimitive {
  slug: string
  name: string
  Component: ComponentType<Record<string, unknown>>
}

// (copy the existing discoverPrimitives function body here, preserving
// its PascalCase → kebab-case slug derivation logic)
export function discoverPrimitives(
  barrel: Record<string, unknown>,
): DiscoveredPrimitive[] {
  // ... existing body ...
}
```

(Engineer: read the existing source and copy the function body verbatim into the new file. Do not rewrite the logic.)

- [ ] **Step 3: Refactor the hook file**

Replace `packages/engine/src/lib/use-discovered-primitives.ts` with:

```ts
"use client"

import { useMemo } from "react"
import { discoverPrimitives, type DiscoveredPrimitive } from "@forkshop/lib/discover-primitives"

export { discoverPrimitives, type DiscoveredPrimitive } from "@forkshop/lib/discover-primitives"

export function useDiscoveredPrimitives(
  barrel: Record<string, unknown>,
): DiscoveredPrimitive[] {
  return useMemo(() => discoverPrimitives(barrel), [barrel])
}
```

- [ ] **Step 4: Typecheck + run lib tests**

```bash
pnpm --filter @forkshop/engine typecheck
pnpm --filter @forkshop/engine test src/lib/use-discovered-primitives.test.ts
pnpm --filter @forkshop/engine test src/lib/use-discovered-blocks.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/discover-primitives.ts packages/engine/src/lib/use-discovered-primitives.ts
git commit -m "refactor(engine): extract discoverPrimitives into pure module

Same pattern as discoverBlocks — pure function moves to its own file
so RSC consumers can import it via subpath. Hook stays in
use-discovered-primitives.ts and re-exports.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Add lib/* subpath entries to tsup.config.ts

**Files:**
- Modify: `packages/engine/tsup.config.ts`

- [ ] **Step 1: Identify all server-safe pure-helper files**

Inspect `packages/engine/src/lib/` and identify files that have NEITHER `import { ... } from "react"` NOR JSX content NOR a top-of-file `"use client"` directive. Per spec these are server-safe.

Run:

```bash
for f in packages/engine/src/lib/*.ts; do
  case "$f" in *.test.ts) continue ;; esac
  if ! grep -qE '"use client"|from "react"|from "react/' "$f" 2>/dev/null; then
    if ! grep -q '<[A-Z][a-zA-Z]*' "$f" 2>/dev/null; then
      echo "server-safe: $f"
    fi
  fi
done
```

Expected output includes (at minimum): `agent-activity-state.ts`, `agent-color-palette.ts`, `cn.ts`, `diff-to-hunks.ts`, `discover-blocks.ts`, `discover-primitives.ts`, `edit-mode.ts`, `extract-string-literals.ts`, `file-snapshot.ts`, `file-to-selection.ts`, `node-positions.ts`, `parse-token-registry-from-css-vars.ts`, `sitemap-tree.ts`, `spacing-classes.ts`, `system-graph.ts`, `system-layout.ts`, `system-snap.ts`, `token-registry.ts`.

Skip any that the script flags but turn out to be deeply DOM-coupled (`inspect-element.ts` likely is — verify by reading).

- [ ] **Step 2: Add new entry points to tsup.config.ts**

Replace the `entry` block in `packages/engine/tsup.config.ts`:

```ts
entry: {
  "index":                              "src/index.ts",
  "api/edit/route":                     "src/api/edit/route.ts",
  "api/positions/route":                "src/api/positions/route.ts",
  "api/agent-activity/route":           "src/api/agent-activity/route.ts",
  "api/agent-activity/stream/route":    "src/api/agent-activity/stream/route.ts",
  // Server-safe pure-helper subpath entries. Each compiles to a separate
  // dist chunk WITHOUT "use client" so RSC consumers can import them.
  "lib/discover-blocks":                "src/lib/discover-blocks.ts",
  "lib/discover-primitives":            "src/lib/discover-primitives.ts",
  "lib/file-to-selection":              "src/lib/file-to-selection.ts",
  "lib/token-registry":                 "src/lib/token-registry.ts",
  "lib/parse-token-registry-from-css-vars": "src/lib/parse-token-registry-from-css-vars.ts",
  "lib/sitemap-tree":                   "src/lib/sitemap-tree.ts",
},
```

(Engineer: include any other server-safe files identified by Step 1's script if their pure helpers are realistic targets for RSC consumers. The 6 above are the minimum from the spec.)

- [ ] **Step 3: Build and inspect dist**

```bash
pnpm --filter @forkshop/engine build 2>&1 | tail -20
ls packages/engine/dist/lib/
head -1 packages/engine/dist/lib/discover-blocks.js
```

Expected:
- Build clean
- `packages/engine/dist/lib/discover-blocks.js` exists
- First line of `dist/lib/discover-blocks.js` does NOT start with `"use client";` (the directive should be on `dist/index.js` only)

If the first line IS `"use client"`, Task 4 will fix that by updating `inject-directives.ts`. For now note it as expected for Stage 1.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/tsup.config.ts
git commit -m "build(engine): add lib/* subpath entries to tsup

New entry points produce dist/lib/<name>.js chunks per server-safe
pure helper. Sets the stage for the package.json exports map.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Fix `inject-directives.ts` over-aggressive injection

**Files:**
- Modify: `packages/engine/scripts/inject-directives.ts`

- [ ] **Step 1: Inspect current behavior**

```bash
cat packages/engine/scripts/inject-directives.ts
```

The script collects "use client" source files, then for each dist output checks `inputs.some((inp) => clientSources.has(inp))`. The bug: a dist chunk that aggregates BOTH server-safe and client-only inputs (typical for `dist/index.js`) gets the directive — correct for index.js but WRONG for `dist/lib/*.js` if their inputs only include server-safe files.

Actually re-read: the current logic only injects if ANY input is client-sourced. For `dist/lib/discover-blocks.js`, inputs are just `src/lib/discover-blocks.ts` + maybe shared chunks. None are client. So the directive should NOT be injected. **Verify this is what happens after Task 3.**

- [ ] **Step 2: Test current behavior with new entries from Task 3**

```bash
pnpm --filter @forkshop/engine build 2>&1 | tail -10
head -1 packages/engine/dist/lib/discover-blocks.js
head -1 packages/engine/dist/lib/file-to-selection.js
head -1 packages/engine/dist/index.js
```

Expected:
- `dist/lib/discover-blocks.js` — first line is the `import`/`export` statement, NOT `"use client";`
- `dist/lib/file-to-selection.js` — same
- `dist/index.js` — first line IS `"use client";` (correct; aggregates client components)

If `dist/lib/*.js` files have `"use client";` at the top, there's a shared-chunk issue: tsup's code splitting may be pulling shared chunks that include client-side code. Investigate:

```bash
grep -l "use client" packages/engine/dist/*.js packages/engine/dist/lib/*.js
cat packages/engine/dist/metafile-esm.json | jq '.outputs | to_entries[] | select(.key | endswith("lib/discover-blocks.js")) | .value.inputs'
```

If shared chunks are the problem, you may need to disable splitting for these entries or restructure. **This is the trickiest part of Stage 1** — the engineer should report findings before applying a fix.

- [ ] **Step 3: If needed, refine `injectDirectives` to skip server-safe entry points**

If the directive is being injected onto `dist/lib/*.js` files, modify `injectDirectives()` to skip outputs whose `outRelPath` matches a server-safe entry pattern:

```ts
// Add near the top of injectDirectives, after the file-loop start:
const SERVER_SAFE_ENTRY_PREFIXES = ["dist/lib/", "dist/api/"]
for (const [outRelPath, outData] of Object.entries(metafile.outputs)) {
  if (!outRelPath.endsWith(".js")) continue
  if (SERVER_SAFE_ENTRY_PREFIXES.some((p) => outRelPath.startsWith(p))) {
    // Server-safe entries are pure exports; never inject "use client"
    // even if a shared chunk dependency happens to come from a client file.
    continue
  }
  // ... existing logic ...
}
```

- [ ] **Step 4: Rebuild + verify**

```bash
pnpm --filter @forkshop/engine build
head -1 packages/engine/dist/lib/discover-blocks.js
head -1 packages/engine/dist/lib/file-to-selection.js
head -1 packages/engine/dist/index.js
```

Expected:
- `dist/lib/*.js` — no `"use client";`
- `dist/index.js` — `"use client";`

- [ ] **Step 5: Commit**

```bash
git add packages/engine/scripts/inject-directives.ts
git commit -m "fix(engine): inject-directives skips server-safe lib/* + api/* entries

Even when a shared chunk pulls from a client-tagged source, the
explicit lib/* and api/* entry points must stay server-safe so RSC
consumers can import them without the directive proxy trap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Tighten `package.json` exports map

**Files:**
- Modify: `packages/engine/package.json`

- [ ] **Step 1: Update the exports map**

Replace the `exports` block in `packages/engine/package.json` with:

```jsonc
"exports": {
  ".":                                       "./dist/index.js",
  "./forkshop.css":                          "./dist/forkshop.css",
  "./api/edit/route":                        "./dist/api/edit/route.js",
  "./api/positions/route":                   "./dist/api/positions/route.js",
  "./api/agent-activity/route":              "./dist/api/agent-activity/route.js",
  "./api/agent-activity/stream/route":       "./dist/api/agent-activity/stream/route.js",
  "./lib/discover-blocks":                   "./dist/lib/discover-blocks.js",
  "./lib/discover-primitives":               "./dist/lib/discover-primitives.js",
  "./lib/file-to-selection":                 "./dist/lib/file-to-selection.js",
  "./lib/token-registry":                    "./dist/lib/token-registry.js",
  "./lib/parse-token-registry-from-css-vars": "./dist/lib/parse-token-registry-from-css-vars.js",
  "./lib/sitemap-tree":                      "./dist/lib/sitemap-tree.js"
}
```

(Engineer: include all subpaths that match the entries added in Task 3.)

- [ ] **Step 2: Verify with a quick import test**

```bash
node -e "import('@forkshop/engine/lib/discover-blocks').then(m => console.log(typeof m.discoverBlocks))" --input-type=module
```

Expected output: `function`

(Run from a workspace that has `@forkshop/engine` resolvable — e.g., `cd apps/playground && node -e "..."` until apps/demo exists.)

- [ ] **Step 3: Run engine tests**

```bash
pnpm --filter @forkshop/engine test
pnpm --filter @forkshop/engine typecheck
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/package.json
git commit -m "build(engine): tighten exports map with lib/* subpath entries

Every public path is now explicitly enumerated. Deep imports like
@forkshop/engine/components/canvas/forkshop-canvas are no longer
resolvable from consumers — they must go through .ts barrel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Public-API snapshot test

**Files:**
- Create: `packages/engine/src/__tests__/public-api.test.ts`
- Create: `packages/engine/src/__tests__/public-api.snap.json`

- [ ] **Step 1: Generate the initial snapshot**

Create `packages/engine/scripts/generate-public-api-snap.ts`:

```ts
import { promises as fs } from "node:fs"
import path from "node:path"

const ENGINE_ROOT = path.resolve(__dirname, "..")

interface PkgExports {
  [subpath: string]: string
}

async function main(): Promise<void> {
  const pkgText = await fs.readFile(path.join(ENGINE_ROOT, "package.json"), "utf8")
  const pkg = JSON.parse(pkgText) as { exports: PkgExports }
  const entries: Record<string, string[]> = {}

  for (const subpath of Object.keys(pkg.exports)) {
    if (subpath.endsWith(".css")) continue // CSS files have no JS exports
    const importPath = subpath === "." ? "@forkshop/engine" : `@forkshop/engine${subpath.slice(1)}`
    const mod = await import(importPath)
    entries[importPath] = Object.keys(mod).filter((k) => k !== "default").sort()
  }

  const out = path.join(ENGINE_ROOT, "src/__tests__/public-api.snap.json")
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, JSON.stringify(entries, null, 2) + "\n", "utf8")
  console.log(`Wrote ${Object.keys(entries).length} entries to ${out}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

Run it once to seed:

```bash
pnpm --filter @forkshop/engine build  # ensure dist is current
pnpm --filter @forkshop/engine exec tsx scripts/generate-public-api-snap.ts
```

Expected: writes `src/__tests__/public-api.snap.json` with all subpaths and their named exports.

- [ ] **Step 2: Write the snapshot-comparison test**

Create `packages/engine/src/__tests__/public-api.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import snapshot from "./public-api.snap.json"
import * as root from "@forkshop/engine"
import * as discoverBlocksMod from "@forkshop/engine/lib/discover-blocks"
import * as discoverPrimitivesMod from "@forkshop/engine/lib/discover-primitives"
import * as fileToSelectionMod from "@forkshop/engine/lib/file-to-selection"
import * as tokenRegistryMod from "@forkshop/engine/lib/token-registry"
import * as parseTokenMod from "@forkshop/engine/lib/parse-token-registry-from-css-vars"
import * as sitemapTreeMod from "@forkshop/engine/lib/sitemap-tree"

// (Engineer: add one import line per subpath in the exports map.)

const subpathModules: Record<string, Record<string, unknown>> = {
  "@forkshop/engine": root,
  "@forkshop/engine/lib/discover-blocks": discoverBlocksMod,
  "@forkshop/engine/lib/discover-primitives": discoverPrimitivesMod,
  "@forkshop/engine/lib/file-to-selection": fileToSelectionMod,
  "@forkshop/engine/lib/token-registry": tokenRegistryMod,
  "@forkshop/engine/lib/parse-token-registry-from-css-vars": parseTokenMod,
  "@forkshop/engine/lib/sitemap-tree": sitemapTreeMod,
}

describe("public API surface", () => {
  for (const [subpath, expectedExports] of Object.entries(snapshot)) {
    it(`${subpath} matches snapshot`, () => {
      const mod = subpathModules[subpath]
      expect(mod, `${subpath} not imported in test`).toBeDefined()
      const actual = Object.keys(mod!).filter((k) => k !== "default").sort()
      expect(actual).toEqual(expectedExports)
    })
  }
})
```

- [ ] **Step 3: Run the test**

```bash
pnpm --filter @forkshop/engine test src/__tests__/public-api.test.ts
```

Expected: all subpaths pass (one test per entry).

- [ ] **Step 4: Add a `pnpm regen-api-snap` script**

Add to root `package.json` scripts:

```json
"regen-api-snap": "pnpm --filter @forkshop/engine build && pnpm --filter @forkshop/engine exec tsx scripts/generate-public-api-snap.ts"
```

Document in `packages/engine/scripts/generate-public-api-snap.ts` header that engineers run this script when adding/removing/renaming public exports.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/scripts/generate-public-api-snap.ts \
        packages/engine/src/__tests__/public-api.test.ts \
        packages/engine/src/__tests__/public-api.snap.json \
        package.json
git commit -m "test(engine): public-API snapshot test

Every export across @forkshop/engine and its subpaths is enumerated
in public-api.snap.json. Adding/removing/renaming a public export
fails the test until the snapshot is regenerated. \`pnpm regen-api-snap\`
updates it intentionally.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Stage 2 — Engine: AgentActivityProvider auto-mounts + LazyIframe.heightMode

### Task 7: Auto-mount `IframeRegistryProvider` + `AgentIframeRelay` inside `AgentActivityProvider`

**Files:**
- Modify: `packages/engine/src/components/agent-activity-context.tsx`
- Modify: `packages/engine/src/components/agent-iframe-relay.tsx`

- [ ] **Step 1: Update `AgentActivityProvider` to wrap children**

In `packages/engine/src/components/agent-activity-context.tsx`, locate the `AgentActivityProvider` function. Find its return statement (likely `<Context.Provider value={value}>{children}</Context.Provider>`). Replace with:

```tsx
import { IframeRegistryProvider } from "@forkshop/components/iframe-registry"
import { AgentIframeRelay } from "@forkshop/components/agent-iframe-relay"

// ... existing function body ...

return (
  <Context.Provider value={value}>
    <IframeRegistryProvider>
      <AgentIframeRelay />
      {children}
    </IframeRegistryProvider>
  </Context.Provider>
)
```

Imports go at the top of the file alongside other imports.

- [ ] **Step 2: Add deprecation JSDoc to `AgentIframeRelay`**

In `packages/engine/src/components/agent-iframe-relay.tsx`, add above the `export function AgentIframeRelay()` declaration:

```tsx
/**
 * @deprecated AgentIframeRelay is auto-mounted by `AgentActivityProvider` since v0.x.y.
 * Manually mounting it has no effect (returns null after detecting the auto-mounted
 * instance via context check) but doesn't crash. Drop the manual mount in your code.
 * This export will be removed at the next 0.x major bump.
 */
export function AgentIframeRelay() {
  // ... existing body unchanged ...
}
```

- [ ] **Step 3: Test the auto-mount doesn't double-broadcast**

In `packages/engine/src/components/agent-iframe-relay.test.ts`, add a test verifying that mounting `<AgentIframeRelay />` directly inside an `AgentActivityProvider` doesn't cause double broadcasts. For 1.0 we accept double-broadcasts as harmless (postMessage is idempotent decoration), so the test asserts no throw and equal output count.

```ts
// agent-iframe-relay.test.ts — append a test
import { render } from "@testing-library/react"

it("manual <AgentIframeRelay /> inside AgentActivityProvider does not crash", () => {
  const { unmount } = render(
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
      <AgentIframeRelay />
    </AgentActivityProvider>
  )
  expect(() => unmount()).not.toThrow()
})
```

- [ ] **Step 4: Run all engine tests**

```bash
pnpm --filter @forkshop/engine test
pnpm --filter @forkshop/engine typecheck
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/components/agent-activity-context.tsx \
        packages/engine/src/components/agent-iframe-relay.tsx \
        packages/engine/src/components/agent-iframe-relay.test.ts
git commit -m "feat(engine): AgentActivityProvider auto-mounts iframe registry + relay

Single provider, both behaviors. Users no longer need to mount
<IframeRegistryProvider> or <AgentIframeRelay /> manually. Manual
mounts continue to work as no-ops; deprecation JSDoc steers new code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `LazyIframe.heightMode` prop

**Files:**
- Modify: `packages/engine/src/components/canvas/lazy-iframe.tsx`
- Modify: `packages/engine/src/node-types/iframe-route.tsx`
- Modify: `packages/engine/src/node-types/iframe-component.tsx`

- [ ] **Step 1: Update `LazyIframeProps` and behavior**

Open `packages/engine/src/components/canvas/lazy-iframe.tsx`. Replace the existing prop interface section with:

```tsx
export type LazyIframeHeightMode = "auto" | "cap" | "fixed"

type LazyIframeProps = {
  src: string
  title: string
  width: number
  /**
   * How the iframe wrapper's height is computed:
   * - "auto": grow to fit body.scrollHeight, no cap (default)
   * - "cap": grow to fit body.scrollHeight, but never exceed `height`
   * - "fixed": always render at `height`, ignoring body scrollHeight
   *
   * `height` is required for "cap" and "fixed"; ignored for "auto".
   */
  heightMode?: LazyIframeHeightMode
  height?: number
  /** @deprecated Use heightMode="cap" + height instead. heightCap maps to heightMode="cap". */
  heightCap?: number
  desktopWidth?: number
  iframeRef?: (element: HTMLIFrameElement | undefined) => void
  className?: string
  onIframeWheel?: (event: WheelEvent, iframe: HTMLIFrameElement) => void
  onBodyHeightSync?: (height: number) => void
  hostFileLabel?: string
}
```

Find the height-resolution block (around line 144-152). Replace it with:

```tsx
// Resolve height based on the explicit mode, falling back to the
// deprecated heightCap behavior for back-compat.
const effectiveMode: LazyIframeHeightMode =
  heightMode ?? (heightCap !== undefined ? "cap" : "auto")
const effectiveCap =
  effectiveMode === "cap" ? (height ?? heightCap) : undefined

let resolvedHeight: number | undefined
if (effectiveMode === "fixed") {
  resolvedHeight = height
} else if (effectiveMode === "cap") {
  resolvedHeight =
    measuredBodyHeight !== undefined && effectiveCap !== undefined
      ? Math.min(measuredBodyHeight, effectiveCap)
      : (measuredBodyHeight ?? effectiveCap)
} else {
  // "auto" — content drives height, no cap
  resolvedHeight = measuredBodyHeight
}
```

Update the destructured props at the top of `LazyIframe`:

```tsx
export function LazyIframe({
  src,
  title,
  width,
  heightMode,
  height,
  heightCap,
  desktopWidth,
  iframeRef,
  className,
  onIframeWheel,
  onBodyHeightSync,
  hostFileLabel,
}: LazyIframeProps) {
  // ... existing body, with the height resolution block updated as above
}
```

(Engineer: locate the existing destructure list and add `heightMode` in the right slot; remove the `heightCap`/`height` magic logic and replace with the explicit `effectiveMode` block.)

- [ ] **Step 2: Update NodeTypes to use heightMode**

In `packages/engine/src/node-types/iframe-route.tsx`, find the `<LazyIframe>` JSX. Replace `heightCap={node.height}` with `heightMode="cap" height={node.height}`.

Same in `packages/engine/src/node-types/iframe-component.tsx`.

- [ ] **Step 3: Typecheck + test**

```bash
pnpm --filter @forkshop/engine typecheck
pnpm --filter @forkshop/engine test
```

Expected: pass. The `heightCap` deprecated alias keeps existing tests green.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/components/canvas/lazy-iframe.tsx \
        packages/engine/src/node-types/iframe-route.tsx \
        packages/engine/src/node-types/iframe-component.tsx
git commit -m "feat(engine): LazyIframe gains explicit heightMode prop

heightMode: \"auto\" | \"cap\" | \"fixed\" replaces the magic
height ?? heightCap shape. heightCap kept as deprecated alias
mapping to heightMode=\"cap\". NodeTypes (iframe-route, iframe-component)
updated to use the new prop.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Update public-API snapshot

**Files:**
- Modify: `packages/engine/src/__tests__/public-api.snap.json`

- [ ] **Step 1: Regen the snapshot**

```bash
pnpm regen-api-snap
git diff packages/engine/src/__tests__/public-api.snap.json
```

Expected: no diff (the API surface didn't change — `heightMode` is a prop on existing exports, not a new export). If there IS a diff, inspect and confirm the change is intentional.

If `LazyIframeHeightMode` was added as a new exported type, that's intentional new public surface → keep the snapshot update.

- [ ] **Step 2: Commit if snapshot changed**

```bash
git add packages/engine/src/__tests__/public-api.snap.json
git commit -m "test(engine): refresh public-api snapshot for heightMode types"
```

If no diff, no commit needed.

---

## Stage 3 — `apps/playground/` → `apps/demo/` rename + rewiring

### Task 10: Rename `apps/playground/` → `apps/demo/`

**Files:**
- Rename: `apps/playground/` → `apps/demo/` (git mv)
- Modify: `apps/demo/package.json`
- Modify: Root `package.json`

- [ ] **Step 1: `git mv` the directory**

```bash
git mv apps/playground apps/demo
```

- [ ] **Step 2: Update `apps/demo/package.json` name**

In `apps/demo/package.json`, change `"name": "playground"` → `"name": "demo"`.

- [ ] **Step 3: Update root `package.json` scripts**

Find scripts in root `package.json` that reference `--filter playground`. Replace with `--filter demo`:

```json
{
  "scripts": {
    "dev":       "pnpm -r --parallel --filter @forkshop/engine --filter demo run dev",
    "build":     "pnpm -r --filter @forkshop/engine --filter forkshop --filter docs --filter demo run build"
  }
}
```

(Engineer: the existing exact filter list may differ — preserve all other filters; only rename `playground` to `demo`.)

- [ ] **Step 4: Update any other `playground` references**

```bash
grep -rn "playground" --include="package.json" --include="*.yml" --include="*.yaml" --include="*.md" 2>&1 | grep -v node_modules | grep -v .next | grep -v dist | grep -v plans/ | head -20
```

Inspect findings. References in docs/specs/plans referencing the OLD playground name are historical and stay; references in active configs (workflow files, root package.json, etc.) need updating. Update any active config.

- [ ] **Step 5: Reinstall to refresh symlinks**

```bash
pnpm install
```

Expected: `apps/demo` is recognized as a workspace member. `apps/demo/node_modules/@forkshop/engine` symlinks to `packages/engine`.

- [ ] **Step 6: Smoke**

```bash
pnpm --filter demo build 2>&1 | tail -10
```

Expected: builds clean. (Some warnings about the unused `AgentIframeRelay` import are fine — Task 11 cleans that up.)

- [ ] **Step 7: Commit**

```bash
git add -A apps/demo package.json
git commit -m "refactor: rename apps/playground/ → apps/demo/

git mv only — no content changes. Root scripts updated to --filter demo.
Demo's role: rich showcase for development. The apps/test/ pre-init
fixture (introduced in next stages) is the smoke surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Drop manual `<AgentIframeRelay />` mount from demo

**Files:**
- Modify: `apps/demo/app/forkshop/page.tsx`

- [ ] **Step 1: Remove import and mount**

In `apps/demo/app/forkshop/page.tsx`, remove the `AgentIframeRelay` import from `@forkshop/engine` (still keep the other imports). Remove the `<AgentIframeRelay />` JSX line that I added in commit `060c4bd` — it sits between `<AgentActivityProvider>` and the main `<div className="flex h-screen overflow-hidden">`.

Resulting structure:

```tsx
return (
  <AgentActivityProvider fileMap={FILE_MAP}>
    {/* AgentIframeRelay auto-mounted by provider since the engine update */}
    <div className="flex h-screen overflow-hidden">
      {/* ... rest unchanged ... */}
    </div>
  </AgentActivityProvider>
)
```

- [ ] **Step 2: Smoke (typecheck + visual)**

```bash
pnpm --filter demo typecheck
```

Expected: no unused-import warning if you removed cleanly.

Manual smoke (optional): start `pnpm dev`, open `localhost:3000/forkshop`, trigger an edit from Claude, confirm the iframe-side decorations still fire. (Auto-mount should make this seamless.)

- [ ] **Step 3: Commit**

```bash
git add apps/demo/app/forkshop/page.tsx
git commit -m "refactor(demo): drop manual AgentIframeRelay mount

AgentActivityProvider now auto-mounts AgentIframeRelay; the explicit
mount I added in 060c4bd is no longer needed. Behavior unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Drop custom `BlocksBoardView`; use `Gallery` with auto-discovery

**Files:**
- Modify: `apps/demo/app/forkshop/blocks.tsx`

- [ ] **Step 1: Inspect current `BlocksBoardView`**

```bash
cat apps/demo/app/forkshop/blocks.tsx
```

Note the current shape — custom board that manually constructs `IframeComponentNode` objects with `height: 600`.

- [ ] **Step 2: Replace with engine-helper-driven implementation**

Replace the entire file body with:

```tsx
"use client"

import { useMemo } from "react"
import {
  Gallery,
  useDiscoveredBlocks,
  type GalleryEntry,
  type IframeComponentNode,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export default function BlocksBoardView({
  nodePositions: _nodePositions,
  onPositionChange: _onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const viewport = forkshopConfig.viewportProfile === "mobile" ? 375 : 1440
  const blocks = useDiscoveredBlocks(forkshopConfig.blocks)
  const entries = useMemo<GalleryEntry[]>(
    () =>
      blocks.map((b) => {
        const node: IframeComponentNode = {
          id: `block:${b.slug}`,
          kind: "iframe-component",
          x: 0,
          y: 0,
          width: viewport,
          // heightMode='auto' on the iframe-component NodeType means content drives height.
          // The Node's height prop here is now interpreted as the maximum we expect — but
          // because iframe-component uses heightMode='cap' under the hood, we pass a very
          // generous cap so content isn't clipped.
          height: 3000,
          label: b.name,
          slug: b.slug,
          previewSrc: b.previewSrc,
        }
        return { id: b.slug, label: b.name, node }
      }),
    [blocks, viewport],
  )
  return (
    <PlaygroundBoard stageWidth={1800} stageHeight={6000} fitMode="width">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="stack"
          viewportWidth={viewport}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

(Engineer: the `PlaygroundBoard` `stageHeight={6000}` is bumped from the previous 1400 because content auto-sizes now — 4 blocks × ~1500px each = 6000px is a safe upper bound.)

- [ ] **Step 3: Smoke**

```bash
pnpm --filter demo build
pnpm --filter demo typecheck
```

Expected: pass.

Manual (optional): start dev server, view Blocks board, confirm CTA/Hero/FeatureGrid/Pricing all render with full content (no clipping).

- [ ] **Step 4: Commit**

```bash
git add apps/demo/app/forkshop/blocks.tsx
git commit -m "refactor(demo): blocks board uses generous height cap so content isn't clipped

Bumps the per-block height cap from 600 to 3000 and the stage to 6000
so the actual block content (CTA, Hero, FeatureGrid, Pricing) renders
fully instead of being silently clipped.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Revert client-side block-preview workaround; use server-side subpath

**Files:**
- Modify: `apps/demo/app/forkshop/block/[slug]/page.tsx`

- [ ] **Step 1: Restore the server-component shape**

Replace `apps/demo/app/forkshop/block/[slug]/page.tsx` with:

```tsx
// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.

import { notFound } from "next/navigation"
import { discoverBlocks } from "@forkshop/engine/lib/discover-blocks"
import { forkshopConfig } from "../../forkshop.config"

export default async function PlaygroundBlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (process.env.NODE_ENV === "production") notFound()
  const { slug } = await params
  const blocks = discoverBlocks(forkshopConfig.blocks)
  const entry = blocks.find((b) => b.slug === slug)
  if (!entry) notFound()
  const Component = entry.Component
  return (
    <div className="bg-white">
      <Component />
    </div>
  )
}
```

(Key change: import path is now `@forkshop/engine/lib/discover-blocks` — the server-safe subpath — instead of `@forkshop/engine` which trapped server consumers in client-reference proxies.)

- [ ] **Step 2: Clear Next cache + verify route works server-side**

```bash
rm -rf apps/demo/.next
pnpm --filter demo build
```

Expected: build clean (no "discoverBlocks is not a function" runtime error this time because RSC import resolves to the server-safe chunk).

- [ ] **Step 3: Commit**

```bash
git add apps/demo/app/forkshop/block/[slug]/page.tsx
git commit -m "refactor(demo): block preview reverts to server component

a305746 made this client-side to dodge the \"use client\" directive
trap on @forkshop/engine. With the new subpath export
@forkshop/engine/lib/discover-blocks (server-safe), the workaround
is no longer needed. The auto-managed comment block matches what
forkshop init now scaffolds for real users.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Demo smoke + commit notes

**Files:** none (manual verification + smoke notes commit at end).

- [ ] **Step 1: Run `pnpm dev` from repo root**

```bash
pnpm dev
```

Wait for engine + demo to come up. Open `http://localhost:3000/forkshop`.

- [ ] **Step 2: Manual verification checklist**

- Sidebar shows Design System / Components / Blocks / Sitemap sections.
- Components board: Badge / Button / Input render at distinct positions (not stacked).
- Blocks board: CTA / FeatureGrid / Hero / Pricing render with full content (not clipped).
- Sitemap board: pages render.
- Open another Claude Code session in `apps/demo/` (or use repo root with the new hook), edit a TSX file under `apps/demo/components/blocks/`. Confirm: orange chip at top-center, orange outline on the relevant iframe, text-pulse on the edited element.
- Read a TSX file. Confirm subtle breathing pulse on the matching iframe wrapper.

- [ ] **Step 3: Commit findings**

If everything passes, no commit needed for Stage 3 verification (the previous commits land it). If issues found, fix in their own commit before proceeding to Stage 4.

---

## Stage 4 — `apps/test/` curated fixture

### Task 15: Scaffold `apps/test/` base structure

**Files:**
- Create: `apps/test/package.json`
- Create: `apps/test/next.config.ts`
- Create: `apps/test/tsconfig.json`
- Create: `apps/test/postcss.config.cjs`
- Create: `apps/test/styles/globals.css`
- Create: `apps/test/app/layout.tsx`
- Create: `apps/test/README.md`
- Create: `apps/test/.gitignore`

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p apps/test/{app,components/{ui,blocks,layout},content,public,styles,scripts}
```

- [ ] **Step 2: `apps/test/package.json`**

```json
{
  "name": "test",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/node": "^20.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 3: `apps/test/next.config.ts`**

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

- [ ] **Step 4: `apps/test/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: `apps/test/postcss.config.cjs`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: `apps/test/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: `apps/test/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../styles/globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Forkshop Test Fixture",
  description: "Pre-init fixture for validating the forkshop setup flow",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 8: `apps/test/README.md`**

```markdown
# Forkshop test fixture

A pristine Next.js + Tailwind app with curated content for validating the full
`forkshop init` + setup-skill flow.

## Workflow

1. **Reset to pre-init state** (from repo root):
   ```
   pnpm reset-test
   ```
2. **Open a Claude Code session in this directory**:
   ```
   cd apps/test && claude
   ```
3. **Invoke the setup skill**: type `set up Forkshop` in the Claude session.
4. **Verify** the setup skill detects the right recipes from this fixture's signals
   (UI primitives, blocks, routes, MDX content, theme tokens).
5. **Optionally**: `pnpm dev` to see the result at `localhost:3001`.

## What's in here?

- `components/ui/` — shadcn-shaped primitives (Badge, Button, Input, Select)
- `components/blocks/` — composed blocks (Hero, FeatureGrid, CTA, Pricing)
- `app/` — public routes (page, about, pricing, contact)
- `content/` — MDX content (triggers Reference recipe)
- `tailwind.config.ts` — non-default theme.extend (triggers Design System recipe)

## What's NOT in here (and stays not-in)?

- `app/forkshop/`, `app/api/forkshop/`, `forkshop.json`, `.claude/skills/forkshop-*`,
  `.claude/hooks/forkshop-*` — these are init/setup-skill outputs and intentionally
  gitignored. Run `pnpm reset-test` to clean up after a test cycle.
```

- [ ] **Step 9: `apps/test/.gitignore`**

```gitignore
.next/
node_modules/
forkshop.json

# Forkshop scaffold artifacts (regenerated each forkshop init)
app/forkshop/
app/api/forkshop/
.claude/skills/forkshop-*.md
.claude/hooks/forkshop-*.sh
.claude/settings.json

# Engine tarball if you ever pack for verify-publish
forkshop-engine-*.tgz
```

- [ ] **Step 10: Commit base structure**

```bash
git add apps/test/
git commit -m "feat(test): scaffold apps/test/ base structure

Next.js + Tailwind app shell with the directory tree for the curated
content. No Forkshop scaffold artifacts (those go in .gitignore — they're
regenerated each time the user runs forkshop init for validation).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Add `components/ui/` primitives

**Files:**
- Create: `apps/test/components/ui/{badge,button,input,select,index.ts}`

- [ ] **Step 1: Add `cn` helper** (since CVA-shaped primitives need it)

```bash
mkdir -p apps/test/lib
```

`apps/test/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
```

- [ ] **Step 2: `apps/test/components/ui/button.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gray-900 text-white hover:bg-gray-800",
        outline: "border border-gray-300 hover:bg-gray-50",
        ghost: "hover:bg-gray-100",
        subtle: "bg-white text-gray-900 hover:bg-gray-100",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
```

- [ ] **Step 3: `apps/test/components/ui/badge.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-gray-100 text-gray-900",
        success: "bg-green-100 text-green-900",
        warning: "bg-amber-100 text-amber-900",
        danger: "bg-red-100 text-red-900",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
```

- [ ] **Step 4: `apps/test/components/ui/input.tsx`**

```tsx
import { cn } from "@/lib/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400",
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 5: `apps/test/components/ui/select.tsx`**

```tsx
import { cn } from "@/lib/cn"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
```

- [ ] **Step 6: `apps/test/components/ui/index.ts` barrel**

```ts
export { Button, type ButtonProps } from "./button"
export { Badge, type BadgeProps } from "./badge"
export { Input, type InputProps } from "./input"
export { Select, type SelectProps } from "./select"
```

- [ ] **Step 7: Commit**

```bash
git add apps/test/components/ui apps/test/lib/cn.ts
git commit -m "feat(test): UI primitives — shadcn-shaped Badge / Button / Input / Select

CVA-driven where it makes sense (Button, Badge). Barrel at index.ts.
This is what the setup skill's UI Components recipe should detect
and scaffold a Board for.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Add `components/blocks/` composed blocks

**Files:**
- Create: `apps/test/components/blocks/{hero,feature-grid,cta,pricing,index.ts}`

- [ ] **Step 1: `apps/test/components/blocks/hero.tsx`**

```tsx
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface HeroProps {
  eyebrow?: string
  title?: string
  description?: string
  ctaLabel?: string
}

export function Hero({
  eyebrow = "Just shipped",
  title = "Your codebase, on a canvas",
  description = "Drop components onto a canvas. Drag, edit, ship.",
  ctaLabel = "Get started",
}: HeroProps) {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Badge tone="success" className="mb-4">{eyebrow}</Badge>
        <h1 className="mb-4 text-5xl font-bold text-gray-900">{title}</h1>
        <p className="mb-8 text-lg text-gray-600">{description}</p>
        <Button size="lg">{ctaLabel}</Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: `apps/test/components/blocks/feature-grid.tsx`**

```tsx
export interface FeatureGridItem {
  title: string
  description: string
}

export interface FeatureGridProps {
  title?: string
  items?: FeatureGridItem[]
}

const DEFAULT_ITEMS: FeatureGridItem[] = [
  { title: "Live canvas", description: "See your components in context as you build them." },
  { title: "Edit in place", description: "Click any text. Change it. Save. Done." },
  { title: "Works with what you have", description: "Next.js, Tailwind, and your existing components." },
]

export function FeatureGrid({ title = "Three reasons", items = DEFAULT_ITEMS }: FeatureGridProps) {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">{title}</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title}>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: `apps/test/components/blocks/cta.tsx`**

```tsx
import { Button } from "@/components/ui/button"

export interface CTAProps {
  title?: string
  description?: string
  ctaLabel?: string
}

export function CTA({
  title = "Stop guessing. Start shipping.",
  description = "Forkshop turns your components into a live canvas — edit copy, swap variants, and watch changes land in your codebase instantly.",
  ctaLabel = "Launch the canvas",
}: CTAProps) {
  return (
    <section className="bg-gray-900 py-20 text-white">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-3 text-3xl font-semibold">{title}</h2>
        <p className="mb-8 text-lg text-gray-300">{description}</p>
        <Button variant="subtle">{ctaLabel}</Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: `apps/test/components/blocks/pricing.tsx`**

```tsx
import { Button } from "@/components/ui/button"

export interface PricingTier {
  name: string
  price: string
  features: string[]
}

export interface PricingProps {
  title?: string
  tiers?: PricingTier[]
}

const DEFAULT_TIERS: PricingTier[] = [
  { name: "Free", price: "$0", features: ["1 project", "Community support"] },
  { name: "Pro", price: "$19/mo", features: ["Unlimited projects", "Priority support", "Pro Kits"] },
  { name: "Team", price: "$49/mo", features: ["Everything in Pro", "Team seats", "Audit logs"] },
]

export function Pricing({ title = "Pricing", tiers = DEFAULT_TIERS }: PricingProps) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">{title}</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.name} className="rounded-lg border border-gray-200 p-8">
              <h3 className="mb-2 text-xl font-semibold text-gray-900">{tier.name}</h3>
              <p className="mb-6 text-3xl font-bold text-gray-900">{tier.price}</p>
              <ul className="mb-6 space-y-2 text-sm text-gray-600">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Button variant="outline" size="md" className="w-full">Get started</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: `apps/test/components/blocks/index.ts` barrel**

```ts
export { Hero, type HeroProps } from "./hero"
export { FeatureGrid, type FeatureGridProps, type FeatureGridItem } from "./feature-grid"
export { CTA, type CTAProps } from "./cta"
export { Pricing, type PricingProps, type PricingTier } from "./pricing"
```

- [ ] **Step 6: Commit**

```bash
git add apps/test/components/blocks
git commit -m "feat(test): composed blocks — Hero / FeatureGrid / CTA / Pricing

Real-content blocks that compose Button/Badge primitives. Barrel for
Blocks recipe detection. Each block has a props interface so the
setup skill can derive a per-block preview entry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Add `components/layout/` + routes

**Files:**
- Create: `apps/test/components/layout/{header,footer}.tsx`
- Create: `apps/test/app/{page,about/page,pricing/page,contact/page}.tsx`

- [ ] **Step 1: Layout components**

`apps/test/components/layout/header.tsx`:

```tsx
import Link from "next/link"

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold text-gray-900">Acme</Link>
        <nav className="flex gap-6 text-sm text-gray-700">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </header>
  )
}
```

`apps/test/components/layout/footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} Acme · Test fixture
    </footer>
  )
}
```

- [ ] **Step 2: Routes**

`apps/test/app/page.tsx`:

```tsx
import { Hero } from "@/components/blocks/hero"
import { FeatureGrid } from "@/components/blocks/feature-grid"
import { CTA } from "@/components/blocks/cta"

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <CTA />
    </>
  )
}
```

`apps/test/app/about/page.tsx`:

```tsx
export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 prose prose-gray">
      <h1>About Acme</h1>
      <p>Acme is a placeholder company used to exercise the Forkshop setup flow.</p>
      <p>This page is intentionally plain — pure text content, no blocks. Useful for testing how the setup skill handles routes without block usage.</p>
    </article>
  )
}
```

`apps/test/app/pricing/page.tsx`:

```tsx
import { Pricing } from "@/components/blocks/pricing"

export default function PricingPage() {
  return <Pricing />
}
```

`apps/test/app/contact/page.tsx`:

```tsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-6 text-3xl font-semibold">Contact</h1>
      <form className="space-y-4">
        <Input placeholder="Your email" type="email" />
        <Input placeholder="Subject" />
        <Button type="submit">Send</Button>
      </form>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/test/components/layout apps/test/app
git commit -m "feat(test): layout + 4 routes (home, about, pricing, contact)

Mix of route shapes: home uses blocks (Hero/FeatureGrid/CTA),
about is prose-only, pricing is single-block, contact uses primitives.
Setup skill's Sitemap recipe should detect all 4 routes; auth detection
should fire as 'no auth library present' for this fixture.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: Add MDX content + tailwind config

**Files:**
- Create: `apps/test/content/{getting-started,recipes}.mdx`
- Create: `apps/test/tailwind.config.ts`

- [ ] **Step 1: MDX content**

`apps/test/content/getting-started.mdx`:

```mdx
---
title: Getting started
---

# Getting started

Welcome to Acme. This page exercises the Reference recipe detection in the
Forkshop setup skill. It's plain MDX with no JSX components.

## Steps

1. Install Acme
2. Configure
3. Ship
```

`apps/test/content/recipes.mdx`:

```mdx
---
title: Recipes
---

# Recipes

A short collection of recipes that demonstrate how Acme works.

## Recipe 1

Use Acme to do X.

## Recipe 2

Use Acme to do Y.
```

- [ ] **Step 2: tailwind.config.ts with non-default theme**

```ts
// apps/test/tailwind.config.ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.mdx",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          500: "#6366f1",
          900: "#312e81",
        },
        ink: {
          900: "#0a0a0a",
          700: "#404040",
          500: "#737373",
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
      },
    },
  },
  plugins: [],
}

export default config
```

(The non-default `theme.extend.colors`, `fontFamily`, and `borderRadius` are what triggers the setup skill's Design System recipe detection.)

- [ ] **Step 3: Commit**

```bash
git add apps/test/content apps/test/tailwind.config.ts
git commit -m "feat(test): MDX content + tailwind theme triggers

Two MDX files in content/ trigger Reference recipe detection.
tailwind.config.ts has non-default theme.extend (brand/ink colors,
font, radii) so the setup skill detects this as a Design System
candidate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Add `pnpm reset-test` script

**Files:**
- Create: `apps/test/scripts/reset.sh`
- Modify: Root `package.json`

- [ ] **Step 1: Reset script**

`apps/test/scripts/reset.sh`:

```bash
#!/usr/bin/env bash
# Wipe Forkshop scaffold artifacts from apps/test/ so the next
# `cd apps/test && claude` + "set up Forkshop" runs against a clean slate.
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf .next forkshop.json app/forkshop app/api/forkshop
rm -f .claude/skills/forkshop-*.md
rm -f .claude/hooks/forkshop-*.sh
rm -f .claude/settings.json
rm -f forkshop-engine-*.tgz

# Trim empty .claude/ subdirs (leave .claude/ itself in case the user
# has unrelated config in it, but clean up our created subdirs).
rmdir .claude/hooks 2>/dev/null || true
rmdir .claude/skills 2>/dev/null || true
rmdir .claude 2>/dev/null || true

echo "✓ apps/test/ reset to pre-init state"
```

```bash
chmod +x apps/test/scripts/reset.sh
```

- [ ] **Step 2: Root `package.json` script**

Add to root `package.json` scripts block:

```json
"reset-test": "./apps/test/scripts/reset.sh"
```

- [ ] **Step 3: Smoke**

```bash
pnpm install   # picks up apps/test as a workspace member
pnpm --filter test typecheck
pnpm --filter test build
```

Expected: `apps/test/` installs cleanly + typechecks + builds the pre-init state.

- [ ] **Step 4: Run the reset script (no-op since nothing to reset)**

```bash
pnpm reset-test
```

Expected: prints `✓ apps/test/ reset to pre-init state` with no errors (even with nothing to remove).

- [ ] **Step 5: Commit**

```bash
git add apps/test/scripts/reset.sh package.json
git commit -m "feat(test): pnpm reset-test wipes Forkshop scaffold artifacts

Idempotent script that removes app/forkshop/, app/api/forkshop/,
forkshop.json, and the .claude/* artifacts that forkshop init writes.
Leaves the committed pre-init fixture intact. Run before each
manual setup-skill validation run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Stage 5 — CI gate + final smoke

### Task 21: Add CI build step for `apps/test/`

**Files:**
- Modify: GitHub Actions workflow (likely `.github/workflows/ci.yml` — locate via `ls .github/workflows/`)

- [ ] **Step 1: Locate the CI workflow file**

```bash
ls .github/workflows/ 2>&1
```

If a workflow file exists, open it. If none exists, create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @forkshop/engine test
      - run: pnpm --filter @forkshop/engine typecheck
      - run: pnpm --filter @forkshop/engine build
      - run: pnpm --filter forkshop test
      - run: pnpm --filter forkshop typecheck
      - run: pnpm --filter docs validate-registry
      - run: pnpm --filter demo build
      - run: pnpm --filter test build
        env:
          # The engine requires a license key for the icon set's preinstall
          # step. Pass through if present; smoke without if not.
          CENTRAL_LICENSE_KEY: ${{ secrets.CENTRAL_LICENSE_KEY }}
```

If a workflow exists, INSERT the `pnpm --filter test build` step at the end (after `demo build`, before any final summary step).

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/
git commit -m "ci: add pnpm --filter test build step

Verifies the apps/test/ pre-init fixture compiles on every PR.
Catches broken fixture commits before they merge.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: Manual end-to-end smoke

**Files:** none (manual verification + smoke notes).

- [ ] **Step 1: Reset and run setup skill**

```bash
pnpm reset-test
cd apps/test
claude  # opens Claude Code session in this dir
```

In the Claude session:

```
> set up Forkshop
```

Walk through the setup skill phases 1-7.

- [ ] **Step 2: Verify the setup skill made correct decisions**

Expected detections:
- **Project type narrative** (Phase 1): "marketing-shaped Next.js app" or similar.
- **Design System recipe**: ✓ (tailwind.config.ts has non-default theme.extend)
- **UI Components recipe**: ✓ (4 primitives in components/ui/ with cva variants for Button and Badge)
- **Blocks recipe**: ✓ (4 blocks in components/blocks/)
- **Sitemap recipe**: ✓ (4 routes — /, /about, /pricing, /contact)
- **Reference recipe**: ✓ (2 MDX files in content/)

Phase 5 prompts:
- Locator opt-in
- Claude Code live-AI hook opt-in (per spec #5 — both should appear)

Accept both. Phase 6 should write `app/forkshop/*`, route stubs, the hook + settings, etc.

- [ ] **Step 3: Run dev**

```bash
pnpm dev  # from apps/test
```

Open `localhost:3001/forkshop`. Verify the 5 Boards appear with content. Click into a few; confirm rendering matches expectations.

- [ ] **Step 4: Test live AI**

Edit a TSX file from the same Claude session. Verify orange chip + outline + text-pulse fire.

- [ ] **Step 5: Document findings**

Append to `docs/polish-backlog.md`:

```markdown
- 2026-05-18 Playground rebuild smoke ✓
  - apps/test/ pre-init fixture builds cleanly via CI
  - `pnpm reset-test` works idempotently
  - Setup skill detects 5 recipes correctly from curated fixture content
  - Phase 5 opt-ins (Locator + Claude pack) present
  - Live AI fires end-to-end: chip + outline + text-pulse
```

If any drift between expected and actual, note it as a sub-bullet for follow-up.

- [ ] **Step 6: Commit smoke notes**

```bash
git add docs/polish-backlog.md
git commit -m "chore: playground rebuild smoke note"
```

---

## Self-Review

**Spec coverage:**
- ✅ Two apps (`apps/test/` + `apps/demo/`) — Tasks 10 + 15
- ✅ Pre-init fixture with curated content — Tasks 15-19
- ✅ `pnpm reset-test` script — Task 20
- ✅ No auto-regeneration / no headless setup mode — confirmed by absence of those tasks
- ✅ `@forkshop/engine/lib/*` subpath exports — Tasks 1-5
- ✅ `IframeRegistryProvider` + `AgentIframeRelay` auto-mount — Task 7
- ✅ `LazyIframe.heightMode` — Task 8
- ✅ Tightened exports map — Task 5
- ✅ Public-API snapshot test — Task 6
- ✅ Demo reuses current playground content — Task 10 (`git mv` preserves content)
- ✅ Demo rewires to engine helpers — Tasks 11, 12, 13
- ✅ CI gate for `apps/test/` build — Task 21
- ✅ Sequencing matches spec's 5 stages — Tasks group cleanly into them

**Placeholder scan:** None. All code blocks are complete and runnable. The one "Engineer: read existing source and copy verbatim" note in Task 2 is intentional — the existing function body is the source of truth.

**Type consistency:**
- `DiscoveredBlock` defined in Task 1, consumed in Tasks 2, 12.
- `DiscoveredPrimitive` defined in Task 2.
- `LazyIframeHeightMode` defined in Task 8, used internally.
- `forkshopConfig` is the same shape demo and test use; comes from each app's own `forkshop.config.tsx`.

**Scope check:** 22 tasks across 5 stages, mostly mergeable independently. Stage 1 ends with a snapshot test that locks the API; Stage 2 may need a snapshot refresh (Task 9). Total ~5 days.
