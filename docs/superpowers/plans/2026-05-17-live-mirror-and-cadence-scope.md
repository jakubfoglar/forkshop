# Live-mirror Boards + cadence scope — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply seven pre-1.0 polish changes from the spec at `docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md`: live-mirror auto-discovery for primitives/blocks, drop the root-CLAUDE.md cadence-note opt-in, fix the `fileMap={{}}` crash post-hot-fix, restore the Locator Phase 5 opt-in, simplify Phase 7 (and all skill messages), always write the block preview route, and fix the Template 5 `previewSrc` typo.

**Architecture:** Live-mirror is implemented via **barrel-based discovery** — the user's `components/ui/index.ts` and `components/blocks/index.ts` are barrel files re-exporting each primitive/block. The engine ships small reflection hooks (`useDiscoveredPrimitives`, `useDiscoveredBlocks`) that walk a barrel module's named PascalCase exports. `forkshop.config.tsx` shrinks to settings + barrel imports; per-primitive variant grids become optional overrides. No new build tooling; works under webpack and Turbopack equivalently.

**Tech Stack:** Next.js 14/15+ App Router, React 18+, TypeScript (strict), Vitest. Engine source uses `@forkshop/*` canonical alias → `packages/engine/src/*`. Run `pnpm check` from repo root before claiming any task done.

**Spec:** `docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md`

---

## File Structure

### New files

```
packages/engine/src/lib/
  use-discovered-primitives.ts          Pure hook — reflects over a barrel module
  use-discovered-primitives.test.ts
  use-discovered-blocks.ts              Same shape for blocks
  use-discovered-blocks.test.ts

apps/playground/components/ui/
  index.ts                              NEW barrel: re-exports Button, Badge, Input

apps/playground/components/blocks/
  index.ts                              NEW barrel: re-exports Hero, FeatureGrid, Cta, Pricing
```

### Files modified

```
packages/engine/src/index.ts            +useDiscoveredPrimitives, +useDiscoveredBlocks exports
packages/engine/src/skill/setup.md      Phase 5/6/7 rewrites; Template 1/3/5/9 updates;
                                        Template 12 removed; wording pass on Phase 3/4
packages/engine/templates/user-claude-md.md   Live-mirror framing + slim config example

apps/playground/app/forkshop/
  forkshop.config.tsx                   Switch to barrel-based shape
  ui-components.tsx                     Use useDiscoveredPrimitives
  blocks.tsx                            Use useDiscoveredBlocks + previewSrc fix
  block/[slug]/page.tsx                 Look up component via discovered list
  page.tsx                              Derive fileMap from discovered primitives + blocks
```

---

## Task 1: Engine hook — `useDiscoveredPrimitives`

**Files:**
- Create: `packages/engine/src/lib/use-discovered-primitives.ts`
- Create: `packages/engine/src/lib/use-discovered-primitives.test.ts`
- Modify: `packages/engine/src/index.ts` — add export

- [ ] **Step 1: Write the failing test**

Create `packages/engine/src/lib/use-discovered-primitives.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { discoverPrimitives } from "@forkshop/lib/use-discovered-primitives"

const Button = () => null
const Badge = () => null
const useUtility = () => null // hook — should be filtered out
const helper = () => null // lowercase — should be filtered out

describe("discoverPrimitives", () => {
  it("returns PascalCase function exports as primitives", () => {
    const barrel = { Button, Badge }
    const result = discoverPrimitives(barrel)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ slug: "button", name: "Button" })
    expect(result[1]).toMatchObject({ slug: "badge", name: "Badge" })
  })

  it("filters out non-PascalCase exports (hooks, helpers)", () => {
    const barrel = { Button, useUtility, helper }
    const result = discoverPrimitives(barrel)
    expect(result.map((p) => p.name)).toEqual(["Button"])
  })

  it("filters out non-function exports (types, constants)", () => {
    const barrel = { Button, BUTTON_VARIANTS: ["primary", "secondary"] }
    const result = discoverPrimitives(barrel)
    expect(result.map((p) => p.name)).toEqual(["Button"])
  })

  it("handles multi-word PascalCase via kebab-case slug", () => {
    const ButtonGroup = () => null
    const result = discoverPrimitives({ ButtonGroup })
    expect(result[0].slug).toBe("button-group")
  })

  it("returns the Component reference unchanged", () => {
    const result = discoverPrimitives({ Button })
    expect(result[0].Component).toBe(Button)
  })

  it("returns an empty array for an empty barrel", () => {
    expect(discoverPrimitives({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/engine test use-discovered-primitives.test.ts`
Expected: FAIL with `Cannot find module '@forkshop/lib/use-discovered-primitives'`.

- [ ] **Step 3: Implement the helper**

Create `packages/engine/src/lib/use-discovered-primitives.ts`:

```ts
import { useMemo } from "react"
import type { ComponentType } from "react"

export interface DiscoveredPrimitive {
  slug: string
  name: string
  Component: ComponentType<Record<string, unknown>>
}

function toKebab(pascalCase: string): string {
  return pascalCase.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

function isPascalCase(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

/**
 * Reflect over a barrel module's named exports and return only PascalCase
 * function values (i.e. likely React components). Hooks (lowercase, prefixed
 * "use"), helpers (lowercase), and non-function exports (types, constants)
 * are filtered out.
 *
 * The barrel module shape is `Record<string, unknown>` — typically the result
 * of `import * as UIPrimitives from "@/components/ui"`. Pure function — safe
 * to call in server components or at module load.
 */
export function discoverPrimitives(
  barrel: Record<string, unknown>,
): DiscoveredPrimitive[] {
  return Object.entries(barrel)
    .filter(([name, value]) => isPascalCase(name) && typeof value === "function")
    .map(([name, value]) => ({
      slug: toKebab(name),
      name,
      Component: value as ComponentType<Record<string, unknown>>,
    }))
}

/**
 * React hook that wraps `discoverPrimitives` with memoization. Barrel modules
 * (the result of `import * as`) are referentially stable across renders, so
 * the memoized result also stays stable — downstream `useMemo`s keyed on the
 * primitives array won't re-run unnecessarily.
 */
export function useDiscoveredPrimitives(
  barrel: Record<string, unknown>,
): DiscoveredPrimitive[] {
  return useMemo(() => discoverPrimitives(barrel), [barrel])
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/engine test use-discovered-primitives.test.ts`
Expected: PASS — all 6 test cases.

