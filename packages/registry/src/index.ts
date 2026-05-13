export { FogmaIcon, type FogmaIconComponent } from "./components/icon.js"
export { FogmaCanvas } from "./components/canvas/fogma-canvas.js"
export { CanvasNode } from "./components/canvas/canvas-node.js"
export { CanvasLabel } from "./components/canvas/canvas-label.js"
export { CanvasClickOverlay } from "./components/canvas/canvas-click-overlay.js"
export { FloatingControls } from "./components/canvas/floating-controls.js"
export { BackButton } from "./components/canvas/back-button.js"
export { GuideOverlay } from "./components/canvas/guide-overlay.js"
export { LazyIframe } from "./components/canvas/lazy-iframe.js"
export { useDraggableNode } from "./hooks/use-draggable-node.js"
export { FogmaSidebar } from "./components/sidebar/fogma-sidebar.js"
export type { FogmaSelection, SidebarSection, SidebarEntry } from "./components/sidebar/fogma-sidebar.js"
export { buildPageTree } from "./components/sidebar/page-tree.js"
export type { PageTreeNode } from "./components/sidebar/page-tree.js"
export { serializeSelection, parseSelection } from "./components/sidebar/selection-hash.js"
export { useIframePreview } from "./hooks/use-iframe-preview.js"
export { useIframeEditWiring } from "./hooks/use-iframe-edit-wiring.js"
export { useIframeSpacingWiring } from "./hooks/use-iframe-spacing-wiring.js"
export type { SpacingZoneTarget, SpacingSide } from "./hooks/use-iframe-spacing-wiring.js"
export { useIframeBlockDoubleClick } from "./hooks/use-iframe-block-dblclick.js"
export { ResponsiveFrameView, responsiveFrameStageDimensions } from "./components/canvas/responsive-frame-view.js"
export { EditPopover } from "./components/canvas/edit-popover.js"
export { SpacingPicker } from "./components/canvas/spacing-picker.js"
export { SpacingBodyMenu } from "./components/canvas/spacing-body-menu.js"
export { isTextElement, computeDomPath, PREVIEW_EDIT_CSS, PREVIEW_AGENT_CSS, PREVIEW_COMPOSE_CSS } from "./lib/edit-mode.js"
export { inspectElement, type InspectionResult, type AppliedToken } from "./lib/inspect-element.js"
export { resolvePaddingClass, resolveGapClass, extractMarginClasses, type ResolvedSpacingClass } from "./lib/spacing-classes.js"
export { InspectPanel } from "./components/inspect-panel.js"
export { LocatorInit } from "./components/locator-init.js"
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
} from "./components/agent-activity-context.js"
export type { ActivityEntry } from "./components/agent-activity-context.js"
export type { ActivityEntry as AgentActivityStateEntry } from "./lib/agent-activity-state.js"
export { recordActivity, subscribe } from "./lib/agent-activity-state.js"
export { filePathToRoute, fileToSelection } from "./lib/file-to-selection.js"
export {
  buildTokenRegistry,
  setActiveTokenRegistry,
  getActiveTokenRegistry,
  findTokenForClass,
  type TokenEntry,
  type TokenRegistry,
  type ClassLookupEntry,
} from "./lib/token-registry.js"
export {
  buildSystemGraph,
  type ColorNode,
  type ColorEdge,
  type SystemGraph,
} from "./lib/system-graph.js"
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
} from "./lib/system-layout.js"
export {
  applySnap,
  snapPixelsAt,
  type SnapTarget,
  type SnapGuide,
  type SnapResult,
} from "./lib/system-snap.js"
export {
  isNodePositions,
  persistNodePositions,
  type NodePosition,
  type NodePositions,
} from "./lib/node-positions.js"
export { DesignSystemBoard, type DesignSystemBoardProps } from "./kits/design-system-board.js"
export { TypographyFrame, type TypographyFrameProps } from "./kits/typography-frame.js"
export {
  PrimitivesShowcase,
  type PrimitivesShowcaseProps,
  type PrimitiveDescriptor,
} from "./kits/primitives-showcase.js"
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
} from "./lib/sitemap-tree.js"
export {
  IframeGallery,
  type IframeGalleryProps,
  type IframeGalleryEntry,
} from "./kits/iframe-gallery.js"
export {
  PageTree,
  type PageTreeProps,
  type PageTreeEntry,
} from "./kits/page-tree.js"
export { fogmaIcons, type FogmaIconName } from "./lib/icons.js"
