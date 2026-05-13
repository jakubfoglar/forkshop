"use client"

import { useRef, useState } from "react"
import { ForkshopCanvas, PageTree, responsiveFrameStageDimensions } from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"

// Grid view: 3 pages in a 4-column grid → all in one row.
// Each tile is 400×280. One row with 3 columns: 3×400 + 2×32 gap = 1264 wide.
const GRID_STAGE_W = 1264
const GRID_STAGE_H = 400

// Isolation view: responsive-frame stage width for default viewports [1440, 768, 375].
// responsiveFrameStageDimensions computes the exact width based on viewport sum + gaps.
// Pass undefined measuredHeight to use the default viewport height for initial stage.
const { width: ISOLATION_STAGE_W, height: ISOLATION_STAGE_H } = responsiveFrameStageDimensions(
  undefined,
  [1440, 768, 375],
)

export default function PagesBoardView({
  isolatedPath: controlledIsolatedPath,
  onBack: onBackProp,
}: {
  isolatedPath?: string
  onBack?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Track internal isolation state from PageTree (double-click) so we can
  // switch stageWidth and trigger ForkshopCanvas's auto-fit-on-width-change effect.
  const [internalIsolated, setInternalIsolated] = useState<string | null>(null)

  // Effective isolation: external prop wins when defined (sidebar nav).
  // Uncontrolled: driven by internal state (double-click).
  const isIsolated =
    controlledIsolatedPath !== undefined ? true : internalIsolated !== null

  // Switch stage dimensions based on isolation state.
  // ForkshopCanvas auto-fits when stageWidth changes, so toggling isolation
  // automatically triggers a zoom-to-fit-width with no additional logic.
  const stageWidth = isIsolated ? ISOLATION_STAGE_W : GRID_STAGE_W
  const stageHeight = isIsolated ? ISOLATION_STAGE_H : GRID_STAGE_H
  const fitMode = isIsolated ? "width" : "both"

  const handleBack = () => {
    // Clear internal isolation state regardless (ensures consistency).
    setInternalIsolated(null)
    // If the parent also manages external state (sidebar nav), notify it.
    onBackProp?.()
  }

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      fitMode={fitMode}
    >
      <PageTree
        entries={[...forkshopConfig.pages]}
        isolatedPath={controlledIsolatedPath}
        onBack={handleBack}
        onIsolatedPathChange={setInternalIsolated}
      />
    </ForkshopCanvas>
  )
}
