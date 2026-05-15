"use client"

import { useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import {
  ForkshopCanvas,
  Gallery,
  NodeDrillIn,
  BUILTIN_NODE_TYPES,
  responsiveFrameStageDimensions,
  type GalleryEntry,
  type IframeComponentNode,
} from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

const OVERVIEW_STAGE_W = 1200
const OVERVIEW_STAGE_H = 2200

const { width: ISOLATION_STAGE_W, height: ISOLATION_STAGE_H } = responsiveFrameStageDimensions(
  undefined,
  [1440, 768, 375],
)

export default function ComponentsBoardView({
  selectedNodeId,
  isolatedSlug,
  onBack,
}: {
  selectedNodeId?: string
  isolatedSlug?: string
  onBack?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { nodePositions, onPositionChange } = useForkshopPositions()

  const entries = useMemo<GalleryEntry[]>(() => {
    return forkshopConfig.blocks.map((b): GalleryEntry => {
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
  }, [])

  const isolatedNode = useMemo<IframeComponentNode | null>(() => {
    if (!isolatedSlug) return null
    const block = forkshopConfig.blocks.find((b) => b.slug === isolatedSlug)
    if (!block) return null
    return {
      id: `block:${block.slug}`,
      kind: "iframe-component",
      x: 0,
      y: 0,
      width: 1200,
      height: 600,
      slug: block.slug,
      previewSrc: block.iframeSrc,
      componentPath: block.sourcePath,
      drillInMode: "responsive",
    }
  }, [isolatedSlug])

  const stageWidth = isolatedNode ? ISOLATION_STAGE_W : OVERVIEW_STAGE_W
  const stageHeight = isolatedNode ? ISOLATION_STAGE_H : OVERVIEW_STAGE_H

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      fitMode="width"
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      {isolatedNode ? (
        <IsolatedView containerRef={containerRef} node={isolatedNode} onBack={onBack ?? (() => {})} />
      ) : (
        <Gallery
          entries={entries}
          layout="stack"
          selectedId={selectedNodeId}
          nodePositions={nodePositions}
          onPositionChange={onPositionChange}
        />
      )}
    </ForkshopCanvas>
  )
}

function IsolatedView({
  containerRef,
  node,
  onBack,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  node: IframeComponentNode
  onBack: () => void
}) {
  return (
    <>
      <NodeDrillIn node={node} onBack={onBack} />
      {containerRef.current &&
        createPortal(<BackButtonOverlay onBack={onBack} />, containerRef.current)}
    </>
  )
}

function BackButtonOverlay({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="absolute left-4 top-4 z-10 rounded-md bg-white px-3 py-1.5 text-sm font-medium shadow-md hover:bg-gray-100"
    >
      ← Overview
    </button>
  )
}
