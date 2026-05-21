import type { ComponentType } from "react"
import { createElement } from "react"
import type { LayoutEntry } from "@forkshop/types/layout"

/**
 * Primitive descriptor used by `enumeratePrimitiveVariants`. The base
 * `DiscoveredPrimitive` from `@forkshop/lib/discover-primitives` lacks the
 * cva-variants and sourcePath fields — this augmented type expects them
 * (both optional) so user-side Boards can hand-craft the input or hydrate
 * from the discover-primitives output.
 */
export type DiscoveredPrimitive = {
  slug: string
  name: string
  Component: ComponentType<Record<string, unknown>>
  /**
   * Optional map of variant prop → allowed values. When present, the helper
   * emits one entry per combination. When null/undefined/empty, the helper
   * emits three stub entries to seed the Board layout.
   */
  cvaVariants?: Record<string, string[]> | null
  /** Optional path string used for `filePath` on the emitted inline-react node. */
  sourcePath?: string
}

export function enumeratePrimitiveVariants(p: DiscoveredPrimitive): LayoutEntry[] {
  const variants = p.cvaVariants
  if (!variants || Object.keys(variants).length === 0) {
    return Array.from({ length: 3 }, (_, i) => ({
      id: `${p.slug}-default-${i + 1}`,
      label: "Default",
      node: {
        id: `primitive:${p.slug}-default-${i + 1}`,
        kind: "inline-react" as const,
        x: 0,
        y: 0,
        width: 240,
        height: 80,
        render: () => createElement(p.Component, {}),
        filePath: p.sourcePath,
      },
    }))
  }

  const keys = Object.keys(variants)
  const combos = cartesian(keys.map((k) => variants[k]!.map((v) => [k, v] as [string, string])))
  return combos.map((combo) => {
    const props = Object.fromEntries(combo)
    const variantKey = combo.map(([, v]) => v).join("-")
    return {
      id: `${p.slug}-${variantKey}`,
      label: combo.map(([k, v]) => `${k}=${v}`).join(" · "),
      node: {
        id: `primitive:${p.slug}-${variantKey}`,
        kind: "inline-react" as const,
        x: 0,
        y: 0,
        width: 240,
        height: 80,
        render: () => createElement(p.Component, { ...props, children: "Click me" }),
        filePath: p.sourcePath,
      },
    }
  })
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((c) => arr.map((v) => [...c, v])),
    [[]],
  )
}