- [ ] **Step 5: Export from engine index**

Edit `packages/engine/src/index.ts` — add the export. Find the section that exports lib utilities (e.g., `export { buildTokenRegistry } from "@forkshop/lib/token-registry"`) and add:

```ts
export {
  useDiscoveredPrimitives,
  discoverPrimitives,
  type DiscoveredPrimitive,
} from "@forkshop/lib/use-discovered-primitives"
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/lib/use-discovered-primitives.ts \
        packages/engine/src/lib/use-discovered-primitives.test.ts \
        packages/engine/src/index.ts
git commit -m "feat(engine): add useDiscoveredPrimitives barrel-reflection hook

Pure reflection over a barrel module — keeps only PascalCase function
exports. Powers live-mirror UI Components Board: user maintains
components/ui/index.ts barrel; the hook turns it into a primitive list."
```

---

## Task 2: Engine hook — `useDiscoveredBlocks`

**Files:**
- Create: `packages/engine/src/lib/use-discovered-blocks.ts`
- Create: `packages/engine/src/lib/use-discovered-blocks.test.ts`
- Modify: `packages/engine/src/index.ts` — add export

- [ ] **Step 1: Write the failing test**

Create `packages/engine/src/lib/use-discovered-blocks.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { discoverBlocks } from "@forkshop/lib/use-discovered-blocks"

const Hero = () => null
const FeatureGrid = () => null

describe("discoverBlocks", () => {
  it("returns PascalCase function exports as blocks", () => {
    const result = discoverBlocks({ Hero, FeatureGrid })
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ slug: "hero", name: "Hero" })
    expect(result[1]).toMatchObject({ slug: "feature-grid", name: "FeatureGrid" })
  })

  it("returns Component, name, and preview-src convention", () => {
    const result = discoverBlocks({ Hero })
    expect(result[0].Component).toBe(Hero)
    expect(result[0].previewSrc).toBe("/forkshop/block/hero")
  })

  it("returns empty array for empty barrel", () => {
    expect(discoverBlocks({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/engine test use-discovered-blocks.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `packages/engine/src/lib/use-discovered-blocks.ts`:

```ts
import { useMemo } from "react"
import type { ComponentType } from "react"
import { discoverPrimitives } from "@forkshop/lib/use-discovered-primitives"

export interface DiscoveredBlock {
  slug: string
  name: string
  Component: ComponentType<Record<string, unknown>>
  /** Convention: /forkshop/block/<slug> — matches the auto-managed preview route. */
  previewSrc: string
}

/**
 * Reflect over a barrel module and return blocks. Blocks use the same
 * reflection logic as primitives (PascalCase function exports) but carry
 * the conventional preview-route URL for iframe-component rendering. Pure
 * function — safe to call in server components or at module load.
 */
export function discoverBlocks(
  barrel: Record<string, unknown>,
): DiscoveredBlock[] {
  return discoverPrimitives(barrel).map((p) => ({
    ...p,
    previewSrc: `/forkshop/block/${p.slug}`,
  }))
}

