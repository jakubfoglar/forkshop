import { galleryLayoutProtocol } from "@forkshop/layouts/gallery"
import { treeLayoutProtocol } from "@forkshop/layouts/tree"
import type { Layout } from "@forkshop/types/layout"

export const BUILTIN_LAYOUTS: ReadonlyArray<Layout<unknown>> = [
  galleryLayoutProtocol as Layout<unknown>,
  treeLayoutProtocol as Layout<unknown>,
]

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
