"use client"

import { useEffect, useState } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  AgentSelectionChip,
  ForkshopDrillProvider,
  useCanvasDrillIn,
  type ForkshopSelection,
  type AnyNode,
  DesignSystemGraph,
  Gallery,
  Tree,
  parseSelection,
  serializeSelection,
} from "@forkshop/registry"
import DesignSystemBoardView from "./design-system-board"
import ComponentsBoardView from "./components-board"
import PagesBoardView from "./pages-board"
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

function selectionToNode(selection: ForkshopSelection): AnyNode | null {
  if (selection.kind === "page") {
    return {
      id: `page:${selection.path}`,
      kind: "iframe-route",
      x: 0,
      y: 0,
      width: 1264,
      height: 800,
      routePath: selection.path,
    }
  }
  if (selection.kind === "block") {
    const block = forkshopConfig.blocks.find((b) => b.slug === selection.slug)
    if (!block) return null
    return {
      id: `block:${block.slug}`,
      kind: "iframe-component",
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
      slug: block.slug,
      previewSrc: block.iframeSrc,
      componentPath: block.sourcePath,
    }
  }
  if (selection.kind === "primitive") {
    const primitive = forkshopConfig.primitives.find((p) => p.id === selection.id)
    if (!primitive) return null
    return {
      id: `primitive:${primitive.id}`,
      kind: "inline-react",
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      label: primitive.name,
      filePath: primitive.sourcePath,
      render: primitive.render,
    }
  }
  return null
}

export default function ForkshopPage() {
  return (
    <ForkshopDrillProvider>
      <ForkshopPageInner />
    </ForkshopDrillProvider>
  )
}

function ForkshopPageInner() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const [hasHydrated, setHasHydrated] = useState(false)
  const drill = useCanvasDrillIn()

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

  useEffect(() => {
    const node = selectionToNode(selection)
    if (node) {
      drill.mark(node)
    } else {
      drill.clear()
    }
  }, [selection, drill])

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
            <DesignSystemBoardView
              selectedNodeId={selectedNodeId}
              onBack={() => setSelection({ kind: "section", sectionId: "foundations" })}
            />
          )}
          {view === "components" && (
            <ComponentsBoardView
              selectedNodeId={selectedNodeId}
              onBack={() => setSelection({ kind: "section", sectionId: "components" })}
            />
          )}
          {view === "pages" && (
            <PagesBoardView
              onBack={() => setSelection({ kind: "section", sectionId: "pages" })}
              selectedNodeId={selectedNodeId}
            />
          )}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
