export { FogmaIcon, type FogmaIconComponent } from "@fogma/components/icon"
export { FogmaCanvas } from "@fogma/components/canvas/fogma-canvas"
export { CanvasNode } from "@fogma/components/canvas/canvas-node"
export { CanvasLabel } from "@fogma/components/canvas/canvas-label"
export { CanvasClickOverlay } from "@fogma/components/canvas/canvas-click-overlay"
export { FloatingControls } from "@fogma/components/canvas/floating-controls"
export { BackButton } from "@fogma/components/canvas/back-button"
export { GuideOverlay } from "@fogma/components/canvas/guide-overlay"
export { LazyIframe } from "@fogma/components/canvas/lazy-iframe"
export { useDraggableNode } from "@fogma/hooks/use-draggable-node"
export { FogmaSidebar } from "@fogma/components/sidebar/fogma-sidebar"
export type { FogmaSelection, SidebarSection, SidebarEntry } from "@fogma/components/sidebar/fogma-sidebar"
export { buildPageTree } from "@fogma/components/sidebar/page-tree"
export type { PageTreeNode } from "@fogma/components/sidebar/page-tree"
export { serializeSelection, parseSelection } from "@fogma/components/sidebar/selection-hash"
export { useIframePreview } from "@fogma/hooks/use-iframe-preview"
export { useIframeEditWiring } from "@fogma/hooks/use-iframe-edit-wiring"
export { useIframeSpacingWiring } from "@fogma/hooks/use-iframe-spacing-wiring"
export type { SpacingZoneTarget, SpacingSide } from "@fogma/hooks/use-iframe-spacing-wiring"
export { useIframeBlockDoubleClick } from "@fogma/hooks/use-iframe-block-dblclick"
export { ResponsiveFrameView, responsiveFrameStageDimensions } from "@fogma/components/canvas/responsive-frame-view"
export { EditPopover } from "@fogma/components/canvas/edit-popover"
export { SpacingPicker } from "@fogma/components/canvas/spacing-picker"
export { SpacingBodyMenu } from "@fogma/components/canvas/spacing-body-menu"
export { isTextElement, computeDomPath, PREVIEW_EDIT_CSS, PREVIEW_AGENT_CSS, PREVIEW_COMPOSE_CSS } from "@fogma/lib/edit-mode"
export { inspectElement, type InspectionResult, type AppliedToken } from "@fogma/lib/inspect-element"
export { resolvePaddingClass, resolveGapClass, extractMarginClasses, type ResolvedSpacingClass } from "@fogma/lib/spacing-classes"
export { InspectPanel } from "@fogma/components/inspect-panel"
export { LocatorInit } from "@fogma/components/locator-init"
export {
  AgentActivityProvider,
  useAgentSeenPagePaths,
  useAgentActivePages,
  useAgentActiveBlocks,
  usePageActiveFallback,
  useIsNavigationActive,
  useSiteWideActivity,
  useAgentSubstringsForPage,
  useAgentSubstringsForBlock,
  deriveAffectedBlocks,
} from "@fogma/components/agent-activity-context"
export type { ActivityEntry } from "@fogma/components/agent-activity-context"
export type { ActivityEntry as AgentActivityStateEntry } from "@fogma/lib/agent-activity-state"
export { recordActivity, subscribe } from "@fogma/lib/agent-activity-state"
export { filePathToRoute, fileToSelection } from "@fogma/lib/file-to-selection"
export {
  buildTokenRegistry,
  setActiveTokenRegistry,
  getActiveTokenRegistry,
  findTokenForClass,
  type TokenEntry,
  type TokenRegistry,
  type ClassLookupEntry,
} from "@fogma/lib/token-registry"
export {
  buildSystemGraph,
  type ColorNode,
  type ColorEdge,
  type SystemGraph,
} from "@fogma/lib/system-graph"
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
} from "@fogma/lib/system-layout"
export {
  applySnap,
  snapPixelsAt,
  type SnapTarget,
  type SnapGuide,
  type SnapResult,
} from "@fogma/lib/system-snap"
export {
  isNodePositions,
  persistNodePositions,
  type NodePosition,
  type NodePositions,
} from "@fogma/lib/node-positions"
export { DesignSystemBoard, type DesignSystemBoardProps } from "@fogma/kits/design-system-board"
export { TypographyFrame, type TypographyFrameProps } from "@fogma/kits/typography-frame"
export {
  PrimitivesShowcase,
  type PrimitivesShowcaseProps,
  type PrimitiveDescriptor,
} from "@fogma/kits/primitives-showcase"
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
} from "@fogma/lib/sitemap-tree"
export {
  IframeGallery,
  type IframeGalleryProps,
  type IframeGalleryEntry,
} from "@fogma/kits/iframe-gallery"
export {
  PageTree,
  type PageTreeProps,
  type PageTreeEntry,
} from "@fogma/kits/page-tree"
export { fogmaIcons, type FogmaIconName } from "@fogma/lib/icons"
