"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  AgentSelectionChip,
  Gallery,
  Tree,
  responsiveFrameEntries,
  parseSelection,
  serializeSelection,
  discoverPrimitives,
  discoverBlocks,
  forkshopIcons,
  type ForkshopSelection,
  type GalleryEntry,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { DesignSystemBoard } from "./design-system"
import { UIComponentsBoard } from "./ui-components"
import BlocksBoardView from "./blocks"
import { SitemapBoard } from "./sitemap-board"
import { ButtonBoard } from "./ui-components/button"
import { BadgeBoard } from "./ui-components/badge"
import { InputBoard } from "./ui-components/input"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

const DEFAULT_SELECTION: ForkshopSelection = { kind: "section", sectionId: "design-system" }

const SITEMAP_ENTRIES = [
  { slug: "/", name: "/" },
  { slug: "/about", name: "/about" },
  { slug: "/pricing", name: "/pricing" },
]

const PRIMITIVE_BOARDS: Record<string, React.ComponentType> = {
  button: ButtonBoard,
  badge: BadgeBoard,
  input: InputBoard,
}

const DISCOVERED_PRIMITIVES = discoverPrimitives(forkshopConfig.ui)
const DISCOVERED_BLOCKS = discoverBlocks(forkshopConfig.blocks)

const FILE_MAP = {
  primitives: DISCOVERED_PRIMITIVES.map((p) => ({
    id: p.slug,
    sourcePath: `components/ui/${p.slug}.tsx`,
  })),
  blocks: DISCOVERED_BLOCKS.map((b) => ({
    slug: b.slug,
    sourcePath: `components/blocks/${b.slug}.tsx`,
  })),
}

const RESPONSIVE_VIEWPORTS = [1440, 768, 375]
// Generous static stage; `fitMode="width"` rescales to container.
const RESPONSIVE_STAGE_WIDTH = 3200
const RESPONSIVE_STAGE_HEIGHT = 1200

function SingleBlockBoard({ slug }: { slug: string }) {
  const block = DISCOVERED_BLOCKS.find((b) => b.slug === slug)
  const entries = useMemo<GalleryEntry[]>(() => {
    if (!block) return []
    // For blocks, the iframe loads the component-preview URL (previewSrc).
    return responsiveFrameEntries(block.previewSrc, {
      viewports: RESPONSIVE_VIEWPORTS,
      sourceFile: `components/blocks/${block.slug}.tsx`,
    })
  }, [block])
  if (!block) return null
  return (
    <PlaygroundBoard
      stageWidth={RESPONSIVE_STAGE_WIDTH}
      stageHeight={RESPONSIVE_STAGE_HEIGHT}
      fitMode="width"
    >
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={Math.max(...RESPONSIVE_VIEWPORTS)}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}

function SinglePageBoard({ path }: { path: string }) {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      responsiveFrameEntries(path, {
        viewports: RESPONSIVE_VIEWPORTS,
      }),
    [path],
  )
  return (
    <PlaygroundBoard
      stageWidth={RESPONSIVE_STAGE_WIDTH}
      stageHeight={RESPONSIVE_STAGE_HEIGHT}
      fitMode="width"
    >
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={Math.max(...RESPONSIVE_VIEWPORTS)}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}

export default function ForkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const [hasHydrated, setHasHydrated] = useState(false)
  const positions = useForkshopPositions()

  useEffect(() => {
    const fromHash = parseSelection(window.location.hash)
    if (fromHash) setSelection(fromHash)
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    const next = serializeSelection(selection)
    if (window.location.hash !== next) {
      window.history.replaceState({}, "", next)
    }
  }, [selection, hasHydrated])

  useEffect(() => {
    function onPopState() {
      const fromHash = parseSelection(window.location.hash)
      setSelection(fromHash ?? DEFAULT_SELECTION)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  return (
    <AgentActivityProvider fileMap={FILE_MAP}>
      <div className="flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
            {
              id: "design-system",
              title: "Design System",
              icon: forkshopIcons.designSystem,
            },
            {
              id: "ui-components",
              title: Gallery.defaultTitle,
              icon: Gallery.icon,
              entryKind: "primitive",
              entries: DISCOVERED_PRIMITIVES.map((p) => ({ slug: p.slug, name: p.name })),
            },
            {
              id: "blocks",
              title: "Blocks",
              icon: Gallery.icon,
              entryKind: "block",
              entries: DISCOVERED_BLOCKS.map((b) => ({ slug: b.slug, name: b.name })),
            },
            {
              id: "sitemap",
              title: Tree.defaultTitle,
              icon: Tree.icon,
              entryKind: "page",
              entries: [...SITEMAP_ENTRIES],
            },
          ]}
          routes={[]}
        />
        <div className="relative flex flex-1 overflow-hidden">
          <AgentSelectionChip
            pageSelectionPath={selection.kind === "page" ? selection.path : undefined}
            blockSelectionSlug={selection.kind === "block" ? selection.slug : undefined}
            primitiveSelectionId={selection.kind === "primitive" ? selection.id : undefined}
          />
          {selection.kind === "section" && selection.sectionId === "design-system" && (
            <DesignSystemBoard />
          )}
          {selection.kind === "section" && selection.sectionId === "ui-components" && (
            <UIComponentsBoard />
          )}
          {selection.kind === "section" && selection.sectionId === "blocks" && (
            <BlocksBoardView
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {selection.kind === "section" && selection.sectionId === "sitemap" && (
            <SitemapBoard
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {selection.kind === "primitive" &&
            (() => {
              const Board = PRIMITIVE_BOARDS[selection.id]
              return Board ? <Board /> : null
            })()}
          {selection.kind === "block" && <SingleBlockBoard slug={selection.slug} />}
          {selection.kind === "page" && <SinglePageBoard path={selection.path} />}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
