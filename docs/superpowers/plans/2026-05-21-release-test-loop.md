# Release-Test Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make per-release QA a one-command flow against content that exercises gnarly edge cases (the kinds that bit v0.4.0), and clean up four small v0.4.1 backlog items (CSS var scoping, docs/extending rewrite, README refresh, gitignore privacy).

**Architecture:** Keep apps/test small. Add 2 stress-test blocks specifically constructed to trigger known-painful patterns (h-screen viewport pinning, naturally tall content). Pin apps/test to npm (not workspace links) and ship a `pnpm test-release` script that wipes + repins + reinstalls in one step. The four cleanups land alongside as separate small phases.

**Tech Stack:** TypeScript, Next.js App Router, Tailwind v3, pnpm workspaces. No new deps anywhere.

**Spec:** [docs/superpowers/specs/2026-05-21-release-test-loop-design.md](../specs/2026-05-21-release-test-loop-design.md). The spec discusses three content paths (full WAVECLASH copy / minimal / stress-test fixture); after writing the spec we chose **Path C — stress-test fixture** for lower coupling and a smaller in-repo surface. apps/test keeps its existing placeholder pages + UI primitives.

---

## File structure

### New files

```
apps/test/components/blocks/
  viewport-hero.tsx          stress-test block — uses min-h-screen,
                             exercises the iframe-viewport-pinning bug class
                             (the one that took most of v0.4.0 to diagnose)
  tall-feature.tsx           stress-test block — naturally tall content
                             (many vertical sections, no fixed height) to
                             exercise iframe auto-growth in Gallery layouts
apps/test/README.md           release-test loop documentation (likely replaces an empty or stale file)
scripts/bump-test-pins.mjs    deterministic rewrite of apps/test/package.json's pinned versions
```

### Modified files

```
apps/test/components/blocks/index.ts    add the 2 stress-test exports
apps/test/package.json                   @forkshop/engine + forkshop pinned to ^X.Y.Z (not workspace:* / file:)
package.json                              new "test-release" script
.gitignore                                private docs folders added
README.md                                 Layouts list refreshed for 0.4.0
apps/docs/app/(marketing)/docs/extending/page.mdx    rewrite for the new contract
packages/engine/tailwind/forkshop.css                CSS vars scoped off :root
```

### Deleted files

None. apps/test keeps its existing structure (3 placeholder blocks, 4 UI primitives, 3 pages, layout/header/footer). We only ADD stress-test blocks.

---

## Phase A — Release-test loop

After this phase, `pnpm test-release && cd apps/test && claude → "set up Forkshop" → pnpm dev` is the full per-release QA loop.

### Task A1: Recon apps/test current state

**Files:**
- Inspect (no commit): `apps/test/`

- [ ] **Step 1: Confirm current content tree**

Run: `ls -la apps/test/components/blocks/ apps/test/components/ui/ apps/test/app/`
Expected: blocks (cta, feature-grid, hero, pricing, index.ts), ui (badge, button, input, select, index.ts), app (about/, contact/, pricing/, layout.tsx, page.tsx).

- [ ] **Step 2: Confirm package.json deps shape**

Run: `cat apps/test/package.json`
Note: `dependencies["@forkshop/engine"]` is likely `"workspace:*"` and `devDependencies.forkshop` is likely `"file:../../packages/cli"`. Task A4 (bump-test-pins) flips both to `^<version>`.

No commit for this task — recon only.

### Task A2: Add stress-test blocks

**Files:**
- Create: `apps/test/components/blocks/viewport-hero.tsx`
- Create: `apps/test/components/blocks/tall-feature.tsx`
- Modify: `apps/test/components/blocks/index.ts`

- [ ] **Step 1: Write `viewport-hero.tsx`**

Create `apps/test/components/blocks/viewport-hero.tsx`:

