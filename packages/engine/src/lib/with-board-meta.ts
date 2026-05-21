import type { ComponentType } from "react"
import type { BoardConfig, BoardComponent } from "@forkshop/types/board"

export type WithBoardMetaInput = Omit<BoardConfig, "useEntries" | "layout"> & {
  layout?: BoardConfig["layout"]
  useEntries?: BoardConfig["useEntries"]
}

/**
 * Escape hatch for Boards that need full control of canvas rendering — wraps a
 * raw React component so BoardRegistry treats it like a defineBoard() result.
 * The wrapped Component is invoked directly (it owns its ForkshopCanvas); the
 * layout / useEntries pair on __config is filled with no-op defaults so the
 * matcher and sidebar wiring still work.
 *
 * Prefer defineBoard() for normal Boards — withBoardMeta sidesteps the engine's
 * layout machinery and the user is on the hook for canvas + positions wiring.
 */
export function withBoardMeta(
  Component: ComponentType<Record<string, never>>,
  meta: WithBoardMetaInput,
): BoardComponent {
  const config: BoardConfig = {
    layout: meta.layout ?? "gallery",
    useEntries: meta.useEntries ?? (() => []),
    ...meta,
  }
  Object.defineProperty(Component, "__config", {
    value: config,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  Object.defineProperty(Component, "__isBoard", {
    value: true as const,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  Object.defineProperty(Component, "__rawRender", {
    value: true as const,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  return Component as unknown as BoardComponent
}
