"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  AgentSelectionChip,
  DesignSystemView,
  Gallery,
  Tree,
  ResponsiveFrameView,
  responsiveFrameStageDimensions,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
  type GalleryEntry,
  type InlineReactNode,
  type IframeRouteNode,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { FoundationsBoard } from "./foundations-board"
import { ComponentsBoard } from "./components-board"
import { BlocksBoard } from "./blocks-board"
import { PagesBoard } from "./pages-board"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

const DEFAULT_SELECTION: ForkshopSelection = {
  kind: "section",
  sectionId: "foundations",
}

const FILE_MAP = {
  primitives: forkshopConfig.primitives
    .filter((p): p is typeof p & { sourcePath: string } => "sourcePath" in p && p.sourcePath !== undefined)
    .map((p) => ({ id: p.id, sourcePath: p.sourcePath })),
  blocks: forkshopConfig.blocks
    .filter((b): b is typeof b & { sourcePath: string } => "sourcePath" in b && b.sourcePath !== undefined)
    .map((b) => ({ slug: b.slug, sourcePath: b.sourcePath })),
}

const PRIMITIVE_STAGE = { width: 800, height: 400 } as const

type View =
  | { kind: "foundations-overview" }
  | { kind: "components-overview" }
  | { kind: "blocks-overview" }
  | { kind: "pages-overview" }
  | { kind: "single-primitive"; id: string }
  | { kind: "single-block"; slug: string }
  | { kind: "single-page"; path: string }

function deriveView(selection: ForkshopSelection): View {
  if (selection.kind === "primitive") return { kind: "single-primitive", id: selection.id }
  if (selection.kind === "block") return { kind: "single-block", slug: selection.slug }
  if (selection.kind === "page") return { kind: "single-page", path: selection.path }
  if (selection.kind === "section") {
    if (selection.sectionId === "components") return { kind: "components-overview" }
    if (selection.sectionId === "blocks") return { kind: "blocks-overview" }
    if (selection.sectionId === "pages") return { kind: "pages-overview" }
  }
  return { kind: "foundations-overview" }
}

function SinglePrimitiveBoard({ primitiveId }: { primitiveId: string }) {
  const primitive = forkshopConfig.primitives.find((p) => p.id === primitiveId)
  if (!primitive) return null
  const node: InlineReactNode = {
    id: `single-primitive:${primitive.id}`,
    kind: "inline-react",
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    label: primitive.name,
    filePath: primitive.sourcePath,
    render: () => (
      <div className="inline-flex items-center justify-center bg-white p-8 shadow-md">
        {primitive.render()}
      </div>
    ),
  }
  return (
    <PlaygroundBoard stageWidth={PRIMITIVE_STAGE.width} stageHeight={PRIMITIVE_STAGE.height} fitMode="both">
      {() => (
        <Gallery
          entries={[{ id: node.id, label: primitive.name, node }]}
          layout="stack"
          viewportWidth={320}
          fitContent
        />
      )}
    </PlaygroundBoard>
  )
}

function SingleBlockBoard({ slug }: { slug: string }) {
  const block = forkshopConfig.blocks.find((b) => b.slug === slug)
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  const handleBodyHeightChange = useCallback((_id: string, h: number) => setMeasuredHeight(h), [])
  const { width, height } = useMemo(
    () => responsiveFrameStageDimensions(measuredHeight, [1440, 768, 375]),
    [measuredHeight],
  )
  if (!block) return null
  return (
    <PlaygroundBoard stageWidth={width} stageHeight={height} fitMode="width">
      {() => (
        <ResponsiveFrameView
          kind="block"
          path={block.slug}
          source={block.iframeSrc}
          sourceFile={block.sourceFile}
          viewports={[1440, 768, 375]}
          measuredHeight={measuredHeight}
          onBodyHeightChange={handleBodyHeightChange}
        />
      )}
    </PlaygroundBoard>
  )
}

function SinglePageBoard({ path }: { path: string }) {
  const page = forkshopConfig.pages.find((p) => p.path === path)
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  const handleBodyHeightChange = useCallback((_id: string, h: number) => setMeasuredHeight(h), [])
  const { width, height } = useMemo(
    () => responsiveFrameStageDimensions(measuredHeight, [1440, 768, 375]),
    [measuredHeight],
  )
  return (
    <PlaygroundBoard stageWidth={width} stageHeight={height} fitMode="width">
      {() => (
        <ResponsiveFrameView
          kind="page"
          path={path}
          source={path}
          sourceFile={page?.sourceFile}
          viewports={[1440, 768, 375]}
          measuredHeight={measuredHeight}
          onBodyHeightChange={handleBodyHeightChange}
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

  const view = deriveView(selection)

  return (
    <AgentActivityProvider fileMap={FILE_MAP}>
      <div className="flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
            {
              id: "foundations",
              title: DesignSystemView.defaultTitle,
              icon: DesignSystemView.icon,
            },
            {
              id: "components",
              title: Gallery.defaultTitle,
              icon: Gallery.icon,
              entryKind: "primitive",
              entries: forkshopConfig.primitives.map((p) => ({ slug: p.id, name: p.name })),
            },
            {
              id: "blocks",
              title: "Blocks",
              icon: Gallery.icon,
              entries: forkshopConfig.blocks.map((b) => ({ slug: b.slug, name: b.name })),
            },
            {
              id: "pages",
              title: Tree.defaultTitle,
              icon: Tree.icon,
            },
          ]}
          routes={forkshopConfig.pages.map((p) => p.path)}
        />
        <div className="relative flex flex-1 overflow-hidden">
          <AgentSelectionChip
            pageSelectionPath={selection.kind === "page" ? selection.path : undefined}
            blockSelectionSlug={selection.kind === "block" ? selection.slug : undefined}
            primitiveSelectionId={selection.kind === "primitive" ? selection.id : undefined}
          />
          {view.kind === "foundations-overview" && (
            <FoundationsBoard
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {view.kind === "components-overview" && (
            <ComponentsBoard
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {view.kind === "blocks-overview" && (
            <BlocksBoard
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {view.kind === "pages-overview" && (
            <PagesBoard
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {view.kind === "single-primitive" && <SinglePrimitiveBoard primitiveId={view.id} />}
          {view.kind === "single-block" && <SingleBlockBoard slug={view.slug} />}
          {view.kind === "single-page" && <SinglePageBoard path={view.path} />}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