export function useDiscoveredBlocks(
  barrel: Record<string, unknown>,
): DiscoveredBlock[] {
  return useMemo(() => discoverBlocks(barrel), [barrel])
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/engine test use-discovered-blocks.test.ts`
Expected: PASS — 3 test cases.

- [ ] **Step 5: Export from engine index**

Edit `packages/engine/src/index.ts` — add below the primitives export:

```ts
export {
  useDiscoveredBlocks,
  discoverBlocks,
  type DiscoveredBlock,
} from "@forkshop/lib/use-discovered-blocks"
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/lib/use-discovered-blocks.ts \
        packages/engine/src/lib/use-discovered-blocks.test.ts \
        packages/engine/src/index.ts
git commit -m "feat(engine): add useDiscoveredBlocks hook

Mirrors useDiscoveredPrimitives but carries the conventional
/forkshop/block/<slug> previewSrc for iframe-component nodes."
```

---

## Task 3: Setup skill — remove cadence-note from Phase 5/6 + remove Template 12

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Phase 5 + Phase 6 Step 12 + Templates section

- [ ] **Step 1: Read current Phase 5**

Run: `awk '/^## Phase 5/,/^## Phase 6/' packages/engine/src/skill/setup.md`
Note the current contents — it has the cadence-note opt-in via `AskUserQuestion`.

- [ ] **Step 2: Replace Phase 5 contents (without the Locator opt-in yet — that's added in Task 7)**

Replace everything from `## Phase 5 —` heading down to (not including) `## Phase 6 —` with:

```markdown
## Phase 5 — Consent for config mutations

The setup skill writes only to Forkshop-namespaced locations by default. Two mutations to existing user files require explicit consent — both gated through `AskUserQuestion`:

1. **`app/globals.css` import line** — always confirmed (added by `forkshop init` when possible; the skill verifies idempotently).
2. **Locator opt-in** — adds `@locator/webpack-loader` to `package.json` devDependencies and merges a webpack/turbopack rule into `next.config.*`. Powers Option-click → editor.

The Locator opt-in is the only `AskUserQuestion` call in Phase 5. Glue text:

```
Two things need your call before I write anything that touches your existing files:

  [1] Option-click → editor — add @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*

Glance at the diff first with "Show me", or pick yes/no.
```

Then `AskUserQuestion`:

```ts
{
  questions: [{
    question: "Enable Option-click → editor (recommended)?",
    header: "Option-click",
    options: [
      { label: "Yes, install", description: "Adds @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*" },
      { label: "No, skip",     description: "Skip Locator wiring — you can install manually later if you change your mind" },
      { label: "Show me",      description: "Print the exact dep + next.config diff first, then re-ask" },
    ],
  }],
}
```

If the answer is `Show me`, render the planned dep + next.config diff inline, then re-call `AskUserQuestion` with only `Yes, install` and `No, skip`.

If the project's `next.config.*` has a shape too unusual for clean automated merging (e.g., functional config that imports from elsewhere), surface that during Phase 6 — for now, take the user's consent at face value.

The cadence-note opt-in that previous setup skill versions had is **removed**. Cadence guidance now ships exclusively via the auto-loading `forkshop-live-editing` skill (in `.claude/skills/`) and the `app/forkshop/CLAUDE.md` dir-loaded note. Both are properly scoped — they don't influence agent behavior outside Forkshop's surface.

```

- [ ] **Step 3: Drop Phase 6 Step 12 (root CLAUDE.md cadence note)**

Find `### Step 12 — Root \`CLAUDE.md\` cadence note` heading in Phase 6. Delete from that heading down to (not including) the next `### Failure handling` heading. The 11 remaining steps stay (Step 1-11). Renumber `### Failure handling` accordingly — it stays where it was; no number change.

- [ ] **Step 4: Drop Template 12 (cadence-note template)**

Find `### Template 12 — Root \`CLAUDE.md\` cadence note` heading in the Scaffolding templates section. Delete from that heading down to the end of the file (or to the next major section). Templates 1-11 remain.

- [ ] **Step 5: Update Step 12 reference in Phase 6 step list**

Find any remaining reference to "Step 12" or "Template 12" in Phase 6's preamble or step list. Remove or renumber as needed. The current Phase 6 lists steps 1-12; after this task it should list steps 1-11.

- [ ] **Step 6: Validate registry**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): drop cadence-note opt-in from Phase 5 + remove Template 12

Strategy v2's "zero edits to user's project CLAUDE.md or settings.json"
promise was being violated by Phase 5's cadence-note opt-in. Cadence
guidance still ships via .claude/skills/forkshop-live-editing.md (auto-
activated by description trigger) + the dir-loaded app/forkshop/CLAUDE.md
section — both properly scoped to Forkshop work.

Phase 5 will get the Locator opt-in restored in a follow-up commit."
```

---

## Task 4: Setup skill — Template 5 fix (`src:` → `previewSrc:`)

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Template 5 in Scaffolding templates section

- [ ] **Step 1: Find Template 5**

Run: `awk '/^### Template 5 —/,/^### Template 6 —/' packages/engine/src/skill/setup.md`
Note the line with `src: \`/forkshop/block/${b.slug}\``.

- [ ] **Step 2: Apply the fix**

Edit `packages/engine/src/skill/setup.md` — change:

```tsx
      src: `/forkshop/block/${b.slug}`,
```

to:

```tsx
      previewSrc: `/forkshop/block/${b.slug}`,
```

(Only one occurrence in Template 5. If grep finds multiple, target the one inside the `iframe-component` node object — the field name on `IframeComponentNode`.)

- [ ] **Step 3: Validate**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "fix(skill): Template 5 uses previewSrc (matches IframeComponentNode shape)

The engine's IframeComponentNode type uses previewSrc, not src — Template 5
emitted broken TypeScript that the playground had to patch around. Aligns
the user-facing scaffold with the engine type."
```

---

## Task 5: Setup skill — Template 1 (forkshop.config.tsx) slim shape with barrels

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Template 1 in Scaffolding templates section

- [ ] **Step 1: Find Template 1**

Run: `awk '/^### Template 1 —/,/^### Template 2 —/' packages/engine/src/skill/setup.md`
Note its current shape — explicit `primitives:` and `blocks:` arrays.

- [ ] **Step 2: Replace Template 1's content**

Find the Template 1 heading and replace the template's fenced TSX block + substitution notes with:

```markdown
### Template 1 — `{{mount}}/forkshop.config.tsx`

````tsx
import * as UIPrimitives from "@/components/ui"
import * as Blocks from "@/components/blocks"
import tailwindConfig from "../../tailwind.config"

export const forkshopConfig = {
  ui: UIPrimitives,
  blocks: Blocks,
  paths: {
    primitives: "components/ui",
    blocks: ["components/blocks"],
  },
  sitemap: {
    excludeGroups: [{{exclude_groups}}],
    autoDiscover: true,
  },
  reference: {
    contentPaths: [{{content_paths}}],
  },
  viewportProfile: "{{viewport_profile}}" as "responsive" | "mobile",
  tailwindConfig,
} as const

export type ForkshopConfig = typeof forkshopConfig
````

Substitution notes:
- `{{exclude_groups}}` — quoted comma-separated route-group names from the auth-filter modifier, or empty.
- `{{content_paths}}` — quoted comma-separated MDX glob paths from Scan E, or empty.
- `{{viewport_profile}}` — `"responsive"` (default) or `"mobile"` (mobile flag set).