```tsx
// Stress-test block — uses min-h-screen to deliberately trigger the
// iframe-viewport-pinning bug class. When this block is loaded inside an
// iframe-route Node, the engine's CSS injection in LazyIframe (see
// buildIframeContentStyle) MUST neutralize min-h-screen so body.scrollHeight
// reports the real content height instead of the iframe's intrinsic 150px
// default. A regression here = the v0.4.0 h-screen bug returning.

export interface ViewportHeroProps {
  title?: string
  description?: string
}

export function ViewportHero({
  title = "Edge of the page",
  description = "This block uses min-h-screen. If Forkshop renders it correctly inside an iframe, the engine's viewport-pinning override is working.",
}: ViewportHeroProps) {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-6 py-24 text-center text-white">
      <h1 className="mb-6 text-5xl font-bold">{title}</h1>
      <p className="max-w-2xl text-lg text-gray-300">{description}</p>
    </section>
  )
}
```

- [ ] **Step 2: Write `tall-feature.tsx`**

Create `apps/test/components/blocks/tall-feature.tsx`:

```tsx
// Stress-test block — naturally tall content (no fixed height, just lots
// of vertical sections). Exercises iframe auto-growth: Gallery's measured
// height should grow to fit this block, not clip it. A regression where
// the cell stays at DEFAULT_INITIAL_HEIGHT (600) = the auto-growth chain
// is broken.

export interface TallFeatureProps {
  heading?: string
}

export function TallFeature({ heading = "Many small things" }: TallFeatureProps) {
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-12 text-3xl font-semibold text-gray-900">{heading}</h2>
        <div className="space-y-12">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-6">
              <h3 className="mb-2 text-lg font-medium text-gray-900">Section {i + 1}</h3>
              <p className="text-gray-600">
                Each section has padding, text, and a border. Twenty of them
                stacked vertically make this block tall enough that any clipping
                bug shows up immediately when rendered in a Forkshop iframe cell.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Update the blocks barrel**

Edit `apps/test/components/blocks/index.ts`. Read current contents first:

```bash
cat apps/test/components/blocks/index.ts
```

Append the two new exports so the file reads:

```ts
export { Hero, type HeroProps } from "./hero"
export { FeatureGrid, type FeatureGridProps, type FeatureGridItem } from "./feature-grid"
export { CTA, type CTAProps } from "./cta"
export { Pricing, type PricingProps, type PricingTier } from "./pricing"
export { ViewportHero, type ViewportHeroProps } from "./viewport-hero"
export { TallFeature, type TallFeatureProps } from "./tall-feature"
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter test typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/test/components/blocks/
git commit -m "$(cat <<'EOF'
chore(test): add stress-test blocks (viewport-hero, tall-feature)

Two blocks specifically engineered to exercise edge cases that have
bitten Forkshop releases:

- viewport-hero.tsx uses min-h-screen — regression-tests the engine's
  CSS injection that neutralizes viewport-height classes so iframes
  size to body.scrollHeight instead of the intrinsic 150px viewport.
- tall-feature.tsx renders 20 naturally-sized vertical sections —
  regression-tests Gallery's auto-growth chain so cells grow past
  DEFAULT_INITIAL_HEIGHT (600) when measured content is taller.

apps/test stays small (existing 3 placeholder blocks + 4 UI primitives
preserved). Stress-test blocks are a thin, targeted addition rather than
a full WAVECLASH copy.
EOF
)"
```

### Task A3: Create scripts/bump-test-pins.mjs

**Files:**
- Create: `scripts/bump-test-pins.mjs`
- Modify: `apps/test/package.json` (as a side-effect of running the script)

- [ ] **Step 1: Write the script**

Create `scripts/bump-test-pins.mjs`:

```js
#!/usr/bin/env node
// Reads the current @forkshop/engine version from packages/engine/package.json
// and rewrites apps/test/package.json so @forkshop/engine and forkshop both
// pin to ^<version>. Idempotent. Exits non-zero on parse failure.
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const enginePkgPath = resolve(root, "packages/engine/package.json")
const testPkgPath = resolve(root, "apps/test/package.json")

const enginePkg = JSON.parse(readFileSync(enginePkgPath, "utf8"))
const testPkg = JSON.parse(readFileSync(testPkgPath, "utf8"))

const version = enginePkg.version
if (!version) {
  console.error("bump-test-pins: could not read version from packages/engine/package.json")
  process.exit(1)
}

const pin = `^${version}`
let changed = false

