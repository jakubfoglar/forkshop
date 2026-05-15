# NodeType + Layout extraction — implementation spec

Date: 2026-05-15
Status: Approved (brainstorming) — ready for plan
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md`
Estimated effort: ~2 weeks (per strategy roadmap)

## Goal

Extract the engine surface from the existing registry into the Node / NodeType / Layout shapes defined in the v2 strategy. Refactor `canvas-node.tsx` into a type-dispatcher. Port the three existing kit files into the three built-in Layouts. Pin down the TypeScript shapes of `NodeType`, `RenderProps`, and `DrillInProps`. Slim the public API of `@forkshop/registry` to ~15 named exports.

All work stays inside `packages/registry/` as it is today. Package rename (`registry` → `engine`), build pipeline, compiled CSS, icon set, and CLI changes are out of scope — those land in downstream specs (engine-packaging, CLI rework).

## Scope edges

**In scope:**
- New types: `BaseNode`, `AnyNode`, the 3 concrete Node types, `NodeType<T>`, `RenderProps<T>`, `DrillInProps<T>`.
- Dispatcher pair: `<NodeFrame>` (chrome wrapper, carved out of current `canvas-node.tsx`) and `<NodeView>` (the dispatcher that looks up NodeType and calls `render`).
- `<ForkshopCanvas>` extended with a `nodeTypes` prop and context exposure.
- Three built-in NodeType implementations: `inlineReactNodeType`, `iframeRouteNodeType`, `iframeComponentNodeType`.
- Three built-in Layouts: `Gallery`, `Tree`, `DesignSystemGraph` — moved from `kits/` to a new `layouts/` directory and renamed.
- Public API slim-down in `packages/registry/src/index.ts`.
- Playground (`apps/playground`) migrated end-to-end to the new shapes.
- Contract tests for `<NodeView>` dispatch and the 3 NodeType impls.

**Out of scope (deferred to other specs):**
- `packages/registry` → `packages/engine` rename → *engine packaging spec*.
- tsup build, compiled CSS, SVG icon set, dependency cleanup → *engine packaging spec*.
- User-side NodeType scaffolding (`app/forkshop/node-types/`), CLI flow → *CLI rework spec*.
- New kit definitions (`marketing`, `saas`, `default`) → *kits rewrite spec*.
- Live-AI producer protocol changes → *live AI spec*.

## Architecture

### Data flow

```
ForkshopCanvas (engine)
  ├── nodeTypes={[inlineReact, iframeRoute, iframeComponent]}  ← passed by user
  └── context exposes nodeTypes + selection state + drag state + agent state
       │
       └── Layout (Gallery | Tree | DesignSystemGraph)
            ├── reads typed entries (props)
            ├── computes positions (the kit's existing layout math stays here)
            ├── emits Node records: { id, kind, x, y, w, h, label?, ...data }
            └── renders Layout chrome (e.g., DSG's SVG edges, Tree's connector lines)
                  + one <NodeView node={...} /> per Node
                    │
                    └── NodeView (the dispatcher)
                         ├── iterates ctx.nodeTypes, finds first matching .match(node)
                         ├── wraps with <NodeFrame> (outline / drag / agent-chip chrome)
                         └── calls nodeType.render({ node, isSelected, agentActive, ... })
```

### Strict layering

- **Layouts position; they do not render Node bodies.** Each Layout emits Node records with `(x, y, width, height)` and renders Layout chrome (edges, connectors). The Node body comes from `NodeType.render`.
- **NodeTypes render bodies; they do not own chrome.** Selection outlines, drag handles, agent-glow rings, and per-Node labels live on `<NodeFrame>`, owned by the dispatcher.
- **The dispatcher knows nothing about Node data shape.** It iterates `ctx.nodeTypes` and trusts each NodeType's `match` predicate.

### NodeType discovery

NodeTypes are passed explicitly to `<ForkshopCanvas nodeTypes={[...]}>` and exposed to descendants via context. Layouts read the array via context; `<NodeView>` consults it for dispatch.

Order in the array is significant: the first `match(node) === true` wins. This lets user-defined NodeTypes (later) take precedence over built-ins by appearing earlier in the array — e.g., `nodeTypes={[myCustomIframeRoute, ...BUILTIN_NODE_TYPES]}`.

## TypeScript shapes

### Node types

```ts
// packages/registry/src/types/node.ts
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
  filePath?: string         // for live-AI activity matching
  render: () => ReactNode   // closure; engine just calls it
}