The skill writes (or updates, if they exist) two **barrel files** at install time:

- `{{srcPrefix}}components/ui/index.ts` — `export { Button } from "./button"`, one line per discovered primitive
- `{{srcPrefix}}components/blocks/index.ts` — one line per discovered block

These barrels are how live-mirror works: the engine's `useDiscoveredPrimitives(forkshopConfig.ui)` and `useDiscoveredBlocks(forkshopConfig.blocks)` hooks reflect over them. Adding a new primitive is two steps: (a) create the `.tsx` file, (b) add a line to the barrel. The auto-loaded `forkshop-live-editing` skill instructs Claude Code to maintain the barrel automatically when the user asks to add a primitive.

If a barrel already exists at one of these paths, the skill **merges** new entries in alphabetical order rather than overwriting.

The old `primitives: [...]` and `blocks: [...]` explicit arrays in `forkshopConfig` are dropped — discovery replaces them.
```

- [ ] **Step 3: Validate**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): Template 1 — slim forkshop.config.tsx with barrel imports

Drops explicit primitives:[] / blocks:[] arrays in favor of importing
two barrel modules (components/ui/index.ts, components/blocks/index.ts).
Engine's useDiscoveredPrimitives/useDiscoveredBlocks hooks reflect over
the barrels for live-mirror Boards. Adding a primitive is now a 2-step
operation (create file + add barrel line) that the forkshop-live-editing
skill teaches Claude to handle automatically."
```

---

## Task 6: Setup skill — Template 3 (UI Components parent) + Template 5 (Blocks parent) use discovery hooks

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Templates 3 and 5

- [ ] **Step 1: Find Template 3**

Run: `awk '/^### Template 3 —/,/^### Template 4a —/' packages/engine/src/skill/setup.md`

- [ ] **Step 2: Replace Template 3's fenced TSX block**

Find Template 3 and replace its fenced TSX block (just the code, keep the heading) with:

````tsx
"use client"

import { ForkshopCanvas, Gallery, useDiscoveredPrimitives } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function UIComponentsBoardView() {
  const primitives = useDiscoveredPrimitives(forkshopConfig.ui)
  const entries = primitives.map((p) => ({
    id: p.slug,
    label: p.name,
    node: {
      id: `primitive:${p.slug}`,
      kind: "inline-react" as const,
      x: 0, y: 0, width: 320, height: 200,
      label: p.name,
      render: () => <p.Component />,
    },
  }))
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={320} />
    </ForkshopCanvas>
  )
}
````

- [ ] **Step 3: Find Template 5**

Run: `awk '/^### Template 5 —/,/^### Template 6 —/' packages/engine/src/skill/setup.md`

- [ ] **Step 4: Replace Template 5's fenced TSX block**

Find Template 5 and replace its fenced TSX block with:

````tsx
"use client"

import { ForkshopCanvas, Gallery, useDiscoveredBlocks } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function BlocksBoardView() {
  const viewport = forkshopConfig.viewportProfile === "mobile" ? 375 : 1440
  const blocks = useDiscoveredBlocks(forkshopConfig.blocks)
  const entries = blocks.map((b) => ({
    id: b.slug,
    label: b.name,
    node: {
      id: `block:${b.slug}`,
      kind: "iframe-component" as const,
      x: 0, y: 0, width: viewport, height: 600,
      label: b.name,
      slug: b.slug,
      previewSrc: b.previewSrc,
    },
  }))
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={viewport} />
    </ForkshopCanvas>
  )
}
````

- [ ] **Step 5: Validate**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): Templates 3 + 5 use discovery hooks for live-mirror Boards

UI Components parent uses useDiscoveredPrimitives(forkshopConfig.ui);
Blocks parent uses useDiscoveredBlocks(forkshopConfig.blocks). New
primitives and blocks appear automatically on next render — no static
config baking, no skill re-run."
```

---

## Task 7: Setup skill — Phase 6 always writes block preview route + Locator install conditional on Phase 5

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Phase 6 step list

- [ ] **Step 1: Find Phase 6**

Run: `awk '/^## Phase 6 —/,/^## Phase 7 —/' packages/engine/src/skill/setup.md`

- [ ] **Step 2: Update Step 6 (block preview route) — drop the conditional**

Find `### Step 6 — \`{{mount}}/block/[slug]/page.tsx\` (auto-managed; if Blocks recipe fired)`. Change the heading to remove the conditional:

```
### Step 6 — `{{mount}}/block/[slug]/page.tsx` (auto-managed; always written)
```

And update the body — replace "Render from Template 6 — dynamic preview route..." with:

```markdown
Render from Template 6 — dynamic preview route. Always written, regardless of whether blocks were discovered at install time. Allows users adding their first block later to see it work without re-running setup. Reads `forkshopConfig.blocks` (the barrel module) via `getBlockBySlug` helper. `notFound()` gate when `process.env.NODE_ENV === "production"`. File carries a `// forkshop:auto-managed` header comment.
```

- [ ] **Step 3: Update Step 11 (next.config.*) to be conditional on Phase 5 Locator opt-in**

Find `### Step 11 — \`next.config.*\` (automatic, always-on)`. Replace the heading and body with:

