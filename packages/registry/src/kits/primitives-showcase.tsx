"use client"

import type { ReactNode } from "react"

export type PrimitiveDescriptor = {
  /** Unique id for the frame, e.g. "primitive:buttons". */
  id: string
  /** Human-readable label shown as the frame title. */
  name: string
  /** Callable that returns the content to render inside the frame. */
  render: () => ReactNode
}

export type PrimitivesShowcaseProps = {
  primitives: PrimitiveDescriptor[]
}

/**
 * Renders each primitive descriptor as a labelled frame in a vertical stack.
 * Use inside a `CanvasNode` (with `DesignSystemBoard`) or standalone.
 */
export function PrimitivesShowcase({ primitives }: PrimitivesShowcaseProps) {
  return (
    <div className="flex flex-col gap-4">
      {primitives.map((p) => (
        <div
          key={p.id}
          className="rounded-md border border-fogma-border bg-fogma-surface p-4"
        >
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-fogma-fg-tertiary">
            {p.name}
          </p>
          <div>{p.render()}</div>
        </div>
      ))}
    </div>
  )
}