export type IframeRouteNode = BaseNode & {
  kind: "iframe-route"
  routePath: string                          // "/about"
  drillInMode?: "single" | "responsive"      // default: "responsive"
}

export type IframeComponentNode = BaseNode & {
  kind: "iframe-component"
  slug: string
  previewSrc: string                         // resolved URL e.g. "/forkshop/preview/<slug>"
  componentPath?: string                     // for live-AI activity matching
  drillInMode?: "single" | "responsive"      // default: "single"
}

export type AnyNode = InlineReactNode | IframeRouteNode | IframeComponentNode
```

`AnyNode` is closed over the three built-in types at 1.0. Future user-side NodeTypes will widen via module declaration merging or a replacement strategy settled in the CLI/kits-rewrite spec — out of scope here.

### NodeType contract

```ts
// packages/registry/src/types/node-type.ts
import type { ReactNode } from "react"
import type { AnyNode } from "./node"

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

If `drillIn` is omitted, the engine renders the small-canvas `render` scaled up as a fallback (per strategy).

## The 3 built-in NodeTypes

### `inline-react`

- `defaultMode: "interactive-live"`
- `enterMode: "never"` (no drill-in)
- `match`: `node.kind === "inline-react"`
- `render`: calls `node.render()`
- `activityKey`: returns `node.filePath`
- No `drillIn`.

### `iframe-route`

- `defaultMode: "click-into"`
- `enterMode: "double-click"`
- `match`: `node.kind === "iframe-route"`
- `render`: returns `<LazyIframe src={node.routePath} />` wrapped in a transparent click overlay (standard click-into behavior — captures pan/select clicks until double-click "enters" the iframe).
- `drillIn`: returns `<ResponsiveFrameView routePath={node.routePath} mode={node.drillInMode ?? "responsive"} />`.
- `activityKey`: returns `node.routePath`.

### `iframe-component`

- Same shape as `iframe-route` but uses `node.previewSrc`.
- `drillIn`: returns `<ResponsiveFrameView routePath={node.previewSrc} mode={node.drillInMode ?? "single"} />`.
- `activityKey`: returns `node.componentPath ?? node.slug`.

### `BUILTIN_NODE_TYPES`

```ts
// packages/registry/src/node-types/index.ts
export const BUILTIN_NODE_TYPES: NodeType<AnyNode>[] = [
  inlineReactNodeType,
  iframeRouteNodeType,
  iframeComponentNodeType,
]
```

The playground passes this to `<ForkshopCanvas nodeTypes={BUILTIN_NODE_TYPES} />`.

## The 3 built-in Layouts

### `Gallery` — was `iframe-gallery.tsx`

```ts
export type GalleryEntry = {
  id: string                   // becomes the Node id
  label?: ReactNode
  node: AnyNode                // the node payload (typically iframe-route or iframe-component)
  row?: number
  column?: number              // grid placement
}

export type GalleryProps = {
  entries: GalleryEntry[]
  layout: "stack" | "grid"
  viewportWidth?: number       // default node.width
  rowGap?: number
  columnGap?: number
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}
```

Layout math from current `iframe-gallery.tsx` (stack/grid logic, gap defaults) is preserved verbatim. Only rendering changes: inline `<LazyIframe>` becomes `<NodeView node={entry.node} />`.

### `Tree` — was `page-tree.tsx`

```ts
export type TreeEntry = {
  id: string
  label?: ReactNode
  path: string                  // "/about", "/blog/[slug]"
  node: AnyNode                 // typically iframe-route
  children?: TreeEntry[]
}

export type TreeProps = {
  entries: TreeEntry[]
  iframeWidth?: number
  iframeHeight?: number
  horizontalGap?: number
  verticalGap?: number
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}
```

`sitemap-tree.ts` lib stays in place. Tree calls `layoutTreeSitemap(entries)` and renders one `<NodeView>` per leaf. Parent/child connector lines are SVG chrome drawn by Tree.

