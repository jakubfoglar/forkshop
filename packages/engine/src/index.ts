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
  DesignSystemView,
  getDesignSystemStageSize,
  type DesignSystemViewProps,
  type PrimitiveGroup,
} from "@forkshop/layouts/design-system-view"
export {
  ResponsiveFrameView,
  type ResponsiveFrameViewProps,
  responsiveFrameStageDimensions,
} from "@forkshop/layouts/responsive-frame-view"

// NodeType contract + types
export type {
  BaseNode,
  AnyNode,
  InlineReactNode,
  IframeRouteNode,
  IframeComponentNode,
} from "@forkshop/types/node"
export type {
  NodeType,
  RenderProps,
  AgentActivitySnapshot,
  AgentMatchResult,
} from "@forkshop/types/node-type"
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
export { EditorLink } from "@forkshop/components/editor-link"
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
  useAllAgentHunks,
  useAgentColorByFile,
  useAgentReadingByFile,
  useAgentEditEpoch,
  deriveAffectedBlocks,
} from "@forkshop/components/agent-activity-context"
export type { ActivityEntry, FileMap, AgentAction } from "@forkshop/components/agent-activity-context"
export type { Hunk } from "@forkshop/lib/diff-to-hunks"
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

// Node positions (public — user code may persist and hydrate positions)
export {
  isNodePositions,
  type NodePosition,
  type NodePositions,
} from "@forkshop/lib/node-positions"

// Barrel reflection (public — user code wires discovery hooks)
export {
  useDiscoveredPrimitives,
  discoverPrimitives,
  type DiscoveredPrimitive,
} from "@forkshop/lib/use-discovered-primitives"
export {
  useDiscoveredBlocks,
  discoverBlocks,
  type DiscoveredBlock,
} from "@forkshop/lib/use-discovered-blocks"
// Pure parser only — the "how do I read CSS vars from the browser" mechanism
// is project-aware (server component fs.read vs client component getComputedStyle
// vs build-time codegen) and gets scaffolded by the setup skill into the user's
// design-system.tsx, not shipped from the engine.
export { parseTokenRegistryFromCssVars } from "@forkshop/lib/parse-token-registry-from-css-vars"
