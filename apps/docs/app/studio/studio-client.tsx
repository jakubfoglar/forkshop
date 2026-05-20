"use client"

import { useEffect, useState } from "react"
import {
  ForkshopSidebar,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
} from "@forkshop/engine"
import { STUDIO_BOARDS } from "./boards"
import { StudioBoardView } from "./studio-board-view"

const DEFAULT_SELECTION: ForkshopSelection = {
  kind: "block",
  slug: STUDIO_BOARDS[0]?.id ?? "hero-with-ai",
}

export function StudioClient() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)

  useEffect(() => {
    const fromHash = parseSelection(window.location.hash)
    if (fromHash) setSelection(fromHash)
  }, [])

  useEffect(() => {
    const next = serializeSelection(selection)
    if (window.location.hash !== next) window.history.replaceState({}, "", next)
  }, [selection])

  const activeBoard =
    (selection.kind === "block" && STUDIO_BOARDS.find((b) => b.id === selection.slug)) ||
    STUDIO_BOARDS[0]

  return (
    <div className="flex h-screen overflow-hidden">
      <ForkshopSidebar
        selection={selection}
        onSelect={setSelection}
        sections={[
          {
            id: "boards",
            title: "Boards",
            entryKind: "block",
            entries: STUDIO_BOARDS.map((b) => ({ slug: b.id, name: b.title })),
          },
        ]}
        routes={[]}
      />
      <div className="relative flex flex-1 overflow-hidden">
        {activeBoard && <StudioBoardView board={activeBoard} />}
      </div>
    </div>
  )
}
