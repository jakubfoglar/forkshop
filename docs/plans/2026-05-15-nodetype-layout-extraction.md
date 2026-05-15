# NodeType + Layout Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the engine surface in `packages/registry/` into the Node / NodeType / Layout shapes from strategy v2 — refactor `canvas-node.tsx` into a dispatcher, port the three existing kit files into three built-in Layouts, slim the public API to ~15 named exports.

**Architecture:** Strict split — Layouts position (emit Node records), NodeTypes render (the dispatcher wraps each Node body in chrome). NodeTypes are passed to `<ForkshopCanvas nodeTypes={[...]}>` and discovered via context. AnyNode is a closed union over three concrete Node types at 1.0.

**Tech Stack:** TypeScript, React 18, Next.js 14 (peer dep), Vitest. Workspace: pnpm. Path alias `@forkshop/*` resolves to `packages/registry/src/*`.

**Spec:** `docs/specs/2026-05-15-nodetype-layout-extraction-design.md`

---

## File Structure

**Adds** (all paths relative to `packages/registry/src/`):
- `types/node.ts` — `BaseNode`, `AnyNode`, 3 concrete Node types
- `types/node-type.ts` — `NodeType<T>`, `RenderProps<T>`, `DrillInProps<T>`
- `node-types/inline-react.tsx` — `inlineReactNodeType`
- `node-types/iframe-route.tsx` — `iframeRouteNodeType`
- `node-types/iframe-component.tsx` — `iframeComponentNodeType`
- `node-types/index.ts` — `BUILTIN_NODE_TYPES`
- `node-types/dispatch.test.ts` — dispatch contract test
- `node-types/inline-react.test.ts` — match/activityKey test
- `node-types/iframe-route.test.ts` — match/activityKey test
- `node-types/iframe-component.test.ts` — match/activityKey test
- `layouts/gallery.tsx` — was `kits/iframe-gallery.tsx`
- `layouts/tree.tsx` — was `kits/page-tree.tsx`
- `layouts/design-system-graph.tsx` — was `kits/design-system-board.tsx`
- `components/canvas/node-frame.tsx` — chrome wrapper carved from `canvas-node.tsx`
- `components/canvas/node-view.tsx` — the dispatcher

**Removes:**
- `components/canvas/canvas-node.tsx` (after step where shim is unneeded)
- `kits/` (directory, after all three layouts have migrated)

**Modifies:**
- `components/canvas/forkshop-canvas.tsx` — add `nodeTypes` prop, expose via context
- `index.ts` — slim to ~15 named exports
- `apps/playground/app/forkshop/forkshop.config.tsx`, `components-board.tsx`, `pages-board.tsx`, `design-system-board.tsx`, `page.tsx` — switch to new shapes

**Untouched but demoted from `index.ts`:** `responsive-frame-view.tsx`, `edit-popover.tsx`, `spacing-picker.tsx`, `spacing-body-menu.tsx`, `floating-controls.tsx`, `back-button.tsx`, `guide-overlay.tsx`, `lazy-iframe.tsx`, `canvas-click-overlay.tsx`, `canvas-label.tsx`, `useDraggableNode`, `useIframe*` hooks, `system-graph.ts`, `system-layout.ts`, `system-snap.ts`, `node-positions.ts`, `sitemap-tree.ts`.

---

## Task 1: Add `BaseNode` and `AnyNode` types

**Files:**
- Create: `packages/registry/src/types/node.ts`

- [ ] **Step 1: Create the types file**

`packages/registry/src/types/node.ts`:

```ts
import type { ReactNode } from "react"

export type BaseNode = {
  id: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  label?: ReactNode
}

export type InlineReactNode = BaseNode & {
  kind: "inline-react"
  filePath?: string
  render: () => ReactNode
}

export type IframeRouteNode = BaseNode & {
  kind: "iframe-route"
  routePath: string
  drillInMode?: "single" | "responsive"
}

export type IframeComponentNode = BaseNode & {
  kind: "iframe-component"
  slug: string
  previewSrc: string
  componentPath?: string
  drillInMode?: "single" | "responsive"
}

export type AnyNode = InlineReactNode | IframeRouteNode | IframeComponentNode
```

- [ ] **Step 2: Typecheck the new file**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS — the file is self-contained and has no consumers yet.

- [ ] **Step 3: Commit**

```bash
git add packages/registry/src/types/node.ts
git commit -m "feat(types): add Node type definitions"
```

---

## Task 2: Add `NodeType` contract types

**Files:**
- Create: `packages/registry/src/types/node-type.ts`

- [ ] **Step 1: Create the contract file**

`packages/registry/src/types/node-type.ts`:

```ts
import type { ReactNode } from "react"
import type { AnyNode } from "@forkshop/types/node"

export type RenderProps<T extends AnyNode> = {
  node: T
  isSelected: boolean
  agentActive: boolean
  agentFileLabel?: string
}

export type DrillInProps<T extends AnyNode> = {
  node: T
  onBack: () => void
}

export type NodeType<T extends AnyNode = AnyNode> = {
  id: string
  match: (node: AnyNode) => node is T
  render: (props: RenderProps<T>) => ReactNode
  drillIn?: (props: DrillInProps<T>) => ReactNode
  defaultMode?: "interactive-live" | "click-into" | "static"
  enterMode?: "double-click" | "single-click" | "never"
  activityKey?: (node: T) => string
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/registry/src/types/node-type.ts
git commit -m "feat(types): add NodeType contract"
```

---

## Task 3: Carve `NodeFrame` out of `canvas-node.tsx`

`NodeFrame` is the chrome wrapper (outline, drag, agent-chip). Today this lives entirely in `canvas-node.tsx`. We carve it out as a separate component first, then build `NodeView` on top of it in Task 4. To keep `pnpm check` green, `canvas-node.tsx` becomes a one-line re-export of `NodeFrame` for now — the existing kits still import `CanvasNode` and the build keeps working.

**Files:**
- Create: `packages/registry/src/components/canvas/node-frame.tsx`
- Modify: `packages/registry/src/components/canvas/canvas-node.tsx` (becomes a re-export)

- [ ] **Step 1: Create `node-frame.tsx` with the carved-out chrome**

`packages/registry/src/components/canvas/node-frame.tsx`:

```tsx
"use client"

import {
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react"
import type { NodePosition } from "@forkshop/lib/node-positions"
import type { SnapGuide } from "@forkshop/lib/system-snap"
import { CanvasLabel } from "@forkshop/components/canvas/canvas-label"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useDraggableNode, type GetSnapTargets } from "@forkshop/hooks/use-draggable-node"

function outlineFor(isSelected: boolean, isHovered: boolean): string {
  if (isSelected) {
    return "calc(1.5px / var(--canvas-zoom, 1)) solid #3b82f6"
  }
  if (isHovered) {
    return "calc(1px / var(--canvas-zoom, 1)) solid #93c5fd"
  }
  return "none"
}

const AGENT_COLOR = "oklch(0.62 0.22 280)"

function agentBoxShadow(agentActive: boolean): string | undefined {
  if (!agentActive) return undefined
  return `0 0 0 calc(2px / var(--canvas-zoom, 1)) ${AGENT_COLOR}, 0 0 0 calc(7px / var(--canvas-zoom, 1)) color-mix(in oklch, ${AGENT_COLOR} 18%, transparent)`
}

export type NodeFrameProps = {
  id: string
  layoutX: number
  layoutY: number
  width: number
  height: number
  override: NodePosition | undefined
  label?: ReactNode
  isSelected: boolean
  agentActive?: boolean
  agentFileLabel?: string
  onSelect?: () => void
  onIsolate?: () => void
  onPositionChange: (id: string, x: number, y: number) => void
  getSnapTargets: GetSnapTargets
  onGuidesChange?: (guides: SnapGuide[]) => void
  onSelectChange?: (id: string, selected: boolean) => void
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function NodeFrame({
  id,
  layoutX,
  layoutY,
  width,
  height,
  override,
  label,
  isSelected,
  agentActive = false,
  agentFileLabel,
  onSelect,
  onIsolate,
  onPositionChange,
  getSnapTargets,
  onGuidesChange,
  onSelectChange,
  className,
  style,
  children,
}: NodeFrameProps) {
  const { transformRef } = useForkshopCanvas()
  const [isBodyHovered, setIsBodyHovered] = useState(false)
  const [isLabelHovered, setIsLabelHovered] = useState(false)
  const isHovered = isBodyHovered || isLabelHovered
  const { containerRef, x, y, dragHandleProps } = useDraggableNode({
    id,
    layoutX,
    layoutY,
    width,
    height,
    override,
    transformRef,
    getSnapTargets,
    onGuidesChange,
    onCommit: onPositionChange,
    onSelectChange:
      onSelectChange === undefined ? undefined : (selected) => onSelectChange(id, selected),
  })
  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsBodyHovered(true)}
      onMouseLeave={() => setIsBodyHovered(false)}
      onClick={
        onSelect === undefined
          ? undefined
          : (event: ReactMouseEvent<HTMLDivElement>) => {
              event.stopPropagation()
              onSelect()
            }
      }
      onDoubleClick={
        onIsolate === undefined
          ? undefined
          : (event: ReactMouseEvent<HTMLDivElement>) => {
              event.stopPropagation()
              onIsolate()
            }
      }
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        outline: outlineFor(isSelected, isHovered),
        outlineOffset: 0,
        boxShadow: agentBoxShadow(agentActive),
        ...style,
      }}
      className={className}
    >
      {label !== undefined && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: 6,
          }}
        >
          <CanvasLabel
            selected={isSelected}
            hovered={isLabelHovered}
            onMouseEnter={() => setIsLabelHovered(true)}
            onMouseLeave={() => setIsLabelHovered(false)}
            style={{ touchAction: "none" }}
            {...dragHandleProps}
          >
            {label}
          </CanvasLabel>
        </div>
      )}
      {agentActive && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            right: 0,
            marginBottom: 6,
            pointerEvents: "none",
          }}
        >
          <CanvasLabel
            style={{
              transformOrigin: "bottom right",
              background: AGENT_COLOR,
              color: "white",
              padding: "1px 6px",
              borderRadius: 3,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "white",
                  animation: "forkshop-agent-pulse 1.2s infinite",
                }}
              />
              <span>Claude · {agentFileLabel ?? "editing"}</span>
            </span>
          </CanvasLabel>
        </div>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Replace `canvas-node.tsx` with a re-export shim**

Overwrite `packages/registry/src/components/canvas/canvas-node.tsx`:

```tsx
"use client"

