export { ForkshopIcon, type ForkshopIconComponent } from "@forkshop/components/icon"
export { ForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
export { CanvasNode } from "@forkshop/components/canvas/canvas-node"
export { CanvasLabel } from "@forkshop/components/canvas/canvas-label"
export { CanvasClickOverlay } from "@forkshop/components/canvas/canvas-click-overlay"
export { FloatingControls } from "@forkshop/components/canvas/floating-controls"
export { BackButton } from "@forkshop/components/canvas/back-button"
export { GuideOverlay } from "@forkshop/components/canvas/guide-overlay"
export { LazyIframe } from "@forkshop/components/canvas/lazy-iframe"
export { useDraggableNode } from "@forkshop/hooks/use-draggable-node"
export { ForkshopSidebar } from "@forkshop/components/sidebar/forkshop-sidebar"
export type { ForkshopSelection, SidebarSection, SidebarEntry } from "@forkshop/components/sidebar/forkshop-sidebar"
export { buildPageTree } from "@forkshop/components/sidebar/page-tree"
export type { PageTreeNode } from "@forkshop/components/sidebar/page-tree"
export { serializeSelection, parseSelection } from "@forkshop/components/sidebar/selection-hash"
export { useIframePreview } from "@forkshop/hooks/use-iframe-preview"
export { useIframeEditWiring } from "@forkshop/hooks/use-iframe-edit-wiring"
export { useIframeSpacingWiring } from "@forkshop/hooks/use-iframe-spacing-wiring"
export type { SpacingZoneTarget, SpacingSide } from "@forkshop/hooks/use-iframe-spacing-wiring"
export { useIframeBlockDoubleClick } from "@forkshop/hooks/use-iframe-block-dblclick"
export { IframeRegistryProvider, useIframeRegistry, useRegisterIframe } from "@forkshop/components/iframe-registry"
export { ResponsiveFrameView, responsiveFrameStageDimensions } from "@forkshop/components/canvas/responsive-frame-view"
export { EditPopover } from "@forkshop/components/canvas/edit-popover"
export { SpacingPicker } from "@forkshop/components/canvas/spacing-picker"
export { SpacingBodyMenu } from "@forkshop/components/canvas/spacing-body-menu"
export { isTextElement, computeDomPath, PREVIEW_EDIT_CSS, PREVIEW_AGENT_CSS, PREVIEW_COMPOSE_CSS } from "@forkshop/lib/edit-mode"
export { inspectElement, type InspectionResult, type AppliedToken } from "@forkshop/lib/inspect-element"
export { resolvePaddingClass, resolveGapClass, extractMarginClasses, type ResolvedSpacingClass } from "@forkshop/lib/spacing-classes"
export { InspectPanel } from "@forkshop/components/inspect-panel"
export { LocatorInit } from "@forkshop/components/locator-init"
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
  deriveAffectedBlocks,
} from "@forkshop/components/agent-activity-context"
export type { ActivityEntry, FileMap } from "@forkshop/components/agent-activity-context"
export type { ActivityEntry as AgentActivityStateEntry } from "@forkshop/lib/agent-activity-state"
export { recordActivity, subscribe } from "@forkshop/lib/agent-activity-state"
export { filePathToRoute, fileToSelection } from "@forkshop/lib/file-to-selection"
export {
  buildTokenRegistry,
  setActiveTokenRegistry,
  getActiveTokenRegistry,
  findTokenForClass,
  type TokenEntry,
  type TokenRegistry,
  type ClassLookupEntry,
} from "@forkshop/lib/token-registry"
export {
  buildSystemGraph,
  type ColorNode,
  type ColorEdge,
  type SystemGraph,
} from "@forkshop/lib/system-graph"
export {
  layoutSystem,
  computeSystemLayout,
  type BlockEntry,
  type SystemLayoutOptions,
  type SystemLayout,
  type PositionedColorNode,
  type ColorEdgePath,
  type PositionedBlockRow,
  type PositionedBlockViewport,
  type PositionedPrimitiveGroup,
  type PrimitiveGroupId,
} from "@forkshop/lib/system-layout"
export {
  applySnap,
  snapPixelsAt,
  type SnapTarget,
  type SnapGuide,
  type SnapResult,
} from "@forkshop/lib/system-snap"
export {
  isNodePositions,
  persistNodePositions,
  type NodePosition,
  type NodePositions,
} from "@forkshop/lib/node-positions"
export { DesignSystemBoard, type DesignSystemBoardProps } from "@forkshop/kits/design-system-board"
export { TypographyFrame, type TypographyFrameProps } from "@forkshop/kits/typography-frame"
export {
  PrimitivesShowcase,
  type PrimitivesShowcaseProps,
  type PrimitiveDescriptor,
} from "@forkshop/kits/primitives-showcase"
export {
  buildMarketingSitemap,
  buildFooterSitemap,
  buildGuideSitemap,
  layoutTreeSitemap,
  layoutFlatSitemap,
  type SitemapNode,
  type SitemapTree,
  type SitemapFlat,
  type PositionedSitemapNode,
  type SitemapLayout,
  SITEMAP_EXCLUSIONS,
  SITEMAP_FOOTER_PATHS,
  SITEMAP_IFRAME_WIDTH,
  SITEMAP_IFRAME_HEIGHT,
  SITEMAP_HORIZONTAL_GAP,
  SITEMAP_VERTICAL_GAP,
} from "@forkshop/lib/sitemap-tree"
export {
  IframeGallery,
  type IframeGalleryProps,
  type IframeGalleryEntry,
} from "@forkshop/kits/iframe-gallery"
export {
  PageTree,
  type PageTreeProps,
  type PageTreeEntry,
} from "@forkshop/kits/page-tree"
export { forkshopIcons, type ForkshopIconName } from "@forkshop/lib/icons"
