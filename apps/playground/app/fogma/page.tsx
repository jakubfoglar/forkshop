"use client"

import { useState } from "react"
import {
  FogmaSidebar,
  LocatorInit,
  AgentActivityProvider,
  type FogmaSelection,
} from "@fogma/registry"
import DesignSystemBoardView from "./design-system-board"
import ComponentsBoardView from "./components-board"
import PagesBoardView from "./pages-board"

const PAGE_ROUTES = ["/sample", "/sample/about", "/sample/dashboard"] as const
const BLOCK_SLUGS = ["hero", "cta-band", "feature-row"] as const

export default function FogmaPage() {
  const [selection, setSelection] = useState<FogmaSelection>({
    kind: "section",
    sectionId: "design-system",
  })

  const activeView =
    selection.kind === "section" ? selection.sectionId : null

  return (
    <AgentActivityProvider blockSlugs={BLOCK_SLUGS} projectRoot="">
      <LocatorInit mountPath="/fogma" />
      <div className="flex h-screen overflow-hidden">
        <FogmaSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
            { id: "design-system", title: "Design System" },
            { id: "components", title: "Components" },
            { id: "pages", title: "Pages" },
          ]}
          routes={PAGE_ROUTES}
        />
        <div className="relative flex flex-1 overflow-hidden">
          {activeView === "design-system" && <DesignSystemBoardView />}
          {activeView === "components" && <ComponentsBoardView />}
          {activeView === "pages" && <PagesBoardView />}
          {activeView === null && (
            <div className="flex flex-1 items-center justify-center text-sm text-fogma-fg-muted">
              Select a section from the sidebar.
            </div>
          )}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