if (testPkg.dependencies?.["@forkshop/engine"] !== pin) {
  testPkg.dependencies ??= {}
  testPkg.dependencies["@forkshop/engine"] = pin
  changed = true
}
if (testPkg.devDependencies?.forkshop !== pin) {
  testPkg.devDependencies ??= {}
  testPkg.devDependencies.forkshop = pin
  changed = true
}

if (changed) {
  writeFileSync(testPkgPath, JSON.stringify(testPkg, null, 2) + "\n", "utf8")
  console.log(`bump-test-pins: apps/test pinned to ${pin}`)
} else {
  console.log(`bump-test-pins: apps/test already at ${pin}, no change`)
}
```

- [ ] **Step 2: Make executable + verify it runs**

```bash
chmod +x scripts/bump-test-pins.mjs
node scripts/bump-test-pins.mjs
```

Expected: prints `bump-test-pins: apps/test pinned to ^0.4.0`. Now check `apps/test/package.json`:
- `dependencies["@forkshop/engine"]` should be `"^0.4.0"` (was `"workspace:*"`)
- `devDependencies.forkshop` should be `"^0.4.0"` (was `"file:../../packages/cli"`)

- [ ] **Step 3: Re-run to verify idempotency**

```bash
node scripts/bump-test-pins.mjs
```

Expected: prints "already at ^0.4.0, no change". Exits 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/bump-test-pins.mjs apps/test/package.json
git commit -m "$(cat <<'EOF'
chore: bump-test-pins.mjs — script that pins apps/test to current engine version

Reads packages/engine/package.json's version and rewrites apps/test's
@forkshop/engine + forkshop deps to ^<version>. Idempotent. Used by
pnpm test-release to switch apps/test from workspace-linked (dev mode)
to npm-pinned (release-test mode) before reinstalling against the
published packages.

apps/test/package.json now pins to ^0.4.0 instead of workspace:* /
file:. This is the release-test mode — re-installs from npm so we
catch install-path bugs.
EOF
)"
```

### Task A4: Add pnpm test-release script

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add the script**

In root `package.json`, add to the `scripts` block (after `reset-test`):

```json
"test-release": "pnpm reset-test && node scripts/bump-test-pins.mjs && cd apps/test && pnpm install"
```

So the relevant section reads:

```json
"scripts": {
  "build": "pnpm -r build",
  "dev": "pnpm -r --parallel --filter @forkshop/engine --filter demo run dev",
  "typecheck": "pnpm -r typecheck",
  "lint": "pnpm -r lint",
  "test": "pnpm -r test",
  "check": "pnpm typecheck && pnpm lint",
  "regen-api-snap": "pnpm --filter @forkshop/engine build && cd packages/engine && pnpm exec tsx scripts/generate-public-api-snap.ts",
  "reset-test": "./apps/test/scripts/reset.sh",
  "test-release": "pnpm reset-test && node scripts/bump-test-pins.mjs && cd apps/test && pnpm install"
}
```

- [ ] **Step 2: Verify the script runs end-to-end**

Run: `pnpm test-release 2>&1 | tail -20`
Expected:
- "✓ apps/test/ reset to pre-init state" (from reset.sh)
- "bump-test-pins: apps/test already at ^0.4.0, no change"
- pnpm install output ending in "Done"

If install fails because v0.4.0 has unmet peer deps on the apps/test side, capture the error and document — that itself is a useful bug found.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore: pnpm test-release — one-command release-test loop entry

Composes reset-test + bump-test-pins + install. After cutting a
Forkshop release, run this once and apps/test is ready for
'set up Forkshop' via Claude Code.
EOF
)"
```

### Task A5: Document the loop in apps/test/README.md

**Files:**
- Modify: `apps/test/README.md`

- [ ] **Step 1: Read current README**

Run: `cat apps/test/README.md`
Note the existing content — may be empty or describe a different purpose.

- [ ] **Step 2: Replace with the release-test loop docs**

Replace `apps/test/README.md` with:

```markdown
# Forkshop release-test fixture

A real Next.js app with placeholder content + stress-test blocks. The
package.json pins `@forkshop/engine` and `forkshop` to specific npm
versions (not workspace links), so installs here exercise the same path
real users get from `npx forkshop init`.

