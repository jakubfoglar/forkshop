# Iframe primitive contract — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `LazyIframe`'s cap-callback bug and add scroll-lock for capped iframes, plus three documentation updates in the user-side CLAUDE.md template. No new public engine fields.

**Architecture:** Two surgical changes inside `packages/engine/src/components/canvas/lazy-iframe.tsx`, gated by extracting two pure helpers (`clampReportedHeight`, `buildIframeContentStyle`) so the bug-fix logic is unit-testable. Three text edits in `packages/engine/templates/user-claude-md.md`. No changes to `iframe-route` or `iframe-component` NodeType render code — they already pass `heightMode="cap"`, so they pick up the corrected behavior for free.

**Tech Stack:** TypeScript, React, Vitest (`/** @vitest-environment jsdom */` not needed for the pure helpers), pnpm workspace, `@forkshop/engine` package, internal alias `@forkshop/components/canvas/lazy-iframe`.

**Spec:** `docs/specs/2026-05-19-iframe-primitive-contract-design.md`

---

### Task 1: Cap the body-height callback (fixes feedback #1)

**Files:**
- Modify: `packages/engine/src/components/canvas/lazy-iframe.tsx`
- Create: `packages/engine/src/components/canvas/lazy-iframe.test.ts`

The bug: `LazyIframe`'s `handleBodySync` passes the raw measured `body.scrollHeight` to `onBodyHeightSync` even in `cap` mode. Gallery uses the callback value to size its cell, so the cell grows past the visual cap. Fix: cap the value sent to the callback when `effectiveMode === "cap"`, while keeping the internal `measuredBodyHeight` raw so the wrapper can render `Math.min(measured, cap)`.

- [ ] **Step 1: Add the failing test for `clampReportedHeight`**

Create `packages/engine/src/components/canvas/lazy-iframe.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { clampReportedHeight } from "@forkshop/components/canvas/lazy-iframe"

describe("clampReportedHeight", () => {
  it("returns the measured value in auto mode regardless of cap", () => {
    expect(clampReportedHeight(900, "auto", undefined)).toBe(900)
    expect(clampReportedHeight(900, "auto", 500)).toBe(900)
  })

  it("returns the measured value in fixed mode regardless of cap", () => {
    expect(clampReportedHeight(900, "fixed", 500)).toBe(900)
  })

  it("returns measured when cap mode and measured is below cap", () => {
    expect(clampReportedHeight(400, "cap", 500)).toBe(400)
  })

  it("returns cap when cap mode and measured exceeds cap", () => {
    expect(clampReportedHeight(900, "cap", 500)).toBe(500)
  })

  it("returns measured when cap mode but cap is undefined", () => {
    expect(clampReportedHeight(900, "cap", undefined)).toBe(900)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm --filter @forkshop/engine test --run lazy-iframe`
Expected: FAIL — `Module '"@forkshop/components/canvas/lazy-iframe"' has no exported member 'clampReportedHeight'.`

- [ ] **Step 3: Add the `clampReportedHeight` helper to `lazy-iframe.tsx`**

In `packages/engine/src/components/canvas/lazy-iframe.tsx`, add this exported helper near the top of the file (between the imports and the `LazyIframeProps` type, after the `LazyIframeHeightMode` type declaration on line 6):

```tsx
export function clampReportedHeight(
  measured: number,
  mode: LazyIframeHeightMode,
  cap: number | undefined,
): number {
  if (mode === "cap" && cap !== undefined) return Math.min(measured, cap)
  return measured
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @forkshop/engine test --run lazy-iframe`
Expected: PASS — all 5 cases green.

- [ ] **Step 5: Wire `clampReportedHeight` into `handleBodySync`**

In the same file, replace the existing `handleBodySync` (currently lines ~71–77):

```tsx
  const handleBodySync = useCallback(
    (h: number) => {
      setMeasuredBodyHeight((prev) => (prev === h ? prev : h))
      onBodyHeightSync?.(h)
    },
    [onBodyHeightSync],
  )
```

with the capped version. **Important:** `effectiveMode` and `effectiveCap` are declared later in the function (lines ~171–174). Move that declaration *above* `handleBodySync` so the callback can reference them:

```tsx
  // Resolve mode + cap up-front so handleBodySync can reference them.
  const effectiveMode: LazyIframeHeightMode =
    heightMode ?? (heightCap !== undefined ? "cap" : "auto")
  const effectiveCap =
    effectiveMode === "cap" ? (height ?? heightCap) : undefined

  const handleBodySync = useCallback(
    (h: number) => {
      // Internal state stays raw so the wrapper can render Math.min(measured, cap).
      setMeasuredBodyHeight((prev) => (prev === h ? prev : h))
      onBodyHeightSync?.(clampReportedHeight(h, effectiveMode, effectiveCap))
    },
    [onBodyHeightSync, effectiveMode, effectiveCap],
  )
```

Then delete the now-duplicated `effectiveMode` / `effectiveCap` declarations from their original location (lines ~171–174 in the pre-edit file).

- [ ] **Step 6: Run engine typecheck and full test suite**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS — no type errors.

Run: `pnpm --filter @forkshop/engine test --run`
Expected: PASS — including the new `clampReportedHeight` cases and all existing tests (especially `iframe-route.test.ts` and `iframe-component.test.ts` which exercise this path indirectly).

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/components/canvas/lazy-iframe.tsx packages/engine/src/components/canvas/lazy-iframe.test.ts
git commit -m "fix(engine): cap onBodyHeightSync value when heightMode is cap

Gallery uses the callback value to size its cell. When LazyIframe was
in cap mode, the callback fired with the raw measured body.scrollHeight,
so cells grew past the visual cap and frames piled onto each other.
Cap the reported value to match the wrapper; internal measuredBodyHeight
stays raw so the wrapper still renders Math.min(measured, cap)."
```

---

### Task 2: Lock scroll inside capped iframes (fixes feedback #14)

**Files:**
- Modify: `packages/engine/src/components/canvas/lazy-iframe.tsx`
- Modify: `packages/engine/src/components/canvas/lazy-iframe.test.ts`

The bug: capped iframes inject CSS to hide Next dev chrome and neutralize `min-h-screen`, but don't lock `body { overflow }`. The iframe element's `scrolling="no"` prevents an outer scrollbar, but wheel events inside the embedded doc still scroll its content separately from the canvas. Fix: when `effectiveMode === "cap"`, append `html, body { overflow: hidden !important }` to the injected style block.

- [ ] **Step 1: Add the failing test for `buildIframeContentStyle`**

Append to `packages/engine/src/components/canvas/lazy-iframe.test.ts`:

```ts
import { buildIframeContentStyle } from "@forkshop/components/canvas/lazy-iframe"