```markdown
### Step 11 — `next.config.*` Locator rule (conditional on Phase 5 Locator opt-in)

If the user accepted the Locator opt-in in Phase 5:

1. Merge `@locator/webpack-loader` into `package.json` devDependencies (idempotent — skip if already present). Print `✓ Added @locator/webpack-loader to devDependencies`.
2. Apply Template 10 (Next 14 webpack-only) or Template 11 (Next 15/16 turbopack + webpack) based on the project's Next major. Merge into existing config rather than replace. Print `✓ Merged Locator rule into next.config.<ext>`.
3. Tell the user once at the end of Phase 6: `"Run pnpm install before pnpm dev — Locator dep was just added."`

If the user declined: skip this step entirely. Phase 7 will surface a one-line note: `Option-click: skipped (re-run setup to enable).`

If the next.config.* shape can't be merged cleanly (rare — functional config importing from elsewhere, etc.), fall back to printing the snippet for manual paste with a `!` warning in Phase 6 output.
```

- [ ] **Step 4: Validate**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): always write block preview route + gate Locator install on Phase 5

Step 6 (block/[slug]/page.tsx) is always written, not gated on blocks
existing at install time — supports users adding their first block
later without re-running setup. Step 11 (Locator) is now conditional
on the Phase 5 opt-in (restored in this spec)."
```

---

## Task 8: Setup skill — Phase 7 summary refresh

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Phase 7

- [ ] **Step 1: Find Phase 7**

Run: `awk '/^## Phase 7 —/,/^## /' packages/engine/src/skill/setup.md | head -80`

- [ ] **Step 2: Replace Phase 7's body**

Find `## Phase 7 — Final summary` and replace its body (from the heading down to the next `## ` heading) with:

```markdown
## Phase 7 — Final summary

After Phase 6 completes (or partially completes with failures), render this summary verbatim — drop sections that don't apply, keep the order.

### Default (clean install)

````
✓ Forkshop is set up.

  /forkshop          → http://localhost:3000/forkshop
  Boards             → <comma-separated board names with counts>
  Live-mirroring     → Add a primitive to components/ui/ and it'll show up

Try it:
  pnpm dev
  → open /forkshop
  → click a route under Sitemap

Sibling skills:
  forkshop-live-editing   auto-applies on Forkshop file edits
  forkshop-doc-sync       invoke when app/forkshop/CLAUDE.md drifts
````

The `Boards` line lists what was actually wired (e.g., `Sitemap (3 routes) · UI Components (4 primitives) · Blocks (2 blocks)`).

### With Locator skipped

If the user declined the Phase 5 Locator opt-in, add one line above `Try it:`:

```
Option-click: skipped (re-run setup to enable)
```

### With Phase 6 failure or manual-paste fallback

If a Phase 6 step couldn't complete cleanly (e.g., next.config.* required manual paste), render the failure variant:

````
✓ Forkshop is set up. One thing needs your attention:

  ! next.config.* — Locator rule needs manual paste. Snippet below.

  <inline snippet>

  /forkshop          → http://localhost:3000/forkshop
  Boards             → <comma-separated board names with counts>
  Live-mirroring     → Add a primitive to components/ui/ and it'll show up

Try it:
  pnpm install         (Locator dep was just added)
  pnpm dev
  → open /forkshop
  → click a route under Sitemap

Sibling skills:
  forkshop-live-editing   auto-applies on Forkshop file edits
  forkshop-doc-sync       invoke when app/forkshop/CLAUDE.md drifts
````

### Rules

- **Lead with `✓ Forkshop is set up.`** — single line, immediately readable.
- **`Boards →` line is honest** — lists what's actually wired with counts.
- **`Live-mirroring →` line** is a single observation; no enumerated "Customize" list.
- **No `Mount:` / `Modifiers:` / `Opt-in:` / `Files written:` / `Skipped:`** default sections — they're debug info. If we want them later, add a `--verbose` flag.
- **No ANSI escape codes** — unicode (`✓`, `→`, `!`) renders everywhere.
- **The `!` line is the only urgent attention-grabber.** Use it sparingly; never for non-actionable info.
```

- [ ] **Step 3: Validate**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): Phase 7 summary refresh — terse, no stale skipped items

Drops Mount/Modifiers/Opt-in/Files written/Skipped sections. Single
clean default mockup + a failure variant with the ! attention-grabber.
No ANSI; unicode only. Boards line is honest about what was wired."
```

---

## Task 9: Setup skill — wording pass on Phase 3 / 4 / 6 messages

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Phase 3, 4, 6 message templates

- [ ] **Step 1: Find Phase 3 proposal template**

Run: `awk '/^## Phase 3 —/,/^## Phase 4 —/' packages/engine/src/skill/setup.md | head -80`

Identify the proposal-rendering template. Look for "alarmist" or "Honest caveat" language to soften.

- [ ] **Step 2: Soften Phase 3 caveat wording**

Find any "Honest caveat: this Board will be very thin right now. As you add components..." style text and replace with a less alarmist framing. Example replacement:

```
This Board's empty for now. Drop primitives into components/ui/ and add them to
components/ui/index.ts — they'll show up next time you open /forkshop.
```

(If the original Phase 3 template doesn't have this text, this step is no-op for Phase 3.)

- [ ] **Step 3: Find Phase 4 iteration messages**

Run: `awk '/^## Phase 4 —/,/^## Phase 5 —/' packages/engine/src/skill/setup.md`

- [ ] **Step 4: Tighten Phase 4 wording**

Look for verbose iteration glue ("We've gone back and forth a few times. Want to pause and come back, or keep refining?" etc.) and shorten where the meaning survives. Example:

Before:
```
We've gone back and forth a few times. Want to pause and come back, or keep refining?
```

After:
```
A few back-and-forths in — keep going, or pause for now?
```

- [ ] **Step 5: Find Phase 6 per-step output format**

Look at how Phase 6 prints `✓ <action> <path>` lines on each step. Confirm the format is consistent across all 11 steps.

- [ ] **Step 6: Standardize Phase 6 output**

If any step prints with different format (e.g., one step uses `Wrote {path}` instead of `✓ Wrote {path}`), normalize all to:

```
✓ <verb> <path>
```

Verbs: `Wrote`, `Added`, `Merged`, `Appended` — whichever fits the action. Always start with `✓`.

For failure cases (the `! manual paste needed` cases), use:

```
! <verb> <path> — <one-line reason>
```

- [ ] **Step 7: Validate**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 8: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): wording pass on Phase 3/4/6 messages

Softens alarmist phrasing ('Honest caveat: this Board will be very thin')
into matter-of-fact direction. Normalizes Phase 6 step output to '✓ verb
path' format (and '! verb path — reason' for failures). Less ceremony,
same information."
```