## Release-test loop

After cutting a Forkshop release (tag + CI publish):

```
pnpm test-release       # from repo root: reset + repin + install
cd apps/test
claude                  # → "set up Forkshop"
pnpm dev                # → eyeball http://localhost:3001/forkshop
```

`pnpm test-release` runs three steps:
1. `pnpm reset-test` — wipe `app/forkshop/`, `forkshop.json`, scaffold artifacts
2. `node scripts/bump-test-pins.mjs` — repin `@forkshop/engine` + `forkshop` to current engine version
3. `(cd apps/test && pnpm install)` — pull pinned versions from npm (install-path regression check)

## What this catches

- **npm install path** (publish / token / dep-resolution bugs)
- **Setup skill against fresh state** (scaffold drift, template bugs)
- **Setup skill produces a working app** (engine API regressions in the canonical pattern)
- **Edge-case rendering** via two stress-test blocks:
  - `viewport-hero` (uses `min-h-screen`) — regression-tests the engine's CSS injection that neutralizes viewport-height classes inside iframes
  - `tall-feature` (20 vertical sections) — regression-tests Gallery's auto-growth chain past DEFAULT_INITIAL_HEIGHT

## Why stress-test blocks instead of full WAVECLASH content

WAVECLASH lives at forkshop.dev/demo and stays hand-controlled as the
marketing surface. apps/test is QA-focused: targeted blocks that
exercise the bug classes that have bitten releases. Both surfaces evolve
independently. If you ever need full-WAVECLASH realism, run `npx
create-next-app` in a scratch dir and paste blocks there — but for
catching the regressions we've actually seen, the stress-test fixture
is sufficient.
```

- [ ] **Step 3: Commit**

```bash
git add apps/test/README.md
git commit -m "$(cat <<'EOF'
docs(test): document the release-test loop in apps/test/README.md
EOF
)"
```

### Task A6: Phase A wrap — full loop dry run

- [ ] **Step 1: Run the full loop**

```bash
pnpm test-release
```

Expected: completes successfully. `apps/test/app/forkshop/` is gone, `apps/test/forkshop.json` is gone, `apps/test/node_modules/@forkshop/engine/package.json` has `"version": "0.4.0"`.

- [ ] **Step 2: Verify the install pulled from npm, not workspace**

```bash
cat apps/test/node_modules/@forkshop/engine/package.json | head -5
```

Expected: `"version": "0.4.0"`. The `"_id": "@forkshop/engine@0.4.0"` field (if present) confirms npm-pulled vs symlinked.

- [ ] **Step 3: Workspace check still green**

```bash
pnpm check
```

Expected: exit 0. The changes here shouldn't affect other workspaces.

The interactive portion of the loop (`cd apps/test && claude → "set up Forkshop" → pnpm dev → eyeball`) needs a human + Claude Code session. Don't attempt it as part of plan execution. Document in a final summary that the manual eyeball is the next step the human does after the plan completes.

---

## Phase B — Engine CSS var scoping

Spec backlog item #1. Scopes `--forkshop-*` vars off `:root` so they only inherit within Forkshop-rendered surfaces. Breaking change for any user code that read these vars via `:root`.

### Task B1: Move CSS vars from :root to scoped selector

**Files:**
- Modify: `packages/engine/tailwind/forkshop.css`
- Possibly modify: `packages/engine/src/components/**` (portaled overlays that need `.forkshop-scope` className)

- [ ] **Step 1: Replace :root selectors**

In `packages/engine/tailwind/forkshop.css`, change the `:root` selector for the light-mode vars and the `:root` selector inside `@media (prefers-color-scheme: dark)` to `[data-forkshop-mount], .forkshop-scope`.

Specifically, replace:

```css
:root {
  --forkshop-canvas: #f3f4f6;
  /* ... 10 more vars ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --forkshop-canvas: #0a0a0a;
    /* ... 10 more vars ... */
  }
}
```

with:

```css
[data-forkshop-mount], .forkshop-scope {
  --forkshop-canvas: #f3f4f6;
  /* ... 10 more vars ... */
}

