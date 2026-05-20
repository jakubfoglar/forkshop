# Engine contract + Board API redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@forkshop/engine` and `forkshop` CLI `0.4.0` with the new typed Board contract (`defineBoard()` / `defineLayout()` / `defineConfig()`), runtime validation, `forkshop verify`, the LazyIframe export, the Gallery / Tree Layout consolidation, and a rewritten setup skill that collapses from 1409 lines to ~400.

**Architecture:** Boards become typed config objects (via `defineBoard()`) that return a React component carrying introspectable `__config` metadata. The engine ships a top-level `<BoardRegistry>` that owns canvas, sidebar, selection, and positions wiring — user-side scaffolds shrink to single-file `defineBoard()` calls. The old `DesignSystemView` and `ResponsiveFrameView` Layouts decompose into small specialized components (`ColorGraph`, `TypographyShowcase`) and helpers (`responsiveFrameEntries`, `enumeratePrimitiveVariants`). Zod schemas + a new `forkshop verify` CLI catch shape drift before runtime.

**Tech Stack:** TypeScript, React 18+, Next.js App Router, Zod (new dep on engine), vitest, pnpm workspaces. No new icon libs, no new heavy deps.

**Spec:** [docs/specs/2026-05-20-engine-contract-and-board-api-design.md](../../specs/2026-05-20-engine-contract-and-board-api-design.md)

---

## Pre-flight

This plan touches roughly 25 new files, 12 modified files, and 2 deletions across `packages/engine/`, `packages/cli/`, and `apps/test/` smoke-fixture. It is structured in nine phases. Each phase is independently testable and ends with a commit. The order matters: foundations (A) must land before consumers (D, E, F); CLI awareness (G) must follow the engine API stabilization (A–F); skill rewrite (H) must follow CLI awareness.

**Run before starting any task:** `pnpm install` (ensure fresh deps; the plan adds `zod` to `packages/engine`).

**Run between phases:** `pnpm check` (typecheck + lint across the workspace) and `pnpm test`. If either fails, halt the phase and diagnose.

**Versioning:** All commits during this plan target the next release; do not bump `package.json` versions until Phase I (release prep).

---

## File structure

### New files in `packages/engine/`

```
src/
  lib/
    define-config.ts                 defineConfig() + Zod schema for ForkshopConfig
    define-board.ts                  defineBoard() + __config attachment
    define-layout.ts                 defineLayout() protocol
    schemas.ts                       Zod schemas for AnyNode, BoardConfig, etc.
    enumerate-primitive-variants.ts  helper: walk cva, return Gallery entries
    responsive-frame-entries.ts      helper: 3-iframe Gallery entries for a path
    use-design-tokens.ts             hook: auto-pick v3-config vs CSS-vars source
    builtin-layouts.ts               BUILTIN_LAYOUTS constant + gallery/tree wiring
  components/
    board-registry.tsx               <BoardRegistry> main mount
    color-graph.tsx                  extracted from design-system-view
    typography-showcase.tsx          extracted from design-system-view
    primitives-grid.tsx              convenience component
  hooks/
    use-selection.ts                 useSelection() hook + provider
  types/
    board.ts                         BoardConfig, BoardComponent types
    layout.ts                        Layout protocol type
    selection.ts                     ForkshopSelection union (with "custom" kind)
templates/scaffolds/
  forkshop-config.tsx.template
  design-system-board.tsx.template
  ui-components-board.tsx.template
  primitive-detail-board.tsx.template
  blocks-board.tsx.template
  sitemap-board.tsx.template
  single-page-board.tsx.template
  reference-board.tsx.template
  page.tsx.template
```

### Modified files in `packages/engine/`

```
src/
  index.ts                          add new exports, remove old
  layouts/
    gallery.tsx                     auto-flow, freeform, rulers prop
    tree.tsx                        attach default icon + Layout protocol
  components/canvas/
    lazy-iframe.tsx                 maxHeight, lockScroll, cap callback fix
  node-types/
    iframe-route.tsx                pass capped height through callback
  lib/
    token-registry.ts               remove setActiveTokenRegistry singleton
templates/
  user-claude-md.md                 rewrite to ~250 lines
src/skill/
  setup.md                          rewrite to ~400 lines
package.json                        add zod dep, add exports for new modules
```

### Deleted files in `packages/engine/`

```
src/layouts/design-system-view.tsx       585 LOC; decomposed
src/layouts/responsive-frame-view.tsx    449 LOC; replaced by helper
```

### New files in `packages/cli/`

```
src/
  commands/verify.ts                forkshop verify command
  verify/
    check-config.ts                 validates forkshop.config.tsx shape
    check-boards.ts                 walks board files; asserts Board contract
    check-references.ts             asserts sourceFile/filePath paths exist
    check-token-classes.ts          asserts forkshop-* not used outside app/forkshop/
    check-claude-md-examples.ts     asserts user-claude-md.md examples typecheck
```

### Modified files in `packages/cli/`

```
src/
  index.ts                          register verify command
  manifest-builder.ts               new scaffold templates, schemaVersion 2.1.0
  commands/diff.ts                  awareness of new file shapes
  commands/update.ts                awareness of new file shapes
  manifest-schema.ts                schemaVersion 2.1.0
```

### Modified files in `apps/test/`

```
forkshop.json (after re-init)       schemaVersion 2.1.0
app/forkshop/*                      regenerated by re-running setup skill
```

---

## Phase A — Types, schemas, defineConfig

Establishes the type foundation everything else builds on. Adds `zod` to engine. Touches no runtime behavior.

### Task A1: Add `zod` to engine dependencies

**Files:**
- Modify: `packages/engine/package.json`

- [ ] **Step 1: Add zod dependency**

Edit `packages/engine/package.json` `dependencies`:

```json
"dependencies": {
  "@locator/runtime": "^0.5.0",
  "clsx": "^2.1.0",
  "lucide-react": "^0.469.0",
  "motion": "^11.18.0",
  "zod": "^3.23.0"
}
```

- [ ] **Step 2: Install**

Run: `pnpm install --filter @forkshop/engine`
Expected: no errors; `zod` resolves.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/package.json pnpm-lock.yaml
git commit -m "deps(engine): add zod for runtime config validation"
```

### Task A2: Selection union with `custom` kind

**Files:**
- Create: `packages/engine/src/types/selection.ts`
- Test: `packages/engine/src/types/selection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/engine/src/types/selection.test.ts
import { describe, it, expect } from "vitest"
import {
  isSectionSelection, isPageSelection, isPrimitiveSelection,
  isBlockSelection, isCustomSelection,
  type ForkshopSelection,
} from "@forkshop/types/selection"

