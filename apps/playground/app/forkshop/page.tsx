"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  AgentSelectionChip,
  DesignSystemView,
  getDesignSystemStageSize,
  Gallery,
  Tree,
  ResponsiveFrameView,
  responsiveFrameStageDimensions,
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

const PAGE_ROUTES = ["/", "/about", "/contact", "/about/team", "/about/careers"] as const

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

const COMPONENTS_STAGE = { width: 1200, height: 2200 } as const
const PRIMITIVE_STAGE = { width: 800, height: 400 } as const
const PAGES_STAGE_PADDING = 200

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
    <div className="flex flex-col gap-forkshop-4 bg-white p-forkshop-4 shadow-md">
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

type View =
  | { kind: "foundations-overview" }
  | { kind: "components-overview" }
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
    if (selection.sectionId === "pages") return { kind: "pages-overview" }
  }
  return { kind: "foundations-overview" }
}

function SinglePrimitiveBoard({ primitiveId }: { primitiveId: string }) {
  const primitive = forkshopConfig.primitives.find((p) => p.id === primitiveId)
  if (!primitive) return null
  // The single-primitive board shows one centered item; it shares the
  // `primitive:<id>` node id with the Foundations overview, so any drag
  // override saved there would render this view's primitive at the wrong
  // (or off-canvas) position. The view also has no meaningful drag target
  // — a one-item stack can't be reordered — so we skip positions entirely.
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
          viewports={[1440, 768, 375]}
          measuredHeight={measuredHeight}
          onBodyHeightChange={handleBodyHeightChange}
        />
      )}
    </PlaygroundBoard>
  )
}

function SinglePageBoard({ path }: { path: string }) {
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

  const foundationsStage = useMemo(
    () => getDesignSystemStageSize({ tokens, primitives: primitiveGroups, typography: typographyNode }),
    [tokens, primitiveGroups, typographyNode],
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
              title: DesignSystemView.defaultTitle,
              icon: DesignSystemView.icon,
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
          {view.kind === "foundations-overview" && (
            <PlaygroundBoard
              stageWidth={foundationsStage.width}
              stageHeight={foundationsStage.height}
              fitMode="both"
            >
              {({ nodePositions, onPositionChange }) => (
                <DesignSystemView
                  tokens={tokens}
                  primitives={primitiveGroups}
                  typography={typographyNode}
                  nodePositions={nodePositions}
                  onPositionChange={onPositionChange}
                />
              )}
            </PlaygroundBoard>
          )}
          {view.kind === "components-overview" && (
            <PlaygroundBoard
              stageWidth={COMPONENTS_STAGE.width}
              stageHeight={COMPONENTS_STAGE.height}
              fitMode="both"
            >
              {({ nodePositions, onPositionChange }) => (
                <Gallery
                  entries={blockEntries}
                  layout="stack"
                  nodePositions={nodePositions}
                  onPositionChange={onPositionChange}
                />
              )}
            </PlaygroundBoard>
          )}
          {view.kind === "pages-overview" && (() => {
            // Size the stage to the Tree's actual content footprint plus a
            // small padding so the canvas's fit-to-view centers the whole
            // forest comfortably regardless of how many pages / nesting depth
            // the config declares.
            const { width: treeW, height: treeH } = Tree.getStageSize(pageEntries)
            return (
              <PlaygroundBoard
                stageWidth={treeW + PAGES_STAGE_PADDING}
                stageHeight={treeH + PAGES_STAGE_PADDING}
                fitMode="both"
              >
                {({ nodePositions, onPositionChange }) => (
                  <Tree
                    entries={pageEntries}
                    nodePositions={nodePositions}
                    onPositionChange={onPositionChange}
                  />
                )}
              </PlaygroundBoard>
            )
          })()}
          {view.kind === "single-primitive" && <SinglePrimitiveBoard primitiveId={view.id} />}
          {view.kind === "single-block" && <SingleBlockBoard slug={view.slug} />}
          {view.kind === "single-page" && <SinglePageBoard path={view.path} />}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
