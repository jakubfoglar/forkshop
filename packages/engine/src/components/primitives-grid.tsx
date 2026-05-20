"use client"

import { useDiscoveredPrimitives } from "@forkshop/lib/use-discovered-primitives"

export type PrimitivesGridProps = {
  /** Barrel object — e.g. `import * as UIPrimitives from "@/components/ui"` */
  ui: Record<string, unknown>
}

export function PrimitivesGrid({ ui }: PrimitivesGridProps) {
  const primitives = useDiscoveredPrimitives(ui)
  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {primitives.map((p) => (
        <div key={p.slug} className="rounded-md border p-3" aria-label={p.name}>
          <div className="mb-2 text-xs text-neutral-500">{p.name}</div>
          <p.Component />
        </div>
      ))}
    </div>
  )
}