describe("buildIframeContentStyle", () => {
  it("always hides Next dev chrome", () => {
    expect(buildIframeContentStyle("auto")).toContain("nextjs-portal")
    expect(buildIframeContentStyle("cap")).toContain("nextjs-portal")
    expect(buildIframeContentStyle("fixed")).toContain("nextjs-portal")
  })

  it("always neutralizes min-h-screen", () => {
    expect(buildIframeContentStyle("auto")).toContain("min-h-screen")
    expect(buildIframeContentStyle("cap")).toContain("min-h-screen")
  })

  it("injects body overflow lock only in cap mode", () => {
    expect(buildIframeContentStyle("cap")).toContain("overflow: hidden")
    expect(buildIframeContentStyle("auto")).not.toContain("overflow: hidden")
    expect(buildIframeContentStyle("fixed")).not.toContain("overflow: hidden")
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm --filter @forkshop/engine test --run lazy-iframe`
Expected: FAIL — `Module '"@forkshop/components/canvas/lazy-iframe"' has no exported member 'buildIframeContentStyle'.`

- [ ] **Step 3: Add the `buildIframeContentStyle` helper**

In `packages/engine/src/components/canvas/lazy-iframe.tsx`, add this exported helper directly below `clampReportedHeight` (added in Task 1):

```tsx
export function buildIframeContentStyle(mode: LazyIframeHeightMode): string {
  // Always: hide Next dev chrome and decouple body height from the iframe
  // viewport so min-h-screen doesn't pin body to the iframe's CSS height.
  // Cap mode additionally locks scroll inside the iframe doc — the canvas
  // is the scroll surface, not the embedded page.
  const lockScroll =
    mode === "cap" ? "html, body { overflow: hidden !important; }\n" : ""
  return `
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dev-overlay],
  #__next-build-watcher {
    display: none !important;
  }
  html, body { min-height: 0 !important; height: auto !important; }
  [class*="min-h-screen"],
  [class*="min-h-dvh"],
  [class*="min-h-svh"],
  [class*="min-h-lvh"] { min-height: 0 !important; }
  ${lockScroll}`
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @forkshop/engine test --run lazy-iframe`
Expected: PASS — all `buildIframeContentStyle` cases green.

- [ ] **Step 5: Wire `buildIframeContentStyle` into the `onLoad` handler**

In `lazy-iframe.tsx`, find the inline style assignment inside `onLoad` (currently lines ~117–131):

```tsx
      styleElement = document_.createElement("style")
      styleElement.textContent = `
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dev-overlay],
  #__next-build-watcher {
    display: none !important;
  }
  html, body { min-height: 0 !important; height: auto !important; }
  [class*="min-h-screen"],
  [class*="min-h-dvh"],
  [class*="min-h-svh"],
  [class*="min-h-lvh"] { min-height: 0 !important; }
`
      document_.head.append(styleElement)
```

Replace with:

```tsx
      styleElement = document_.createElement("style")
      styleElement.textContent = buildIframeContentStyle(effectiveMode)
      document_.head.append(styleElement)
```

`effectiveMode` is in scope (moved above `handleBodySync` in Task 1, Step 5). Add `effectiveMode` to the `useEffect`'s dependency array. The current deps are `[shouldLoad, onIframeWheel, handleBodySync]`; change to `[shouldLoad, onIframeWheel, handleBodySync, effectiveMode]`.

- [ ] **Step 6: Run engine typecheck and full test suite**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS.

Run: `pnpm --filter @forkshop/engine test --run`
Expected: PASS — all `lazy-iframe.test.ts` cases plus all existing tests.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/components/canvas/lazy-iframe.tsx packages/engine/src/components/canvas/lazy-iframe.test.ts
git commit -m "fix(engine): lock body scroll inside capped iframes

scrolling=\"no\" on the iframe element prevents an outer scrollbar
but doesn't stop wheel events from scrolling the embedded doc's body.
On cap mode, inject html, body { overflow: hidden !important } so
the canvas is the only scroll surface. Extracted style construction
to buildIframeContentStyle for unit testing."
```

---

### Task 3: User-side CLAUDE.md template updates (Doc 3.1, 3.2, 3.3)

**Files:**
- Modify: `packages/engine/templates/user-claude-md.md`

Three independent edits in the same file. Bundling into one commit because they share the same "iframe primitive contract" theme — splitting would create noise.

- [ ] **Step 1: Fix the `routePath` field naming (Doc 3.1)**

The "Adding a new Board" example uses `path` but the engine type is `routePath`. Find this block in `packages/engine/templates/user-claude-md.md`:

```tsx
    node: {
      id: "doc:getting-started",
      kind: "iframe-route",
      x: 0, y: 0, width: 1200, height: 800,
      path: "/docs/getting-started",
      sourceFile: "app/docs/getting-started/page.tsx",
    },
```

Replace `path: "/docs/getting-started",` with `routePath: "/docs/getting-started",`.

There's also an earlier example showing `IframeRouteNode` shape — search the file for `path: "/about"` (in the Node mental-model section) and change to `routePath: "/about"`.

Run `grep -n "kind: \"iframe-route\"" packages/engine/templates/user-claude-md.md -A 4` to confirm every iframe-route example uses `routePath`, not `path`.

- [ ] **Step 2: Add the "Frame heights" subsection (Doc 3.2)**

In the same file, find the "How edit, spacing, and open-in-editor work" heading. Add a new subsection immediately after it (before the existing "Live text editing" subsection):

```markdown
### Frame heights

`iframe-route` clamps the rendered iframe to `node.height`. The iframe loads the
full page, auto-sizes vertically until it hits the cap, then clips. Scrolling
inside the iframe is locked — the canvas is the scroll surface, not the
embedded page.

If you want the iframe to grow taller to fit a long page, increase `node.height`.
If you want a fixed-thumbnail look regardless of content length, set `node.height`
to your desired tile height — the iframe will clip the page accordingly.

(`iframe-component` follows the same rules using its `previewSrc` URL.)

```

- [ ] **Step 3: Add the "Wrapping a built-in NodeType" example (Doc 3.3)**

In the same file, find the "Adding a custom NodeType" section. After the existing from-scratch Storybook example, add this second example block:

````markdown
**Wrapping a built-in NodeType.** When you need an `iframe-route` variant with one tweak (a sidebar-only clip, custom framing, a non-default `desktopWidth`), spread the built-in's properties and override only the parts that differ. This inherits `agentMatch` so route-level live-AI attribution keeps working:

```tsx
// app/forkshop/node-types/sidebar-only-frame.tsx
"use client"
import { iframeRouteNodeType } from "@forkshop/engine"
import type { NodeType, IframeRouteNode } from "@forkshop/engine"

type SidebarOnlyFrame = IframeRouteNode & { kind: "sidebar-only-frame" }

export const sidebarOnlyFrameNodeType: NodeType<SidebarOnlyFrame> = {
  ...iframeRouteNodeType,
  id: "sidebar-only-frame",
  match: (node): node is SidebarOnlyFrame => node.kind === "sidebar-only-frame",
  // agentMatch inherited — route attribution still works
  render: ({ node, onBodyHeightChange }) => (
    <div style={{ width: 520, overflow: "hidden" }}>
      <div style={{ marginLeft: -(1440 - 520) }}>
        {iframeRouteNodeType.render({ node, onBodyHeightChange })}
      </div>
    </div>
  ),
}
```

Use this pattern whenever you'd otherwise reach for `inline-react` + a hand-rolled iframe — wrapping `iframe-route` keeps live-edit overlay, agent-read indicator, wheel forwarding, and route-level pulses intact.
````

- [ ] **Step 4: Run docs registry validation**

Run: `pnpm --filter docs validate-registry`
Expected: PASS — no `{{placeholder}}` leaks, no broken examples.

- [ ] **Step 5: Run engine typecheck (template doesn't break consumers)**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/templates/user-claude-md.md
git commit -m "docs(template): iframe-route field naming, frame heights, NodeType wrapping

- Rename path -> routePath in the iframe-route examples to match the
  engine type (was a footgun on copy-paste).
- Add a 'Frame heights' subsection explaining the cap behavior and
  scroll lock — surfaces what the iframe primitive actually does.
- Add a second 'Adding a custom NodeType' example showing the
  wrap-a-built-in pattern (canonical answer when iframe-route's
  defaults don't fit and you'd otherwise reach for inline-react)."
```

---

### Task 4: Final validation

**Files:**
- None (verification only)

Make sure the full workspace is healthy before this lands.

- [ ] **Step 1: Run workspace-wide check**

Run: `pnpm check`
Expected: PASS — typecheck + lint across every package.

- [ ] **Step 2: Run workspace-wide tests**

Run: `pnpm test`
Expected: PASS — all packages.

- [ ] **Step 3: Regenerate API snapshot if the public surface changed**

The two helper exports (`clampReportedHeight`, `buildIframeContentStyle`) live in `lazy-iframe.tsx`, which is **not** re-exported from `packages/engine/src/index.ts`. So they're engine-internal, not public API. Verify:

Run: `grep -n "lazy-iframe\|LazyIframe\|clampReportedHeight\|buildIframeContentStyle" packages/engine/src/index.ts`
Expected: no matches.

If matches appear (shouldn't), regenerate the snapshot:

Run: `pnpm regen-api-snap`

Then commit the updated snapshot.

- [ ] **Step 4: Manual smoke check on `apps/demo`**

This is verification only — no code changes. Boot the demo and confirm the iframe primitive behaves correctly:

Run: `pnpm dev`
Expected: dev server boots, browser opens at `localhost:3000/forkshop`.

In the browser, click the Sitemap section. Confirm:
- Page iframes render with no visible scroll overflow inside (scroll lock applied).
- Cells size to their content within the cap; no piling/overlapping.

Drag a frame; positions update visually. (Position persistence is the separate spec — not validated here.)

- [ ] **Step 5: Confirm done**

No commit; this is just a checklist marker. Spec is implemented when steps 1–4 pass.

---

## Out of scope for this plan

These came up during spec but are explicitly deferred:

- Position model unification (Gallery row/column auto-flow, `node.x`/`node.y` semantics, DesignSystemView position drift). Next spec.
- Canvas zoom containment (portal-rendered tooltips, `--canvas-zoom` on `:root`). Following spec.
- Type exports (`ForkshopCanvasHandle`, `Transform`, `WheelInput`). Pure DX paper cuts; can ship alongside any patch release independently.
- `LazyIframe` as a public React component. Decided no.
- Search-param support, `desktopWidth` field, `maxHeight` field. YAGNI for now; revisit on recurring demand.
