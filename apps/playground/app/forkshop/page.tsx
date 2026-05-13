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

const PAGE_ROUTES = ["/sample", "/sample/about", "/sample/dashboard"] as const
const BLOCK_SLUGS = ["hero", "cta-band", "feature-row"] as const

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

  // FILE_MAP populated in Task 19
  return (
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
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
