"use client"

import type { BoardConfig, BoardComponent } from "@forkshop/types/board"

export class BoardConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BoardConfigError"
  }
}

export function defineBoard<TLayoutOptions = unknown>(
  config: BoardConfig<TLayoutOptions>,
): BoardComponent<TLayoutOptions> {
  if (!config.id || typeof config.id !== "string") {
    throw new BoardConfigError("BoardConfigError: Board.id must be a non-empty string")
  }
  if (typeof config.match !== "function") {
    throw new BoardConfigError(
      `BoardConfigError: Board "${config.id}" must define a 'match' function`,
    )
  }
  if (typeof config.useEntries !== "function") {
    throw new BoardConfigError(
      `BoardConfigError: Board "${config.id}" must define a 'useEntries' hook`,
    )
  }
  if (!config.layout) {
    throw new BoardConfigError(
      `BoardConfigError: Board "${config.id}" must select a layout (built-in id "gallery"/"tree" or a Layout object)`,
    )
  }

  // The component is an identity tag: BoardRegistry dispatches rendering via __config
  // (reading useEntries, layoutOptions, etc). The function body is never used as JSX.
  function BoardComponentFn() {
    return null
  }

  Object.defineProperty(BoardComponentFn, "__config", {
    value: config,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  Object.defineProperty(BoardComponentFn, "__isBoard", {
    value: true as const,
    enumerable: false,
    writable: false,
    configurable: false,
  })

  return BoardComponentFn as unknown as BoardComponent<TLayoutOptions>
}
