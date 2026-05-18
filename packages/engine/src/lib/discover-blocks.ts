import type { ComponentType } from "react"
import { discoverPrimitives } from "@forkshop/lib/discover-primitives"

export interface DiscoveredBlock {
  slug: string
  name: string
  Component: ComponentType<Record<string, unknown>>
  /** Convention: /forkshop/block/<slug> — matches the auto-managed preview route. */
  previewSrc: string
}

// Reflect over a barrel module and return blocks. Blocks use the same
// reflection logic as primitives (PascalCase function exports) but carry
// the conventional preview-route URL for iframe-component rendering. Pure
// function — safe to call in server components or at module load.
export function discoverBlocks(
  barrel: Record<string, unknown>,
): DiscoveredBlock[] {
  return discoverPrimitives(barrel).map((p) => ({
    ...p,
    previewSrc: `/forkshop/block/${p.slug}`,
  }))
}