@media (prefers-color-scheme: dark) {
  [data-forkshop-mount], .forkshop-scope {
    --forkshop-canvas: #0a0a0a;
    /* ... 10 more vars ... */
  }
}
```

- [ ] **Step 2: Audit portaled overlays for .forkshop-scope className**

Run: `grep -rn "createPortal\|ReactDOM.createPortal" packages/engine/src/`

Expected: list of files that portal to body. For each portaled component (likely candidates: `EditorLink`, `AgentSelectionChip`, popovers in `SpacingPicker` if any), confirm the portaled root element has `className="forkshop-scope"` OR is wrapped by something that does. If any don't, add the class to the outermost portaled div.

If grep returns no results, skip — no portaled overlays.

- [ ] **Step 3: Rebuild engine**

Run: `pnpm --filter @forkshop/engine build`
Expected: build succeeds.

- [ ] **Step 4: Verify dist/forkshop.css has the scoped selector**

```bash
grep -E "forkshop-mount|forkshop-scope" packages/engine/dist/forkshop.css | head -5
```

Expected: selector appears in compiled output.

- [ ] **Step 5: Sanity-check in apps/demo**

In a separate terminal: `pnpm dev`. Open `http://localhost:3001/forkshop`. The Forkshop chrome should look identical to before (because apps/demo's `app/forkshop/page.tsx` wraps in `data-forkshop-mount`). If colors look wrong, the `data-forkshop-mount` attribute is missing somewhere — find and add.

Kill the dev server.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/tailwind/forkshop.css packages/engine/src/  # any portaled overlay changes
git commit -m "$(cat <<'EOF'
fix(engine)!: scope --forkshop-* CSS vars off :root

The 11 --forkshop-* design-token vars were declared on :root, meaning
they inherited globally onto every page that imports
@forkshop/engine/forkshop.css. Dark-mode @media also flipped them on
the whole document.

Move to [data-forkshop-mount], .forkshop-scope so the vars are only
visible inside Forkshop's rendered surface. Portaled overlays apply
the .forkshop-scope className. Tailwind utility classes were already
namespaced; this closes the remaining leak vector.

BREAKING CHANGE: user code that read --forkshop-* via :root selector
will no longer see them. The fix on user side is to apply class
"forkshop-scope" to the consuming element, or query inside a
data-forkshop-mount ancestor.
EOF
)"
```

---

## Phase C — Docs cleanup

### Task C1: Rewrite docs/extending/page.mdx for 0.4.0 contract

**Files:**
- Modify: `apps/docs/app/(marketing)/docs/extending/page.mdx`

- [ ] **Step 1: Read current content**

Run: `cat 'apps/docs/app/(marketing)/docs/extending/page.mdx'`
Note the four sections (Custom NodeType, Custom Layout, etc.) and the references to old API (`<ForkshopCanvas>` mounting, "four shipped Layouts").

- [ ] **Step 2: Rewrite to the new contract**

Replace the page content with:

```mdx
---
title: Extending Forkshop
description: Custom NodeTypes, custom Layouts, and the escape hatch.
---

Most Forkshop installs need only the built-ins: `gallery` and `tree`
layouts, plus the three Node kinds (`inline-react`, `iframe-route`,
`iframe-component`). For everything else, the engine exposes three
extension points.

## Custom NodeType

A **NodeType** tells the engine how to render a kind of Node. To add
one, write an object that satisfies the `NodeType<T>` interface and
register it in `forkshop.config.tsx`.

```tsx
import type { NodeType, AnyNode, RenderProps } from "@forkshop/engine"

type StorybookStoryNode = AnyNode & {
  kind: "storybook-story"
  storyId: string
}

export const storybookStoryNodeType: NodeType<StorybookStoryNode> = {
  id: "storybook-story",
  match: (node): node is StorybookStoryNode => node.kind === "storybook-story",
  render: ({ node }: RenderProps<StorybookStoryNode>) => (
    <iframe
      src={`http://localhost:6006/?path=/story/${node.storyId}`}
      style={{ width: "100%", height: "100%", border: 0 }}
    />
  ),
}
```

Register it in `forkshop.config.tsx`:

```tsx
import { defineConfig, BUILTIN_NODE_TYPES } from "@forkshop/engine"
import { storybookStoryNodeType } from "./node-types/storybook-story-node-type"