export { NodeFrame as CanvasNode, type NodeFrameProps as CanvasNodeProps } from "@forkshop/components/canvas/node-frame"
```

- [ ] **Step 3: Run typecheck + lint**

Run: `pnpm --filter @forkshop/registry typecheck && pnpm --filter @forkshop/registry lint`
Expected: PASS. All existing `CanvasNode` consumers (the three kits) still compile via the re-export.

- [ ] **Step 4: Run the registry test suite**

Run: `pnpm --filter @forkshop/registry test`
Expected: PASS — no behavior changed; tests should be green.

- [ ] **Step 5: Commit**

```bash
git add packages/registry/src/components/canvas/node-frame.tsx packages/registry/src/components/canvas/canvas-node.tsx
git commit -m "refactor(canvas): carve NodeFrame out of canvas-node"
```

---

## Task 4: Extend `ForkshopCanvas` with a `nodeTypes` prop

Add a `nodeTypes` prop that flows through canvas context. Existing call sites pass nothing; the prop is optional and defaults to `[]`. We'll require it indirectly once Layouts use NodeView.

**Files:**
- Modify: `packages/registry/src/components/canvas/forkshop-canvas.tsx`

- [ ] **Step 1: Add `nodeTypes` to the context value type**

Open `packages/registry/src/components/canvas/forkshop-canvas.tsx`. Add an import at the top of the existing import block:

```ts
import type { NodeType } from "@forkshop/types/node-type"
import type { AnyNode } from "@forkshop/types/node"
```

Then extend `ForkshopCanvasContextValue` (currently defined around line 37):

```ts
type ForkshopCanvasContextValue = {
  transformRef: RefObject<Transform>
  isInteractingRef: RefObject<boolean>
  fitToView: () => void
  resetZoom: () => void
  animateToBox: (x: number, y: number, w: number, h: number) => void
  setTransform: (transform: Transform) => void
  applyWheelInput: (input: WheelInput) => void
  containerRef: RefObject<HTMLDivElement | null>
  nodeTypes: ReadonlyArray<NodeType<AnyNode>>
}
```

- [ ] **Step 2: Add `nodeTypes` to the component props and contextValue**

In the same file, add `nodeTypes` to the destructured props block in `ForkshopCanvas` (the param object around line 66) — adjacent to the other props:

```ts
nodeTypes = [],
```

And add it to the props type:

```ts
nodeTypes?: ReadonlyArray<NodeType<AnyNode>>
```

Then add `nodeTypes` to the `contextValue` memo (around line 395):

```ts
const contextValue = useMemo<ForkshopCanvasContextValue>(
  () => ({
    transformRef,
    isInteractingRef,
    fitToView,
    resetZoom,
    animateToBox,
    setTransform,
    applyWheelInput: applyWheel,
    containerRef,
    nodeTypes,
  }),
  [fitToView, resetZoom, animateToBox, setTransform, applyWheel, containerRef, nodeTypes],
)
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS. No existing consumer passes `nodeTypes`; the default `[]` keeps them working.

- [ ] **Step 4: Commit**

```bash
git add packages/registry/src/components/canvas/forkshop-canvas.tsx
git commit -m "feat(canvas): thread nodeTypes through ForkshopCanvas context"
```

---

## Task 5: Build the `NodeView` dispatcher (TDD)

`NodeView` looks up the first matching NodeType for a Node and renders its body. The Layout wraps each Node body in a `NodeFrame` so chrome (outline, drag, agent glow) is shared.

**Files:**
- Create: `packages/registry/src/components/canvas/node-view.test.ts`
- Create: `packages/registry/src/components/canvas/node-view.tsx`

- [ ] **Step 1: Write the failing dispatch unit test**

`packages/registry/src/components/canvas/node-view.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { resolveNodeType } from "@forkshop/components/canvas/node-view"
import type { AnyNode, InlineReactNode, IframeRouteNode } from "@forkshop/types/node"
import type { NodeType } from "@forkshop/types/node-type"

const noopRender = () => null

const inlineReactStub: NodeType<InlineReactNode> = {
  id: "inline-react",
  match: (n): n is InlineReactNode => n.kind === "inline-react",
  render: noopRender,
}

const iframeRouteStub: NodeType<IframeRouteNode> = {
  id: "iframe-route",
  match: (n): n is IframeRouteNode => n.kind === "iframe-route",
  render: noopRender,
}

const inlineReactNode: InlineReactNode = {
  id: "n1",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  render: () => null,
}

const iframeRouteNode: IframeRouteNode = {
  id: "n2",
  kind: "iframe-route",
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  routePath: "/about",
}

describe("resolveNodeType", () => {
  it("returns the first NodeType whose match() returns true", () => {
    const types: NodeType<AnyNode>[] = [inlineReactStub, iframeRouteStub]
    expect(resolveNodeType(inlineReactNode, types)?.id).toBe("inline-react")
    expect(resolveNodeType(iframeRouteNode, types)?.id).toBe("iframe-route")
  })

  it("respects array order — earlier NodeTypes win", () => {
    // A custom override placed before the built-in must take precedence.
    const customInlineReact: NodeType<InlineReactNode> = {
      id: "custom-inline",
      match: (n): n is InlineReactNode => n.kind === "inline-react",
      render: noopRender,
    }
    const types: NodeType<AnyNode>[] = [customInlineReact, inlineReactStub]
    expect(resolveNodeType(inlineReactNode, types)?.id).toBe("custom-inline")
  })

  it("returns undefined when no NodeType matches", () => {
    const types: NodeType<AnyNode>[] = [iframeRouteStub]
    expect(resolveNodeType(inlineReactNode, types)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- node-view`
Expected: FAIL — `resolveNodeType` is not exported from `@forkshop/components/canvas/node-view` (module not found).

- [ ] **Step 3: Create `node-view.tsx` with the dispatcher + `resolveNodeType`**

`packages/registry/src/components/canvas/node-view.tsx`:

```tsx
"use client"

import type { CSSProperties, ReactNode } from "react"
import type { AnyNode } from "@forkshop/types/node"
import type { NodeType, RenderProps } from "@forkshop/types/node-type"
import { NodeFrame } from "@forkshop/components/canvas/node-frame"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import type { NodePosition } from "@forkshop/lib/node-positions"
import type { SnapGuide } from "@forkshop/lib/system-snap"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"

export function resolveNodeType(
  node: AnyNode,
  nodeTypes: ReadonlyArray<NodeType<AnyNode>>,
): NodeType<AnyNode> | undefined {
  for (const nt of nodeTypes) {
    if (nt.match(node)) return nt
  }
  return undefined
}

export type NodeViewProps = {
  node: AnyNode
  override: NodePosition | undefined
  isSelected: boolean
  agentActive?: boolean
  agentFileLabel?: string
  onSelect?: () => void
  onIsolate?: () => void
  onPositionChange: (id: string, x: number, y: number) => void
  getSnapTargets: GetSnapTargets
  onGuidesChange?: (guides: SnapGuide[]) => void
  onSelectChange?: (id: string, selected: boolean) => void
  className?: string
  style?: CSSProperties
}

export function NodeView({
  node,
  override,
  isSelected,
  agentActive = false,
  agentFileLabel,
  onSelect,
  onIsolate,
  onPositionChange,
  getSnapTargets,
  onGuidesChange,
  onSelectChange,
  className,
  style,
}: NodeViewProps): ReactNode {
  const { nodeTypes } = useForkshopCanvas()
  const nodeType = resolveNodeType(node, nodeTypes)
  if (!nodeType) {
    if (typeof console !== "undefined") {
      console.warn(`[forkshop] No NodeType matched node ${node.id} (kind=${node.kind})`)
    }
    return null
  }
  const renderProps: RenderProps<AnyNode> = {
    node,
    isSelected,
    agentActive,
    agentFileLabel,
  }
  return (
    <NodeFrame
      id={node.id}
      layoutX={node.x}
      layoutY={node.y}
      width={node.width}
      height={node.height}
      override={override}
      label={node.label}
      isSelected={isSelected}
      agentActive={agentActive}
      agentFileLabel={agentFileLabel}
      onSelect={onSelect}
      onIsolate={onIsolate}
      onPositionChange={onPositionChange}
      getSnapTargets={getSnapTargets}
      onGuidesChange={onGuidesChange}
      onSelectChange={onSelectChange}
      className={className}
      style={style}
    >
      {nodeType.render(renderProps)}
    </NodeFrame>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- node-view`
