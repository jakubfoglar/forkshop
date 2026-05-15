"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  AgentSelectionChip,
  DesignSystemGraph,
  Gallery,
  Tree,
  buildTokenRegistry,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
  type GalleryEntry,
  type TreeEntry,
  type PrimitiveGroup,
  type InlineReactNode,
  type IframeRouteNode,
  type IframeComponentNode,
} from "@forkshop/registry"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

const PAGE_ROUTES = ["/sample", "/sample/about", "/sample/dashboard"] as const

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

const FOUNDATIONS_STAGE = { width: 3000, height: 2400 } as const
const COMPONENTS_STAGE = { width: 1200, height: 2200 } as const
const PAGES_STAGE = { width: 1264, height: 400 } as const

const DISPLAY_SAMPLES = [
  { className: "text-display-3xl", label: "display-3xl" },
  { className: "text-display-2xl", label: "display-2xl" },
  { className: "text-display-xl", label: "display-xl" },
  { className: "text-display-lg", label: "display-lg" },
  { className: "text-display-md", label: "display-md" },
  { className: "text-display-sm", label: "display-sm" },
  { className: "text-display-xs", label: "display-xs" },
] as const

const BODY_SAMPLES = [
  { className: "text-xl", label: "xl" },
  { className: "text-lg", label: "lg" },
  { className: "text-base", label: "base" },
  { className: "text-sm", label: "sm" },
  { className: "text-xs", label: "xs" },
] as const

const TYPOGRAPHY_SAMPLE = "Type Sample"
const BODY_SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog."

function TypographySamples() {
  return (
    <div className="flex flex-col gap-forkshop-4 p-forkshop-4">
      <section className="flex flex-col gap-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          Display
        </span>
        {DISPLAY_SAMPLES.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-forkshop-0.5">
            <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">
              {sample.label}
            </span>
            <span className={`${sample.className} text-forkshop-fg`}>{TYPOGRAPHY_SAMPLE}</span>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          Body
        </span>
        {BODY_SAMPLES.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-forkshop-0.5">
            <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">
              {sample.label}
            </span>
            <span className={`${sample.className} text-forkshop-fg`}>{BODY_SAMPLE_TEXT}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

function humanizePagePath(path: string): string {
  if (path === "/") return "Home"
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .join(" / ")
}

export default function ForkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const [hasHydrated, setHasHydrated] = useState(false)

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

  // Determine which main view to show.
  const view: "foundations" | "components" | "pages" =
    selection.kind === "page"
      ? "pages"
      : selection.kind === "block"
        ? "components"
        : selection.kind === "primitive"
          ? "foundations"
          : selection.kind === "section" &&
              (selection.sectionId === "foundations" ||
                selection.sectionId === "components" ||
                selection.sectionId === "pages")
            ? selection.sectionId
            : "foundations"

  const selectedNodeId =
    selection.kind === "primitive"
      ? `primitive:${selection.id}`
      : selection.kind === "block"
        ? `block:${selection.slug}`
        : selection.kind === "page"
          ? `page:${selection.path}`
          : undefined

  const focusedEntryId = selectedNodeId

  // Layout-specific data
  const tokens = useMemo(() => buildTokenRegistry(forkshopConfig.tailwindConfig), [])

  const primitiveGroups = useMemo<PrimitiveGroup[]>(
    () => [
      {
        id: "ui",
        label: "UI Primitives",
        primitives: forkshopConfig.primitives.map<InlineReactNode>((p) => ({
          id: `primitive:${p.id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 720,
          height: 480,
          label: p.name,
          filePath: p.sourcePath,
          render: p.render,
        })),
      },
    ],
    [],
  )

  const typographyNode = useMemo<InlineReactNode>(
    () => ({
      id: "typography",
      kind: "inline-react",
      x: 0,
      y: 0,
      width: 720,
      height: 920,
      label: "Typography",
      render: () => <TypographySamples />,
    }),
    [],
  )

  const blockEntries = useMemo<GalleryEntry[]>(
    () =>
      forkshopConfig.blocks.map((b): GalleryEntry => {
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
      }),
    [],
  )

  const pageEntries = useMemo<TreeEntry[]>(
    () =>
      forkshopConfig.pages.map((p): TreeEntry => {
        const node: IframeRouteNode = {
          id: `page:${p.path}`,
          kind: "iframe-route",
          x: 0,
          y: 0,
          width: 400,
          height: 280,
          routePath: p.path,
        }
        return { id: node.id, label: humanizePagePath(p.path), path: p.path, node }
      }),
    [],
  )

  return (
    <AgentActivityProvider fileMap={FILE_MAP}>
      <div className="flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
            {
              id: "foundations",
              title: DesignSystemGraph.defaultTitle,
              icon: DesignSystemGraph.icon,
              entryKind: "primitive",
              entries: forkshopConfig.primitives.map((p) => ({ slug: p.id, name: p.name })),
            },
            {
              id: "components",
              title: Gallery.defaultTitle,
              icon: Gallery.icon,
              entries: forkshopConfig.blocks.map((b) => ({ slug: b.slug, name: b.name })),
            },
            { id: "pages", title: Tree.defaultTitle, icon: Tree.icon },
          ]}
          routes={PAGE_ROUTES}
        />
        <div className="relative flex flex-1 overflow-hidden">
          <AgentSelectionChip
            pageSelectionPath={selection.kind === "page" ? selection.path : undefined}
            blockSelectionSlug={selection.kind === "block" ? selection.slug : undefined}
            primitiveSelectionId={selection.kind === "primitive" ? selection.id : undefined}
          />
          {view === "foundations" && (
            <PlaygroundBoard
              stageWidth={FOUNDATIONS_STAGE.width}
              stageHeight={FOUNDATIONS_STAGE.height}
              fitMode="both"
            >
              {({ nodePositions, onPositionChange }) => (
                <DesignSystemGraph
                  tokens={tokens}
                  primitives={primitiveGroups}
                  typography={typographyNode}
                  selectedId={selectedNodeId}
                  focusedEntryId={focusedEntryId}
                  nodePositions={nodePositions}
                  onPositionChange={onPositionChange}
                />
              )}
            </PlaygroundBoard>
          )}
          {view === "components" && (
            <PlaygroundBoard
              stageWidth={COMPONENTS_STAGE.width}
              stageHeight={COMPONENTS_STAGE.height}
              fitMode="width"
            >
              {({ nodePositions, onPositionChange }) => (
                <Gallery
                  entries={blockEntries}
                  layout="stack"
                  selectedId={selectedNodeId}
                  focusedEntryId={focusedEntryId}
                  nodePositions={nodePositions}
                  onPositionChange={onPositionChange}
                />
              )}
            </PlaygroundBoard>
          )}
          {view === "pages" && (
            <PlaygroundBoard
              stageWidth={PAGES_STAGE.width}
              stageHeight={PAGES_STAGE.height}
              fitMode="both"
            >
              {({ nodePositions, onPositionChange }) => (
                <Tree
                  entries={pageEntries}
                  selectedId={selectedNodeId}
                  focusedEntryId={focusedEntryId}
                  nodePositions={nodePositions}
                  onPositionChange={onPositionChange}
                />
              )}
            </PlaygroundBoard>
          )}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