### `DesignSystemGraph` — was `design-system-board.tsx` + `system-layout.ts`

```ts
export type PrimitiveGroup = {
  id: string                    // "buttons", "inputs", "badges"
  label: string
  primitives: AnyNode[]         // each typically an inline-react Node
}

export type DesignSystemGraphProps = {
  tokens: TokenRegistry
  primitives: PrimitiveGroup[]
  typography?: AnyNode          // typically an inline-react Node; omittable
  nodePositions?: NodePositions
  onPositionChange?: (id: string, x: number, y: number) => void
  selectedId?: string
  onSelectChange?: (id: string, selected: boolean) => void
}
```

Color swatches become individually draggable/selectable inline-react Nodes (matching current behavior). Edges between raw and semantic tokens remain Layout chrome (SVG, not Nodes — they can't be dragged). `buildSystemGraph` + `layoutSystem` lib stays as-is. DSG is deliberately purpose-built (typed `tokens`/`primitives`/`typography`, not a generic entries field) — it's not user-extensible but is expected to fit most projects Forkshop is used in.

## File layout

### Adds

```
packages/registry/src/
  types/
    node.ts                 BaseNode, AnyNode, 3 concrete Node types
    node-type.ts            NodeType<T>, RenderProps<T>, DrillInProps<T>
  node-types/
    inline-react.tsx        NodeType impl
    iframe-route.tsx        NodeType impl
    iframe-component.tsx    NodeType impl
    index.ts                exports BUILTIN_NODE_TYPES
  layouts/
    gallery.tsx             (moved from kits/iframe-gallery.tsx, renamed)
    tree.tsx                (moved from kits/page-tree.tsx, renamed)
    design-system-graph.tsx (moved from kits/design-system-board.tsx, renamed)
  components/canvas/
    node-frame.tsx          outline/drag/agent-chip chrome (carved from canvas-node.tsx)
    node-view.tsx           the dispatcher; uses NodeFrame
```

### Removes

```
components/canvas/canvas-node.tsx   replaced by node-frame.tsx + node-view.tsx
kits/                                directory deleted entirely
kits/primitives-showcase.tsx         content moves to playground forkshop.config.tsx as
                                       inline-react Node definitions
kits/typography-frame.tsx            content moves to playground forkshop.config.tsx;
                                       DSG receives typography as an inline-react Node prop
```

### Demoted from public exports (kept in engine, no longer in `index.ts`)

- `responsive-frame-view.tsx` — internal default `drillIn` for the iframe NodeTypes.
- `edit-popover.tsx`, `spacing-picker.tsx`, `spacing-body-menu.tsx`, `floating-controls.tsx`, `back-button.tsx`, `guide-overlay.tsx`, `lazy-iframe.tsx`, `canvas-click-overlay.tsx`, `canvas-label.tsx` — primitives used internally by Layouts/NodeTypes.
- `useDraggableNode`, `useIframeEditWiring`, `useIframeSpacingWiring`, `useIframePreview`, `useIframeBlockDoubleClick` — internal to NodeType implementations.
- `system-graph.ts`, `system-layout.ts`, `system-snap.ts`, `node-positions.ts`, `sitemap-tree.ts` — Layout-internal lib.
- `edit-mode.ts`, `inspect-element.ts`, `spacing-classes.ts` exports beyond what `InspectPanel` and the API routes need.

If a future spec needs one of these back, we re-export at that point. Going small first is reversible.

## Public API after this spec

~15 named exports total (down from ~50).

```
// Engine shell
ForkshopCanvas              (extended: nodeTypes prop)
ForkshopSidebar

// Layouts
Gallery, type GalleryProps, type GalleryEntry
Tree, type TreeProps, type TreeEntry
DesignSystemGraph, type DesignSystemGraphProps, type PrimitiveGroup

// NodeType contract + built-ins
NodeType, RenderProps, DrillInProps              (types)
BaseNode, AnyNode                                (types)
InlineReactNode, IframeRouteNode, IframeComponentNode  (types)
inlineReactNodeType, iframeRouteNodeType, iframeComponentNodeType  (impls)
BUILTIN_NODE_TYPES                               (array)

// Standalone UI
ForkshopIcon, LocatorInit, InspectPanel

// Agent-activity (already public, kept)
AgentActivityProvider + hook family + deriveAffectedBlocks
AgentIframeRelay, AgentSelectionChip
IframeRegistryProvider, useIframeRegistry, useRegisterIframe

// Lib (kept public)
buildTokenRegistry, setActiveTokenRegistry, type TokenRegistry, type TokenEntry
filePathToRoute, fileToSelection
serializeSelection, parseSelection
```

## Implementation order

Sequenced so `pnpm check` stays green at every step.

1. **Types only.** Add `types/node.ts` and `types/node-type.ts`. No usage yet — dead code is fine.
2. **Dispatcher pair.** Add `components/canvas/node-frame.tsx` (carved out of `canvas-node.tsx`) and `components/canvas/node-view.tsx`. Existing `canvas-node.tsx` becomes a one-line re-export of NodeFrame so consumers don't break.
3. **Extend `ForkshopCanvas`.** Add `nodeTypes?: NodeType<AnyNode>[]` prop; expose via context (extend the existing `useForkshopCanvas` hook).
4. **Add the 3 NodeTypes.** `node-types/inline-react.tsx`, `iframe-route.tsx`, `iframe-component.tsx`, plus `BUILTIN_NODE_TYPES`. Export from `index.ts`.
5. **Migrate Gallery.** Move `kits/iframe-gallery.tsx` → `layouts/gallery.tsx`, rewrite to emit Nodes + use `<NodeView>`. Update playground's `forkshop.config.tsx` to use `Gallery` + iframe Node records. Verify in browser.
6. **Migrate Tree.** `kits/page-tree.tsx` → `layouts/tree.tsx`. Same pattern. Verify in browser.
7. **Migrate DesignSystemGraph.** `kits/design-system-board.tsx` → `layouts/design-system-graph.tsx`. Color swatches, primitive frames, and typography all become inline-react Nodes. Absorb `primitives-showcase.tsx` and `typography-frame.tsx` content into the playground config. Verify in browser.
8. **Remove `canvas-node.tsx` shim.** Delete the re-export; remove `CanvasNode` from `index.ts`.
9. **Slim `index.ts`.** Remove all demoted exports. Run `pnpm check`. Walk through the playground in a browser to confirm canvas, sidebar, drill-in, agent glow, drag-persist, and Locator.js bridge all still work.
10. **Tests.** Extend existing contract-test style (e.g., `4cca9fc test(components): lock contracts for IframeRegistry / AgentSelectionChip / AgentIframeRelay`) with:
    - `<NodeView>` dispatch — correct NodeType selected for each Node `kind`; first match wins.
    - Each of the 3 NodeType impls — `match` predicate, `render` output, `activityKey` derivation, `drillIn` (where present).
    - Each of the 3 Layouts — given typed entries, emits expected Node records.

## Out of scope at this spec

- **Package rename** `registry` → `engine`. The strategy plans this; deferred to engine-packaging spec.
- **Compiled-CSS pipeline, SVG icon set, dropping `motion`.** Engine-packaging spec.
- **CLI changes** (init flow, manifest schema). CLI-rework spec.
- **User-side NodeType plumbing** (`app/forkshop/node-types/`, registration helpers). CLI-rework spec.
- **New kits** (`marketing`, `saas`, `default`). Kits-rewrite spec.
- **Custom Layouts as user extension.** Permanently out of scope per strategy.
- **Theme customization.** Permanently out of scope at 1.0 per strategy.

## Open questions deferred to implementation

- Exact shape of `useForkshopCanvas` context after extending it with `nodeTypes` and selection state — whether to grow the existing hook or split into `useForkshopCanvas` + `useNodeTypes`. Decide during step 3 based on what feels least clumsy at the call site.
- Whether `<NodeFrame>` accepts a `className` / `style` escape hatch from NodeType.render or whether the NodeType's returned ReactNode is wrapped without merge. Decide during step 2.
- Test framework conventions for Layout tests — reuse the existing component-contract pattern, or add a lighter snapshot-style test for Node emission. Decide during step 10.

These are local details — they don't ripple beyond their step and don't affect downstream specs.