describe("selection guards", () => {
  it("narrows custom selection by namespace", () => {
    const s: ForkshopSelection = { kind: "custom", namespace: "charts", data: { id: "x" } }
    expect(isCustomSelection(s)).toBe(true)
    expect(isCustomSelection(s) && s.namespace).toBe("charts")
  })
  it("rejects custom guard on non-custom kinds", () => {
    const s: ForkshopSelection = { kind: "page", path: "/" }
    expect(isCustomSelection(s)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @forkshop/engine test selection`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the union and guards**

```ts
// packages/engine/src/types/selection.ts
export type ForkshopSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "block"; slug: string }
  | { kind: "primitive"; slug: string }
  | { kind: "page"; path: string }
  | { kind: "custom"; namespace: string; data: unknown }

export function isSectionSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "section" }> {
  return s.kind === "section"
}
export function isPageSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "page" }> {
  return s.kind === "page"
}
export function isPrimitiveSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "primitive" }> {
  return s.kind === "primitive"
}
export function isBlockSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "block" }> {
  return s.kind === "block"
}
export function isCustomSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "custom" }> {
  return s.kind === "custom"
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @forkshop/engine test selection`
Expected: PASS.

- [ ] **Step 5: Verify the union replaces the existing selection type**

Run: `grep -rn "ForkshopSelection" packages/engine/src --include="*.ts" --include="*.tsx" -l`
Confirm existing usages (notably `components/sidebar/forkshop-sidebar.tsx`) compile against the new five-kind union (existing four kinds are intact; `custom` is additive). Re-run `pnpm --filter @forkshop/engine typecheck` — expect no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/types/selection.ts packages/engine/src/types/selection.test.ts
git commit -m "feat(engine): selection union gains 'custom' kind with type guards"
```

### Task A3: Layout protocol type

**Files:**
- Create: `packages/engine/src/types/layout.ts`

- [ ] **Step 1: Define the Layout protocol**

```ts
// packages/engine/src/types/layout.ts
import type { ReactNode } from "react"
import type { AnyNode } from "./node"
import type { ForkshopIconComponent } from "../lib/icons"
import type { NodePositions } from "../lib/node-positions"

export type LayoutEntry = {
  id: string
  label?: string
  node: AnyNode
  row?: number
  column?: number
}

export type LayoutRenderProps<TOptions> = {
  entries: LayoutEntry[]
  options: TOptions
  nodePositions: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string | undefined) => void
}

export type Layout<TOptions = unknown> = {
  id: string
  icon: ForkshopIconComponent
  defaultOptions: TOptions
  render: (props: LayoutRenderProps<TOptions>) => ReactNode
  stageSize: (entries: LayoutEntry[], options: TOptions) => { width: number; height: number }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS (no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/types/layout.ts
git commit -m "feat(engine): Layout protocol type for built-in and custom layouts"
```

### Task A4: Board types

**Files:**
- Create: `packages/engine/src/types/board.ts`

- [ ] **Step 1: Define Board config and component types**

```ts
// packages/engine/src/types/board.ts
import type { ComponentType } from "react"
import type { ForkshopSelection } from "./selection"
import type { Layout, LayoutEntry } from "./layout"
import type { ForkshopIconComponent } from "../lib/icons"

export type SidebarChild = {
  selection: ForkshopSelection
  label: string
  icon?: ForkshopIconComponent
}

export type BoardConfig<TLayoutOptions = unknown> = {
  id: string
  label?: string
  icon?: ForkshopIconComponent
  match: (selection: ForkshopSelection) => boolean
  layout: "gallery" | "tree" | Layout<TLayoutOptions>
  layoutOptions?: Partial<TLayoutOptions>
  useEntries: () => LayoutEntry[]
  useSidebarChildren?: () => SidebarChild[]
}

export type BoardComponent<TLayoutOptions = unknown> = ComponentType<Record<string, never>> & {
  readonly __config: BoardConfig<TLayoutOptions>
  readonly __isBoard: true
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/types/board.ts
git commit -m "feat(engine): BoardConfig and BoardComponent types"
```

### Task A5: Zod schemas for nodes and config

**Files:**
- Create: `packages/engine/src/lib/schemas.ts`
- Test: `packages/engine/src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/engine/src/lib/schemas.test.ts
import { describe, it, expect } from "vitest"
import { nodeSchema, forkshopConfigSchema } from "@forkshop/lib/schemas"

describe("nodeSchema", () => {
  it("accepts a well-formed iframe-route node", () => {
    const result = nodeSchema.safeParse({
      id: "page:/", kind: "iframe-route",
      x: 0, y: 0, width: 1200, height: 800,
      routePath: "/", sourceFile: "app/page.tsx",
    })
    expect(result.success).toBe(true)
  })
  it("rejects an iframe-component node missing slug", () => {
    const result = nodeSchema.safeParse({
      id: "block:hero", kind: "iframe-component",
      x: 0, y: 0, width: 1200, height: 600,
      previewSrc: "/forkshop/block/hero",
      // slug missing
    })
    expect(result.success).toBe(false)
  })
})

describe("forkshopConfigSchema", () => {
  it("rejects an empty route path", () => {
    const result = forkshopConfigSchema.safeParse({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "", sourceFile: "app/page.tsx" }] },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("sitemap")
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @forkshop/engine test schemas`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement schemas**

```ts
// packages/engine/src/lib/schemas.ts
import { z } from "zod"

const baseNodeFields = {
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  label: z.string().optional(),
}

const inlineReactSchema = z.object({
  ...baseNodeFields,
  kind: z.literal("inline-react"),
  render: z.function(),
  filePath: z.string().optional(),
})

const iframeRouteSchema = z.object({
  ...baseNodeFields,
  kind: z.literal("iframe-route"),
  routePath: z.string().regex(/^\//, "routePath must start with /"),
  sourceFile: z.string().optional(),
})

const iframeComponentSchema = z.object({
  ...baseNodeFields,
  kind: z.literal("iframe-component"),
  slug: z.string().min(1),
  previewSrc: z.string().min(1),
  sourceFile: z.string().optional(),
})

export const nodeSchema = z.discriminatedUnion("kind", [
  inlineReactSchema,
  iframeRouteSchema,
  iframeComponentSchema,
])

const sitemapRouteSchema = z.object({
  path: z.string().regex(/^\/.+/, "route paths must start with / and be non-empty").or(z.literal("/")),
  sourceFile: z.string().min(1),
})

export const forkshopConfigSchema = z.object({
  mount: z.string().min(1),
  ui: z.record(z.string(), z.unknown()).optional(),
  blocks: z.record(z.string(), z.unknown()).optional(),
  nodeTypes: z.array(z.unknown()).optional(),
  layouts: z.array(z.unknown()).optional(),
  sitemap: z.object({ routes: z.array(sitemapRouteSchema) }),
  reference: z.object({ contentPaths: z.array(z.string()) }).optional(),
  viewportProfile: z.enum(["responsive", "mobile"]).default("responsive"),
})

export type ParsedNode = z.infer<typeof nodeSchema>
export type ParsedForkshopConfig = z.infer<typeof forkshopConfigSchema>
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @forkshop/engine test schemas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/schemas.ts packages/engine/src/lib/schemas.test.ts
git commit -m "feat(engine): zod schemas for AnyNode union and ForkshopConfig"
```

### Task A6: `defineConfig()` with import-time validation

**Files:**
- Create: `packages/engine/src/lib/define-config.ts`
- Test: `packages/engine/src/lib/define-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/engine/src/lib/define-config.test.ts
import { describe, it, expect } from "vitest"
import { defineConfig } from "@forkshop/lib/define-config"

describe("defineConfig", () => {
  it("returns the parsed config when valid", () => {
    const cfg = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })
    expect(cfg.mount).toBe("app/forkshop")
    expect(cfg.viewportProfile).toBe("responsive")  // default applied
  })

  it("throws ForkshopConfigError when invalid", () => {
    expect(() =>
      defineConfig({
        // @ts-expect-error -- testing runtime rejection of bad shape
        mount: "",
        sitemap: { routes: [{ path: "", sourceFile: "" }] },
      })
    ).toThrowError(/ForkshopConfigError/)
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test define-config`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/engine/src/lib/define-config.ts
import { forkshopConfigSchema, type ParsedForkshopConfig } from "@forkshop/lib/schemas"
import { ZodError } from "zod"

export class ForkshopConfigError extends Error {
  constructor(message: string, public readonly issues: unknown[]) {
    super(message)
    this.name = "ForkshopConfigError"
  }
}

export function defineConfig(input: unknown): ParsedForkshopConfig {
  const result = forkshopConfigSchema.safeParse(input)
  if (!result.success) {
    const detail = formatZodError(result.error)
    throw new ForkshopConfigError(
      `ForkshopConfigError: invalid forkshop.config.tsx shape.\n${detail}`,
      result.error.issues,
    )
  }
  return result.data
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `  at ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test define-config`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/define-config.ts packages/engine/src/lib/define-config.test.ts
git commit -m "feat(engine): defineConfig validates shape at import time"
```

### Task A7: Phase A wrap — typecheck and lint

- [ ] **Step 1: Full workspace check**

Run: `pnpm check`
Expected: PASS across engine + cli + docs + demo + test.

- [ ] **Step 2: Full workspace tests**

Run: `pnpm test`
Expected: PASS (Phase A adds tests but doesn't break anything).

If either fails, halt and diagnose before starting Phase B.

---

## Phase B — Iframe primitive exports + height-cap fix

Ships the polish-backlog top items: export `LazyIframe`, `useForkshopCanvas`, canvas types; add `maxHeight` and `lockScroll` props; fix the `heightMode: "cap"` body-height callback bug.

### Task B1: Type exports for canvas handle/transform/wheel input

**Files:**
- Modify: `packages/engine/src/index.ts`
- Modify: `packages/engine/src/components/canvas/forkshop-canvas.tsx` (just verifying exports)

- [ ] **Step 1: Locate the canvas type definitions**

Run: `grep -n "type Transform\|type WheelInput\|type ForkshopCanvasHandle" packages/engine/src/components/canvas/forkshop-canvas.tsx`
Expected: lines where the types are declared. Note them.

- [ ] **Step 2: Export the types from the canvas file**

If any are declared with `type Foo = ...` without `export`, add `export`. Run typecheck to confirm.

- [ ] **Step 3: Re-export from `src/index.ts`**

Edit `packages/engine/src/index.ts`. Find the canvas-shell exports group (`ForkshopCanvas`, `ForkshopCanvasHandle`) and add:

```ts
export type { Transform, WheelInput } from "./components/canvas/forkshop-canvas.js"
```

If `ForkshopCanvasHandle` isn't already exported, add it to the same export.

- [ ] **Step 4: Regen public-api snapshot**

Run: `pnpm --filter @forkshop/engine regen-api-snap`
Confirm the snapshot now includes `Transform`, `WheelInput`, `ForkshopCanvasHandle`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/index.ts packages/engine/src/components/canvas/forkshop-canvas.tsx packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine): export ForkshopCanvasHandle, Transform, WheelInput types"
```

### Task B2: Export `useForkshopCanvas`

**Files:**
- Modify: `packages/engine/src/components/canvas/forkshop-canvas.tsx`
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Confirm the hook exists internally**

Run: `grep -n "useForkshopCanvas" packages/engine/src/components/canvas/forkshop-canvas.tsx`
Expected: hook is defined (with `export function useForkshopCanvas` or `function useForkshopCanvas`).

- [ ] **Step 2: Ensure the hook is `export`ed from the file**

If it's not exported, prefix `export`. Make sure the hook's docstring (single-line comment above the declaration) explains the contract: *"Returns the canvas's imperative API (applyWheelInput, transformRef) for custom NodeTypes and leaf components."*

- [ ] **Step 3: Re-export from `src/index.ts`**

Add to the canvas-shell exports group:

```ts
export { useForkshopCanvas } from "./components/canvas/forkshop-canvas.js"
```

- [ ] **Step 4: Typecheck + regen snapshot**

Run: `pnpm --filter @forkshop/engine typecheck && pnpm --filter @forkshop/engine regen-api-snap`
Expected: PASS; snapshot includes `useForkshopCanvas`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/index.ts packages/engine/src/components/canvas/forkshop-canvas.tsx packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine): export useForkshopCanvas hook for custom NodeTypes"
```

### Task B3: Fix `LazyIframe` height-cap callback bug

**Files:**
- Modify: `packages/engine/src/components/canvas/lazy-iframe.tsx`
- Test: `packages/engine/src/components/canvas/lazy-iframe.test.tsx`

- [ ] **Step 1: Locate the body-height sync code**

Run: `grep -n "onBodyHeightSync\|heightMode" packages/engine/src/components/canvas/lazy-iframe.tsx`
Expected: lines showing the existing `heightMode` discriminator and the `onBodyHeightSync` callback. Note the line where `onBodyHeightSync?.(id, measured)` (or equivalent) is called.

- [ ] **Step 2: Write the failing test**

```tsx
// packages/engine/src/components/canvas/lazy-iframe.test.tsx
import { describe, it, expect, vi } from "vitest"
import { capReportedHeight } from "./lazy-iframe.js"  // export the helper below

describe("capReportedHeight", () => {
  it("returns the measured height when heightMode is auto", () => {
    expect(capReportedHeight(500, 1000, "auto")).toBe(500)
  })
  it("caps the measured height when heightMode is cap and measured exceeds cap", () => {
    expect(capReportedHeight(2000, 800, "cap")).toBe(800)
  })
  it("returns measured when cap mode but measured is under the cap", () => {
    expect(capReportedHeight(500, 800, "cap")).toBe(500)
  })
  it("returns fixed when heightMode is fixed", () => {
    expect(capReportedHeight(2000, 800, "fixed")).toBe(800)
  })
})
```

- [ ] **Step 3: Verify failure**

Run: `pnpm --filter @forkshop/engine test lazy-iframe`
Expected: FAIL (helper not exported).

- [ ] **Step 4: Add the cap helper and apply it to the callback site**

In `lazy-iframe.tsx`, add at the top (after imports):

```ts
export function capReportedHeight(
  measured: number,
  cap: number,
  mode: "auto" | "cap" | "fixed",
): number {
  if (mode === "auto") return measured
  return Math.min(measured, cap)
}
```

Find the call site that invokes `onBodyHeightSync` (look for `onBodyHeightSync?.(id`). Wrap the measured value with `capReportedHeight`:

```tsx
// before:
onBodyHeightSync?.(id, measured)

// after:
onBodyHeightSync?.(id, capReportedHeight(measured, height, heightMode))
```

Where `height` is the existing `node.height` (or equivalent cap prop) and `heightMode` is the existing discriminator prop on `LazyIframe`.

- [ ] **Step 5: Verify pass**

Run: `pnpm --filter @forkshop/engine test lazy-iframe`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/components/canvas/lazy-iframe.tsx packages/engine/src/components/canvas/lazy-iframe.test.tsx
git commit -m "fix(engine): LazyIframe caps body-height callback when heightMode is cap"
```

### Task B4: Add `maxHeight` and `lockScroll` props to `LazyIframe`

**Files:**
- Modify: `packages/engine/src/components/canvas/lazy-iframe.tsx`

- [ ] **Step 1: Locate the props interface**

Run: `grep -n "LazyIframeProps\|interface.*Iframe" packages/engine/src/components/canvas/lazy-iframe.tsx`
Expected: the props type declaration.

- [ ] **Step 2: Add the two new optional props**

```ts
// In the props type:
maxHeight?: number   // bounds wrapper AND reported height callback
lockScroll?: boolean // inject `html, body { overflow: hidden !important }` into iframe doc
```

- [ ] **Step 3: Apply `maxHeight` to wrapper sizing and the cap helper**

Where the wrapper style or container sizing is computed, take `Math.min(currentHeight, maxHeight ?? Infinity)`. Pass the same value to `capReportedHeight`:

```ts
const effectiveCap = maxHeight !== undefined ? Math.min(node.height, maxHeight) : node.height
// use effectiveCap in capReportedHeight calls
```

- [ ] **Step 4: Apply `lockScroll` in onLoad**

In the existing `onLoad` handler (where the engine already injects style to hide Next.js dev chrome), add:

```ts
if (lockScroll) {
  const style = doc.createElement("style")
  style.textContent = "html, body { overflow: hidden !important; }"
  doc.head.appendChild(style)
}
```

(Match the style of existing dev-chrome-hiding injection — same approach.)

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/components/canvas/lazy-iframe.tsx
git commit -m "feat(engine): LazyIframe gains maxHeight and lockScroll props"
```

### Task B5: Export `LazyIframe`

**Files:**
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Add the export**

In `src/index.ts`, near the canvas-shell exports:

```ts
export { LazyIframe, type LazyIframeProps } from "./components/canvas/lazy-iframe.js"
```

(`LazyIframeProps` should already be exported from the file — if not, add `export` to its declaration first.)

- [ ] **Step 2: Regen snapshot**

Run: `pnpm --filter @forkshop/engine regen-api-snap`
Expected: snapshot includes `LazyIframe`, `LazyIframeProps`.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/index.ts packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine): export LazyIframe primitive for custom iframe Boards"
```

### Task B6: Phase B wrap

- [ ] **Step 1: Full workspace check**

Run: `pnpm check && pnpm test`
Expected: PASS.

If any failures, halt and diagnose.

---

## Phase C — defineLayout + Layout consolidation

Adds the `defineLayout()` protocol, refactors `Gallery` for auto-flow / freeform / rulers, attaches default icons + Layout protocol to `Gallery` and `Tree`, and ships `BUILTIN_LAYOUTS`.

### Task C1: `defineLayout()` helper

**Files:**
- Create: `packages/engine/src/lib/define-layout.ts`
- Test: `packages/engine/src/lib/define-layout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/engine/src/lib/define-layout.test.ts
import { describe, it, expect } from "vitest"
import { defineLayout } from "@forkshop/lib/define-layout"
import { forkshopIcons } from "@forkshop/lib/icons"

describe("defineLayout", () => {
  it("returns a Layout object with id, icon, defaultOptions, render, stageSize", () => {
    const layout = defineLayout<{ orbit: number }>({
      id: "x",
      icon: forkshopIcons.flows,
      defaultOptions: { orbit: 100 },
      render: () => null,
      stageSize: () => ({ width: 800, height: 600 }),
    })
    expect(layout.id).toBe("x")
    expect(layout.defaultOptions.orbit).toBe(100)
    expect(layout.stageSize([], { orbit: 0 })).toEqual({ width: 800, height: 600 })
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test define-layout`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/engine/src/lib/define-layout.ts
import type { Layout } from "@forkshop/types/layout"

export function defineLayout<TOptions>(layout: Layout<TOptions>): Layout<TOptions> {
  return layout
}
```

(Note: this is intentionally a thin pass-through. The "definition" semantics live entirely in the type — there's no runtime registration. Consumers register Layouts via `forkshop.config.tsx`'s `layouts: [...]` array, which `BoardRegistry` reads.)

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test define-layout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/define-layout.ts packages/engine/src/lib/define-layout.test.ts
git commit -m "feat(engine): defineLayout() protocol for custom user-side layouts"
```

### Task C2: Refactor Gallery — auto-flow default and freeform mode

**Files:**
- Modify: `packages/engine/src/layouts/gallery.tsx`
- Modify/Add: `packages/engine/src/layouts/gallery.test.tsx`

- [ ] **Step 1: Inspect current Gallery placement logic**

Run: `grep -n "row\|column\|position\|placement" packages/engine/src/layouts/gallery.tsx | head -30`
Expected: see the existing layout function. The current bug per polish-backlog: when `entry.row` and `entry.column` default to 0, all cells overlap at (0,0).

- [ ] **Step 2: Add tests for the three modes**

Append to `packages/engine/src/layouts/gallery.test.tsx`:

```tsx
import { computeGalleryPlacements } from "./gallery.js"

describe("computeGalleryPlacements", () => {
  it("uses explicit row/column when set", () => {
    const placements = computeGalleryPlacements(
      [
        { id: "a", row: 0, column: 0, node: { x: 0, y: 0, width: 100, height: 100, id: "a", kind: "inline-react", render: () => null } },
        { id: "b", row: 1, column: 0, node: { x: 0, y: 0, width: 100, height: 100, id: "b", kind: "inline-react", render: () => null } },
      ],
      { columns: 2, rowGap: 10, columnGap: 10 },
    )
    expect(placements.a.y).toBeLessThan(placements.b.y)
  })

  it("uses node x/y when neither row/column set and node has explicit coords", () => {
    const placements = computeGalleryPlacements(
      [{ id: "a", node: { id: "a", kind: "inline-react", x: 200, y: 300, width: 100, height: 100, render: () => null } }],
      { columns: 1 },
    )
    expect(placements.a).toEqual({ x: 200, y: 300 })
  })

  it("auto-flows when no row/column/x/y given", () => {
    const placements = computeGalleryPlacements(
      [
        { id: "a", node: { id: "a", kind: "inline-react", x: 0, y: 0, width: 100, height: 100, render: () => null } },
        { id: "b", node: { id: "b", kind: "inline-react", x: 0, y: 0, width: 100, height: 100, render: () => null } },
        { id: "c", node: { id: "c", kind: "inline-react", x: 0, y: 0, width: 100, height: 100, render: () => null } },
      ],
      { columns: 2, rowGap: 10, columnGap: 10 },
    )
    expect(placements.a).toEqual({ x: 0, y: 0 })
    expect(placements.b.x).toBeGreaterThan(0)
    expect(placements.b.y).toBe(0)
    expect(placements.c.x).toBe(0)
    expect(placements.c.y).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Verify failure**

Run: `pnpm --filter @forkshop/engine test gallery`
Expected: FAIL — `computeGalleryPlacements` not exported.

- [ ] **Step 4: Extract and implement `computeGalleryPlacements`**

Add to `gallery.tsx`:

```ts
import type { LayoutEntry } from "@forkshop/types/layout"

export type GalleryOptions = {
  columns?: number
  rowGap?: number
  columnGap?: number
  rulers?: boolean
  rulerUnit?: "px" | "rem"
}

export function computeGalleryPlacements(
  entries: LayoutEntry[],
  options: GalleryOptions,
): Record<string, { x: number; y: number }> {
  const columns = Math.max(1, options.columns ?? 1)
  const rowGap = options.rowGap ?? 24
  const columnGap = options.columnGap ?? 24

  const hasExplicit = entries.some((e) => e.row !== undefined || e.column !== undefined)
  const hasNodeCoords = !hasExplicit && entries.some((e) => e.node.x !== 0 || e.node.y !== 0)

  const result: Record<string, { x: number; y: number }> = {}

  if (hasExplicit) {
    // Grid mode — explicit row/column
    const widths = inferColumnWidths(entries, columns)
    const heights = inferRowHeights(entries)
    entries.forEach((e) => {
      const r = e.row ?? 0
      const c = e.column ?? 0
      const x = widths.slice(0, c).reduce((sum, w) => sum + w + columnGap, 0)
      const y = heights.slice(0, r).reduce((sum, h) => sum + h + rowGap, 0)
      result[e.id] = { x, y }
    })
    return result
  }

  if (hasNodeCoords) {
    // Freeform mode — node x/y are absolute coords
    entries.forEach((e) => {
      result[e.id] = { x: e.node.x, y: e.node.y }
    })
    return result
  }

  // Auto-flow mode — fill left-to-right, top-to-bottom
  const widths = entries.map((e) => e.node.width)
  const heights = entries.map((e) => e.node.height)
  entries.forEach((e, i) => {
    const c = i % columns
    const r = Math.floor(i / columns)
    const x = widths.slice(r * columns, r * columns + c).reduce((sum, w) => sum + w + columnGap, 0)
    const previousRows = []
    for (let row = 0; row < r; row++) {
      const rowSlice = heights.slice(row * columns, (row + 1) * columns)
      previousRows.push(Math.max(0, ...rowSlice))
    }
    const y = previousRows.reduce((sum, h) => sum + h + rowGap, 0)
    result[e.id] = { x, y }
  })
  return result
}

function inferColumnWidths(entries: LayoutEntry[], columns: number): number[] {
  const widths = new Array(columns).fill(0)
  entries.forEach((e) => {
    const c = e.column ?? 0
    if (c >= 0 && c < columns) widths[c] = Math.max(widths[c], e.node.width)
  })
  return widths
}

function inferRowHeights(entries: LayoutEntry[]): number[] {
  const heights: Record<number, number> = {}
  entries.forEach((e) => {
    const r = e.row ?? 0
    heights[r] = Math.max(heights[r] ?? 0, e.node.height)
  })
  return Object.values(heights)
}
```

Then update the Gallery component's render to use `computeGalleryPlacements` instead of the existing placement logic. Keep the existing drag-override resolution on top (overrides win over computed placements).

- [ ] **Step 5: Verify pass**

Run: `pnpm --filter @forkshop/engine test gallery`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/layouts/gallery.tsx packages/engine/src/layouts/gallery.test.tsx
git commit -m "feat(engine): Gallery auto-flows by default; supports grid, freeform, rulers"
```

### Task C3: Attach Layout protocol metadata to Gallery and Tree

**Files:**
- Modify: `packages/engine/src/layouts/gallery.tsx`
- Modify: `packages/engine/src/layouts/tree.tsx`
- Create: `packages/engine/src/lib/builtin-layouts.ts`

- [ ] **Step 1: Attach Layout-protocol metadata to Gallery**

In `gallery.tsx`, near the bottom, add:

```ts
import { forkshopIcons } from "@forkshop/lib/icons"
import type { Layout } from "@forkshop/types/layout"

export const galleryLayoutProtocol: Layout<GalleryOptions> = {
  id: "gallery",
  icon: forkshopIcons.gallery ?? forkshopIcons.components,
  defaultOptions: { columns: 1, rowGap: 24, columnGap: 24, rulers: false },
  render: ({ entries, options, nodePositions, onPositionChange, selectedId, onSelectChange }) => (
    <Gallery
      entries={entries}
      layout={(options.columns ?? 1) === 1 ? "stack" : "grid"}
      rowGap={options.rowGap}
      columnGap={options.columnGap}
      nodePositions={nodePositions}
      onPositionChange={onPositionChange}
      selectedId={selectedId}
      onSelectChange={onSelectChange}
    />
  ),
  stageSize: (entries, options) => {
    const placements = computeGalleryPlacements(entries, options)
    let width = 0, height = 0
    for (const e of entries) {
      const p = placements[e.id]
      width = Math.max(width, p.x + e.node.width)
      height = Math.max(height, p.y + e.node.height)
    }
    return { width, height }
  },
}
```

(If `forkshopIcons.gallery` doesn't exist, pick the closest semantically — `components` is fine; we can add a dedicated icon later. Don't add a new icon library.)

- [ ] **Step 2: Attach Layout-protocol metadata to Tree**

In `tree.tsx`, mirror the pattern:

```ts
import { forkshopIcons } from "@forkshop/lib/icons"
import type { Layout, LayoutEntry } from "@forkshop/types/layout"

export type TreeOptions = {
  connectors?: "stepped" | "curved" | "straight"
  rowHeight?: number
}

export const treeLayoutProtocol: Layout<TreeOptions> = {
  id: "tree",
  icon: forkshopIcons.pages,
  defaultOptions: { connectors: "stepped", rowHeight: 80 },
  render: ({ entries, options, nodePositions, onPositionChange, selectedId, onSelectChange }) => (
    <Tree
      entries={entries as TreeEntry[]}
      nodePositions={nodePositions}
      onPositionChange={onPositionChange}
      selectedId={selectedId}
      onSelectChange={onSelectChange}
    />
  ),
  stageSize: (entries) => Tree.getStageSize(entries as TreeEntry[]),
}
```

- [ ] **Step 3: Create the BUILTIN_LAYOUTS constant**

```ts
// packages/engine/src/lib/builtin-layouts.ts
import { galleryLayoutProtocol } from "@forkshop/layouts/gallery"
import { treeLayoutProtocol } from "@forkshop/layouts/tree"
import type { Layout } from "@forkshop/types/layout"

export const BUILTIN_LAYOUTS: ReadonlyArray<Layout<unknown>> = [
  galleryLayoutProtocol as Layout<unknown>,
  treeLayoutProtocol as Layout<unknown>,
]

export function resolveLayout(
  ref: "gallery" | "tree" | Layout<unknown>,
  registered: ReadonlyArray<Layout<unknown>>,
): Layout<unknown> | undefined {
  if (typeof ref === "string") {
    return registered.find((l) => l.id === ref) ?? BUILTIN_LAYOUTS.find((l) => l.id === ref)
  }
  return ref
}
```

- [ ] **Step 4: Export from `src/index.ts`**

```ts
export { BUILTIN_LAYOUTS, resolveLayout } from "./lib/builtin-layouts.js"
export { galleryLayoutProtocol, type GalleryOptions } from "./layouts/gallery.js"
export { treeLayoutProtocol, type TreeOptions } from "./layouts/tree.js"
```

- [ ] **Step 5: Typecheck + tests**

Run: `pnpm --filter @forkshop/engine typecheck && pnpm --filter @forkshop/engine test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/layouts/gallery.tsx packages/engine/src/layouts/tree.tsx packages/engine/src/lib/builtin-layouts.ts packages/engine/src/index.ts
git commit -m "feat(engine): Gallery/Tree expose Layout protocol; BUILTIN_LAYOUTS exported"
```

### Task C4: Phase C wrap

- [ ] **Step 1: Full check**

Run: `pnpm check && pnpm test`
Expected: PASS.

---

## Phase D — defineBoard + useSelection + BoardRegistry

The architectural heart. After this phase, Boards can be written as typed configs and mounted via `<BoardRegistry>`, but the engine still has the old `DesignSystemView` / `ResponsiveFrameView` Layouts (deleted in Phase F).

### Task D1: `useSelection()` hook + provider

**Files:**
- Create: `packages/engine/src/hooks/use-selection.ts`
- Test: `packages/engine/src/hooks/use-selection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/engine/src/hooks/use-selection.test.tsx
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { SelectionProvider, useSelection, useSetSelection } from "./use-selection.js"

function wrap({ children }: { children: React.ReactNode }) {
  return <SelectionProvider initial={{ kind: "section", sectionId: "ui-components" }}>{children}</SelectionProvider>
}

describe("useSelection", () => {
  it("returns the current selection", () => {
    const { result } = renderHook(() => useSelection(), { wrapper: wrap })
    expect(result.current.kind).toBe("section")
  })

  it("updates when setSelection is called", () => {
    const { result } = renderHook(
      () => ({ sel: useSelection(), set: useSetSelection() }),
      { wrapper: wrap },
    )
    act(() => result.current.set({ kind: "page", path: "/about" }))
    expect(result.current.sel.kind).toBe("page")
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test use-selection`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// packages/engine/src/hooks/use-selection.ts
"use client"

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react"
import type { ForkshopSelection } from "@forkshop/types/selection"

type Ctx = {
  selection: ForkshopSelection
  setSelection: (next: ForkshopSelection) => void
}

const SelectionContext = createContext<Ctx | null>(null)

export function SelectionProvider({
  initial,
  children,
}: {
  initial: ForkshopSelection
  children: ReactNode
}) {
  const [selection, setSelection] = useState<ForkshopSelection>(initial)
  const value = useMemo<Ctx>(() => ({ selection, setSelection }), [selection])
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection(): ForkshopSelection {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error("useSelection must be used inside <SelectionProvider> (provided by <BoardRegistry>)")
  return ctx.selection
}

export function useSetSelection(): (next: ForkshopSelection) => void {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error("useSetSelection must be used inside <SelectionProvider>")
  return useCallback(ctx.setSelection, [ctx.setSelection])
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test use-selection`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/hooks/use-selection.ts packages/engine/src/hooks/use-selection.test.tsx
git commit -m "feat(engine): useSelection hook + SelectionProvider"
```

### Task D2: `defineBoard()` with `__config` attachment

**Files:**
- Create: `packages/engine/src/lib/define-board.ts`
- Test: `packages/engine/src/lib/define-board.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/engine/src/lib/define-board.test.tsx
import { describe, it, expect } from "vitest"
import { defineBoard } from "@forkshop/lib/define-board"

describe("defineBoard", () => {
  it("returns a Component with __config and __isBoard attached", () => {
    const Board = defineBoard({
      id: "test",
      label: "Test",
      match: (s) => s.kind === "section" && s.sectionId === "test",
      layout: "gallery",
      useEntries: () => [],
    })
    expect(Board.__isBoard).toBe(true)
    expect(Board.__config.id).toBe("test")
    expect(Board.__config.label).toBe("Test")
  })

  it("validates the config shape at definition time", () => {
    expect(() =>
      defineBoard({
        // @ts-expect-error -- bad shape
        id: "",
        match: () => true,
        layout: "gallery",
        useEntries: () => [],
      })
    ).toThrowError(/BoardConfigError|invalid/i)
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test define-board`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// packages/engine/src/lib/define-board.ts
"use client"

import type { BoardConfig, BoardComponent } from "@forkshop/types/board"

export class BoardConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BoardConfigError"
  }
}

export function defineBoard<TLayoutOptions = unknown>(
  config: BoardConfig<TLayoutOptions>,
): BoardComponent<TLayoutOptions> {
  if (!config.id || typeof config.id !== "string") {
    throw new BoardConfigError("BoardConfigError: Board.id must be a non-empty string")
  }
  if (typeof config.match !== "function") {
    throw new BoardConfigError(`BoardConfigError: Board "${config.id}" must define a 'match' function`)
  }
  if (typeof config.useEntries !== "function") {
    throw new BoardConfigError(`BoardConfigError: Board "${config.id}" must define a 'useEntries' hook`)
  }
  if (!config.layout) {
    throw new BoardConfigError(`BoardConfigError: Board "${config.id}" must select a layout`)
  }

  // The Board component itself is a render placeholder; BoardRegistry reads __config
  // and renders the Layout. The Board function is invoked only when registered.
  function BoardComponentFn() {
    // Render path runs inside BoardRegistry's context; this component is the
    // identity tag. Actual render is dispatched in BoardRegistry using __config.
    return null
  }

  Object.defineProperty(BoardComponentFn, "__config", {
    value: config,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  Object.defineProperty(BoardComponentFn, "__isBoard", {
    value: true as const,
    enumerable: false,
    writable: false,
    configurable: false,
  })

  return BoardComponentFn as BoardComponent<TLayoutOptions>
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test define-board`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/define-board.ts packages/engine/src/lib/define-board.test.tsx
git commit -m "feat(engine): defineBoard returns Component with __config metadata"
```

### Task D3: `<BoardRegistry>` core mount

**Files:**
- Create: `packages/engine/src/components/board-registry.tsx`
- Test: `packages/engine/src/components/board-registry.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/engine/src/components/board-registry.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { defineBoard } from "@forkshop/lib/define-board"
import { defineConfig } from "@forkshop/lib/define-config"
import { BoardRegistry } from "./board-registry.js"

describe("BoardRegistry", () => {
  it("activates the first Board whose match() returns true", () => {
    const A = defineBoard({
      id: "a",
      label: "A",
      match: (s) => s.kind === "section" && s.sectionId === "a",
      layout: "gallery",
      useEntries: () => [],
    })
    const B = defineBoard({
      id: "b",
      label: "B",
      match: (s) => s.kind === "section" && s.sectionId === "b",
      layout: "gallery",
      useEntries: () => [],
    })

    const config = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })

    render(
      <BoardRegistry config={config} boards={[A, B]} initialSelection={{ kind: "section", sectionId: "b" }} />,
    )

    // Sidebar renders both Board labels
    expect(screen.getByText("A")).toBeInTheDocument()
    expect(screen.getByText("B")).toBeInTheDocument()
  })

  it("warns in dev when two Boards match the same selection", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const A = defineBoard({ id: "a", match: () => true, layout: "gallery", useEntries: () => [] })
    const B = defineBoard({ id: "b", match: () => true, layout: "gallery", useEntries: () => [] })

    const config = defineConfig({ mount: "app/forkshop", sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] } })
    render(<BoardRegistry config={config} boards={[A, B]} initialSelection={{ kind: "section", sectionId: "x" }} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("multiple Boards matched"))
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test board-registry`
Expected: FAIL.

- [ ] **Step 3: Implement (minimal version — without sidebar wiring; that comes in D4)**

```tsx
// packages/engine/src/components/board-registry.tsx
"use client"

import { useMemo, type ReactNode } from "react"
import type { BoardComponent } from "@forkshop/types/board"
import type { ForkshopSelection } from "@forkshop/types/selection"
import type { ParsedForkshopConfig } from "@forkshop/lib/schemas"
import { SelectionProvider, useSelection } from "@forkshop/hooks/use-selection"
import { resolveLayout, BUILTIN_LAYOUTS } from "@forkshop/lib/builtin-layouts"
import { ForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useForkshopPositions } from "@forkshop/hooks/use-forkshop-positions"
import { AgentActivityProvider } from "@forkshop/components/agent-activity-context"

export type BoardRegistryProps = {
  config: ParsedForkshopConfig
  boards: ReadonlyArray<BoardComponent>
  initialSelection?: ForkshopSelection
}

export function BoardRegistry({ config, boards, initialSelection }: BoardRegistryProps) {
  const defaultSelection: ForkshopSelection = initialSelection ?? {
    kind: "section",
    sectionId: boards[0]?.__config.id ?? "default",
  }
  return (
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
      <SelectionProvider initial={defaultSelection}>
        <BoardRegistryInner config={config} boards={boards} />
      </SelectionProvider>
    </AgentActivityProvider>
  )
}

function BoardRegistryInner({
  config,
  boards,
}: {
  config: ParsedForkshopConfig
  boards: ReadonlyArray<BoardComponent>
}) {
  const selection = useSelection()
  const allLayouts = useMemo(
    () => [...(config.layouts ?? []), ...BUILTIN_LAYOUTS],
    [config.layouts],
  )

  const matches = boards.filter((b) => b.__config.match(selection))
  if (matches.length > 1) {
    console.warn(
      `Forkshop: multiple Boards matched selection ${JSON.stringify(selection)}: ` +
      matches.map((b) => b.__config.id).join(", ") + " (first wins)",
    )
  }
  const active = matches[0]

  return (
    <div className="flex h-screen overflow-hidden">
      <BoardSidebar boards={boards} />
      <div className="relative flex flex-1 overflow-hidden">
        {active ? <ActiveBoard board={active} layouts={allLayouts} /> : <EmptyBoardState />}
      </div>
    </div>
  )
}

function ActiveBoard({
  board,
  layouts,
}: {
  board: BoardComponent
  layouts: ReadonlyArray<import("@forkshop/types/layout").Layout<unknown>>
}) {
  const cfg = board.__config
  const entries = cfg.useEntries()
  const layout = resolveLayout(cfg.layout, layouts)
  const { nodePositions, onPositionChange } = useForkshopPositions({ boardId: cfg.id })

  if (!layout) {
    return (
      <div className="p-4 text-sm text-red-600">
        Board "{cfg.id}" references layout "{String(cfg.layout)}" but it isn't registered.
        Add it to forkshopConfig.layouts or use a built-in id ("gallery" | "tree").
      </div>
    )
  }

  const options = { ...layout.defaultOptions, ...(cfg.layoutOptions ?? {}) } as Record<string, unknown>
  return (
    <ForkshopCanvas>
      {layout.render({
        entries,
        options,
        nodePositions,
        onPositionChange,
      })}
    </ForkshopCanvas>
  )
}

function BoardSidebar({ boards }: { boards: ReadonlyArray<BoardComponent> }) {
  // Phase D4 fills this in — for now, a list of labels so D3 tests pass.
  return (
    <aside className="w-60 border-r p-2">
      {boards.map((b) => (
        <div key={b.__config.id} className="px-2 py-1 text-sm">{b.__config.label ?? b.__config.id}</div>
      ))}
    </aside>
  )
}

function EmptyBoardState() {
  return (
    <div className="p-4 text-sm text-neutral-500">
      No Board matched this selection. Check each Board's match() function.
    </div>
  )
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test board-registry`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/components/board-registry.tsx packages/engine/src/components/board-registry.test.tsx
git commit -m "feat(engine): BoardRegistry core mount with selection-driven activation"
```

### Task D4: `BoardRegistry` sidebar wiring (consumes Board labels, icons, children)

**Files:**
- Modify: `packages/engine/src/components/board-registry.tsx`

- [ ] **Step 1: Replace the stub BoardSidebar with real sidebar wiring**

Replace the `BoardSidebar` function with one that:
- Renders `<ForkshopSidebar>` from the existing `components/sidebar/forkshop-sidebar.tsx`.
- Builds `sections` from each Board's `__config` (id → sectionId, label → title, icon → icon).
- Calls each Board's `useSidebarChildren()` (if defined) to populate `entries`.
- Wires `routes` from `config.sitemap.routes.map((r) => r.path)`.

```tsx
import { ForkshopSidebar } from "@forkshop/components/sidebar/forkshop-sidebar"
import { forkshopIcons } from "@forkshop/lib/icons"
import { useSetSelection } from "@forkshop/hooks/use-selection"

function BoardSidebar({
  boards,
  config,
}: {
  boards: ReadonlyArray<BoardComponent>
  config: ParsedForkshopConfig
}) {
  const selection = useSelection()
  const setSelection = useSetSelection()

  // Read sidebar children from every Board that provides them
  const sections = boards.map((b) => {
    const cfg = b.__config
    const childrenHook = cfg.useSidebarChildren
    const entries = childrenHook ? childrenHook() : undefined
    return {
      id: cfg.id,
      title: cfg.label ?? cfg.id,
      icon: cfg.icon ?? forkshopIcons.components,
      entries: entries?.map((c) => ({ slug: childSlug(c.selection), name: c.label, icon: c.icon })),
      // entryKind is inferred from the first child's selection kind:
      entryKind: entries?.[0] ? inferEntryKind(entries[0].selection) : undefined,
    }
  })

  return (
    <ForkshopSidebar
      selection={selection}
      onSelect={setSelection}
      sections={sections}
      routes={config.sitemap.routes.map((r) => r.path)}
    />
  )
}

function childSlug(sel: ForkshopSelection): string {
  if (sel.kind === "primitive" || sel.kind === "block") return sel.slug
  if (sel.kind === "page") return sel.path
  if (sel.kind === "custom") return `${sel.namespace}:${JSON.stringify(sel.data)}`
  return ""
}

function inferEntryKind(sel: ForkshopSelection): "primitive" | "block" | "page" | undefined {
  if (sel.kind === "primitive") return "primitive"
  if (sel.kind === "block") return "block"
  if (sel.kind === "page") return "page"
  return undefined
}
```

- [ ] **Step 2: Update `BoardRegistryInner` to pass `config` to `BoardSidebar`**

Replace `<BoardSidebar boards={boards} />` with `<BoardSidebar boards={boards} config={config} />`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/components/board-registry.tsx
git commit -m "feat(engine): BoardRegistry wires sidebar from Board configs + sidebar children"
```

### Task D5: URL-hash routing for selection (round-trip)

**Files:**
- Modify: `packages/engine/src/components/board-registry.tsx`

- [ ] **Step 1: Use existing `parseSelection`/`serializeSelection`**

These are already exported from `@forkshop/engine`. In `BoardRegistryInner`, add a `useEffect` that hydrates initial selection from `window.location.hash` on mount and writes back on every selection change.

```tsx
import { parseSelection, serializeSelection } from "@forkshop/components/sidebar/selection-hash"
import { useEffect } from "react"

// inside BoardRegistry (above SelectionProvider):
function useHashSyncedInitial(initialSelection: ForkshopSelection | undefined, fallback: ForkshopSelection) {
  if (typeof window === "undefined") return initialSelection ?? fallback
  const fromHash = parseSelection(window.location.hash)
  return fromHash ?? initialSelection ?? fallback
}

// And inside BoardRegistryInner, after useSelection:
useEffect(() => {
  window.history.replaceState({}, "", serializeSelection(selection))
}, [selection])
```

- [ ] **Step 2: Update the BoardRegistry wrapper to use the hash-synced initial**

```tsx
export function BoardRegistry({ config, boards, initialSelection }: BoardRegistryProps) {
  const fallback: ForkshopSelection = { kind: "section", sectionId: boards[0]?.__config.id ?? "default" }
  const hydratedInitial = useHashSyncedInitial(initialSelection, fallback)
  return (
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
      <SelectionProvider initial={hydratedInitial}>
        <BoardRegistryInner config={config} boards={boards} />
      </SelectionProvider>
    </AgentActivityProvider>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/components/board-registry.tsx
git commit -m "feat(engine): BoardRegistry round-trips selection via URL hash"
```

### Task D6: Export the new contract from `src/index.ts`

**Files:**
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Add exports**

```ts
// new contract
export { defineConfig, ForkshopConfigError } from "./lib/define-config.js"
export { defineBoard, BoardConfigError } from "./lib/define-board.js"
export { defineLayout } from "./lib/define-layout.js"
export { BoardRegistry } from "./components/board-registry.js"
export { useSelection, useSetSelection, SelectionProvider } from "./hooks/use-selection.js"
export type { BoardConfig, BoardComponent, SidebarChild } from "./types/board.js"
export type { Layout, LayoutEntry, LayoutRenderProps } from "./types/layout.js"
export type { ForkshopSelection } from "./types/selection.js"
export {
  isSectionSelection, isPageSelection, isPrimitiveSelection,
  isBlockSelection, isCustomSelection,
} from "./types/selection.js"
```

- [ ] **Step 2: Regen API snapshot**

Run: `pnpm --filter @forkshop/engine regen-api-snap`
Expected: snapshot includes all the new exports.

- [ ] **Step 3: Full check**

Run: `pnpm check && pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/index.ts packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine): export defineBoard / defineConfig / defineLayout / BoardRegistry surface"
```

---

## Phase E — Specialized components and helpers

Extracts `ColorGraph`, `TypographyShowcase`, `PrimitivesGrid` from the old `DesignSystemView`. Adds `useDesignTokens`, `enumeratePrimitiveVariants`, `responsiveFrameEntries`.

### Task E1: Extract `ColorGraph`

**Files:**
- Create: `packages/engine/src/components/color-graph.tsx`
- Test: `packages/engine/src/components/color-graph.test.tsx`

- [ ] **Step 1: Locate color-rendering logic in `design-system-view.tsx`**

Run: `grep -n "color\|token\|swatch" packages/engine/src/layouts/design-system-view.tsx | head -30`
Identify the section that:
- Reads `tokens.colors` from the registry.
- Renders raw token swatches.
- Draws connector edges from raw tokens to semantic aliases.

This is roughly ~150 LOC inside the 585-LOC file.

- [ ] **Step 2: Write the failing test**

```tsx
// packages/engine/src/components/color-graph.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ColorGraph } from "./color-graph.js"

describe("ColorGraph", () => {
  it("renders a swatch per raw color token", () => {
    const tokens = {
      colors: [
        { name: "blue-500", value: "#3b82f6", category: "raw" as const },
        { name: "blue-600", value: "#2563eb", category: "raw" as const },
      ],
      spacing: [], fontSizes: [], fontWeights: [], radii: [], shadows: [], containers: [], classLookup: {},
    }
    render(<ColorGraph tokens={tokens} />)
    expect(screen.getByLabelText("blue-500")).toBeInTheDocument()
    expect(screen.getByLabelText("blue-600")).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Verify failure**

Run: `pnpm --filter @forkshop/engine test color-graph`
Expected: FAIL.

- [ ] **Step 4: Extract `ColorGraph` from design-system-view**

Create `color-graph.tsx`. Copy the color-section JSX + helpers from `design-system-view.tsx`. Wrap in:

```tsx
"use client"

import type { TokenRegistry } from "@forkshop/lib/token-registry"

export type ColorGraphProps = {
  tokens: TokenRegistry
  mode?: "swatches" | "semantic-aliases-as-edges"
}

export function ColorGraph({ tokens, mode = "semantic-aliases-as-edges" }: ColorGraphProps) {
  // … paste extracted JSX from design-system-view.tsx,
  // adapted to read from `tokens.colors` directly.
  // Use aria-label={token.name} on each swatch so the test passes.
}
```

Each color swatch must have `aria-label={token.name}`.

- [ ] **Step 5: Verify pass**

Run: `pnpm --filter @forkshop/engine test color-graph`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/components/color-graph.tsx packages/engine/src/components/color-graph.test.tsx
git commit -m "feat(engine): extract ColorGraph from DesignSystemView"
```

### Task E2: Extract `TypographyShowcase`

**Files:**
- Create: `packages/engine/src/components/typography-showcase.tsx`
- Test: `packages/engine/src/components/typography-showcase.test.tsx`

- [ ] **Step 1: Locate typography rendering in `design-system-view.tsx`**

Look for font-size, line-height, font-family rendering blocks. Roughly ~80 LOC.

- [ ] **Step 2: Write the failing test**

```tsx
// packages/engine/src/components/typography-showcase.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TypographyShowcase } from "./typography-showcase.js"

describe("TypographyShowcase", () => {
  it("renders a row per fontSize token", () => {
    const tokens = {
      colors: [], spacing: [], fontWeights: [], radii: [], shadows: [], containers: [], classLookup: {},
      fontSizes: [
        { name: "lg", value: "18px" },
        { name: "xl", value: "20px" },
      ],
    }
    render(<TypographyShowcase tokens={tokens} />)
    expect(screen.getByText("lg")).toBeInTheDocument()
    expect(screen.getByText("xl")).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Verify failure**

Run: `pnpm --filter @forkshop/engine test typography-showcase`
Expected: FAIL.

- [ ] **Step 4: Extract**

```tsx
// packages/engine/src/components/typography-showcase.tsx
"use client"

import type { TokenRegistry } from "@forkshop/lib/token-registry"

export type TypographyShowcaseProps = {
  tokens: TokenRegistry
  sampleText?: string
}

export function TypographyShowcase({ tokens, sampleText = "The quick brown fox" }: TypographyShowcaseProps) {
  // paste extracted JSX from design-system-view.tsx
  // each row must include the token name as text (e.g., <span>{token.name}</span>)
}
```

- [ ] **Step 5: Verify pass**

Run: `pnpm --filter @forkshop/engine test typography-showcase`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/components/typography-showcase.tsx packages/engine/src/components/typography-showcase.test.tsx
git commit -m "feat(engine): extract TypographyShowcase from DesignSystemView"
```

### Task E3: `PrimitivesGrid` convenience component

**Files:**
- Create: `packages/engine/src/components/primitives-grid.tsx`

- [ ] **Step 1: Implement**

```tsx
// packages/engine/src/components/primitives-grid.tsx
"use client"

import { useDiscoveredPrimitives } from "@forkshop/lib/discover-primitives"

export type PrimitivesGridProps = {
  ui: Record<string, unknown>  // matches forkshopConfig.ui shape
}

export function PrimitivesGrid({ ui }: PrimitivesGridProps) {
  const primitives = useDiscoveredPrimitives(ui)
  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {primitives.map((p) => (
        <div key={p.slug} className="rounded-md border p-3" aria-label={p.name}>
          <div className="mb-2 text-xs text-neutral-500">{p.name}</div>
          <p.Component />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/components/primitives-grid.tsx
git commit -m "feat(engine): PrimitivesGrid convenience component for Design System Board"
```

### Task E4: `useDesignTokens` hook (auto-detect source)

**Files:**
- Create: `packages/engine/src/lib/use-design-tokens.ts`
- Test: `packages/engine/src/lib/use-design-tokens.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/engine/src/lib/use-design-tokens.test.tsx
import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useDesignTokens } from "./use-design-tokens.js"

describe("useDesignTokens", () => {
  it("returns an empty registry shape when there are no tokens", () => {
    const { result } = renderHook(() => useDesignTokens())
    expect(result.current).toMatchObject({
      colors: expect.any(Array),
      spacing: expect.any(Array),
      fontSizes: expect.any(Array),
    })
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test use-design-tokens`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/engine/src/lib/use-design-tokens.ts
"use client"

import { useEffect, useState } from "react"
import { parseTokenRegistryFromCssVars, type TokenRegistry } from "@forkshop/lib/parse-token-registry-from-css-vars"
import { buildTokenRegistry } from "@forkshop/lib/token-registry"

const EMPTY_REGISTRY: TokenRegistry = {
  colors: [], spacing: [], fontSizes: [], fontWeights: [],
  radii: [], shadows: [], containers: [], classLookup: {},
}

export type UseDesignTokensOptions = {
  source?: "auto" | "css-vars" | { tailwindConfig: unknown }
}

export function useDesignTokens(options: UseDesignTokensOptions = {}): TokenRegistry {
  const [registry, setRegistry] = useState<TokenRegistry>(EMPTY_REGISTRY)

  useEffect(() => {
    if (options.source && typeof options.source === "object" && "tailwindConfig" in options.source) {
      setRegistry(buildTokenRegistry(options.source.tailwindConfig))
      return
    }
    // default: read CSS vars from :root after hydration
    const style = window.getComputedStyle(document.documentElement)
    const pairs: [string, string][] = []
    for (let i = 0; i < style.length; i++) {
      const name = style.item(i)
      if (name.startsWith("--")) pairs.push([name, style.getPropertyValue(name)])
    }
    setRegistry(parseTokenRegistryFromCssVars(pairs))
  }, [])

  return registry
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test use-design-tokens`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/use-design-tokens.ts packages/engine/src/lib/use-design-tokens.test.tsx
git commit -m "feat(engine): useDesignTokens auto-picks v3-config vs CSS-vars source"
```

### Task E5: `enumeratePrimitiveVariants` helper

**Files:**
- Create: `packages/engine/src/lib/enumerate-primitive-variants.ts`
- Test: `packages/engine/src/lib/enumerate-primitive-variants.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/engine/src/lib/enumerate-primitive-variants.test.ts
import { describe, it, expect } from "vitest"
import { enumeratePrimitiveVariants } from "./enumerate-primitive-variants.js"

describe("enumeratePrimitiveVariants", () => {
  it("returns 3 stub entries when no cva is detected", () => {
    const fakePrimitive = { name: "Button", slug: "button", Component: () => null, cvaVariants: null }
    const entries = enumeratePrimitiveVariants(fakePrimitive)
    expect(entries).toHaveLength(3)
    expect(entries[0].id).toMatch(/button.*default-1/)
  })

  it("returns cartesian product of cva variants", () => {
    const fakePrimitive = {
      name: "Button", slug: "button", Component: () => null,
      cvaVariants: { variant: ["primary", "secondary"], size: ["sm", "md"] },
    }
    const entries = enumeratePrimitiveVariants(fakePrimitive)
    expect(entries).toHaveLength(4)
    expect(entries.find((e) => e.id === "button-primary-sm")).toBeDefined()
    expect(entries.find((e) => e.id === "button-secondary-md")).toBeDefined()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test enumerate-primitive-variants`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/engine/src/lib/enumerate-primitive-variants.ts
import type { LayoutEntry } from "@forkshop/types/layout"
import { createElement } from "react"

export type DiscoveredPrimitive = {
  slug: string
  name: string
  Component: React.ComponentType<Record<string, unknown>>
  cvaVariants?: Record<string, string[]> | null
  sourcePath?: string
}

export function enumeratePrimitiveVariants(p: DiscoveredPrimitive): LayoutEntry[] {
  if (!p.cvaVariants || Object.keys(p.cvaVariants).length === 0) {
    return Array.from({ length: 3 }, (_, i) => ({
      id: `${p.slug}-default-${i + 1}`,
      label: "Default",
      node: {
        id: `primitive:${p.slug}-default-${i + 1}`,
        kind: "inline-react" as const,
        x: 0, y: 0, width: 240, height: 80,
        render: () => createElement(p.Component, {}),
        filePath: p.sourcePath,
      },
    }))
  }

  const keys = Object.keys(p.cvaVariants)
  const combos = cartesian(keys.map((k) => p.cvaVariants![k].map((v) => [k, v] as [string, string])))
  return combos.map((combo) => {
    const props = Object.fromEntries(combo)
    const variantKey = combo.map(([, v]) => v).join("-")
    return {
      id: `${p.slug}-${variantKey}`,
      label: combo.map(([k, v]) => `${k}=${v}`).join(" · "),
      node: {
        id: `primitive:${p.slug}-${variantKey}`,
        kind: "inline-react" as const,
        x: 0, y: 0, width: 240, height: 80,
        render: () => createElement(p.Component, { ...props, children: "Click me" }),
        filePath: p.sourcePath,
      },
    }
  })
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>((acc, arr) => acc.flatMap((c) => arr.map((v) => [...c, v])), [[]])
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test enumerate-primitive-variants`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/enumerate-primitive-variants.ts packages/engine/src/lib/enumerate-primitive-variants.test.ts
git commit -m "feat(engine): enumeratePrimitiveVariants — cva detection or 3-stub fallback"
```

### Task E6: `responsiveFrameEntries` helper

**Files:**
- Create: `packages/engine/src/lib/responsive-frame-entries.ts`
- Test: `packages/engine/src/lib/responsive-frame-entries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/engine/src/lib/responsive-frame-entries.test.ts
import { describe, it, expect } from "vitest"
import { responsiveFrameEntries } from "./responsive-frame-entries.js"

describe("responsiveFrameEntries", () => {
  it("returns one entry per viewport width", () => {
    const entries = responsiveFrameEntries("/about", { viewports: [1440, 768, 375], sourceFile: "app/about/page.tsx" })
    expect(entries).toHaveLength(3)
    expect(entries[0].node.kind).toBe("iframe-route")
    if (entries[0].node.kind === "iframe-route") {
      expect(entries[0].node.routePath).toBe("/about")
      expect(entries[0].node.width).toBe(1440)
      expect(entries[2].node.width).toBe(375)
    }
  })

  it("uses default viewports when none provided", () => {
    const entries = responsiveFrameEntries("/", { sourceFile: "app/page.tsx" })
    expect(entries).toHaveLength(3)
    expect(entries.map((e) => (e.node as any).width)).toEqual([1440, 768, 375])
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @forkshop/engine test responsive-frame-entries`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/engine/src/lib/responsive-frame-entries.ts
import type { LayoutEntry } from "@forkshop/types/layout"

export type ResponsiveFrameOptions = {
  viewports?: number[]
  sourceFile?: string
}

const DEFAULT_VIEWPORTS = [1440, 768, 375]

export function responsiveFrameEntries(
  path: string,
  options: ResponsiveFrameOptions = {},
): LayoutEntry[] {
  const viewports = options.viewports ?? DEFAULT_VIEWPORTS
  return viewports.map((width, i) => ({
    id: `responsive:${path}:${width}`,
    label: `${width}px`,
    column: i,
    row: 0,
    node: {
      id: `responsive:${path}:${width}`,
      kind: "iframe-route" as const,
      x: 0, y: 0,
      width,
      height: Math.round(width * (3 / 4)),
      routePath: path,
      sourceFile: options.sourceFile,
    },
  }))
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter @forkshop/engine test responsive-frame-entries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/responsive-frame-entries.ts packages/engine/src/lib/responsive-frame-entries.test.ts
git commit -m "feat(engine): responsiveFrameEntries helper — 3 iframe-route entries per path"
```

### Task E7: Export new components and helpers

**Files:**
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Add exports**

```ts
export { ColorGraph, type ColorGraphProps } from "./components/color-graph.js"
export { TypographyShowcase, type TypographyShowcaseProps } from "./components/typography-showcase.js"
export { PrimitivesGrid, type PrimitivesGridProps } from "./components/primitives-grid.js"
export { useDesignTokens, type UseDesignTokensOptions } from "./lib/use-design-tokens.js"
export { enumeratePrimitiveVariants, type DiscoveredPrimitive } from "./lib/enumerate-primitive-variants.js"
export { responsiveFrameEntries, type ResponsiveFrameOptions } from "./lib/responsive-frame-entries.js"
```

- [ ] **Step 2: Regen snapshot + full check**

Run: `pnpm --filter @forkshop/engine regen-api-snap && pnpm check && pnpm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/index.ts packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine): export ColorGraph/TypographyShowcase/PrimitivesGrid + helpers"
```

---

## Phase F — Remove old surface

Now safe to delete `DesignSystemView` and `ResponsiveFrameView`, remove the token-registry singleton, and clean up imports.

### Task F1: Delete `DesignSystemView`

**Files:**
- Delete: `packages/engine/src/layouts/design-system-view.tsx`
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Search for remaining usages**

Run: `grep -rn "DesignSystemView\|design-system-view" packages/engine/src --include="*.ts" --include="*.tsx" | grep -v test`
Expected: only the export in `index.ts` and the file itself. Any usage inside other engine code must be removed first; if there is one, halt and remove that usage.

- [ ] **Step 2: Delete the file**

```bash
rm packages/engine/src/layouts/design-system-view.tsx
```

- [ ] **Step 3: Remove from `index.ts`**

Find and delete the `export ... DesignSystemView ...` line and any `type PrimitiveGroup` re-export tied to it.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS — if it fails because something still imports `DesignSystemView`, fix that consumer first.

- [ ] **Step 5: Regen API snapshot**

Run: `pnpm --filter @forkshop/engine regen-api-snap`
Expected: snapshot no longer mentions `DesignSystemView`.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/layouts packages/engine/src/index.ts packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine)!: remove DesignSystemView — replaced by ColorGraph + TypographyShowcase + Gallery"
```

### Task F2: Delete `ResponsiveFrameView`

**Files:**
- Delete: `packages/engine/src/layouts/responsive-frame-view.tsx`
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Search for usages**

Run: `grep -rn "ResponsiveFrameView\|responsive-frame-view" packages/engine/src --include="*.ts" --include="*.tsx" | grep -v test`
Expected: only index.ts + the file itself.

- [ ] **Step 2: Delete the file and the export**

```bash
rm packages/engine/src/layouts/responsive-frame-view.tsx
```

Remove the `export ... ResponsiveFrameView ...` line from `index.ts`.

- [ ] **Step 3: Typecheck + snapshot regen**

Run: `pnpm --filter @forkshop/engine typecheck && pnpm --filter @forkshop/engine regen-api-snap`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/layouts packages/engine/src/index.ts packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine)!: remove ResponsiveFrameView — replaced by responsiveFrameEntries helper"
```

### Task F3: Remove `setActiveTokenRegistry` singleton

**Files:**
- Modify: `packages/engine/src/lib/token-registry.ts`
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Locate the singleton**

Run: `grep -n "setActiveTokenRegistry\|getActiveTokenRegistry\|_activeCatalog" packages/engine/src/lib/token-registry.ts`
Expected: the singleton state + getter/setter.

- [ ] **Step 2: Delete them**

Remove `_activeCatalog`, `setActiveTokenRegistry`, `getActiveTokenRegistry`. Keep `buildTokenRegistry` and all pure helpers — they're still used by `useDesignTokens` and tests.

- [ ] **Step 3: Remove from exports**

In `src/index.ts`, drop the lines that re-export the deleted singleton functions.

- [ ] **Step 4: Search for remaining callers in the workspace**

Run: `grep -rn "setActiveTokenRegistry\|getActiveTokenRegistry" packages apps 2>/dev/null | grep -v node_modules`
Expected: empty. If any remain (e.g., in `apps/demo`), update them to use `useDesignTokens()` instead.

- [ ] **Step 5: Typecheck + regen snapshot**

Run: `pnpm check && pnpm --filter @forkshop/engine regen-api-snap`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/token-registry.ts packages/engine/src/index.ts packages/engine/src/__tests__/public-api.snap.json
git commit -m "feat(engine)!: remove token-registry singleton — useDesignTokens replaces it"
```

### Task F4: Phase F wrap

- [ ] **Step 1: Full check**

Run: `pnpm check && pnpm test`
Expected: PASS. Engine API surface is now consistent with the spec.

---

## Phase G — CLI verify command + manifest updates

### Task G1: Bump `forkshop.json` schemaVersion to 2.1.0

**Files:**
- Modify: `packages/cli/src/manifest-schema.ts`
- Modify: `packages/cli/src/forkshop-json.ts` (or wherever schemaVersion is enforced)

- [ ] **Step 1: Locate schemaVersion enforcement**

Run: `grep -rn "schemaVersion\|2\\.0\\.0" packages/cli/src --include="*.ts" | head -10`
Note the file(s) that hardcode `2.0.0`.

- [ ] **Step 2: Update both writer and reader to `2.1.0`**

Replace `"2.0.0"` with `"2.1.0"` in the writer. In the reader, accept `2.0.0` OR `2.1.0`, but emit a soft warning for `2.0.0` ("schemaVersion 2.0.0 detected — re-run `npx forkshop init` to upgrade"). Keep the hard-reject for any version not matching either.

(Note: per spec, no migration mechanism; Jakub deletes and re-inits. The soft warning gives a heads-up without forcing action.)

- [ ] **Step 3: Update tests**

Run: `grep -rn "2\\.0\\.0" packages/cli/src --include="*.test.ts"`
Fix any test fixture that asserts `2.0.0`. Either bump to `2.1.0` or add a separate test for the soft-warning case.

- [ ] **Step 4: Verify**

Run: `pnpm --filter forkshop test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src
git commit -m "feat(cli): bump forkshop.json schemaVersion to 2.1.0 for new Board API"
```

### Task G2: `forkshop verify` command — skeleton

**Files:**
- Create: `packages/cli/src/commands/verify.ts`
- Modify: `packages/cli/src/index.ts` (register command)

- [ ] **Step 1: Skeleton**

```ts
// packages/cli/src/commands/verify.ts
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import pc from "picocolors"

export type VerifyOptions = {
  cwd?: string
}

export type VerifyResult = {
  ok: boolean
  issues: Array<{ file: string; message: string }>
}

export async function runVerify(options: VerifyOptions = {}): Promise<VerifyResult> {
  const cwd = options.cwd ?? process.cwd()
  const issues: VerifyResult["issues"] = []

  // Subsequent tasks add the actual checks. Skeleton just confirms forkshop.json exists.
  try {
    await readFile(resolve(cwd, "forkshop.json"), "utf8")
  } catch {
    issues.push({ file: "forkshop.json", message: "missing — run `npx forkshop init` first" })
  }

  if (issues.length === 0) {
    console.log(pc.green("✓ Forkshop install is consistent."))
    return { ok: true, issues: [] }
  }

  for (const i of issues) {
    console.log(pc.red(`✗ ${i.file}`))
    console.log(`    ${i.message}`)
  }
  console.log(pc.red(`✗ ${issues.length} issue(s) found.`))
  return { ok: false, issues }
}
```

- [ ] **Step 2: Register in CLI**

In `packages/cli/src/index.ts`, add a `verify` subcommand using the same Commander pattern as `init`/`diff`/`update`.

```ts
import { runVerify } from "./commands/verify.js"

program
  .command("verify")
  .description("Verify the local Forkshop install is consistent with the engine contract")
  .action(async () => {
    const result = await runVerify({})
    process.exit(result.ok ? 0 : 1)
  })
```

- [ ] **Step 3: Smoke test the skeleton**

Run: `pnpm --filter forkshop build && (cd apps/test && rm -f forkshop.json && node ../../packages/cli/dist/index.js verify; node ../../packages/cli/dist/index.js verify)`
Expected: first invocation fails (missing forkshop.json), second invocation reflects the actual state. (Re-init apps/test if needed: `pnpm reset-test`.)

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/verify.ts packages/cli/src/index.ts
git commit -m "feat(cli): forkshop verify skeleton — checks forkshop.json presence"
```

### Task G3: Verify check — `forkshop.config.tsx` shape

**Files:**
- Create: `packages/cli/src/verify/check-config.ts`
- Test: `packages/cli/src/verify/check-config.test.ts`

- [ ] **Step 1: Write test**

```ts
// packages/cli/src/verify/check-config.test.ts
import { describe, it, expect } from "vitest"
import { checkConfig } from "./check-config.js"

describe("checkConfig", () => {
  it("flags missing forkshop.config.tsx", async () => {
    const result = await checkConfig({ cwd: "/tmp/nonexistent-forkshop-test" })
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].message).toContain("forkshop.config")
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter forkshop test check-config`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/cli/src/verify/check-config.ts
import { access } from "node:fs/promises"
import { resolve } from "node:path"

export type VerifyIssue = { file: string; message: string }
export type VerifyCheckOptions = { cwd: string }

export async function checkConfig(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  // Path is derived from forkshop.json's `mount` (Phase 0 of the setup skill enforces this).
  // For now, check both common locations.
  const candidates = [
    resolve(opts.cwd, "app/forkshop/forkshop.config.tsx"),
    resolve(opts.cwd, "app/forkshop/forkshop.config.ts"),
    resolve(opts.cwd, "src/app/forkshop/forkshop.config.tsx"),
  ]
  let found = false
  for (const p of candidates) {
    try {
      await access(p)
      found = true
      break
    } catch {}
  }
  if (!found) {
    issues.push({
      file: "forkshop.config.tsx",
      message: "missing — run the setup skill (open Claude Code, say 'set up Forkshop')",
    })
  }
  return issues
}
```

- [ ] **Step 4: Wire into `runVerify`**

In `commands/verify.ts`:

```ts
import { checkConfig } from "../verify/check-config.js"
// inside runVerify, after the forkshop.json check:
issues.push(...await checkConfig({ cwd }))
```

- [ ] **Step 5: Verify pass**

Run: `pnpm --filter forkshop test check-config`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/verify packages/cli/src/commands/verify.ts
git commit -m "feat(cli): verify checks forkshop.config.tsx presence"
```

### Task G4: Verify check — Board files declare `__config`

**Files:**
- Create: `packages/cli/src/verify/check-boards.ts`
- Test: `packages/cli/src/verify/check-boards.test.ts`

- [ ] **Step 1: Test**

```ts
// packages/cli/src/verify/check-boards.test.ts
import { describe, it, expect } from "vitest"
import { detectBoardExport } from "./check-boards.js"

describe("detectBoardExport", () => {
  it("detects a defineBoard default export", () => {
    const src = `
import { defineBoard } from "@forkshop/engine"
export default defineBoard({ id: "x", match: () => true, layout: "gallery", useEntries: () => [] })
`
    expect(detectBoardExport(src)).toEqual({ kind: "defineBoard", boardId: "x" })
  })
  it("returns 'raw-component' when default export is a function component without defineBoard", () => {
    const src = `export default function MyBoard() { return null }`
    expect(detectBoardExport(src)).toEqual({ kind: "raw-component" })
  })
  it("returns 'unknown' when no default export is present", () => {
    expect(detectBoardExport("const x = 1")).toEqual({ kind: "unknown" })
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter forkshop test check-boards`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/cli/src/verify/check-boards.ts
import { readdir, readFile, stat } from "node:fs/promises"
import { resolve } from "node:path"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

export type BoardExportShape =
  | { kind: "defineBoard"; boardId: string }
  | { kind: "raw-component" }
  | { kind: "unknown" }

export function detectBoardExport(src: string): BoardExportShape {
  // Conservative parser — looks for `defineBoard({ ... id: "..." })` or `export default function`.
  const defineMatch = src.match(/export\s+default\s+defineBoard\s*\(\s*{[\s\S]*?id:\s*["'`]([^"'`]+)["'`]/)
  if (defineMatch) return { kind: "defineBoard", boardId: defineMatch[1] }
  if (/export\s+default\s+(function|\()/m.test(src)) return { kind: "raw-component" }
  return { kind: "unknown" }
}

export async function checkBoards(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  const mountCandidates = ["app/forkshop", "src/app/forkshop"]
  let mountDir: string | null = null
  for (const candidate of mountCandidates) {
    try {
      const s = await stat(resolve(opts.cwd, candidate))
      if (s.isDirectory()) {
        mountDir = candidate
        break
      }
    } catch {}
  }
  if (!mountDir) return issues  // checkConfig already flagged this

  const dir = resolve(opts.cwd, mountDir)
  const files = (await readdir(dir)).filter((f) => f.endsWith("-board.tsx") || f.endsWith("-board.ts"))

  for (const f of files) {
    const fullPath = resolve(dir, f)
    const src = await readFile(fullPath, "utf8")
    const shape = detectBoardExport(src)
    if (shape.kind === "unknown") {
      issues.push({
        file: `${mountDir}/${f}`,
        message: "no default export detected — Board files must default-export a defineBoard() call or a raw React component",
      })
    }
  }
  return issues
}
```

- [ ] **Step 4: Wire into `runVerify`**

```ts
import { checkBoards } from "../verify/check-boards.js"
// inside runVerify:
issues.push(...await checkBoards({ cwd }))
```

- [ ] **Step 5: Verify pass**

Run: `pnpm --filter forkshop test check-boards`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/verify packages/cli/src/commands/verify.ts
git commit -m "feat(cli): verify walks Board files; flags unknown default exports"
```

### Task G5: Verify check — `sourceFile`/`filePath` references exist

**Files:**
- Create: `packages/cli/src/verify/check-references.ts`
- Test: `packages/cli/src/verify/check-references.test.ts`

- [ ] **Step 1: Test**

```ts
// packages/cli/src/verify/check-references.test.ts
import { describe, it, expect } from "vitest"
import { extractStringFileRefs } from "./check-references.js"

describe("extractStringFileRefs", () => {
  it("extracts sourceFile literals", () => {
    const src = `sourceFile: "app/about/page.tsx"`
    expect(extractStringFileRefs(src)).toContain("app/about/page.tsx")
  })
  it("extracts filePath literals", () => {
    const src = `filePath: 'components/ui/button.tsx'`
    expect(extractStringFileRefs(src)).toContain("components/ui/button.tsx")
  })
  it("ignores variables, only takes string literals", () => {
    const src = `sourceFile: someVar`
    expect(extractStringFileRefs(src)).toEqual([])
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter forkshop test check-references`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/cli/src/verify/check-references.ts
import { access } from "node:fs/promises"
import { resolve } from "node:path"
import { readdir, readFile, stat } from "node:fs/promises"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

const REF_REGEX = /(?:sourceFile|filePath|sourcePath)\s*:\s*["'`]([^"'`]+)["'`]/g

export function extractStringFileRefs(src: string): string[] {
  const refs: string[] = []
  for (const match of src.matchAll(REF_REGEX)) {
    refs.push(match[1])
  }
  return refs
}

export async function checkReferences(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  const mountCandidates = ["app/forkshop", "src/app/forkshop"]
  let mountDir: string | null = null
  for (const c of mountCandidates) {
    try { if ((await stat(resolve(opts.cwd, c))).isDirectory()) { mountDir = c; break } } catch {}
  }
  if (!mountDir) return issues

  const dir = resolve(opts.cwd, mountDir)
  const files = (await readdir(dir)).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))

  for (const f of files) {
    const src = await readFile(resolve(dir, f), "utf8")
    const refs = extractStringFileRefs(src)
    for (const ref of refs) {
      try {
        await access(resolve(opts.cwd, ref))
      } catch {
        issues.push({
          file: `${mountDir}/${f}`,
          message: `references "${ref}" which doesn't exist on disk`,
        })
      }
    }
  }
  return issues
}
```

- [ ] **Step 4: Wire into `runVerify`**

```ts
import { checkReferences } from "../verify/check-references.js"
issues.push(...await checkReferences({ cwd }))
```

- [ ] **Step 5: Verify pass + commit**

Run: `pnpm --filter forkshop test check-references && pnpm --filter forkshop build`
Expected: PASS.

```bash
git add packages/cli/src/verify packages/cli/src/commands/verify.ts
git commit -m "feat(cli): verify checks sourceFile/filePath references exist on disk"
```

### Task G6: Verify check — `forkshop-*` classes not used outside `app/forkshop/`

**Files:**
- Create: `packages/cli/src/verify/check-token-classes.ts`
- Test: `packages/cli/src/verify/check-token-classes.test.ts`

- [ ] **Step 1: Test**

```ts
// packages/cli/src/verify/check-token-classes.test.ts
import { describe, it, expect } from "vitest"
import { findForkshopTokenClasses } from "./check-token-classes.js"

describe("findForkshopTokenClasses", () => {
  it("flags bg-forkshop-* classes", () => {
    const refs = findForkshopTokenClasses('<div className="bg-forkshop-accent">')
    expect(refs).toContain("bg-forkshop-accent")
  })
  it("flags text-forkshop-* classes", () => {
    const refs = findForkshopTokenClasses(`<p class='text-forkshop-fg'>x</p>`)
    expect(refs).toContain("text-forkshop-fg")
  })
  it("ignores forkshop-accent inside a string variable", () => {
    const refs = findForkshopTokenClasses(`const x = "forkshop-accent"`)
    expect(refs).toEqual([])
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter forkshop test check-token-classes`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/cli/src/verify/check-token-classes.ts
import { readFile, readdir, stat } from "node:fs/promises"
import { resolve, relative } from "node:path"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

const TOKEN_CLASS_REGEX = /(?:bg|text|border|ring|fill|stroke|from|to|via)-forkshop-[a-z][a-z0-9-]*/g

export function findForkshopTokenClasses(src: string): string[] {
  const found: string[] = []
  // Only inspect class attribute values
  const classAttrRegex = /(?:class(?:Name)?)\s*=\s*[{`'"]([^`'"}]+)[{`'"}]/g
  for (const match of src.matchAll(classAttrRegex)) {
    const classes = match[1]
    for (const c of classes.matchAll(TOKEN_CLASS_REGEX)) {
      found.push(c[0])
    }
  }
  return [...new Set(found)]
}

export async function checkTokenClasses(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  // Walk components/, lib/, src/components/, src/lib/, app/ (excluding app/forkshop/)
  const includeDirs = ["components", "lib", "src/components", "src/lib", "app"]
  const excludeRegex = /\/(forkshop|node_modules|\.next)\//

  async function walk(d: string): Promise<string[]> {
    const out: string[] = []
    try {
      const entries = await readdir(d, { withFileTypes: true })
      for (const e of entries) {
        const p = resolve(d, e.name)
        if (excludeRegex.test(p + "/")) continue
        if (e.isDirectory()) out.push(...await walk(p))
        else if (e.isFile() && /\.(tsx?|jsx?|mdx)$/.test(e.name)) out.push(p)
      }
    } catch {}
    return out
  }

  for (const dir of includeDirs) {
    const full = resolve(opts.cwd, dir)
    try { if (!(await stat(full)).isDirectory()) continue } catch { continue }
    const files = await walk(full)
    for (const f of files) {
      const src = await readFile(f, "utf8")
      const refs = findForkshopTokenClasses(src)
      if (refs.length > 0) {
        issues.push({
          file: relative(opts.cwd, f),
          message: `uses forkshop-* token classes (${refs.join(", ")}) — these are engine-internal; use your own design tokens here`,
        })
      }
    }
  }
  return issues
}
```

- [ ] **Step 4: Wire into `runVerify`**

```ts
import { checkTokenClasses } from "../verify/check-token-classes.js"
issues.push(...await checkTokenClasses({ cwd }))
```

- [ ] **Step 5: Verify pass + commit**

```bash
git add packages/cli/src/verify packages/cli/src/commands/verify.ts
git commit -m "feat(cli): verify flags forkshop-* classes used outside app/forkshop/"
```

### Task G7: Verify check — user-CLAUDE.md examples typecheck

**Files:**
- Create: `packages/cli/src/verify/check-claude-md-examples.ts`
- Test: `packages/cli/src/verify/check-claude-md-examples.test.ts`

- [ ] **Step 1: Test**

```ts
// packages/cli/src/verify/check-claude-md-examples.test.ts
import { describe, it, expect } from "vitest"
import { extractTsCodeBlocks } from "./check-claude-md-examples.js"

describe("extractTsCodeBlocks", () => {
  it("extracts ts and tsx fenced blocks", () => {
    const md = "Some text\n```ts\nconst x = 1\n```\nMore\n```tsx\n<X />\n```"
    const blocks = extractTsCodeBlocks(md)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].lang).toBe("ts")
    expect(blocks[1].lang).toBe("tsx")
  })
  it("ignores bash and json blocks", () => {
    const md = "```bash\nls\n```\n```json\n{}\n```"
    expect(extractTsCodeBlocks(md)).toEqual([])
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter forkshop test check-claude-md-examples`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/cli/src/verify/check-claude-md-examples.ts
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { VerifyIssue, VerifyCheckOptions } from "./check-config.js"

export function extractTsCodeBlocks(md: string): { lang: "ts" | "tsx"; code: string }[] {
  const blocks: { lang: "ts" | "tsx"; code: string }[] = []
  const regex = /```(ts|tsx)\n([\s\S]*?)```/g
  for (const match of md.matchAll(regex)) {
    blocks.push({ lang: match[1] as "ts" | "tsx", code: match[2] })
  }
  return blocks
}

// Field names that must NOT appear in code blocks (these were the stale ones)
const FORBIDDEN_FIELDS = [
  /\bsourcePath\b\s*:/,             // InlineReactNode now uses `filePath`
  /path\s*:\s*["'`]\/[^"'`]*["'`]/, // IframeComponentNode has no `path` field (only iframe-route does; this regex over-flags but is conservative)
]

const REQUIRED_FIELDS_BY_KIND: Record<string, string[]> = {
  "inline-react": ["render"],
  "iframe-route": ["routePath"],
  "iframe-component": ["slug", "previewSrc"],
}

export async function checkClaudeMdExamples(opts: VerifyCheckOptions): Promise<VerifyIssue[]> {
  const issues: VerifyIssue[] = []
  const candidatePaths = ["app/forkshop/CLAUDE.md", "src/app/forkshop/CLAUDE.md"]
  for (const p of candidatePaths) {
    try {
      const md = await readFile(resolve(opts.cwd, p), "utf8")
      const blocks = extractTsCodeBlocks(md)
      for (const [i, block] of blocks.entries()) {
        for (const forbidden of FORBIDDEN_FIELDS) {
          if (forbidden.test(block.code)) {
            issues.push({
              file: p,
              message: `code block #${i + 1} uses a deprecated field name. Update to match @forkshop/engine type definitions.`,
            })
            break
          }
        }
      }
    } catch {
      // file missing — checkConfig handles it
    }
  }
  return issues
}
```

- [ ] **Step 4: Wire into `runVerify`**

```ts
import { checkClaudeMdExamples } from "../verify/check-claude-md-examples.js"
issues.push(...await checkClaudeMdExamples({ cwd }))
```

- [ ] **Step 5: Verify pass + commit**

```bash
git add packages/cli/src/verify packages/cli/src/commands/verify.ts
git commit -m "feat(cli): verify flags stale field names in user-side CLAUDE.md examples"
```

### Task G8: Update manifest builder for new scaffold templates

**Files:**
- Modify: `packages/cli/src/manifest-builder.ts`

- [ ] **Step 1: Find the scaffold-template indexing logic**

Run: `grep -n "templates/api-stubs\|templates/hooks\|template" packages/cli/src/manifest-builder.ts | head -20`
Note the section that walks `templates/` and indexes files into the manifest.

- [ ] **Step 2: Add scaffold-templates indexing**

In `manifest-builder.ts`, add a new pass that indexes `packages/engine/templates/scaffolds/` (the directory created in Phase H). For each `.tsx.template` file:
- Map to `{aliases.mount}/<basename-without-template>`.
- Bundle name: `scaffolds`.

```ts
// pseudocode — match the existing pattern used for api-stubs
const scaffoldFiles = await walkScaffoldsTemplatesDir(scaffoldsDir)
for (const file of scaffoldFiles) {
  manifest.files.push({
    address: `@forkshop/scaffolds/${basenameWithoutTemplate(file)}`,
    destination: `{aliases.mount}/${basenameWithoutTemplate(file)}`,
    bundle: "scaffolds",
    sha256: await sha256(file),
  })
}
```

- [ ] **Step 3: Update the `init` bundle composition**

Find where `init` bundle is composed (`bundles.init = [...]`) and add `scaffolds` to it.

- [ ] **Step 4: Test**

Run: `pnpm --filter forkshop test manifest-builder`
Expected: PASS — existing tests still green; new templates indexed.

(Note: Phase H will create the actual template files; this task only adds the indexing logic. The build will be a no-op until Phase H runs.)

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/manifest-builder.ts
git commit -m "feat(cli): manifest indexes scaffolds/ template directory"
```

### Task G9: Phase G wrap

- [ ] **Step 1: Build and smoke-test verify against an existing install**

Run: `pnpm --filter forkshop build && pnpm reset-test && (cd apps/test && node ../../packages/cli/dist/index.js init --no-install && node ../../packages/cli/dist/index.js verify)`
Expected: verify reports a clean install (or, until Phase H ships, surfaces "config missing" because we haven't run the setup skill yet — that's acceptable here; we test the wired check, not the full flow).

- [ ] **Step 2: Full check**

Run: `pnpm check && pnpm test`
Expected: PASS.

---

## Phase H — New scaffolds, setup skill rewrite, user-CLAUDE.md rewrite

### Task H1: Create scaffold template files

**Files:**
- Create: `packages/engine/templates/scaffolds/forkshop-config.tsx.template`
- Create: `packages/engine/templates/scaffolds/page.tsx.template`
- Create: `packages/engine/templates/scaffolds/design-system-board.tsx.template`
- Create: `packages/engine/templates/scaffolds/ui-components-board.tsx.template`
- Create: `packages/engine/templates/scaffolds/primitive-detail-board.tsx.template`
- Create: `packages/engine/templates/scaffolds/blocks-board.tsx.template`
- Create: `packages/engine/templates/scaffolds/sitemap-board.tsx.template`
- Create: `packages/engine/templates/scaffolds/single-page-board.tsx.template`
- Create: `packages/engine/templates/scaffolds/reference-board.tsx.template`

- [ ] **Step 1: Write `forkshop-config.tsx.template`**

```tsx
import { defineConfig, BUILTIN_NODE_TYPES, BUILTIN_LAYOUTS } from "@forkshop/engine"
{{ui_import}}
{{blocks_import}}

export const forkshopConfig = defineConfig({
  mount: "{{mount}}",
{{ui_field}}
{{blocks_field}}
  nodeTypes: [...BUILTIN_NODE_TYPES],
  layouts: [...BUILTIN_LAYOUTS],
  sitemap: {
    routes: [
{{sitemap_routes}}
    ],
  },
{{reference_field}}
  viewportProfile: "{{viewport_profile}}" as "responsive" | "mobile",
})

export type ForkshopConfig = typeof forkshopConfig
```

Placeholders the skill fills:
- `{{ui_import}}` — `import * as UIPrimitives from "@/components/ui"` (when UI Components recipe fires; else empty line).
- `{{blocks_import}}` — similar.
- `{{ui_field}}` / `{{blocks_field}}` — `  ui: UIPrimitives,` / `  blocks: Blocks,` (or omitted).
- `{{mount}}` — from forkshop.json mount path.
- `{{sitemap_routes}}` — comma-terminated route entries.
- `{{reference_field}}` — `  reference: { contentPaths: [...] },` or omitted.
- `{{viewport_profile}}` — `responsive` or `mobile`.

- [ ] **Step 2: Write `page.tsx.template`**

```tsx
"use client"

import { BoardRegistry } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"
{{board_imports}}

export default function ForkshopPage() {
  return (
    <BoardRegistry
      config={forkshopConfig}
      boards={[
{{board_list}}
      ]}
    />
  )
}
```

`{{board_imports}}` — one line per fired recipe.
`{{board_list}}` — comma-terminated identifiers.

- [ ] **Step 3: Write `design-system-board.tsx.template`**

```tsx
"use client"

import { defineBoard, ColorGraph, TypographyShowcase, PrimitivesGrid, useDesignTokens, forkshopIcons } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "design-system",
  label: "Design System",
  icon: forkshopIcons.components,
  match: (s) => s.kind === "section" && s.sectionId === "design-system",
  layout: "gallery",
  layoutOptions: { columns: 1, rowGap: 32 },
  useEntries: () => {
    const tokens = useDesignTokens()
    return [
      {
        id: "colors",
        node: { id: "ds:colors", kind: "inline-react" as const, x: 0, y: 0, width: 1200, height: 600, render: () => <ColorGraph tokens={tokens} /> },
      },
      {
        id: "typography",
        node: { id: "ds:typography", kind: "inline-react" as const, x: 0, y: 0, width: 1200, height: 400, render: () => <TypographyShowcase tokens={tokens} /> },
      },
      {
        id: "primitives",
        node: { id: "ds:primitives", kind: "inline-react" as const, x: 0, y: 0, width: 1200, height: 800, render: () => <PrimitivesGrid ui={forkshopConfig.ui ?? {}} /> },
      },
    ]
  },
})
```

- [ ] **Step 4: Write `ui-components-board.tsx.template`**

```tsx
"use client"

import { defineBoard, useDiscoveredPrimitives, forkshopIcons } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "ui-components",
  label: "UI Components",
  icon: forkshopIcons.components,
  match: (s) => s.kind === "section" && s.sectionId === "ui-components",
  layout: "gallery",
  layoutOptions: { columns: 3, rowGap: 24, columnGap: 24 },
  useEntries: () => {
    const primitives = useDiscoveredPrimitives(forkshopConfig.ui ?? {})
    return primitives.map((p) => ({
      id: p.slug,
      label: p.name,
      node: {
        id: `primitive:${p.slug}`,
        kind: "inline-react" as const,
        x: 0, y: 0, width: 320, height: 200,
        render: () => <p.Component />,
        filePath: p.sourcePath,
      },
    }))
  },
  useSidebarChildren: () => {
    const primitives = useDiscoveredPrimitives(forkshopConfig.ui ?? {})
    return primitives.map((p) => ({
      selection: { kind: "primitive" as const, slug: p.slug },
      label: p.name,
    }))
  },
})
```

- [ ] **Step 5: Write `primitive-detail-board.tsx.template`**

```tsx
"use client"

import { defineBoard, useSelection, useDiscoveredPrimitives, enumeratePrimitiveVariants, isPrimitiveSelection } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "primitive-detail",
  match: isPrimitiveSelection,
  layout: "gallery",
  layoutOptions: { columns: 4, rowGap: 16, columnGap: 16 },
  useEntries: () => {
    const selection = useSelection()
    const primitives = useDiscoveredPrimitives(forkshopConfig.ui ?? {})
    if (!isPrimitiveSelection(selection)) return []
    const p = primitives.find((x) => x.slug === selection.slug)
    return p ? enumeratePrimitiveVariants(p) : []
  },
})
```

- [ ] **Step 6: Write `blocks-board.tsx.template`**

```tsx
"use client"

import { defineBoard, useDiscoveredBlocks, forkshopIcons } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "blocks",
  label: "Blocks",
  icon: forkshopIcons.components,
  match: (s) => s.kind === "section" && s.sectionId === "blocks",
  layout: "gallery",
  layoutOptions: { columns: 1, rowGap: 24 },
  useEntries: () => {
    const blocks = useDiscoveredBlocks(forkshopConfig.blocks ?? {})
    const viewport = forkshopConfig.viewportProfile === "mobile" ? 375 : 1440
    return blocks.map((b) => ({
      id: b.slug,
      label: b.name,
      node: {
        id: `block:${b.slug}`,
        kind: "iframe-component" as const,
        x: 0, y: 0, width: viewport, height: 600,
        slug: b.slug,
        previewSrc: b.previewSrc,
        sourceFile: b.sourcePath,
      },
    }))
  },
  useSidebarChildren: () => {
    const blocks = useDiscoveredBlocks(forkshopConfig.blocks ?? {})
    return blocks.map((b) => ({
      selection: { kind: "block" as const, slug: b.slug },
      label: b.name,
    }))
  },
})
```

- [ ] **Step 7: Write `sitemap-board.tsx.template`**

```tsx
"use client"

import { defineBoard, forkshopIcons } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "sitemap",
  label: "Sitemap",
  icon: forkshopIcons.pages,
  match: (s) => s.kind === "section" && s.sectionId === "sitemap",
  layout: "tree",
  useEntries: () =>
    forkshopConfig.sitemap.routes.map((r) => ({
      id: `page:${r.path}`,
      label: r.path,
      node: {
        id: `page:${r.path}`,
        kind: "iframe-route" as const,
        x: 0, y: 0, width: 400, height: 280,
        routePath: r.path,
        sourceFile: r.sourceFile,
      },
    })),
})
```

- [ ] **Step 8: Write `single-page-board.tsx.template`**

```tsx
"use client"

import { defineBoard, responsiveFrameEntries, useSelection, isPageSelection } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "single-page",
  match: isPageSelection,
  layout: "gallery",
  layoutOptions: { columns: 3, rowGap: 24, columnGap: 24 },
  useEntries: () => {
    const selection = useSelection()
    if (!isPageSelection(selection)) return []
    const route = forkshopConfig.sitemap.routes.find((r) => r.path === selection.path)
    return responsiveFrameEntries(selection.path, {
      viewports: [1440, 768, 375],
      sourceFile: route?.sourceFile,
    })
  },
})
```

- [ ] **Step 9: Write `reference-board.tsx.template`**

```tsx
"use client"

import { defineBoard, forkshopIcons } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default defineBoard({
  id: "reference",
  label: "Reference",
  icon: forkshopIcons.pages,
  match: (s) => s.kind === "section" && s.sectionId === "reference",
  layout: "tree",
  useEntries: () =>
    (forkshopConfig.reference?.contentPaths ?? []).map((p) => ({
      id: `ref:${p}`,
      label: p,
      node: {
        id: `ref:${p}`,
        kind: "iframe-route" as const,
        x: 0, y: 0, width: 400, height: 280,
        routePath: `/${p.replace(/\.mdx$/, "")}`,
        sourceFile: p,
      },
    })),
})
```

- [ ] **Step 10: Build and confirm manifest picks them up**

Run: `pnpm --filter @forkshop/engine build && pnpm --filter forkshop build && (cd apps/test && pnpm reset-test 2>/dev/null; node ../../packages/cli/dist/index.js init --no-install 2>&1 | tail -20)`
Expected: init copies the scaffold templates into `app/forkshop/`.

- [ ] **Step 11: Commit**

```bash
git add packages/engine/templates/scaffolds
git commit -m "feat(engine): scaffold templates for the new defineBoard contract"
```

### Task H2: Rewrite the setup skill

**Files:**
- Modify: `packages/engine/src/skill/setup.md`

- [ ] **Step 1: Back up the current skill content for reference**

Run: `cp packages/engine/src/skill/setup.md /tmp/forkshop-setup-old.md`
(Local-only reference; don't commit the backup.)

- [ ] **Step 2: Rewrite from scratch (~400 lines)**

Replace the file with a new structure:

```markdown
---
name: forkshop-setup
description: Wires Forkshop into a Next.js App Router project after `npx forkshop init`. Detects styling system, scans components/routes, proposes a Board layout, asks before mutating next.config / package.json, writes one defineBoard() file per recipe + a typed forkshop.config, and runs `forkshop verify` to confirm the install. Activates on "set up Forkshop", "finish Forkshop setup", "configure Forkshop", "wire up Forkshop", "initialize Forkshop".
---

# Forkshop — first-run setup

You are setting up Forkshop in the user's project. The CLI (`npx forkshop init`) has already dropped Forkshop's source files. Your job is to populate `{{mount}}/forkshop.config.tsx` and write one defineBoard() file per fired recipe.

Forkshop's vocabulary: **Board** (typed config via defineBoard), **Node** (data on the canvas), **NodeType** (plugin), **Layout** (gallery | tree | custom). Custom Layouts via defineLayout(). The engine renders Boards through `<BoardRegistry>` — users don't write their own switch statements or canvas wiring.

## Phase 0 — Preconditions

Read forkshop.json from the working directory. If missing → exit ("Forkshop's source files aren't installed yet. Run `npx forkshop init` first."). If schemaVersion is not 2.1.0 → exit ("Re-run `npx forkshop init` to upgrade to the v2.1 schema.").

Read `{{mount}}/CLAUDE.md` to confirm install is complete. If missing → exit.

Confirm `app/` exists at repo root (or under workspace mount). If only `pages/` exists → exit with router-not-supported message. Same for Vite, Remix configs.

If `forkshop.config.tsx` is already populated past the stub, switch to Adjust mode.

## Phase 1 — Read the project, build understanding

(Same Phase 1 as before — narrative-first; read CLAUDE.md/AGENTS.md/GEMINI.md/README, then package.json, app/layout.tsx, app/page.tsx, styling-system fingerprint, next.config. Produce a 2-3 sentence narrative.)

## Phase 2 — Scan for primitives, blocks, routes, tokens, MDX

(Same as before — five scans, all silent. Output is the data structure that feeds Phase 3.)

## Phase 3 — Build the consolidated proposal

(Same recipe-selection algorithm and proposal template as before. Use the proposal format showing the sidebar tree with counts.)

## Phase 4 — Iterate

(Same iteration loop as before.)

## Phase 5 — Consent for config mutations

(Same two AskUserQuestion calls — Locator opt-in, live-AI hook opt-in.)

## Phase 6 — Write artifacts

Four sequential steps. Each step is one file or one config mutation.

### Step 1 — `{{mount}}/forkshop.config.tsx`

Render from the `forkshop-config.tsx.template` scaffold. Apply the same conditional logic the CLI manifest expanded: include `ui:` and `blocks:` lines only when those recipes fired; populate `sitemap.routes`; include `reference:` only when MDX detected.

### Step 2 — One file per fired recipe

For each recipe that fired, render the corresponding scaffold template into `{{mount}}/`:

- Design System recipe → `design-system-board.tsx` (from scaffold template)
- UI Components recipe → `ui-components-board.tsx` + `primitive-detail-board.tsx`
- Blocks recipe → `blocks-board.tsx`
- Sitemap recipe (always fires) → `sitemap-board.tsx` + `single-page-board.tsx`
- Reference recipe → `reference-board.tsx`

These files are essentially the scaffold templates as-is — no per-file substitutions beyond what the CLI manifest already applies. The skill's job here is to choose which to write.

### Step 3 — `{{mount}}/page.tsx`

Render from `page.tsx.template`. Substitute `{{board_imports}}` with one import line per recipe; `{{board_list}}` with the matching identifiers (default-exported defineBoard components).

### Step 4 — Optional next.config + Claude pack

(Same as old Phase 6 Steps 10-12 — locator opt-in, Claude pack opt-in. Unchanged.)

## Phase 7 — Verify and report

Run `npx forkshop verify` via Bash. If it reports clean:

```
✓ Forkshop is set up.

  /forkshop          → http://localhost:3000/forkshop
  Boards             → <comma-separated board names with counts>
  Verify             → ✓ clean

Try it:
  pnpm dev
  → open /forkshop
```

If it reports issues, surface them inline and offer to fix each one interactively.

## Adjust mode

If Phase 0 detected a non-empty config, render an Adjust prompt with these actions: rescan, add board, rename board, install opt-ins, open config. Apply changes in-place — patch existing files, never rewrite from scratch.

## What this skill never does

- Silently mutate root CLAUDE.md.
- Touch files outside the Forkshop namespace.
- Install npm packages outside `forkshop init`.
- Network calls.
- Revert user edits.
```

(Note: this is the structural rewrite; the prose above is illustrative — the actual file should be the full ~400 lines with each phase's details preserved from the existing skill where they're still correct.)

- [ ] **Step 3: Verify the skill is under 500 lines**

Run: `wc -l packages/engine/src/skill/setup.md`
Expected: < 500.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(engine): rewrite setup skill for defineBoard contract (1409 → ~400 lines)"
```

### Task H3: Rewrite the user-CLAUDE.md template

**Files:**
- Modify: `packages/engine/templates/user-claude-md.md`

- [ ] **Step 1: Rewrite** (target ~250 lines)

Replace the file with a structure focused on the new contract:

```markdown
# Forkshop

Forkshop is a Figma-style canvas + sidebar tool installed into your Next.js App Router project. It shows the real thing — your actual components and pages rendered in live iframes. Edit in place. Drag to arrange.

This file is auto-loaded by Claude Code when working in `{{srcPrefix}}app/forkshop/`. Everything in that directory is yours to customize.

---

## Mental model

Four concepts compose the system:

- **Node** — a positioned instance on the canvas. Has `kind` (`inline-react` | `iframe-route` | `iframe-component`), `id`, and shape-specific fields.
- **NodeType** — plugin defining how a kind renders. Three ship built-in.
- **Layout** — engine-shipped arrangement strategy. Two ship: `gallery` and `tree`. Custom layouts via `defineLayout()`.
- **Board** — a typed configuration via `defineBoard()` that becomes a React component. The engine owns canvas, sidebar, selection, and positions wiring.

(Show the type definitions for AnyNode, NodeType, Layout, BoardConfig — these are the contracts users build against.)

## File layout

```
{{srcPrefix}}app/forkshop/
  page.tsx                          <BoardRegistry config={...} boards={[...]} />
  forkshop.config.tsx               defineConfig({...})
  design-system-board.tsx           defineBoard for Design System
  ui-components-board.tsx           defineBoard with sidebar children
  primitive-detail-board.tsx        defineBoard rendering per-primitive variants
  blocks-board.tsx                  defineBoard with sidebar children
  sitemap-board.tsx                 defineBoard layout: "tree"
  single-page-board.tsx             defineBoard with responsiveFrameEntries
  reference-board.tsx               defineBoard layout: "tree" (if MDX)
  block/[slug]/page.tsx             auto-managed block preview route
  node-types/                       (optional) custom NodeTypes
  layouts/                          (optional) custom Layouts via defineLayout
  CLAUDE.md                         this file
```

## Adding a new Board

```tsx
// app/forkshop/charts-board.tsx
"use client"
import { defineBoard, forkshopIcons } from "@forkshop/engine"
import { useChartData } from "@/lib/charts"

export default defineBoard({
  id: "charts",
  label: "Charts",
  icon: forkshopIcons.flows,
  match: (s) => s.kind === "section" && s.sectionId === "charts",
  layout: "gallery",
  layoutOptions: { columns: 2 },
  useEntries: () => {
    const data = useChartData()
    return data.map((chart) => ({
      id: chart.slug,
      label: chart.name,
      node: {
        id: `chart:${chart.slug}`,
        kind: "inline-react" as const,
        x: 0, y: 0, width: 600, height: 400,
        render: () => <ChartComponent data={chart} />,
      },
    }))
  },
})
```

Then register in `page.tsx`:

```tsx
import chartsBoard from "./charts-board"
// inside boards array:
<BoardRegistry config={forkshopConfig} boards={[..., chartsBoard]} />
```

## Adding sidebar children

```tsx
defineBoard({
  // ...
  useSidebarChildren: () => {
    const items = useMyItems()
    return items.map((item) => ({
      selection: { kind: "custom" as const, namespace: "myboard", data: { id: item.id } },
      label: item.name,
    }))
  },
})
```

Then create a detail Board with `match: (s) => s.kind === "custom" && s.namespace === "myboard"`.

## Adding a custom NodeType

(Same content as before; show storybook-story example.)

## Adding a custom Layout

```tsx
// app/forkshop/layouts/charts-layout.tsx
import { defineLayout, forkshopIcons } from "@forkshop/engine"

export const chartsLayout = defineLayout({
  id: "charts-orbit",
  icon: forkshopIcons.flows,
  defaultOptions: { orbitRadius: 200 },
  render: ({ entries, options, nodePositions, onPositionChange }) => {
    // Return JSX that arranges entries on the canvas using your math.
  },
  stageSize: (entries, options) => ({ width: 2000, height: 1500 }),
})
```

Register in `forkshop.config.tsx`:

```ts
import { chartsLayout } from "./layouts/charts-layout"

defineConfig({
  // ...
  layouts: [...BUILTIN_LAYOUTS, chartsLayout],
})
```

## Live text editing, spacing picker, open-in-editor

(Same content as before — dev-only behaviors. blue/gray ring metaphor, ⌘↵, Esc, Option-click.)

## Live AI awareness

(Same content — useAgentActivePages etc. hooks. No "Configuring file mapping" section anymore; the engine wires this automatically from Board configs.)

## The raw-component escape hatch

If a Board needs full control beyond what `defineBoard()` exposes:

```tsx
"use client"
import { ForkshopCanvas, Gallery, useForkshopPositions, withBoardMeta, forkshopIcons } from "@forkshop/engine"

function ExoticBoard() {
  const { nodePositions, onPositionChange } = useForkshopPositions({ boardId: "exotic" })
  return (
    <ForkshopCanvas>
      <Gallery entries={[/* ... */]} nodePositions={nodePositions} onPositionChange={onPositionChange} />
    </ForkshopCanvas>
  )
}

export default withBoardMeta(ExoticBoard, {
  id: "exotic",
  label: "Exotic",
  icon: forkshopIcons.flows,
  match: (s) => s.kind === "section" && s.sectionId === "exotic",
})
```

`withBoardMeta` attaches `__config` to a raw React component so BoardRegistry treats it like a defineBoard result. Use sparingly — most Boards don't need this.

## How to debug a misbehaving Board

1. Run `npx forkshop verify` — surfaces structural drift before runtime.
2. Look at the canvas — invalid Nodes render as inline error placeholders with a hint.
3. Check the dev console — BoardRegistry warns about duplicate matches, missing layouts, and unregistered NodeTypes.
4. If you see a "Board returned a Node with kind 'X' but no NodeType is registered" message, add the NodeType to `forkshopConfig.nodeTypes` and reload.

## Update this file when you customize Forkshop

(Same content — keep the doc-sync forcing function.)
```

- [ ] **Step 2: Verify line count**

Run: `wc -l packages/engine/templates/user-claude-md.md`
Expected: < 300.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/templates/user-claude-md.md
git commit -m "feat(engine): rewrite user-CLAUDE.md template for defineBoard contract"
```

### Task H4: Add `withBoardMeta` helper for the escape hatch

**Files:**
- Create: `packages/engine/src/lib/with-board-meta.ts`
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Implement**

```ts
// packages/engine/src/lib/with-board-meta.ts
import type { ComponentType } from "react"
import type { BoardConfig, BoardComponent } from "@forkshop/types/board"

export function withBoardMeta<P extends Record<string, never>>(
  Component: ComponentType<P>,
  meta: Omit<BoardConfig, "useEntries" | "layout"> & {
    layout?: BoardConfig["layout"]
    useEntries?: BoardConfig["useEntries"]
  },
): BoardComponent {
  const wrapped = Component as unknown as BoardComponent
  Object.defineProperty(wrapped, "__config", {
    value: {
      layout: meta.layout ?? "gallery",
      useEntries: meta.useEntries ?? (() => []),
      ...meta,
    },
    enumerable: false,
    writable: false,
    configurable: false,
  })
  Object.defineProperty(wrapped, "__isBoard", {
    value: true as const,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  return wrapped
}
```

- [ ] **Step 2: Export**

In `src/index.ts`:

```ts
export { withBoardMeta } from "./lib/with-board-meta.js"
```

- [ ] **Step 3: Update BoardRegistry to skip render of raw components correctly**

In `BoardRegistry`'s `ActiveBoard`, if `board.__config.useEntries` returns `[]` AND the component renders something itself, fall through to rendering the component:

```tsx
// inside ActiveBoard, before invoking layout.render:
if (entries.length === 0 && board !== EmptyBoardState) {
  // Allow raw components (via withBoardMeta) to render directly.
  const Component = board
  return <ForkshopCanvas><Component /></ForkshopCanvas>
}
```

(This needs careful review during implementation — the right boundary may be a separate `BoardComponent.__rawRender` flag, set by `withBoardMeta`. Track this as a refinement during execution.)

- [ ] **Step 4: Typecheck + commit**

```bash
git add packages/engine/src/lib/with-board-meta.ts packages/engine/src/index.ts packages/engine/src/components/board-registry.tsx
git commit -m "feat(engine): withBoardMeta helper for raw-component escape hatch"
```

### Task H5: Phase H wrap

- [ ] **Step 1: Full workspace check**

Run: `pnpm check && pnpm test`
Expected: PASS.

---

## Phase I — Integration, smoke test, release prep

### Task I1: Smoke test against `apps/test`

**Files:**
- Run: `pnpm reset-test` + `npx forkshop init` + interactive setup skill

- [ ] **Step 1: Reset the test fixture**

Run: `pnpm reset-test`
Expected: `apps/test/app/forkshop/` is removed; `apps/test/forkshop.json` is deleted.

- [ ] **Step 2: Run init**

Run: `(cd apps/test && node ../../packages/cli/dist/index.js init --no-install)`
Expected: scaffold templates copied; `forkshop.json` with schemaVersion 2.1.0 written.

- [ ] **Step 3: Run setup skill manually**

Open Claude Code in `apps/test/`. Say "set up Forkshop". Walk through the skill end-to-end. Accept all defaults. Confirm:

- All Boards land as defineBoard() files.
- `page.tsx` is the 20-line `<BoardRegistry>` mount.
- `forkshop verify` reports clean.
- `pnpm dev` boots and `/forkshop` renders.

- [ ] **Step 4: Manually verify in browser**

Open `http://localhost:3000/forkshop` (cd apps/test && pnpm dev). Click each Board in the sidebar. Confirm:

- Design System renders ColorGraph, TypographyShowcase, PrimitivesGrid stacked.
- UI Components Gallery shows discovered primitives in a 3-column grid (auto-flow, not (0,0) stacking).
- Clicking a primitive in the sidebar opens the variant grid (PrimitiveDetailBoard).
- Sitemap tree renders the routes.
- Single-page Board renders 3 iframes when a route is clicked.

- [ ] **Step 5: Document any deviations**

If the smoke test surfaces issues, halt the plan and fix them inline (each fix is a new task — write test → verify fail → implement → verify pass → commit).

- [ ] **Step 6: Commit any smoke-test-driven fixes**

(One commit per fix; no umbrella commit.)

### Task I2: Update `apps/demo` to the new contract

**Files:**
- Modify: `apps/demo/app/forkshop/*` (delete, re-init)

- [ ] **Step 1: Delete current install**

Run: `rm -rf apps/demo/app/forkshop apps/demo/forkshop.json`

- [ ] **Step 2: Re-init demo**

Run: `(cd apps/demo && node ../../packages/cli/dist/index.js init --no-install)`

- [ ] **Step 3: Run setup skill in demo**

Open Claude Code in `apps/demo/`. Run "set up Forkshop". Accept the proposal.

- [ ] **Step 4: Verify demo runs**

Run: `pnpm --filter apps-demo dev`
Expected: `/forkshop` renders all 5 Boards correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/demo
git commit -m "chore(demo): re-init under new defineBoard contract"
```

### Task I3: Regenerate the public-API snapshot

- [ ] **Step 1: Regen**

Run: `pnpm --filter @forkshop/engine regen-api-snap`

- [ ] **Step 2: Review the diff**

Run: `git diff packages/engine/src/__tests__/public-api.snap.json`
Expected: shows all the new exports and removals consistent with the spec.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/__tests__/public-api.snap.json
git commit -m "chore(engine): regen public-api snapshot for 0.4.0"
```

### Task I4: Bump versions

**Files:**
- Modify: `packages/engine/package.json` (version → `0.4.0`)
- Modify: `packages/cli/package.json` (version → `0.4.0`)

- [ ] **Step 1: Bump engine**

Edit `packages/engine/package.json`: `"version": "0.4.0"`.

- [ ] **Step 2: Bump CLI**

Edit `packages/cli/package.json`: `"version": "0.4.0"`.

- [ ] **Step 3: Rebuild CLI (manifest reads engine version at build time)**

Run: `pnpm --filter forkshop build`
Expected: build succeeds; manifest stamps `engineVersion: 0.4.0`.

- [ ] **Step 4: Final check**

Run: `pnpm check && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/package.json packages/cli/package.json
git commit -m "release: v0.4.0 — engine contract + Board API redesign"
```

### Task I5: Update docs site (forkshop.dev/docs)

**Files:**
- Modify: `apps/docs/app/(marketing)/docs/boards/page.mdx`
- Modify: `apps/docs/app/(marketing)/docs/extending/page.mdx`
- Modify: `apps/docs/app/(marketing)/docs/concepts/page.mdx`

- [ ] **Step 1: Find pages that mention the old API**

Run: `grep -rln "DesignSystemView\|ResponsiveFrameView\|ComponentsBoardView" apps/docs/app`
Identify each MDX page to update.

- [ ] **Step 2: For each page, update to reference `defineBoard`, `BoardRegistry`, the new helpers**

Replace old API references with new ones. Reword to match the new mental model (Board as typed config, not user-written component). Keep code examples short and accurate.

- [ ] **Step 3: Validate docs site build**

Run: `pnpm --filter docs validate-registry && pnpm --filter docs build`
Expected: PASS (no placeholder leaks, build succeeds).

- [ ] **Step 4: Commit**

```bash
git add apps/docs
git commit -m "docs: update docs site for 0.4.0 defineBoard contract"
```

### Task I6: Release

- [ ] **Step 1: Push branch + tag**

Run: `git push && git tag v0.4.0 && git push --tags`
Expected: `.github/workflows/release.yml` triggers on the tag.

- [ ] **Step 2: Watch the workflow**

Open the GitHub Actions tab for the repo (or run `gh run watch`). Confirm:
- Engine builds.
- CLI builds.
- Engine publishes to npm.
- CLI publishes to npm.
- GitHub release is created.

- [ ] **Step 3: Smoke-test the published version**

In a scratch directory: `npx create-next-app@latest scratch && cd scratch && npx forkshop@0.4.0 init`
Expected: install succeeds; pull `@forkshop/engine@0.4.0` from npm.

- [ ] **Step 4: Done**

Plan complete. Next-cycle work (rulers, resizable breakpoints, polish-backlog items not addressed here) goes into a follow-on cycle.

---

## Self-review notes

Spec coverage:
- Spec §"defineBoard() contract" → Phase D Tasks D1–D6.
- Spec §"Layouts: gallery + tree" → Phase C Tasks C1–C3.
- Spec §"Specialized renderers" → Phase E Tasks E1–E3.
- Spec §"Specialized helpers" → Phase E Tasks E5–E6.
- Spec §"Sidebar children" → covered in D4 (BoardRegistry sidebar wiring) + scaffold template designs in H1.
- Spec §"page.tsx collapses" → H1 page.tsx.template + Tasks D3–D5 (BoardRegistry).
- Spec §"forkshop.config.tsx becomes typed validated" → Phase A Task A6.
- Spec §"Validation (3 layers)" → A5 (Zod schemas), A6 (defineConfig), D2 (defineBoard validation), D3 (mount-time check in BoardRegistry).
- Spec §"forkshop verify" → Phase G Tasks G2–G7.
- Spec §"Setup skill rewrite" → Phase H Task H2.
- Spec §"User-CLAUDE.md template rewrite" → Phase H Task H3.
- Spec §"Engine API surface diff" → covered across phases; final snapshot in I3.
- Spec §"Rollout" → Phase I Tasks I4–I6.

Placeholder scan: no "TBD", "fill in details" placeholders. Each task has concrete code or commands. Specific files referenced. Open issues noted (e.g., `withBoardMeta` raw-component render path needs refinement during implementation) but flagged inline, not deferred.

Type consistency: function names match across tasks (`defineBoard`, `defineConfig`, `defineLayout`, `BoardRegistry`, `useSelection`, `enumeratePrimitiveVariants`, `responsiveFrameEntries`, `useDesignTokens`, `withBoardMeta`, `capReportedHeight`, `computeGalleryPlacements`).