---

## Task 10: User CLAUDE.md template — live-mirror framing + slim config example

**Files:**
- Modify: `packages/engine/templates/user-claude-md.md`

- [ ] **Step 1: Read current template**

Run: `cat packages/engine/templates/user-claude-md.md`

Note current sections — file layout, Per-primitive variant authoring, Self-containment posture, etc.

- [ ] **Step 2: Update the `forkshop.config.tsx` example reference**

Find the section that documents `forkshop.config.tsx` (or shows an example). Replace its config example with the slim barrel-based shape:

````tsx
// Slim settings + barrel imports — live-mirrored.
import * as UIPrimitives from "@/components/ui"
import * as Blocks from "@/components/blocks"
import tailwindConfig from "../../tailwind.config"

export const forkshopConfig = {
  ui: UIPrimitives,         // Add a primitive → add line to components/ui/index.ts → it shows up
  blocks: Blocks,           // Same for components/blocks/index.ts
  paths: {
    primitives: "components/ui",
    blocks: ["components/blocks"],
  },
  sitemap: { excludeGroups: [], autoDiscover: true },
  reference: { contentPaths: [] },
  viewportProfile: "responsive" as "responsive" | "mobile",
  tailwindConfig,
} as const
````

- [ ] **Step 3: Rewrite the "Per-primitive variant authoring" section**

Find the existing "Per-primitive variant authoring" section. Reframe it as optional override:

```markdown
## Per-primitive variant authoring (optional override)

By default, each discovered primitive renders with default props as a single tile on the UI Components Board. If you want a richer variant grid for a specific primitive (Button: all variants × sizes × states laid out in a grid), drop a file at `ui-components/<slug>.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

export default function ButtonBoardView() {
  const entries = [
    { id: "primary-sm", label: "Primary / SM", node: { id: "primitive:button-primary-sm", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <Button variant="primary" size="sm">Click me</Button> } },
    { id: "primary-md", label: "Primary / MD", node: { id: "primitive:button-primary-md", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <Button variant="primary" size="md">Click me</Button> } },
    // … one entry per variant combination
  ]
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={240} />
    </ForkshopCanvas>
  )
}
```

If no override file exists, the primitive renders as a single tile on the parent. The override file is for primitives where the variant matrix is worth seeing in isolation.

These files import your *real* primitive — they're not duplicates. Edit `components/ui/button.tsx` and the grid re-renders via HMR.
```

- [ ] **Step 4: Add a new "Adding components" section**

Insert after "Per-primitive variant authoring":

```markdown
## Adding components

Forkshop auto-discovers primitives and blocks via barrel modules. Adding a new primitive is two steps:

1. Create the file: `components/ui/select.tsx` with a named PascalCase export
2. Add an export to the barrel: open `components/ui/index.ts` and add `export { Select } from "./select"`

That's it. Reload `/forkshop` and the new primitive appears on the UI Components Board.

Same pattern for blocks (`components/blocks/index.ts`).

**Why the barrel?** It's how Forkshop discovers components without a build-time codegen step. The `forkshop-live-editing` skill teaches Claude Code to maintain the barrel automatically when you ask to add a primitive — so in practice, you just say "add a Card primitive" and both files get updated.
```

- [ ] **Step 5: Update Self-containment posture section**

Find the Self-containment posture section. Verify it still lists the 4 modifications correctly:

