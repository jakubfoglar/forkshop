"use client"

import { useState } from "react"
import {
  ForkshopSidebar,
  LocatorInit,
  AgentActivityProvider,
  type ForkshopSelection,
  DesignSystemBoard,
  IframeGallery,
  PageTree,
} from "@forkshop/registry"
import DesignSystemBoardView from "./design-system-board"
import ComponentsBoardView from "./components-board"
import PagesBoardView from "./pages-board"
import { forkshopConfig } from "./forkshop.config"

const PAGE_ROUTES = ["/sample", "/sample/about", "/sample/dashboard"] as const

const FILE_MAP = {
  primitives: forkshopConfig.primitives
    .filter((p): p is typeof p & { sourcePath: string } => "sourcePath" in p && p.sourcePath !== undefined)
    .map((p) => ({ id: p.id, sourcePath: p.sourcePath })),
  blocks: forkshopConfig.blocks
    .filter((b): b is typeof b & { sourcePath: string } => "sourcePath" in b && b.sourcePath !== undefined)
    .map((b) => ({ slug: b.slug, sourcePath: b.sourcePath })),
}

export default function ForkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>({
    kind: "section",
    sectionId: "design-system",
  })

  // Determine which main view to show.
  const view: "design-system" | "components" | "pages" =
    selection.kind === "page"
      ? "pages"
      : selection.kind === "section" &&
          (selection.sectionId === "design-system" ||
            selection.sectionId === "components" ||
            selection.sectionId === "pages")
        ? selection.sectionId
        : "design-system"

  // When the user clicked a page leaf in the sidebar, isolate that page.
  const isolatedPath = selection.kind === "page" ? selection.path : undefined

  return (
    <AgentActivityProvider fileMap={FILE_MAP}>
      <LocatorInit mountPath="/forkshop" />
      <div className="flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
            { id: "design-system", title: DesignSystemBoard.defaultTitle, icon: DesignSystemBoard.icon },
            { id: "components", title: IframeGallery.defaultTitle, icon: IframeGallery.icon },
            { id: "pages", title: PageTree.defaultTitle, icon: PageTree.icon },
          ]}
          routes={PAGE_ROUTES}
        />
        <div className="relative flex flex-1 overflow-hidden">
          {view === "design-system" && <DesignSystemBoardView />}
          {view === "components" && <ComponentsBoardView />}
          {view === "pages" && (
            <PagesBoardView
              isolatedPath={isolatedPath}
              onBack={() => setSelection({ kind: "section", sectionId: "pages" })}
            />
          )}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
