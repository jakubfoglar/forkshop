"use client"

import { useEffect, useState } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  AgentSelectionChip,
  type ForkshopSelection,
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
  sectionId: "design-system",
}

const FILE_MAP = {
  primitives: forkshopConfig.primitives
    .filter((p): p is typeof p & { sourcePath: string } => "sourcePath" in p && p.sourcePath !== undefined)
    .map((p) => ({ id: p.id, sourcePath: p.sourcePath })),
  blocks: forkshopConfig.blocks
    .filter((b): b is typeof b & { sourcePath: string } => "sourcePath" in b && b.sourcePath !== undefined)
    .map((b) => ({ slug: b.slug, sourcePath: b.sourcePath })),
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
  const view: "design-system" | "components" | "pages" =
    selection.kind === "page"
      ? "pages"
      : selection.kind === "block"
        ? "components"
        : selection.kind === "primitive"
          ? "design-system"
          : selection.kind === "section" &&
              (selection.sectionId === "design-system" ||
                selection.sectionId === "components" ||
                selection.sectionId === "pages")
            ? selection.sectionId
            : "design-system"

  // When the user clicked a page leaf in the sidebar, isolate that page.
  const isolatedPath = selection.kind === "page" ? selection.path : undefined

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
              id: "design-system",
              title: DesignSystemGraph.defaultTitle,
              icon: DesignSystemGraph.icon,
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
          {view === "design-system" && <DesignSystemBoardView selectedNodeId={selectedNodeId} />}
          {view === "components" && <ComponentsBoardView selectedNodeId={selectedNodeId} />}
          {view === "pages" && (
            <PagesBoardView
              isolatedPath={isolatedPath}
              onBack={() => setSelection({ kind: "section", sectionId: "pages" })}
              onIsolate={(path) => setSelection({ kind: "page", path })}
              selectedNodeId={selectedNodeId}
            />
          )}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