export const forkshopConfig = defineConfig({
  mount: "app/forkshop",
  nodeTypes: [...BUILTIN_NODE_TYPES, storybookStoryNodeType],
  // ...
})
```

`<BoardRegistry>` picks it up automatically and dispatches any Node
with `kind: "storybook-story"` to your custom render.

## Custom Layout

A **Layout** arranges Nodes on the canvas. Two ship by id (`gallery`,
`tree`); add your own with `defineLayout()`.

```tsx
import { defineLayout, forkshopIcons, type Layout } from "@forkshop/engine"

export const radialLayout: Layout<{ radius: number }> = defineLayout({
  id: "radial",
  icon: forkshopIcons.flows,
  defaultOptions: { radius: 300 },
  stageSize: () => ({ width: 800, height: 800 }),
  render: ({ entries, options, nodePositions, onPositionChange }) => {
    // Compute positions around a circle of radius `options.radius`
    // Render each entry at its computed (x, y) — use NodeView or
    // your own React tree
    return /* ... */
  },
})
```

Register and reference in a Board:

```tsx
import { defineConfig, BUILTIN_LAYOUTS } from "@forkshop/engine"
import { radialLayout } from "./layouts/radial"

export const forkshopConfig = defineConfig({
  // ...
  layouts: [...BUILTIN_LAYOUTS, radialLayout],
})
```

```tsx
// In a Board:
import { defineBoard } from "@forkshop/engine"
import { radialLayout } from "./layouts/radial"

export default defineBoard({
  id: "radial-demo",
  match: (s) => s.kind === "section" && s.sectionId === "radial",
  layout: radialLayout,
  layoutOptions: { radius: 400 },
  useEntries: () => /* ... */,
})
```

## Escape hatch — withBoardMeta

When the `useEntries + Layout` model doesn't fit (e.g., a Board that
manages its own canvas via direct `<ForkshopCanvas>`), wrap a raw React
component:

```tsx
import { withBoardMeta } from "@forkshop/engine"

const CustomBoard = withBoardMeta(
  function MyBoard() {
    return /* whatever JSX renders directly on the canvas */
  },
  {
    id: "custom",
    label: "Custom",
    match: (s) => s.kind === "section" && s.sectionId === "custom",
  },
)
```

`<BoardRegistry>` treats this like any other Board for sidebar
rendering and selection matching, but skips the Layout dispatch and
just renders your component.

Use sparingly — the canonical pattern is `defineBoard()` with a Layout.
```

- [ ] **Step 3: Validate the docs build**

```bash
pnpm --filter docs validate-registry
pnpm --filter docs build
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add 'apps/docs/app/(marketing)/docs/extending/page.mdx'
git commit -m "$(cat <<'EOF'
docs: rewrite extending/ for 0.4.0 contract

Three extension points: custom NodeType (registered in
forkshopConfig.nodeTypes), custom Layout via defineLayout()
(registered in forkshopConfig.layouts), and the withBoardMeta
escape hatch. Replaces the old "four shipped Layouts" framing and
the ForkshopCanvas mounting prose that referenced deleted API.
EOF
)"
```

### Task C2: Refresh repo root README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Find the stale section**

Run: `grep -n -A2 "Four engine-shipped Layouts\|ResponsiveFrameView\|DesignSystemView" README.md`
Expected: lines 31–32 (or thereabouts) listing "Four engine-shipped Layouts: Gallery, Tree, DesignSystemView, ResponsiveFrameView".

- [ ] **Step 2: Replace with current state**

Edit `README.md` lines around 31–32. Replace:

```
- Four engine-shipped Layouts: `Gallery`, `Tree`, `DesignSystemView`,
  `ResponsiveFrameView`. Build your own NodeTypes and Layouts when
```

with:

