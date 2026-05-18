"use client"

import { useMemo } from "react"
import { discoverPrimitives, type DiscoveredPrimitive } from "@forkshop/lib/discover-primitives"

export { discoverPrimitives, type DiscoveredPrimitive } from "@forkshop/lib/discover-primitives"

/**
 * React hook that wraps `discoverPrimitives` with memoization. Barrel modules
 * (the result of `import * as`) are referentially stable across renders, so
 * the memoized result also stays stable — downstream `useMemo`s keyed on the
 * primitives array won't re-run unnecessarily.
 */
export function useDiscoveredPrimitives(
  barrel: Record<string, unknown>,
): DiscoveredPrimitive[] {
  return useMemo(() => discoverPrimitives(barrel), [barrel])
}
