"use client"

import "@forkshop/engine/forkshop.css"
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
  type ActivityEntry,
  type GalleryEntry,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { DesignSystemBoard } from "./design-system"
import { UIComponentsBoard } from "./ui-components"
import BlocksBoardView from "./blocks"
import { SitemapBoard } from "./sitemap-board"
import { ButtonBoard } from "./ui-components/button"
import { BadgeBoard } from "./ui-components/badge"
import { StatCounterBoard } from "./ui-components/stat-counter"
import { ProfileLinkBoard } from "./ui-components/profile-link"
import { SectionHeadingRowBoard } from "./ui-components/section-heading-row"
import { TickerBeltBoard } from "./ui-components/ticker-belt"
import { forkshopConfig } from "./forkshop.config"
import { decodeUrlState, type AgentSeed } from "./decode-url-state"

const DEFAULT_SELECTION: ForkshopSelection = { kind: "section", sectionId: "design-system" }

// WAVECLASH demo site routes shown in the sitemap
const SITEMAP_ENTRIES = [
  { slug: "/demo/site", name: "Home" },
]

const PRIMITIVE_BOARDS: Record<string, React.ComponentType> = {
  button: ButtonBoard,
  badge: BadgeBoard,
  "stat-counter": StatCounterBoard,
  "profile-link": ProfileLinkBoard,
  "section-heading-row": SectionHeadingRowBoard,
  "ticker-belt": TickerBeltBoard,
}

const DISCOVERED_PRIMITIVES = discoverPrimitives(forkshopConfig.ui)
const DISCOVERED_BLOCKS = discoverBlocks(forkshopConfig.blocks)

const FILE_MAP = {
  primitives: DISCOVERED_PRIMITIVES.map((p) => ({
    id: p.slug,
    sourcePath: `app/demo/_components/ui/${p.slug}.tsx`,
  })),
  blocks: DISCOVERED_BLOCKS.map((b) => ({
    slug: b.slug,
    sourcePath: `app/demo/_components/blocks/${b.slug}.tsx`,
  })),
}

// No-op stubs — board components accept these props but delegate position state
// to the PlaygroundBoard's internal useForkshopPositions hook.
const NOOP_ON_POSITION_CHANGE = () => {}
const EMPTY_NODE_POSITIONS = {}

function mapAgentSeed(seed: AgentSeed): ActivityEntry {
  let filePath: string
  if (seed.kind === "file") {
    filePath = seed.path
  } else if (seed.kind === "page") {
    filePath = `app${seed.path}/page.tsx`
  } else if (seed.kind === "block") {
    filePath = `app/demo/_components/blocks/${seed.slug}.tsx`
  } else {
    filePath = `app/demo/_components/ui/${seed.id}.tsx`
  }
  return {
    filePath,
    agent: "demo",
    agentLabel: "Demo",
    sessionId: "demo-seed",
    color: "#3057f0",
    action: "edit",
    lastSeenAt: Date.now(),
    pinned: true, // URL-seeded entries are persistent until URL changes
  }
}

const RESPONSIVE_VIEWPORTS = [1440, 768, 375]
// Generous static stage; `fitMode="width"` rescales to container.
const RESPONSIVE_STAGE_WIDTH = 3200
const RESPONSIVE_STAGE_HEIGHT = 1200

