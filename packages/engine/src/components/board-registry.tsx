"use client"

import { useEffect, useMemo } from "react"
import type { AnyBoardComponent } from "@forkshop/types/board"
import type { ForkshopSelection } from "@forkshop/types/selection"
import type { ParsedForkshopConfig } from "@forkshop/lib/schemas"
import type { Layout } from "@forkshop/types/layout"
import { SelectionProvider, useSelection, useSetSelection } from "@forkshop/hooks/use-selection"
import { resolveLayout, BUILTIN_LAYOUTS } from "@forkshop/lib/builtin-layouts"
import { ForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { useForkshopPositions } from "@forkshop/hooks/use-forkshop-positions"
import { AgentActivityProvider } from "@forkshop/components/agent-activity-context"
import { ForkshopSidebar } from "@forkshop/components/sidebar/forkshop-sidebar"
import { parseSelection, serializeSelection } from "@forkshop/components/sidebar/selection-hash"
import { forkshopIcons } from "@forkshop/lib/icons"

export type BoardRegistryProps = {
  config: ParsedForkshopConfig
  // AnyBoardComponent erases the layoutOptions generic — see types/board.ts for why.
  boards: ReadonlyArray<AnyBoardComponent>
  initialSelection?: ForkshopSelection
}

function useHashSyncedInitial(
  initialSelection: ForkshopSelection | undefined,
  fallback: ForkshopSelection,
): ForkshopSelection {
  // SSR-safe: on the server `window` is undefined, so we return the deterministic
  // value used to render the first paint. On the client, the hash takes priority
  // — accepts a minor hydration mismatch if the server-rendered selection
  // differs from the URL hash (BoardRegistry is a "use client" component, so
  // the mismatch resolves on the first client render).
  if (typeof window === "undefined") return initialSelection ?? fallback
  const fromHash = parseSelection(window.location.hash)
  return fromHash ?? initialSelection ?? fallback
}

export function BoardRegistry({ config, boards, initialSelection }: BoardRegistryProps) {
  const fallback: ForkshopSelection = {
    kind: "section",
    sectionId: boards[0]?.__config.id ?? "default",
  }
  const hydratedInitial = useHashSyncedInitial(initialSelection, fallback)
  return (
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
      <SelectionProvider initial={hydratedInitial}>
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
  boards: ReadonlyArray<AnyBoardComponent>
}) {
  const selection = useSelection()
  useEffect(() => {
    if (typeof window === "undefined") return
    window.history.replaceState({}, "", serializeSelection(selection))
  }, [selection])
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
      <BoardSidebar boards={boards} config={config} />
      <div className="relative flex flex-1 overflow-hidden">
        {active ? (
          active.__rawRender ? (
            <RawBoard board={active} />
          ) : (
            <ActiveBoard board={active} layouts={allLayouts} />
          )
        ) : (
          <EmptyBoardState />
        )}
      </div>
    </div>
  )
}

function RawBoard({ board }: { board: AnyBoardComponent }) {
  // Escape hatch (withBoardMeta): the Component owns its canvas and is rendered
  // directly. Hooks on __config (useEntries / useSidebarChildren) are not invoked.
  const Component = board
  return <Component />
}

function ActiveBoard({
  board,
  layouts,
}: {
  board: AnyBoardComponent
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

function BoardSidebar({
  boards,
  config,
}: {
  boards: ReadonlyArray<AnyBoardComponent>
  config: ParsedForkshopConfig
}) {
  const selection = useSelection()
  const setSelection = useSetSelection()

  const sections = boards.map((b) => {
    const cfg = b.__config
    const childrenHook = cfg.useSidebarChildren
    // Each Board contributes one sidebar section. useSidebarChildren is
    // optional — when omitted the section row is non-expandable.
    const children = childrenHook ? childrenHook() : undefined
    return {
      id: cfg.id,
      title: cfg.label ?? cfg.id,
      icon: cfg.icon ?? forkshopIcons.components,
      entries: children?.map((c) => ({
        slug: childSlug(c.selection),
        name: c.label,
        icon: c.icon,
      })),
      entryKind: children?.[0] ? inferEntryKind(children[0].selection) : undefined,
    }
  })

  return (
    <ForkshopSidebar
      selection={selection}
      onSelect={setSelection}
      sections={sections}
      routes={config.sitemap.routes.map((r) => r.path)}
    />
  )
}

function childSlug(sel: ForkshopSelection): string {
  if (sel.kind === "block") return sel.slug
  if (sel.kind === "primitive") return sel.id
  if (sel.kind === "page") return sel.path
  if (sel.kind === "custom") return `${sel.namespace}:${JSON.stringify(sel.data)}`
  return ""
}

function inferEntryKind(sel: ForkshopSelection): "primitive" | "block" | "page" | undefined {
  if (sel.kind === "primitive") return "primitive"
  if (sel.kind === "block") return "block"
  if (sel.kind === "page") return "page"
  return undefined
}

function EmptyBoardState() {
  return (
    <div className="p-4 text-sm text-neutral-500">
      {`No Board matched this selection. Check each Board's match() function.`}
    </div>
  )
}