1. `app/globals.css` import
2. `next.config.*` Locator rule (now opt-in via Phase 5)
3. `package.json` deps (engine + optional Locator)
4. **No** root CLAUDE.md cadence note (this used to be #4 — drop it)

Adjust the section's bullet to reflect: only 3 modifications now (4 if Locator is opted in).

- [ ] **Step 6: Validate**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/templates/user-claude-md.md
git commit -m "feat(template): user CLAUDE.md framed around live-mirror + barrels

Updates the forkshop.config.tsx example to the slim barrel-based shape.
Reframes 'Per-primitive variant authoring' as optional override. Adds
'Adding components' section explaining the 2-step barrel pattern.
Drops the cadence-note item from Self-containment posture (no longer
written by the skill)."
```

---

## Task 11: Playground — create barrel files + slim forkshop.config.tsx

**Files:**
- Create: `apps/playground/components/ui/index.ts`
- Create: `apps/playground/components/blocks/index.ts`
- Modify: `apps/playground/app/forkshop/forkshop.config.tsx`

- [ ] **Step 1: Create components/ui/index.ts**

Write `apps/playground/components/ui/index.ts`:

```ts
export { Button } from "./button"
export { Badge } from "./badge"
export { Input } from "./input"
```

If any of these primitives don't have named exports (some shadcn-style files default-export), adjust. Verify with `cat apps/playground/components/ui/button.tsx | grep "^export"`.

- [ ] **Step 2: Create components/blocks/index.ts**

Write `apps/playground/components/blocks/index.ts`:

```ts
export { Hero } from "./hero"
export { FeatureGrid } from "./feature-grid"
export { Cta } from "./cta"
export { Pricing } from "./pricing"
```

Verify the export names match what's in each block file with `grep "^export" apps/playground/components/blocks/*.tsx`.

- [ ] **Step 3: Replace forkshop.config.tsx**

Overwrite `apps/playground/app/forkshop/forkshop.config.tsx`:

```tsx
import * as UIPrimitives from "@/components/ui"
import * as Blocks from "@/components/blocks"
import tailwindConfig from "../../tailwind.config"

export const forkshopConfig = {
  ui: UIPrimitives,
  blocks: Blocks,
  paths: {
    primitives: "components/ui",
    blocks: ["components/blocks"],
  },
  sitemap: {
    excludeGroups: [] as string[],
    autoDiscover: true,
  },
  reference: {
    contentPaths: [] as string[],
  },
  viewportProfile: "responsive" as "responsive" | "mobile",
  tailwindConfig,
} as const

export type ForkshopConfig = typeof forkshopConfig
```

Note: `getBlockBySlug` helper is no longer exported here — the block preview route uses `useDiscoveredBlocks` directly (Task 13).

- [ ] **Step 4: Typecheck (expect downstream errors that get fixed in later tasks)**

Run: `pnpm --filter playground typecheck`
Expected: errors only in files that consume the old shape (`forkshopConfig.primitives.map`, `getBlockBySlug`, etc.) — those are fixed in Tasks 12-14.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/components/ui/index.ts \
        apps/playground/components/blocks/index.ts \
        apps/playground/app/forkshop/forkshop.config.tsx
git commit -m "refactor(playground): barrel files + slim forkshop.config.tsx

Adds components/ui/index.ts and components/blocks/index.ts barrels that
re-export each primitive/block. Updates forkshop.config.tsx to import the
barrels and pass them through. Downstream consumers (ui-components.tsx,
blocks.tsx, block/[slug]/page.tsx, page.tsx) updated in follow-up tasks."
```

---

## Task 12: Playground — UI Components + Blocks parents use discovery hooks

**Files:**
- Modify: `apps/playground/app/forkshop/ui-components.tsx`
- Modify: `apps/playground/app/forkshop/blocks.tsx`

- [ ] **Step 1: Update ui-components.tsx**

Overwrite `apps/playground/app/forkshop/ui-components.tsx`:

```tsx
"use client"

import { useMemo } from "react"
import {
  Gallery,
  useDiscoveredPrimitives,
  type GalleryEntry,
  type InlineReactNode,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export default function UIComponentsBoardView({
  nodePositions,
  onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const primitives = useDiscoveredPrimitives(forkshopConfig.ui)
  const entries = useMemo<GalleryEntry[]>(
    () =>
      primitives.map((p) => {
        const node: InlineReactNode = {
          id: `primitive:${p.slug}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 320,
          height: 120,
          label: p.name,
          render: () => <p.Component />,
        }
        return { id: p.slug, label: p.name, node }
      }),
    [primitives],
  )

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={700} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={320}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

- [ ] **Step 2: Update blocks.tsx**

Overwrite `apps/playground/app/forkshop/blocks.tsx`:

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
  nodePositions,
  onPositionChange,
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
          height: 600,
          label: b.name,
          slug: b.slug,
          previewSrc: b.previewSrc,
        }
        return { id: b.slug, label: b.name, node }
      }),
    [blocks, viewport],
  )
  return (
    <PlaygroundBoard stageWidth={1800} stageHeight={1400} fitMode="width">
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

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter playground typecheck`
Expected: errors only in `block/[slug]/page.tsx` (still uses old `getBlockBySlug`) and `page.tsx` (fileMap shape). Fixed in Tasks 13-14.

- [ ] **Step 4: Commit**

```bash
git add apps/playground/app/forkshop/ui-components.tsx \
        apps/playground/app/forkshop/blocks.tsx
git commit -m "refactor(playground): UI Components + Blocks parents use discovery hooks

useDiscoveredPrimitives(forkshopConfig.ui) replaces the static
forkshopConfig.primitives map. Same for blocks with useDiscoveredBlocks.
Adding a primitive to components/ui/index.ts now appears on the Board
on next render — no playground edits needed."
```

---

## Task 13: Playground — block preview route uses discovery hook

**Files:**
- Modify: `apps/playground/app/forkshop/block/[slug]/page.tsx`

- [ ] **Step 1: Overwrite the file**

Replace `apps/playground/app/forkshop/block/[slug]/page.tsx` with:

```tsx
// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.

import { notFound } from "next/navigation"
import { discoverBlocks } from "@forkshop/engine"
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

Note: server component (no `"use client"` directive), so we use the non-hook `discoverBlocks` export.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter playground typecheck`
Expected: only `page.tsx` errors remain.

- [ ] **Step 3: Commit**

```bash
git add apps/playground/app/forkshop/block/[slug]/page.tsx
git commit -m "refactor(playground): block preview route uses discoverBlocks

Server-side discoverBlocks() replaces the removed getBlockBySlug helper.
Adding a new block to components/blocks/index.ts makes /forkshop/block/<slug>
resolve automatically — no playground config edits."
```

---

## Task 14: Playground — page.tsx derives fileMap from discovered primitives + blocks

**Files:**
- Modify: `apps/playground/app/forkshop/page.tsx`

- [ ] **Step 1: Read the current file to understand the FILE_MAP definition**

Run: `awk '/const FILE_MAP/,/^}/' apps/playground/app/forkshop/page.tsx`

Note: current shape is `{ primitives: [{id, sourcePath}], blocks: [{slug, sourcePath}] }`.

- [ ] **Step 2: Replace the FILE_MAP definition**

In `apps/playground/app/forkshop/page.tsx`, find the FILE_MAP block (currently maps `forkshopConfig.primitives` and `forkshopConfig.blocks` arrays) and replace with:

```tsx
import { discoverPrimitives, discoverBlocks } from "@forkshop/engine"

// Discovered once at module load — barrels are stable across renders.
const DISCOVERED_PRIMITIVES = discoverPrimitives(forkshopConfig.ui)
const DISCOVERED_BLOCKS = discoverBlocks(forkshopConfig.blocks)

const FILE_MAP = {
  primitives: DISCOVERED_PRIMITIVES.map((p) => ({
    id: p.slug,
    sourcePath: `components/ui/${p.slug}.tsx`,
  })),
  blocks: DISCOVERED_BLOCKS.map((b) => ({
    slug: b.slug,
    sourcePath: `components/blocks/${b.slug}.tsx`,
  })),
}
```

The `discoverPrimitives` / `discoverBlocks` imports go alongside other `@forkshop/engine` imports — merge with the existing import block, don't add a separate line.

- [ ] **Step 3: Update the sidebar sections to use DISCOVERED_PRIMITIVES / DISCOVERED_BLOCKS**

Find the `sections={[...]}` array in the return JSX. Replace:

```tsx
entries: forkshopConfig.primitives.map((p) => ({ slug: p.slug, name: p.name })),
```

with:

```tsx
entries: DISCOVERED_PRIMITIVES.map((p) => ({ slug: p.slug, name: p.name })),
```

And the same swap for blocks:

```tsx
entries: forkshopConfig.blocks.map((b) => ({ slug: b.slug, name: b.name })),
```

→

```tsx
entries: DISCOVERED_BLOCKS.map((b) => ({ slug: b.slug, name: b.name })),
```

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter playground typecheck`
Expected: 0 errors.

Run: `pnpm --filter playground build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/app/forkshop/page.tsx
git commit -m "refactor(playground): page.tsx derives FILE_MAP + sidebar entries from discovered lists

discoverPrimitives/discoverBlocks called at module load (barrel modules
are referentially stable). FILE_MAP and sidebar entry lists derive from
the discovered output — adding a primitive to the barrel propagates
through the whole page automatically."
```

---

## Task 15: Final validation

**Files:** none — verification only.

- [ ] **Step 1: pnpm check (typecheck + lint workspace-wide)**

Run: `pnpm check`
Expected: success. Lint may still fail with the pre-existing `eslint-plugin-react-hooks` missing — that's unrelated to this branch.

- [ ] **Step 2: validate-registry**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 3: Engine unit tests**

Run: `pnpm --filter @forkshop/engine test`
Expected: success. Should include the new `use-discovered-primitives.test.ts` (6 tests) and `use-discovered-blocks.test.ts` (3 tests) plus the existing suite.

- [ ] **Step 4: Playground build**

Run: `pnpm --filter playground build`
Expected: success.

- [ ] **Step 5: Manual smoke test (live-mirror)**

In a separate terminal:
```bash
pnpm --filter playground dev
```

Open `http://localhost:3000/forkshop` (or whichever port — kill stragglers first if needed).

Click through:
- Design System (parent)
- UI Components (parent) → see 3 primitive tiles
- UI Components → Button → variant grid renders (assumes Task 10 left button.tsx override in place)
- Blocks (parent) → see 4 block iframes
- Sitemap (parent) → see Tree

Then test live-mirror: add a new primitive file like `apps/playground/components/ui/test-primitive.tsx`:

```tsx
export function TestPrimitive() {
  return <div className="bg-yellow-100 p-4">Test primitive</div>
}
```

And add to the barrel: `apps/playground/components/ui/index.ts` — add `export { TestPrimitive } from "./test-primitive"`.

Refresh `/forkshop`. The UI Components Board should now show 4 tiles. The TestPrimitive should appear in the sidebar under UI Components.

Cleanup: remove the test files after confirming.

- [ ] **Step 6: Exit-criteria audit against the spec**

Read `docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md` Exit criteria section. For each item:

- ✓ Engine exports `useDiscoveredPrimitives` / `useDiscoveredBlocks` (Task 1, 2)
- ✓ Playground uses the hooks; adding a primitive shows up (Step 5)
- ✓ Phase 5 has the Locator opt-in only (Task 3 dropped cadence-note; Task 7 will need to verify Locator opt-in is wired — check Phase 5 content)
- ✓ Phase 6 always writes block/[slug]/page.tsx (Task 7)
- ✓ Phase 6 installs Locator conditional on Phase 5 (Task 7)
- ✓ Template 5 uses previewSrc (Task 4)
- ✓ Template 12 removed (Task 3)
- ✓ Template 9 derives fileMap from forkshopConfig (Task 14 covers playground; Template 9 in skill needs the same — verify in Phase 6's page.tsx template)
- ✓ Phase 7 simplified (Task 8)
- ✓ Phase 3/4/6 wording pass (Task 9)
- ✓ forkshop.config.tsx slim shape (Task 5 in skill template; Task 11 in playground)

If any exit-criteria item isn't satisfied, file a follow-up issue or revert that task.

- [ ] **Step 7: Final commit (if any uncommitted state remains)**

Run: `git status --short`
Expected: clean — every task committed its own changes.

If there are uncommitted changes from manual smoke (positions.json, removed test files), discard them:
```bash
git checkout apps/playground/app/forkshop/positions.json
```