function SingleBlockBoard({
  slug,
  initialZoom,
  initialPan,
}: {
  slug: string
  initialZoom?: number
  initialPan?: { x: number; y: number }
}) {
  const block = DISCOVERED_BLOCKS.find((b) => b.slug === slug)
  const fileMapEntry = FILE_MAP.blocks.find((b) => b.slug === slug)
  const entries = useMemo<GalleryEntry[]>(() => {
    if (!block) return []
    // For blocks, the iframe loads the component-preview URL (/demo/block/<slug>).
    return responsiveFrameEntries(`/demo/block/${block.slug}`, {
      viewports: RESPONSIVE_VIEWPORTS,
      sourceFile: fileMapEntry?.sourcePath,
    })
  }, [block, fileMapEntry])
  if (!block) return null
  return (
    <PlaygroundBoard
      stageWidth={RESPONSIVE_STAGE_WIDTH}
      stageHeight={RESPONSIVE_STAGE_HEIGHT}
      fitMode="width"
      initialZoom={initialZoom}
      initialPan={initialPan}
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

function SinglePageBoard({
  path,
  initialZoom,
  initialPan,
}: {
  path: string
  initialZoom?: number
  initialPan?: { x: number; y: number }
}) {
  // Derive sourceFile from the route path — matches mapAgentSeed convention.
  const sourceFile = `app${path}/page.tsx`
  const entries = useMemo<GalleryEntry[]>(
    () =>
      responsiveFrameEntries(path, {
        viewports: RESPONSIVE_VIEWPORTS,
        sourceFile,
      }),
    [path, sourceFile],
  )
  return (
    <PlaygroundBoard
      stageWidth={RESPONSIVE_STAGE_WIDTH}
      stageHeight={RESPONSIVE_STAGE_HEIGHT}
      fitMode="width"
      initialZoom={initialZoom}
      initialPan={initialPan}
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

export default function DemoPage() {
  // Decode URL state eagerly during the first client render so that
  // AgentActivityProvider receives the correct initialActivity before its
  // own useState initializer runs. Reading window.location inside a lazy
  // useState initializer is safe in "use client" components — Next.js only
  // calls the initializer on the client, never during SSR.
  const [urlState] = useState(() =>
    typeof window !== "undefined"
      ? decodeUrlState(window.location.search)
      : { agents: [], zoom: undefined, pan: undefined },
  )

  const [selection, setSelection] = useState<ForkshopSelection>(() => {
    if (typeof window === "undefined") return DEFAULT_SELECTION
    return parseSelection(window.location.hash) ?? DEFAULT_SELECTION
  })
  const [hasHydrated, setHasHydrated] = useState(false)
  const [initialActivity] = useState<ActivityEntry[]>(() =>
    urlState.agents.map(mapAgentSeed),
  )
  const [initialZoom] = useState<number | undefined>(() => urlState.zoom)
  const [initialPan] = useState<{ x: number; y: number } | undefined>(() => urlState.pan)

  useEffect(() => {
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
    <AgentActivityProvider fileMap={FILE_MAP} initialActivity={initialActivity} subscribeToStream={false}>
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
            <DesignSystemBoard
              nodePositions={EMPTY_NODE_POSITIONS}
              onPositionChange={NOOP_ON_POSITION_CHANGE}
              initialZoom={initialZoom}
              initialPan={initialPan}
            />
          )}
          {selection.kind === "section" && selection.sectionId === "ui-components" && (
            <UIComponentsBoard />
          )}
          {selection.kind === "section" && selection.sectionId === "blocks" && (
            <BlocksBoardView
              nodePositions={EMPTY_NODE_POSITIONS}
              onPositionChange={NOOP_ON_POSITION_CHANGE}
              initialZoom={initialZoom}
              initialPan={initialPan}
            />
          )}
          {selection.kind === "section" && selection.sectionId === "sitemap" && (
            <SitemapBoard
              nodePositions={EMPTY_NODE_POSITIONS}
              onPositionChange={NOOP_ON_POSITION_CHANGE}
              initialZoom={initialZoom}
              initialPan={initialPan}
            />
          )}
          {selection.kind === "primitive" &&
            (() => {
              const Board = PRIMITIVE_BOARDS[selection.id]
              return Board ? <Board /> : null
            })()}
          {selection.kind === "block" && (
            <SingleBlockBoard slug={selection.slug} initialZoom={initialZoom} initialPan={initialPan} />
          )}
          {selection.kind === "page" && (
            <SinglePageBoard path={selection.path} initialZoom={initialZoom} initialPan={initialPan} />
          )}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