```
- Two engine-shipped Layouts: `Gallery` (grid / stack / freeform /
  auto-flow) and `Tree` (hierarchical). Compose design-system content
  with `ColorGraph` + `TypographyShowcase` + `PrimitivesGrid`; do
  responsive frames with `responsiveFrameEntries`. Custom NodeTypes
  and Layouts when
```

Preserve the existing sentence flow — the continuation after "Custom NodeTypes and Layouts when..." should still read naturally.

- [ ] **Step 3: Grep for any other stale references in README**

```bash
grep -n "DesignSystemView\|ResponsiveFrameView\|setActiveTokenRegistry\|getActiveTokenRegistry\|findTokenForClass\|PrimitiveGroup" README.md
```

Expected: empty after the Step 2 edit. If anything remains, fix it.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: refresh README Layouts list for 0.4.0

Two engine-shipped Layouts now (Gallery + Tree); design-system
content composes ColorGraph + TypographyShowcase + PrimitivesGrid;
responsive frames come from responsiveFrameEntries + Gallery.
DesignSystemView / ResponsiveFrameView references removed.
EOF
)"
```

---

## Phase D — Privacy: gitignore private docs

### Task D1: Add gitignore rules for strategy/feedback/persona/analytics

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append the rules**

Append to `.gitignore`:

```
# Private docs — strategy + user-testing feedback + persona analyses.
# These contain opinionated business thinking or named participants and
# are intentionally kept out of the public repo. Note: gitignoring does
# NOT remove the files from prior commits — for true privacy, move them
# to a separate private location and accept that history retains a copy.
docs/strategy/
docs/feedback/
docs/2026-05-17-multi-persona-audit.md
docs/analytics-umami.md
```

- [ ] **Step 2: Verify the rules match the right files**

Run: `git check-ignore -v docs/strategy/2026-05-14-forkshop-strategy-v2-design.md docs/feedback/2026-05-19-board-building-session.md docs/2026-05-17-multi-persona-audit.md docs/analytics-umami.md`
Expected: each file shows `.gitignore:<line>:<pattern>  <file>`, confirming the ignore rules apply.

- [ ] **Step 3: Confirm the files are still tracked (gitignore is for FUTURE state)**

Run: `git ls-files docs/strategy/ docs/feedback/ docs/2026-05-17-multi-persona-audit.md docs/analytics-umami.md`
Expected: files listed. They're already tracked. The ignore rule prevents new additions but doesn't remove existing tracked files. Document this in the commit.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore: gitignore private docs (strategy, feedback, persona audit, analytics)

Stops new files in these paths from being staged. Already-tracked
files remain — to actually privatize, move them to a separate
location and either (a) delete here, accepting git history retains
them, or (b) rewrite history with git filter-repo. For a side
project (a) is almost always the right call.
EOF
)"
```

---

## Self-review

Spec coverage:
- §1 three-surface model → documented (no code change; Phase A validates the apps/test surface)
- §2 release loop → Tasks A3 (bump script) + A4 (test-release script) + A5 (README) + A6 (dry run)
- §3 work-to-land #1 (realistic content) → Task A2 (stress-test blocks; PATH C deviation from spec's WAVECLASH copy — documented in plan header)
- §3 work-to-land #2 (test-release script) → A4
- §3 work-to-land #3 (bump-test-pins.mjs) → A3
- §3 work-to-land #4 (apps/test README) → A5
- "Related" backlog #1 (CSS var scoping) → Phase B
- "Related" backlog #2 (extending mdx rewrite) → Task C1
- "Related" backlog #3 (README refresh) → Task C2
- User-added gitignore privacy → Phase D

Placeholder scan: no TBDs, no "implement later", no "similar to Task N". Every code-bearing step has the actual code or actual command. Task B2 is the one judgment call: if portaled overlays exist they need `.forkshop-scope`. Bounded — grep tells you which files.

Type consistency: `defineLayout`, `defineBoard`, `withBoardMeta` signatures in Task C1's prose snippets match what shipped in 0.4.0. `Layout<TOptions>`, `NodeType<T>`, `RenderProps<T>` all match types/layout.ts and types/node-type.ts.

Phase order is correct: A (loop) is the deliverable; B/C/D are independent cleanups that can land in any order after A. Could be combined into a single v0.4.1 release.
