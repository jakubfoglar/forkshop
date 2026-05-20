import { galleryLayoutProtocol } from "@forkshop/layouts/gallery"
import { treeLayoutProtocol } from "@forkshop/layouts/tree"
import type { Layout } from "@forkshop/types/layout"

// `Layout<TOptions>` is invariant in `TOptions` (render/stageSize both
// consume options), so the concrete typed protocols don't assign directly
// to `Layout<unknown>`. The cast is safe at the registry boundary: every
// consumer that resolves a Layout knows its own options shape.
export const BUILTIN_LAYOUTS: ReadonlyArray<Layout<unknown>> = [
  galleryLayoutProtocol as Layout<unknown>,
  treeLayoutProtocol as Layout<unknown>,
]

/**
 * Resolve a layout reference to a Layout. String refs ("gallery", "tree")
 * search `registered` first, then BUILTIN_LAYOUTS — so a user-registered
 * Layout with id "gallery" or "tree" shadows the built-in.
 */
export function resolveLayout(
  ref: "gallery" | "tree" | Layout<unknown>,
  registered: ReadonlyArray<Layout<unknown>>,
): Layout<unknown> | undefined {
  if (typeof ref === "string") {
    return (
      registered.find((l) => l.id === ref) ??
      BUILTIN_LAYOUTS.find((l) => l.id === ref)
    )
  }
  return ref
}
