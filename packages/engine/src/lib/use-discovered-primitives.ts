import { useMemo } from "react"
import type { ComponentType } from "react"

export interface DiscoveredPrimitive {
  slug: string
  name: string
  Component: ComponentType<Record<string, unknown>>
}

function toKebab(pascalCase: string): string {
  return pascalCase.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

function isPascalCase(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

/**
 * Reflect over a barrel module's named exports and return only PascalCase
 * function values (i.e. likely React components). Hooks (lowercase, prefixed
 * "use"), helpers (lowercase), and non-function exports (types, constants)
 * are filtered out.
 *
 * The barrel module shape is `Record<string, unknown>` — typically the result
 * of `import * as UIPrimitives from "@/components/ui"`. Pure function — safe
 * to call in server components or at module load.
 */
export function discoverPrimitives(
  barrel: Record<string, unknown>,
): DiscoveredPrimitive[] {
  return Object.entries(barrel)
    .filter(([name, value]) => isPascalCase(name) && typeof value === "function")
    .map(([name, value]) => ({
      slug: toKebab(name),
      name,
      Component: value as ComponentType<Record<string, unknown>>,
    }))
}

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