Expected: PASS — all three test cases green.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm --filter @forkshop/registry typecheck && pnpm --filter @forkshop/registry lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/registry/src/components/canvas/node-view.tsx packages/registry/src/components/canvas/node-view.test.ts
git commit -m "feat(canvas): add NodeView dispatcher + resolveNodeType"
```

---

## Task 6: Build the `inline-react` NodeType (TDD)

**Files:**
- Create: `packages/registry/src/node-types/inline-react.test.ts`
- Create: `packages/registry/src/node-types/inline-react.tsx`

- [ ] **Step 1: Write the failing test**

`packages/registry/src/node-types/inline-react.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { inlineReactNodeType } from "@forkshop/node-types/inline-react"
import type { AnyNode, InlineReactNode, IframeRouteNode } from "@forkshop/types/node"

const inlineNode: InlineReactNode = {
  id: "p:button",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  filePath: "components/ui/button.tsx",
  render: () => null,
}

const iframeNode: IframeRouteNode = {
  id: "page:about",
  kind: "iframe-route",
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  routePath: "/about",
}

describe("inlineReactNodeType", () => {
  it("has id 'inline-react'", () => {
    expect(inlineReactNodeType.id).toBe("inline-react")
  })

  it("match() returns true for inline-react nodes", () => {
    expect(inlineReactNodeType.match(inlineNode)).toBe(true)
  })

  it("match() returns false for other kinds", () => {
    expect(inlineReactNodeType.match(iframeNode as AnyNode)).toBe(false)
  })

  it("activityKey() returns the filePath", () => {
    expect(inlineReactNodeType.activityKey?.(inlineNode)).toBe("components/ui/button.tsx")
  })

  it("activityKey() returns undefined when filePath is absent", () => {
    const noPath: InlineReactNode = { ...inlineNode, filePath: undefined }
    expect(inlineReactNodeType.activityKey?.(noPath)).toBeUndefined()
  })

  it("defaultMode is 'interactive-live' and enterMode is 'never'", () => {
    expect(inlineReactNodeType.defaultMode).toBe("interactive-live")
    expect(inlineReactNodeType.enterMode).toBe("never")
  })

  it("has no drillIn", () => {
    expect(inlineReactNodeType.drillIn).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- inline-react`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the NodeType**

`packages/registry/src/node-types/inline-react.tsx`:

```tsx
"use client"

import type { NodeType } from "@forkshop/types/node-type"
import type { InlineReactNode } from "@forkshop/types/node"

export const inlineReactNodeType: NodeType<InlineReactNode> = {
  id: "inline-react",
  match: (node): node is InlineReactNode => node.kind === "inline-react",
  render: ({ node }) => node.render(),
  defaultMode: "interactive-live",
  enterMode: "never",
  activityKey: (node) => node.filePath ?? "",
}
```

Note: the test expects `activityKey` to return `undefined` when `filePath` is absent. Adjust the implementation to honor that:

```tsx
activityKey: (node) => node.filePath,
```

(`activityKey` returns `string | undefined`; that matches the contract — types/node-type.ts declares it as `(node: T) => string`, so widen to `string | undefined` in the contract.)

- [ ] **Step 4: Widen `activityKey` return type in the contract**

In `packages/registry/src/types/node-type.ts`, change:

```ts
activityKey?: (node: T) => string
```

to:

```ts
activityKey?: (node: T) => string | undefined
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- inline-react`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/registry/src/node-types/inline-react.tsx packages/registry/src/node-types/inline-react.test.ts packages/registry/src/types/node-type.ts
git commit -m "feat(node-types): add inline-react NodeType"
```

---

## Task 7: Build the `iframe-route` NodeType (TDD)

The `render` function returns a `<LazyIframe>` wrapped in a transparent click overlay. The `drillIn` function returns `<ResponsiveFrameView>`.

The render function needs canvas context (for wheel forwarding) and iframe registration, so we extract its body into a small inner component. Activity is matched by `useAgentActivePages`.

**Files:**
- Create: `packages/registry/src/node-types/iframe-route.test.ts`
- Create: `packages/registry/src/node-types/iframe-route.tsx`

- [ ] **Step 1: Write the failing test**

`packages/registry/src/node-types/iframe-route.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { iframeRouteNodeType } from "@forkshop/node-types/iframe-route"
import type { AnyNode, IframeRouteNode, InlineReactNode } from "@forkshop/types/node"

const routeNode: IframeRouteNode = {
  id: "page:about",
  kind: "iframe-route",
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  routePath: "/about",
}

const inlineNode: InlineReactNode = {
  id: "p:button",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  render: () => null,
}

describe("iframeRouteNodeType", () => {
  it("has id 'iframe-route'", () => {
    expect(iframeRouteNodeType.id).toBe("iframe-route")
  })

  it("match() returns true for iframe-route nodes", () => {
    expect(iframeRouteNodeType.match(routeNode)).toBe(true)
  })

  it("match() returns false for other kinds", () => {
    expect(iframeRouteNodeType.match(inlineNode as AnyNode)).toBe(false)
  })

  it("activityKey() returns the routePath", () => {
    expect(iframeRouteNodeType.activityKey?.(routeNode)).toBe("/about")
  })

  it("defaultMode is 'click-into' and enterMode is 'double-click'", () => {
    expect(iframeRouteNodeType.defaultMode).toBe("click-into")
    expect(iframeRouteNodeType.enterMode).toBe("double-click")
  })

  it("has a drillIn function", () => {
    expect(typeof iframeRouteNodeType.drillIn).toBe("function")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- iframe-route`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the NodeType**

`packages/registry/src/node-types/iframe-route.tsx`:

```tsx
"use client"

import { useCallback, useRef } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeRouteNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { ResponsiveFrameView } from "@forkshop/components/canvas/responsive-frame-view"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"
import { useAgentActivePages } from "@forkshop/components/agent-activity-context"

function IframeRouteRender({ node }: { node: IframeRouteNode }) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  return (
    <LazyIframe
      src={node.routePath}
      title={node.routePath}
      width={node.width}
      heightCap={node.height}
      desktopWidth={1440}
      onIframeWheel={handleIframeWheel}
      iframeRef={(el) => {
        iframeRef.current = el ?? null
      }}
      className="bg-white shadow-md"
    />
  )
}

function IframeRouteDrillIn({
  node,
  onBack,
}: {
  node: IframeRouteNode
  onBack: () => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const activePages = useAgentActivePages()
  const agentActive = activePages.has(node.routePath)
  const mode = node.drillInMode ?? "responsive"

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  // mode === "single" → render a single 375px viewport; otherwise 3-viewport responsive stack.
  const viewports = mode === "single" ? [375] : [1440, 768, 375]

  // onBack is wired up by the engine's drill-in mechanics (out of scope for this spec);
  // it's accepted in the signature so future drill-in chrome can use it.
  void onBack
  return (
    <ResponsiveFrameView
      kind="page"
      path={node.routePath}
      source={node.routePath}
      onIframeWheel={handleIframeWheel}
      viewports={viewports}
      agentActive={agentActive}
    />
  )
}

export const iframeRouteNodeType: NodeType<IframeRouteNode> = {
  id: "iframe-route",
  match: (node): node is IframeRouteNode => node.kind === "iframe-route",
  render: ({ node }) => <IframeRouteRender node={node} />,
  drillIn: ({ node, onBack }) => <IframeRouteDrillIn node={node} onBack={onBack} />,
  defaultMode: "click-into",
  enterMode: "double-click",
  activityKey: (node) => node.routePath,
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- iframe-route`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/registry/src/node-types/iframe-route.tsx packages/registry/src/node-types/iframe-route.test.ts
git commit -m "feat(node-types): add iframe-route NodeType"
```

---

## Task 8: Build the `iframe-component` NodeType (TDD)

Same shape as `iframe-route` but uses `node.previewSrc` and matches activity by `componentPath`/`slug`. Uses `useAgentActiveBlocks`.

**Files:**
- Create: `packages/registry/src/node-types/iframe-component.test.ts`
- Create: `packages/registry/src/node-types/iframe-component.tsx`

- [ ] **Step 1: Write the failing test**

`packages/registry/src/node-types/iframe-component.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { iframeComponentNodeType } from "@forkshop/node-types/iframe-component"
import type { AnyNode, IframeComponentNode, InlineReactNode } from "@forkshop/types/node"

const componentNode: IframeComponentNode = {
  id: "block:hero",
  kind: "iframe-component",
  x: 0,
  y: 0,
  width: 1200,
  height: 600,
  slug: "hero",
  previewSrc: "/forkshop/preview/hero",
  componentPath: "components/blocks/hero.tsx",
}

const inlineNode: InlineReactNode = {
  id: "p:button",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  render: () => null,
}

describe("iframeComponentNodeType", () => {
  it("has id 'iframe-component'", () => {
    expect(iframeComponentNodeType.id).toBe("iframe-component")
  })

  it("match() returns true for iframe-component nodes", () => {
    expect(iframeComponentNodeType.match(componentNode)).toBe(true)
  })

  it("match() returns false for other kinds", () => {
    expect(iframeComponentNodeType.match(inlineNode as AnyNode)).toBe(false)
  })

  it("activityKey() prefers componentPath over slug", () => {
    expect(iframeComponentNodeType.activityKey?.(componentNode)).toBe("components/blocks/hero.tsx")
  })

  it("activityKey() falls back to slug when componentPath is absent", () => {
    const noPath: IframeComponentNode = { ...componentNode, componentPath: undefined }
    expect(iframeComponentNodeType.activityKey?.(noPath)).toBe("hero")
  })

  it("defaultMode is 'click-into' and enterMode is 'double-click'", () => {
    expect(iframeComponentNodeType.defaultMode).toBe("click-into")
    expect(iframeComponentNodeType.enterMode).toBe("double-click")
  })

  it("has a drillIn function", () => {
    expect(typeof iframeComponentNodeType.drillIn).toBe("function")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forkshop/registry test -- iframe-component`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the NodeType**

`packages/registry/src/node-types/iframe-component.tsx`:

```tsx
"use client"

import { useCallback, useRef } from "react"
import type { NodeType } from "@forkshop/types/node-type"
import type { IframeComponentNode } from "@forkshop/types/node"
import { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
import { ResponsiveFrameView } from "@forkshop/components/canvas/responsive-frame-view"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useRegisterIframe } from "@forkshop/components/iframe-registry"
import { useAgentActiveBlocks } from "@forkshop/components/agent-activity-context"

function IframeComponentRender({ node }: { node: IframeComponentNode }) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useRegisterIframe(iframeRef)

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  return (
    <LazyIframe
      src={node.previewSrc}
      title={node.slug}
      width={node.width}
      heightCap={node.height}
      onIframeWheel={handleIframeWheel}
      iframeRef={(el) => {
        iframeRef.current = el ?? null
      }}
      className="bg-white shadow-md"
    />
  )
}

function IframeComponentDrillIn({
  node,
  onBack,
}: {
  node: IframeComponentNode
  onBack: () => void
}) {
  const { applyWheelInput, transformRef } = useForkshopCanvas()
  const activeBlocks = useAgentActiveBlocks()
  const agentActive = activeBlocks.has(node.slug)
  const mode = node.drillInMode ?? "single"

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  const viewports = mode === "responsive" ? [1440, 768, 375] : [375]

  void onBack
  return (
    <ResponsiveFrameView
      kind="block"
      path={node.slug}
      source={node.previewSrc}
      onIframeWheel={handleIframeWheel}
      viewports={viewports}
      agentActive={agentActive}
    />
  )
}

export const iframeComponentNodeType: NodeType<IframeComponentNode> = {
  id: "iframe-component",
  match: (node): node is IframeComponentNode => node.kind === "iframe-component",
  render: ({ node }) => <IframeComponentRender node={node} />,
  drillIn: ({ node, onBack }) => <IframeComponentDrillIn node={node} onBack={onBack} />,
  defaultMode: "click-into",
  enterMode: "double-click",
  activityKey: (node) => node.componentPath ?? node.slug,
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @forkshop/registry test -- iframe-component`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/registry/src/node-types/iframe-component.tsx packages/registry/src/node-types/iframe-component.test.ts
git commit -m "feat(node-types): add iframe-component NodeType"
```

---

## Task 9: Export `BUILTIN_NODE_TYPES` and add to `index.ts`

**Files:**
- Create: `packages/registry/src/node-types/index.ts`
- Modify: `packages/registry/src/index.ts`

- [ ] **Step 1: Create the node-types index**

`packages/registry/src/node-types/index.ts`:

```ts
import type { AnyNode } from "@forkshop/types/node"
import type { NodeType } from "@forkshop/types/node-type"
import { inlineReactNodeType } from "@forkshop/node-types/inline-react"
import { iframeRouteNodeType } from "@forkshop/node-types/iframe-route"
import { iframeComponentNodeType } from "@forkshop/node-types/iframe-component"

export { inlineReactNodeType } from "@forkshop/node-types/inline-react"
export { iframeRouteNodeType } from "@forkshop/node-types/iframe-route"
export { iframeComponentNodeType } from "@forkshop/node-types/iframe-component"

export const BUILTIN_NODE_TYPES: ReadonlyArray<NodeType<AnyNode>> = [
  inlineReactNodeType,
  iframeRouteNodeType,
  iframeComponentNodeType,
] as ReadonlyArray<NodeType<AnyNode>>
```

- [ ] **Step 2: Add exports to the public surface**

Append to `packages/registry/src/index.ts`:

```ts
export type {
  BaseNode,
  AnyNode,
  InlineReactNode,
  IframeRouteNode,
  IframeComponentNode,
} from "@forkshop/types/node"
export type { NodeType, RenderProps, DrillInProps } from "@forkshop/types/node-type"
export {
  BUILTIN_NODE_TYPES,
  inlineReactNodeType,
  iframeRouteNodeType,
  iframeComponentNodeType,
} from "@forkshop/node-types"
export { NodeView, type NodeViewProps, resolveNodeType } from "@forkshop/components/canvas/node-view"
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm --filter @forkshop/registry typecheck && pnpm --filter @forkshop/registry lint`
Expected: PASS.

- [ ] **Step 4: Run the full registry test suite**

Run: `pnpm --filter @forkshop/registry test`
Expected: PASS — all old + new tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/registry/src/node-types/index.ts packages/registry/src/index.ts
git commit -m "feat(node-types): export BUILTIN_NODE_TYPES + Node/NodeType types"
```

---

## Task 10: Migrate `IframeGallery` → `Gallery`

Move the file from `kits/iframe-gallery.tsx` to `layouts/gallery.tsx`, rename the component, swap rendering from inline `LazyIframe` to `<NodeView>` driven by Node records. The stack/grid layout math is preserved verbatim. The compound `.icon` / `.defaultTitle` properties are preserved.

**Known simplification for this spec:** the old `IframeGallery` measured each iframe's body height and re-flowed the stack accordingly. The new `Gallery` uses a fixed `DEFAULT_INITIAL_HEIGHT` per cell. Height-syncing wiring is removed here because the new iframe NodeType doesn't yet expose an `onHeightChange` callback through `NodeView`. Re-introducing it is a future spec — for 1.0 launch, fixed-height iframes are acceptable per strategy. This is the only intentional behavior regression in the migration.

**Files:**
- Create: `packages/registry/src/layouts/gallery.tsx`
- Modify: `packages/registry/src/index.ts`

- [ ] **Step 1: Create the new file with the migrated component**

`packages/registry/src/layouts/gallery.tsx`:

```tsx
"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import type { AnyNode } from "@forkshop/types/node"
import { forkshopIcons } from "@forkshop/lib/icons"

const DEFAULT_INITIAL_HEIGHT = 600

const DEFAULTS = {
  stack: { viewportWidth: 1200, rowGap: 32, columnGap: 0 },
  grid: { viewportWidth: 400, rowGap: 48, columnGap: 32 },
} as const

export type GalleryEntry = {
  id: string
  label?: ReactNode
  node: AnyNode
  row?: number
  column?: number
}

export type GalleryProps = {
  entries: GalleryEntry[]
  layout: "stack" | "grid"
  viewportWidth?: number
  rowGap?: number
  columnGap?: number
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}

type LayoutCell = {
  id: string
  layoutX: number
  layoutY: number
  width: number
  height: number
}

function buildStackLayout(
  entries: GalleryEntry[],
  measuredHeights: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  const cells: LayoutCell[] = []
  let cursorY = 0
  for (const entry of entries) {
    const height = measuredHeights[entry.id] ?? DEFAULT_INITIAL_HEIGHT
    cells.push({ id: entry.id, layoutX: 0, layoutY: cursorY, width: viewportWidth, height })
    cursorY += height + rowGap
  }
  const stageHeight = Math.max(0, cursorY - rowGap)
  return { cells, stageWidth: viewportWidth, stageHeight }
}

function buildGridLayout(
  entries: GalleryEntry[],
  measuredHeights: Readonly<Record<string, number>>,
  viewportWidth: number,
  rowGap: number,
  columnGap: number,
): { cells: LayoutCell[]; stageWidth: number; stageHeight: number } {
  const rowMaxHeights = new Map<number, number>()
  for (const entry of entries) {
    const row = entry.row ?? 0
    const height = measuredHeights[entry.id] ?? DEFAULT_INITIAL_HEIGHT
    rowMaxHeights.set(row, Math.max(rowMaxHeights.get(row) ?? 0, height))
  }
  const sortedRows = [...rowMaxHeights.keys()].sort((a, b) => a - b)
  const rowY = new Map<number, number>()
  let cursorY = 0
  for (const row of sortedRows) {
    rowY.set(row, cursorY)
    cursorY += (rowMaxHeights.get(row) ?? DEFAULT_INITIAL_HEIGHT) + rowGap
  }
  let maxColumn = 0
  const cells: LayoutCell[] = []
  for (const entry of entries) {
    const row = entry.row ?? 0
    const column = entry.column ?? 0
    maxColumn = Math.max(maxColumn, column)
    const height = measuredHeights[entry.id] ?? DEFAULT_INITIAL_HEIGHT
    cells.push({
      id: entry.id,
      layoutX: column * (viewportWidth + columnGap),
      layoutY: rowY.get(row) ?? 0,
      width: viewportWidth,
      height,
    })
  }
  const stageWidth = (maxColumn + 1) * viewportWidth + maxColumn * columnGap
  const stageHeight = Math.max(0, cursorY - rowGap)
  return { cells, stageWidth, stageHeight }
}

const _Gallery = memo(GalleryInner)
export const Gallery: typeof _Gallery & {
  icon: typeof forkshopIcons.components
  defaultTitle: string
} = Object.assign(_Gallery, {
  icon: forkshopIcons.components,
  defaultTitle: "Components",
})

function GalleryInner({
  entries,
  layout,
  viewportWidth: vpwProp,
  rowGap: rgProp,
  columnGap: cgProp,
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
}: GalleryProps) {
  const viewportWidth = vpwProp ?? DEFAULTS[layout].viewportWidth
  const rowGap = rgProp ?? DEFAULTS[layout].rowGap
  const columnGap = cgProp ?? DEFAULTS[layout].columnGap

  const measuredHeights: Readonly<Record<string, number>> = {}

  const { cells, stageWidth, stageHeight } = useMemo(() => {
    return layout === "stack"
      ? buildStackLayout(entries, measuredHeights, viewportWidth, rowGap)
      : buildGridLayout(entries, measuredHeights, viewportWidth, rowGap, columnGap)
  }, [entries, layout, viewportWidth, rowGap, columnGap])

  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const handleGuidesChange = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides)
  }, [])

  const allTargets = useMemo<SnapTarget[]>(() => {
    return cells.map((cell) => {
      const override = nodePositions[cell.id]
      return {
        id: cell.id,
        x: override?.x ?? cell.layoutX,
        y: override?.y ?? cell.layoutY,
        width: cell.width,
        height: cell.height,
      }
    })
  }, [cells, nodePositions])

  const allTargetsRef = useRef(allTargets)
  useEffect(() => {
    allTargetsRef.current = allTargets
  }, [allTargets])

  const getSnapTargets = useCallback<GetSnapTargets>(
    (excludeId) => allTargetsRef.current.filter((t) => t.id !== excludeId),
    [],
  )

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => {
      onPositionChange?.(id, x, y)
    },
    [onPositionChange],
  )

  const handleSelectChange = useCallback(
    (id: string, selected: boolean) => {
      onSelectChange?.(id, selected)
    },
    [onSelectChange],
  )

  return (
    <>
      {cells.map((cell) => {
        const entry = entries.find((e) => e.id === cell.id)
        if (!entry) return null
        // Each entry's Node already carries (x, y, w, h); we override with the
        // cell positions computed by the layout so the Layout truly owns positioning.
        const positionedNode: AnyNode = {
          ...entry.node,
          x: cell.layoutX,
          y: cell.layoutY,
          width: cell.width,
          height: cell.height,
          label: entry.label ?? entry.node.label,
        }
        return (
          <NodeView
            key={cell.id}
            node={positionedNode}
            override={nodePositions[cell.id]}
            isSelected={selectedId === cell.id}
            onPositionChange={handlePositionChange}
            getSnapTargets={getSnapTargets}
            onGuidesChange={handleGuidesChange}
            onSelectChange={handleSelectChange}
          />
        )
      })}
      <GuideOverlay width={stageWidth} height={stageHeight} guides={activeGuides} />
    </>
  )
}
```

- [ ] **Step 2: Remove the old kits/iframe-gallery.tsx file**

```bash
git rm packages/registry/src/kits/iframe-gallery.tsx
```

- [ ] **Step 3: Update `index.ts` exports — drop `IframeGallery`, add `Gallery`**

In `packages/registry/src/index.ts`, find and remove:

```ts
export {
  IframeGallery,
  type IframeGalleryProps,
  type IframeGalleryEntry,
} from "@forkshop/kits/iframe-gallery"
```

Add in its place:

```ts
export { Gallery, type GalleryProps, type GalleryEntry } from "@forkshop/layouts/gallery"
```

- [ ] **Step 4: Add `@forkshop/layouts/*` to tsconfig and playground webpack aliases**

In `packages/registry/tsconfig.json`, ensure `paths` includes:

```json
"@forkshop/layouts/*": ["./src/layouts/*"],
"@forkshop/types/*": ["./src/types/*"],
"@forkshop/node-types/*": ["./src/node-types/*"]
```

(If those entries already exist via a wildcard, skip.)

In `apps/playground/next.config.mjs`, add the same aliases to the webpack `resolve.alias` block. Check the existing block first to match its style.

- [ ] **Step 5: Typecheck the registry**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS — the new layout file compiles. The playground will fail at typecheck because it still imports `IframeGallery`; that gets fixed in Task 11.

- [ ] **Step 6: Commit the Gallery migration (without playground updates)**

```bash
git add packages/registry/src/layouts/gallery.tsx packages/registry/src/index.ts packages/registry/tsconfig.json apps/playground/next.config.mjs
git commit -m "refactor(layouts): migrate IframeGallery to Gallery"
```

(The playground may be temporarily broken at this commit — Task 11 fixes it.)

---

## Task 11: Update playground Components Board for `Gallery`

The playground's `components-board.tsx` imports `IframeGallery` and feeds it `IframeGalleryEntry[]`. Migrate to `Gallery` + `GalleryEntry[]` whose `node` field is an `iframe-component` Node.

**Files:**
- Modify: `apps/playground/app/forkshop/components-board.tsx`
- Modify: `apps/playground/app/forkshop/page.tsx` (add `BUILTIN_NODE_TYPES` to `ForkshopCanvas`)

- [ ] **Step 1: Read the current `components-board.tsx`**

Read `apps/playground/app/forkshop/components-board.tsx` to understand its current shape.

- [ ] **Step 2: Update the imports**

Replace the existing `IframeGallery` import with:

```tsx
import { Gallery, type GalleryEntry } from "@forkshop/registry"
import type { IframeComponentNode } from "@forkshop/registry"
```

- [ ] **Step 3: Replace `entries: IframeGalleryEntry[]` construction with `GalleryEntry[]`**

Replace the existing block-to-entry mapping (look for `iframeSrc:` usage). Old shape:

```tsx
const entries: IframeGalleryEntry[] = forkshopConfig.blocks.map((b) => ({
  slug: b.slug, name: b.name, iframeSrc: b.iframeSrc,
}))
```

New shape:

```tsx
const entries: GalleryEntry[] = forkshopConfig.blocks.map((b): GalleryEntry => {
  const node: IframeComponentNode = {
    id: `block:${b.slug}`,
    kind: "iframe-component",
    x: 0,
    y: 0,
    width: 1200,
    height: 600,
    slug: b.slug,
    previewSrc: b.iframeSrc,
    componentPath: b.sourcePath,
  }
  return { id: node.id, label: b.name, node }
})
```

- [ ] **Step 4: Replace `<IframeGallery ... />` with `<Gallery ... />`**

Both components take identical positional props (`entries`, `layout`, `nodePositions`, etc.), so this is a one-token rename plus dropping any prop the new shape doesn't accept. Refer to the `Gallery` props in `layouts/gallery.tsx`.

- [ ] **Step 5: Pass `BUILTIN_NODE_TYPES` to `<ForkshopCanvas>` in `page.tsx`**

In `apps/playground/app/forkshop/page.tsx`, find `<ForkshopCanvas ...>` and add the prop:

```tsx
import { BUILTIN_NODE_TYPES } from "@forkshop/registry"
// ...
<ForkshopCanvas nodeTypes={BUILTIN_NODE_TYPES} ...>
```

- [ ] **Step 6: Typecheck the playground**

Run: `pnpm --filter playground typecheck`
Expected: PASS — the Components Board now references the new types.

- [ ] **Step 7: Manual browser check**

Start the dev server:

```bash
pnpm dev
```

Open `http://localhost:3000/forkshop` in a browser. Switch to the Components board. Verify:
- All three blocks render
- You can drag them
- Selecting one outlines it
- Drag positions persist on reload

If any of these fail, stop and debug before continuing.

- [ ] **Step 8: Commit**

```bash
git add apps/playground/app/forkshop/components-board.tsx apps/playground/app/forkshop/page.tsx
git commit -m "refactor(playground): wire Gallery + BUILTIN_NODE_TYPES"
```

---

## Task 12: Migrate `PageTree` → `Tree`

Move `kits/page-tree.tsx` → `layouts/tree.tsx`, swap rendering to `<NodeView>`. The isolation/drill-in view used by today's PageTree is replaced by the engine's drill-in mechanics — but those aren't built yet, so we preserve the existing internal isolation behavior under the new file name. The drill-in path from the iframe-route NodeType is the future replacement; in this Task we keep behavior identical and let the future drill-in spec replace it.

**Files:**
- Create: `packages/registry/src/layouts/tree.tsx`
- Modify: `packages/registry/src/index.ts`

- [ ] **Step 1: Create `layouts/tree.tsx` mirroring the old `page-tree.tsx`**

Start from the current contents of `packages/registry/src/kits/page-tree.tsx` (read it in full). Apply these transforms:

1. Rename the component `PageTree` → `Tree`. Keep the compound `.icon` / `.defaultTitle` property pattern; icon stays `forkshopIcons.pages`, defaultTitle stays `"Pages"`.
2. Rename `PageTreeProps` → `TreeProps`, `PageTreeEntry` → `TreeEntry`.
3. Add `node: AnyNode` to `TreeEntry`. Old `path` and optional `label` stay; the consumer constructs the Node.
4. Inside `SitemapView` and `PageTile`, replace `<CanvasNode>...<LazyIframe />` with `<NodeView node={positionedNode} ... />`. Construct `positionedNode` by spreading `entry.node` with the cell's `layoutX/Y/width/height` (TILE_WIDTH/TILE_HEIGHT).
5. Drop the inline iframe-wheel + `useRegisterIframe` logic from the tile — that now lives inside `iframeRouteNodeType.render`.
6. Drop `iframeSrcResolver` — the entry's Node already carries `routePath`. (Resolver was a convenience; callers can pre-resolve when building entries.)
7. Keep the `IsolationView` block (drill-in) using `ResponsiveFrameView` directly for now. A follow-up spec will replace this with engine-level drill-in mechanics.

The final file shape:

```tsx
"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { ReactNode } from "react"
import { BackButton } from "@forkshop/components/canvas/back-button"
import { NodeView } from "@forkshop/components/canvas/node-view"
import { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
import { ResponsiveFrameView } from "@forkshop/components/canvas/responsive-frame-view"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useAgentActivePages } from "@forkshop/components/agent-activity-context"
import type { GetSnapTargets } from "@forkshop/hooks/use-draggable-node"
import type { NodePositions } from "@forkshop/lib/node-positions"
import type { SnapGuide, SnapTarget } from "@forkshop/lib/system-snap"
import type { AnyNode } from "@forkshop/types/node"
import { forkshopIcons } from "@forkshop/lib/icons"

const TILE_WIDTH = 400
const TILE_HEIGHT = 280
const COLUMNS = 4
const TILE_GAP_X = 32
const TILE_GAP_Y = 48

export type TreeEntry = {
  id: string
  label?: ReactNode
  path: string
  node: AnyNode
}

export type TreeProps = {
  entries: TreeEntry[]
  viewports?: number[]
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
  isolatedPath?: string
  onBack?: () => void
  onIsolatedPathChange?: (path: string | null) => void
}

type TileCell = {
  id: string
  path: string
  layoutX: number
  layoutY: number
}

function buildTileLayout(entries: TreeEntry[]): TileCell[] {
  return entries.map((entry, index) => {
    const col = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    return {
      id: entry.id,
      path: entry.path,
      layoutX: col * (TILE_WIDTH + TILE_GAP_X),
      layoutY: row * (TILE_HEIGHT + TILE_GAP_Y),
    }
  })
}

function stageSize(cells: TileCell[]): { width: number; height: number } {
  if (cells.length === 0) return { width: 0, height: 0 }
  const maxX = Math.max(...cells.map((c) => c.layoutX)) + TILE_WIDTH
  const maxY = Math.max(...cells.map((c) => c.layoutY)) + TILE_HEIGHT
  return { width: maxX, height: maxY }
}

const _Tree = memo(TreeInner)
export const Tree: typeof _Tree & {
  icon: typeof forkshopIcons.pages
  defaultTitle: string
} = Object.assign(_Tree, {
  icon: forkshopIcons.pages,
  defaultTitle: "Pages",
})

function TreeInner({
  entries,
  viewports = [1440, 768, 375],
  nodePositions = {},
  onPositionChange,
  selectedId,
  onSelectChange,
  isolatedPath: controlledIsolatedPath,
  onBack,
  onIsolatedPathChange,
}: TreeProps) {
  const [internalIsolated, setInternalIsolated] = useState<string | null>(null)
  const effectiveIsolated =
    controlledIsolatedPath !== undefined
      ? entries.some((e) => e.path === controlledIsolatedPath)
        ? controlledIsolatedPath
        : null
      : internalIsolated

  const handleIsolate = (path: string) => {
    setInternalIsolated(path)
    if (controlledIsolatedPath === undefined) {
      onIsolatedPathChange?.(path)
    }
  }

  const handleBack = () => {
    if (onBack) {
      setInternalIsolated(null)
      if (controlledIsolatedPath === undefined) {
        onIsolatedPathChange?.(null)
      }
      onBack()
    } else {
      setInternalIsolated(null)
      onIsolatedPathChange?.(null)
    }
  }

  const showBackButton = controlledIsolatedPath === undefined && internalIsolated !== null

  if (effectiveIsolated !== null) {
    const isolated = entries.find((e) => e.path === effectiveIsolated)
    return (
      <IsolationView
        path={effectiveIsolated}
        src={isolated?.path ?? effectiveIsolated}
        viewports={viewports}
        showBackButton={showBackButton}
        onBack={handleBack}
      />
    )
  }

  return (
    <SitemapView
      entries={entries}
      nodePositions={nodePositions}
      onPositionChange={onPositionChange}
      selectedId={selectedId}
      onSelectChange={onSelectChange}
      onIsolate={handleIsolate}
    />
  )
}

function SitemapView({
  entries,
  nodePositions,
  onPositionChange,
  selectedId,
  onSelectChange,
  onIsolate,
}: {
  entries: TreeEntry[]
  nodePositions: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
  onIsolate: (path: string) => void
}) {
  const cells = useMemo(() => buildTileLayout(entries), [entries])
  const { width: stageWidth, height: stageHeight } = useMemo(() => stageSize(cells), [cells])
  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const handleGuidesChange = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides)
  }, [])

  const allTargets = useMemo<SnapTarget[]>(() => {
    return cells.map((cell) => {
      const override = nodePositions[cell.id]
      return {
        id: cell.id,
        x: override?.x ?? cell.layoutX,
        y: override?.y ?? cell.layoutY,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
      }
    })
  }, [cells, nodePositions])

  const allTargetsRef = useRef(allTargets)
  useEffect(() => {
    allTargetsRef.current = allTargets
  }, [allTargets])

  const getSnapTargets = useCallback<GetSnapTargets>(
    (excludeId) => allTargetsRef.current.filter((t) => t.id !== excludeId),
    [],
  )

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => onPositionChange?.(id, x, y),
    [onPositionChange],
  )
  const handleSelectChange = useCallback(
    (id: string, selected: boolean) => onSelectChange?.(id, selected),
    [onSelectChange],
  )

  return (
    <>
      {cells.map((cell) => {
        const entry = entries.find((e) => e.id === cell.id)
        if (!entry) return null
        const positionedNode: AnyNode = {
          ...entry.node,
          x: cell.layoutX,
          y: cell.layoutY,
          width: TILE_WIDTH,
          height: TILE_HEIGHT,
          label: entry.label ?? entry.node.label,
        }
        return (
          <NodeView
            key={cell.id}
            node={positionedNode}
            override={nodePositions[cell.id]}
            isSelected={selectedId === cell.id}
            onIsolate={() => onIsolate(entry.path)}
            onPositionChange={handlePositionChange}
            getSnapTargets={getSnapTargets}
            onGuidesChange={handleGuidesChange}
            onSelectChange={handleSelectChange}
          />
        )
      })}
      <GuideOverlay width={stageWidth} height={stageHeight} guides={activeGuides} />
    </>
  )
}

function IsolationView({
  path,
  src,
  viewports,
  showBackButton,
  onBack,
}: {
  path: string
  src: string
  viewports: number[]
  showBackButton: boolean
  onBack: () => void
}) {
  const { applyWheelInput, transformRef, containerRef } = useForkshopCanvas()
  const activePages = useAgentActivePages()
  const agentActive = activePages.has(path)
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  const [containerReady, setContainerReady] = useState(false)
  useEffect(() => {
    setContainerReady(!!containerRef.current)
  }, [containerRef])

  const handleBodyHeightChange = useCallback((_id: string, height: number) => {
    setMeasuredHeight(height)
  }, [])

  const handleIframeWheel = useCallback(
    (event: WheelEvent, iframe: HTMLIFrameElement) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
      const iframeRect = iframe.getBoundingClientRect()
      const zoom = transformRef.current?.zoom ?? 1
      applyWheelInput({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        pinch: event.ctrlKey || event.metaKey,
        screenX: iframeRect.left + event.clientX * zoom,
        screenY: iframeRect.top + event.clientY * zoom,
      })
    },
    [applyWheelInput, transformRef],
  )

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {showBackButton &&
        containerReady &&
        containerRef.current &&
        createPortal(
          <BackButton destinationLabel="Overview" onBack={onBack} />,
          containerRef.current,
        )}
      <ResponsiveFrameView
        kind="page"
        path={path}
        source={src}
        measuredHeight={measuredHeight}
        onBodyHeightChange={handleBodyHeightChange}
        onIframeWheel={handleIframeWheel}
        viewports={viewports}
        agentActive={agentActive}
      />
    </div>
  )
}
```

- [ ] **Step 2: Remove the old kits/page-tree.tsx file**

```bash
git rm packages/registry/src/kits/page-tree.tsx
```

- [ ] **Step 3: Update `index.ts` — drop `PageTree`, add `Tree`**

In `packages/registry/src/index.ts`, find and remove:

```ts
export {
  PageTree,
  type PageTreeProps,
  type PageTreeEntry,
} from "@forkshop/kits/page-tree"
```

Add in its place:

```ts
export { Tree, type TreeProps, type TreeEntry } from "@forkshop/layouts/tree"
```

- [ ] **Step 4: Typecheck the registry**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS.

- [ ] **Step 5: Commit (playground temporarily broken)**

```bash
git add packages/registry/src/layouts/tree.tsx packages/registry/src/index.ts packages/registry/src/kits/page-tree.tsx
git commit -m "refactor(layouts): migrate PageTree to Tree"
```

---

## Task 13: Update playground Pages Board for `Tree`

**Files:**
- Modify: `apps/playground/app/forkshop/pages-board.tsx`

- [ ] **Step 1: Read the current `pages-board.tsx`**

Read `apps/playground/app/forkshop/pages-board.tsx`.

- [ ] **Step 2: Update imports + entry construction**

Replace `PageTree` and `PageTreeEntry` imports with:

```tsx
import { Tree, type TreeEntry } from "@forkshop/registry"
import type { IframeRouteNode } from "@forkshop/registry"
```

Convert the page list. Old shape:

```tsx
const entries: PageTreeEntry[] = forkshopConfig.pages.map((p) => ({ path: p.path }))
```

New shape:

```tsx
const entries: TreeEntry[] = forkshopConfig.pages.map((p): TreeEntry => {
  const node: IframeRouteNode = {
    id: `page:${p.path}`,
    kind: "iframe-route",
    x: 0,
    y: 0,
    width: 400,
    height: 280,
    routePath: p.path,
  }
  return { id: node.id, path: p.path, node }
})
```

- [ ] **Step 3: Replace `<PageTree ... />` with `<Tree ... />`**

Token rename. Drop any `iframeSrcResolver` prop usage.

- [ ] **Step 4: Typecheck the playground**

Run: `pnpm --filter playground typecheck`
Expected: PASS — both Components and Pages boards now use the new shapes.

- [ ] **Step 5: Manual browser check**

`pnpm dev`, open Pages board:
- Pages render in grid
- Drag works
- Double-click drills into responsive 3-viewport view
- Back button returns to overview
- Positions persist on reload

- [ ] **Step 6: Commit**

```bash
git add apps/playground/app/forkshop/pages-board.tsx
git commit -m "refactor(playground): wire Tree into Pages board"
```

---

## Task 14: Migrate `DesignSystemBoard` → `DesignSystemGraph`

Move `kits/design-system-board.tsx` → `layouts/design-system-graph.tsx`. Color swatches and primitive frames become `inline-react` Nodes rendered via `<NodeView>`; typography is taken as an optional `inline-react` Node prop. Edges between raw and semantic tokens remain SVG chrome.

This is the largest migration. The current file is ~500 LOC. We preserve the layout math (`layoutSystem`, `buildSystemGraph`, primitive layout helpers) and the SVG edges; we change only the rendering path for individual swatches/frames.

**Files:**
- Create: `packages/registry/src/layouts/design-system-graph.tsx`
- Modify: `packages/registry/src/index.ts`

- [ ] **Step 1: Read the full current implementation**

Read `packages/registry/src/kits/design-system-board.tsx` end-to-end. Read also `packages/registry/src/kits/typography-frame.tsx` and `packages/registry/src/kits/primitives-showcase.tsx` (these will be absorbed).

- [ ] **Step 2: Create `layouts/design-system-graph.tsx`**

The new file structure:

- Top-level imports stay the same shape as the old `design-system-board.tsx`, but:
  - Replace `import { CanvasNode } from "@forkshop/components/canvas/canvas-node"` with `import { NodeView } from "@forkshop/components/canvas/node-view"`
  - Drop `import { TypographyFrame, type TypographyFrameProps } from "@forkshop/kits/typography-frame"`
  - Drop `import { type PrimitiveDescriptor } from "@forkshop/kits/primitives-showcase"`
  - Add `import type { AnyNode, InlineReactNode } from "@forkshop/types/node"`

- Replace `DesignSystemBoardProps` with `DesignSystemGraphProps`:

```ts
export type PrimitiveGroup = {
  id: string
  label: string
  primitives: AnyNode[]
}

export type DesignSystemGraphProps = {
  tokens: TokenRegistry
  primitives: PrimitiveGroup[]
  typography?: AnyNode
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}
```

Note: the `tailwindConfig` input is replaced by a pre-built `TokenRegistry`. Callers now build the registry once (likely in `forkshop.config.tsx` or the Board file) and pass it in. This decouples the Layout from the build step.

- Inside the component body, replace every spot that rendered a color swatch via `<CanvasNode>...<ColorSwatchBody />` with a constructed `InlineReactNode` and `<NodeView>`:

```tsx
const colorNode: InlineReactNode = {
  id: `color:${colorEntry.id}`,
  kind: "inline-react",
  x: positioned.x,
  y: positioned.y,
  width: COLOR_NODE_WIDTH,
  height: COLOR_NODE_HEIGHT,
  label: colorEntry.label,
  render: () => <ColorSwatchBody entry={colorEntry} />,
}
```

(Inline the `ColorSwatchBody` component locally — it's the same JSX the old code rendered as `<CanvasNode>`'s children.)

- Similarly, primitives:

```tsx
{primitives.flatMap((group) =>
  group.primitives.map((primitive) => (
    <NodeView
      key={primitive.id}
      node={{ ...primitive, x: pos.x, y: pos.y, width: pos.width, height: pos.height }}
      override={nodePositions[primitive.id]}
      isSelected={selectedId === primitive.id}
      onPositionChange={handlePositionChange}
      getSnapTargets={getSnapTargets}
      onGuidesChange={handleGuidesChange}
      onSelectChange={handleSelectChange}
    />
  )),
)}
```

- For typography:

```tsx
{typography && (
  <NodeView
    node={{
      ...typography,
      x: typographyPosition.x,
      y: typographyPosition.y,
      width: typographyPosition.width,
      height: typographyPosition.height,
    }}
    override={nodePositions[typography.id]}
    isSelected={selectedId === typography.id}
    onPositionChange={handlePositionChange}
    getSnapTargets={getSnapTargets}
    onGuidesChange={handleGuidesChange}
    onSelectChange={handleSelectChange}
  />
)}
```

- Preserve the SVG edges rendering exactly as today (the `<svg>` element with paths between raw and semantic color positions).

- Preserve the compound `.icon` / `.defaultTitle` pattern:

```ts
export const DesignSystemGraph: typeof _DesignSystemGraph & {
  icon: typeof forkshopIcons.foundations
  defaultTitle: string
} = Object.assign(_DesignSystemGraph, {
  icon: forkshopIcons.foundations,
  defaultTitle: "Foundations",
})
```

(Check `forkshopIcons.foundations` exists; if the old code used a different icon key, match it.)

- [ ] **Step 3: Remove the old kit files**

```bash
git rm packages/registry/src/kits/design-system-board.tsx
git rm packages/registry/src/kits/typography-frame.tsx
git rm packages/registry/src/kits/primitives-showcase.tsx
```

- [ ] **Step 4: Update `index.ts` — drop old exports, add new ones**

In `packages/registry/src/index.ts`, find and remove:

```ts
export { DesignSystemBoard, type DesignSystemBoardProps } from "@forkshop/kits/design-system-board"
export { TypographyFrame, type TypographyFrameProps } from "@forkshop/kits/typography-frame"
export {
  PrimitivesShowcase,
  type PrimitivesShowcaseProps,
  type PrimitiveDescriptor,
} from "@forkshop/kits/primitives-showcase"
```

Add in their place:

```ts
export {
  DesignSystemGraph,
  type DesignSystemGraphProps,
  type PrimitiveGroup,
} from "@forkshop/layouts/design-system-graph"
```

- [ ] **Step 5: Typecheck the registry**

Run: `pnpm --filter @forkshop/registry typecheck`
Expected: PASS.

- [ ] **Step 6: Commit (playground temporarily broken)**

```bash
git add packages/registry/src/layouts/design-system-graph.tsx packages/registry/src/index.ts packages/registry/src/kits/
git commit -m "refactor(layouts): migrate DesignSystemBoard to DesignSystemGraph"
```

---

## Task 15: Update playground Foundations Board for `DesignSystemGraph`

The playground's `design-system-board.tsx` consumes the old `DesignSystemBoard` API. It needs the new shape: pass a `TokenRegistry` (built from `tailwindConfig`), a `PrimitiveGroup[]`, and an optional typography Node. Absorb the old `TypographyFrame` content into a local typography component inside this file.

**Files:**
- Modify: `apps/playground/app/forkshop/design-system-board.tsx`

- [ ] **Step 1: Read the current `design-system-board.tsx`**

Read `apps/playground/app/forkshop/design-system-board.tsx`.

- [ ] **Step 2: Update imports**

Replace `DesignSystemBoard` and related types/components. New imports:

```tsx
import {
  DesignSystemGraph,
  type PrimitiveGroup,
  buildTokenRegistry,
} from "@forkshop/registry"
import type { AnyNode, InlineReactNode } from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"
```

- [ ] **Step 3: Build the TokenRegistry once**

Inside the Board component, build the registry up front:

```tsx
const tokens = useMemo(() => buildTokenRegistry(forkshopConfig.tailwindConfig), [])
```

- [ ] **Step 4: Construct primitive groups as InlineReactNode arrays**

```tsx
const primitives = useMemo<PrimitiveGroup[]>(() => {
  return [
    {
      id: "ui",
      label: "UI Primitives",
      primitives: forkshopConfig.primitives.map<InlineReactNode>((p) => ({
        id: `primitive:${p.id}`,
        kind: "inline-react",
        x: 0,
        y: 0,
        width: 720,
        height: 480,
        label: p.name,
        filePath: p.sourcePath,
        render: p.render,
      })),
    },
  ]
}, [])
```

- [ ] **Step 5: Construct a typography Node**

The old `TypographyFrame` rendered headings + body text using the project's font stack. Inline an equivalent locally (this absorbs the deleted `typography-frame.tsx` content). Define inside the Board file or in a sibling component file:

```tsx
function TypographySamples() {
  return (
    <div className="bg-white shadow-md p-8 space-y-4">
      <h1 className="text-4xl font-bold">Heading 1</h1>
      <h2 className="text-3xl font-semibold">Heading 2</h2>
      <h3 className="text-2xl font-semibold">Heading 3</h3>
      <p className="text-base">Body text. The quick brown fox jumps over the lazy dog.</p>
      <p className="text-sm text-gray-600">Small body text.</p>
    </div>
  )
}

const typographyNode: InlineReactNode = {
  id: "typography",
  kind: "inline-react",
  x: 0,
  y: 0,
  width: 720,
  height: 920,
  label: "Typography",
  render: () => <TypographySamples />,
}
```

(Mirror the actual content of the old `TypographyFrame` if it had richer features; this is the minimum-viable replacement.)

- [ ] **Step 6: Replace `<DesignSystemBoard ... />` with `<DesignSystemGraph ... />`**

```tsx
<DesignSystemGraph
  tokens={tokens}
  primitives={primitives}
  typography={typographyNode}
  nodePositions={nodePositions}
  onPositionChange={onPositionChange}
  selectedId={selectedId}
  onSelectChange={onSelectChange}
/>
```

- [ ] **Step 7: Typecheck the playground**

Run: `pnpm --filter playground typecheck`
Expected: PASS — all three Boards now use the new shapes.

- [ ] **Step 8: Manual browser check**

`pnpm dev`, open Foundations board. Verify:
- Color swatches render in the graph
- Edges connect raw to semantic tokens
- Primitive frames render and you can interact with them (Button clickable, etc.)
- Typography renders
- All nodes draggable, positions persist

- [ ] **Step 9: Commit**

```bash
git add apps/playground/app/forkshop/design-system-board.tsx
git commit -m "refactor(playground): wire DesignSystemGraph in Foundations board"
```

---

## Task 16: Remove the `canvas-node.tsx` shim

All consumers now go through `NodeView`. The re-export shim is dead.

**Files:**
- Modify: `packages/registry/src/index.ts`
- Remove: `packages/registry/src/components/canvas/canvas-node.tsx`

- [ ] **Step 1: Verify no remaining usage**

Run: `grep -rn "from \"@forkshop/components/canvas/canvas-node\"" packages apps`
Expected: zero hits.

Run: `grep -rn "CanvasNode" packages apps`
Expected: zero hits in `packages/` or `apps/` (other than `node-frame.tsx` itself, which doesn't reference the old name).

If anything matches, fix the consumer first.

- [ ] **Step 2: Remove the file and its export**

```bash
git rm packages/registry/src/components/canvas/canvas-node.tsx
```

In `packages/registry/src/index.ts`, find and remove:

```ts
export { CanvasNode } from "@forkshop/components/canvas/canvas-node"
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm --filter @forkshop/registry typecheck && pnpm --filter @forkshop/registry lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/registry/src/components/canvas/canvas-node.tsx packages/registry/src/index.ts
git commit -m "refactor(canvas): remove canvas-node shim"
```

---

## Task 17: Slim `index.ts` to the new public API

Remove ~35 demoted exports. Keep the ~15 named exports specified in the spec.

**Files:**
- Modify: `packages/registry/src/index.ts`

- [ ] **Step 1: Rewrite `index.ts` to the slimmed surface**

Replace the entire `packages/registry/src/index.ts` file with this content (this is the full new file — preserve the order and grouping):

```ts
// Engine shell
export { ForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
export { ForkshopSidebar } from "@forkshop/components/sidebar/forkshop-sidebar"
export type {
  ForkshopSelection,
  SidebarSection,
  SidebarEntry,
} from "@forkshop/components/sidebar/forkshop-sidebar"

// Layouts
export { Gallery, type GalleryProps, type GalleryEntry } from "@forkshop/layouts/gallery"
export { Tree, type TreeProps, type TreeEntry } from "@forkshop/layouts/tree"
export {
  DesignSystemGraph,
  type DesignSystemGraphProps,
  type PrimitiveGroup,
} from "@forkshop/layouts/design-system-graph"

// NodeType contract + types
export type {
  BaseNode,
  AnyNode,
  InlineReactNode,
  IframeRouteNode,
  IframeComponentNode,
} from "@forkshop/types/node"
export type { NodeType, RenderProps, DrillInProps } from "@forkshop/types/node-type"
export {
  BUILTIN_NODE_TYPES,
  inlineReactNodeType,
  iframeRouteNodeType,
  iframeComponentNodeType,
} from "@forkshop/node-types"

// Dispatcher
export { NodeView, type NodeViewProps } from "@forkshop/components/canvas/node-view"

// Standalone UI (top-level mount points)
export { ForkshopIcon, type ForkshopIconComponent } from "@forkshop/components/icon"
export { LocatorInit } from "@forkshop/components/locator-init"
export { InspectPanel } from "@forkshop/components/inspect-panel"
export { forkshopIcons, type ForkshopIconName } from "@forkshop/lib/icons"

// Agent activity (kept public — user-side may inspect)
export {
  AgentActivityProvider,
  useAgentSeenPagePaths,
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
  usePageActiveFallback,
  useSiteWideActivity,
  useAgentSubstringsForPage,
  useAgentSubstringsForBlock,
  useAllAgentSubstrings,
  useAgentEditEpoch,
  deriveAffectedBlocks,
} from "@forkshop/components/agent-activity-context"
export type { ActivityEntry, FileMap } from "@forkshop/components/agent-activity-context"
export type { ActivityEntry as AgentActivityStateEntry } from "@forkshop/lib/agent-activity-state"
export { recordActivity, subscribe } from "@forkshop/lib/agent-activity-state"
export { AgentIframeRelay } from "@forkshop/components/agent-iframe-relay"
export { AgentSelectionChip } from "@forkshop/components/agent-selection-chip"

// Iframe registry (used by AgentIframeRelay consumers and may stay public)
export {
  IframeRegistryProvider,
  useIframeRegistry,
  useRegisterIframe,
} from "@forkshop/components/iframe-registry"

// Token registry (public — user code references tokens)
export {
  buildTokenRegistry,
  setActiveTokenRegistry,
  getActiveTokenRegistry,
  findTokenForClass,
  type TokenEntry,
  type TokenRegistry,
  type ClassLookupEntry,
} from "@forkshop/lib/token-registry"

// File-to-selection (public — user code wires sidebar selection)
export { filePathToRoute, fileToSelection } from "@forkshop/lib/file-to-selection"

// Selection-hash (public — used by user-side page mount)
export {
  serializeSelection,
  parseSelection,
} from "@forkshop/components/sidebar/selection-hash"
```

- [ ] **Step 2: Typecheck the workspace**

Run: `pnpm typecheck`
Expected: PASS for the registry; the playground MAY fail if it imports something now demoted.

If any playground TypeScript errors appear, list them. Likely candidates: `LazyIframe`, `ResponsiveFrameView`, `CanvasNode`, `useDraggableNode`, `buildSystemGraph`, `layoutSystem`, `EditPopover`, `SpacingPicker`, `SpacingBodyMenu` — any of these imported directly from `@forkshop/registry` in playground code.

Resolution policy: the playground should not be importing these. If it does, either:
1. Move the playground call site into a kit/layout/board pattern that uses public exports.
2. Add the demoted item back to `index.ts` if it represents a genuine 1.0 user-side need.

Default: option 1. Add back only if option 1 isn't reasonable.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm --filter @forkshop/registry test`
Expected: PASS.

- [ ] **Step 4: Browser smoke test**

`pnpm dev`. Open `http://localhost:3000/forkshop`. Walk through all three Boards (Foundations, Pages, Components). For each:
- Layout renders without console errors
- Drag works
- Selection works
- Drill-in (where applicable) works
- Back button (where applicable) works
- Refresh — positions persist

If any agent-glow / live-AI behavior is in your dev environment, exercise that too — edit a primitive file and confirm the corresponding Node glows.

- [ ] **Step 5: Commit**

```bash
git add packages/registry/src/index.ts
git commit -m "refactor(registry): slim public API to the new surface"
```

---

## Task 18: Final verification — full `pnpm check` + browser walkthrough

- [ ] **Step 1: Run `pnpm check` from repo root**

```bash
pnpm check
```

Expected: typecheck + lint pass across all workspace packages.

- [ ] **Step 2: Run all tests**

```bash
pnpm -r test
```

Expected: PASS (registry test suite includes the new dispatch + 3 NodeType tests).

- [ ] **Step 3: Lint canonical imports**

```bash
pnpm --filter @forkshop/registry lint
```

Expected: PASS — the canonical-imports check confirms every cross-file import inside `packages/registry/src/**` uses the `@forkshop/*` alias.

- [ ] **Step 4: Browser walkthrough**

`pnpm dev`. Walk through these flows in `http://localhost:3000/forkshop`:

1. **Foundations board**
   - All color swatches visible in the graph
   - SVG edges connect raw → semantic
   - Primitive frames render and are interactive (click Button, type in Input)
   - Typography frame renders
   - Drag a primitive → position persists on reload

2. **Pages board**
   - Page tiles render in 4-column grid
   - Drag a tile → position persists on reload
   - Double-click a tile → 3-viewport responsive drill-in
   - Back button → returns to grid

3. **Components board**
   - Block iframes render
   - Drag works; positions persist
   - Stack/grid layout switches as expected

4. **Cross-cutting**
   - ⌘0 fits the view
   - Spacebar+drag pans
   - Pinch-zoom works
   - Hover outline shows
   - Selection outline shows

5. **(If your dev environment runs Claude Code with the Forkshop hook)**
   - Edit a primitive's source file
   - Confirm the corresponding Node glows on the canvas

- [ ] **Step 5: If any browser flow fails, stop and debug**

Don't claim completion until every browser flow above passes. The 35-export slim-down is the highest-risk step; if anything broke, it's most likely a missing re-export that the playground silently relied on.

- [ ] **Step 6: Final commit (if any verification fixes were needed)**

If steps 1-4 surfaced no issues, no final commit is needed. If they did, commit any fixes individually with appropriate `fix(...)` messages.

---

## Spec coverage check

| Spec section | Implementing task(s) |
|---|---|
| Types: `BaseNode`, `AnyNode`, 3 concrete Node types | Task 1 |
| Types: `NodeType<T>`, `RenderProps<T>`, `DrillInProps<T>` | Task 2 |
| Dispatcher pair: `NodeFrame` + `NodeView` | Tasks 3, 5 |
| Extend `ForkshopCanvas` with `nodeTypes` prop + context | Task 4 |
| `inlineReactNodeType` | Task 6 |
| `iframeRouteNodeType` | Task 7 |
| `iframeComponentNodeType` | Task 8 |
| `BUILTIN_NODE_TYPES` array | Task 9 |
| `Gallery` Layout (was `iframe-gallery.tsx`) | Tasks 10, 11 |
| `Tree` Layout (was `page-tree.tsx`) | Tasks 12, 13 |
| `DesignSystemGraph` Layout (was `design-system-board.tsx`) | Tasks 14, 15 |
| Color swatches as inline-react Nodes | Task 14 |
| `primitives-showcase.tsx` absorbed into playground | Task 15 |
| `typography-frame.tsx` absorbed into playground | Task 15 |
| Remove `canvas-node.tsx` shim | Task 16 |
| Slim `index.ts` to ~15 exports | Task 17 |
| Contract tests for dispatch + 3 NodeType impls | Tasks 5, 6, 7, 8 |
| Browser verification at every Layout migration | Tasks 11, 13, 15, 18 |
| Final `pnpm check` clean | Task 18 |
