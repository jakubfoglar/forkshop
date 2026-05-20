"use client"

import { useMemo } from "react"
import type { BoardComponent } from "@forkshop/types/board"
import type { ForkshopSelection } from "@forkshop/types/selection"
import type { ParsedForkshopConfig } from "@forkshop/lib/schemas"
import type { Layout } from "@forkshop/types/layout"
import { SelectionProvider, useSelection } from "@forkshop/hooks/use-selection"
import { resolveLayout, BUILTIN_LAYOUTS } from "@forkshop/lib/builtin-layouts"
import { ForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useForkshopPositions } from "@forkshop/hooks/use-forkshop-positions"
import { AgentActivityProvider } from "@forkshop/components/agent-activity-context"

export type BoardRegistryProps = {
  config: ParsedForkshopConfig
  boards: ReadonlyArray<BoardComponent>
  initialSelection?: ForkshopSelection
}

export function BoardRegistry({ config, boards, initialSelection }: BoardRegistryProps) {
  const defaultSelection: ForkshopSelection = initialSelection ?? {
    kind: "section",
    sectionId: boards[0]?.__config.id ?? "default",
  }
  return (
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
      <SelectionProvider initial={defaultSelection}>
        <BoardRegistryInner config={config} boards={boards} />
      </SelectionProvider>
    </AgentActivityProvider>
  )
}

function BoardRegistryInner({
  config,
  boards,
}: {
  config: ParsedForkshopConfig
  boards: ReadonlyArray<BoardComponent>
}) {
  const selection = useSelection()
  // ParsedForkshopConfig.layouts is z.array(z.unknown()).optional() because the
  // schema can't introspect the Layout<TOptions> generic — cast at this
  // registry boundary (mirrors the cast in BUILTIN_LAYOUTS for the same reason).
  const allLayouts = useMemo<ReadonlyArray<Layout<unknown>>>(
    () => [
      ...((config.layouts ?? []) as ReadonlyArray<Layout<unknown>>),
      ...BUILTIN_LAYOUTS,
    ],
    [config.layouts],
  )

  const matches = boards.filter((b) => b.__config.match(selection))
  if (matches.length > 1) {
    console.warn(
      `Forkshop: multiple Boards matched selection ${JSON.stringify(selection)}: ` +
        matches.map((b) => b.__config.id).join(", ") +
        " (first wins)",
    )
  }
  const active = matches[0]

  return (
    <div className="flex h-screen overflow-hidden">
      <BoardSidebar boards={boards} />
      <div className="relative flex flex-1 overflow-hidden">
        {active ? <ActiveBoard board={active} layouts={allLayouts} /> : <EmptyBoardState />}
      </div>
    </div>
  )
}

function ActiveBoard({
  board,
  layouts,
}: {
  board: BoardComponent
  layouts: ReadonlyArray<Layout<unknown>>
}) {
  const cfg = board.__config
  const entries = cfg.useEntries()
  const layout = resolveLayout(cfg.layout, layouts)
  const { nodePositions, onPositionChange } = useForkshopPositions({ boardId: cfg.id })

  if (!layout) {
    return (
      <div className="p-4 text-sm text-red-600">
        {`Board "${cfg.id}" references layout "${String(cfg.layout)}" but it isn't registered. `}
        {`Add it to forkshopConfig.layouts or use a built-in id ("gallery" | "tree").`}
      </div>
    )
  }

  // layout.defaultOptions is typed `unknown` (Layout<unknown> invariance —
  // see BUILTIN_LAYOUTS cast). The contract is that defaultOptions is always
  // a plain options object, so coerce to a record before spreading.
  const defaults = (layout.defaultOptions ?? {}) as Record<string, unknown>
  const options = { ...defaults, ...(cfg.layoutOptions ?? {}) } as Record<string, unknown>
  return (
    <ForkshopCanvas>
      {layout.render({
        entries,
        options,
        nodePositions,
        onPositionChange,
      })}
    </ForkshopCanvas>
  )
}

/**
 * Stub sidebar — D3 only verifies labels render. D4 replaces this with
 * ForkshopSidebar wired to each Board's __config + useSidebarChildren.
 */
function BoardSidebar({ boards }: { boards: ReadonlyArray<BoardComponent> }) {
  return (
    <aside className="w-60 border-r p-2">
      {boards.map((b) => (
        <div key={b.__config.id} className="px-2 py-1 text-sm">
          {b.__config.label ?? b.__config.id}
        </div>
      ))}
    </aside>
  )
}

function EmptyBoardState() {
  return (
    <div className="p-4 text-sm text-neutral-500">
      {`No Board matched this selection. Check each Board's match() function.`}
    </div>
  )
}
