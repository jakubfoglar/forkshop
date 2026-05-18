import { useEffect, useState } from "react"
import type { TokenEntry, TokenRegistry } from "@forkshop/lib/token-registry"

const EMPTY_REGISTRY: TokenRegistry = {
  colors: [],
  spacing: [],
  fontSizes: [],
  fontWeights: [],
  radii: [],
  shadows: [],
  containers: [],
  classLookup: {},
}

/**
 * Pure-function path: parse a sequence of `[name, value]` CSS-custom-property
 * pairs into a `TokenRegistry`. Recognized prefixes:
 *
 * - `--color-*`     → colors entries (value used verbatim as hex/oklch/etc.)
 * - `--spacing-*`   → spacing entries (value used as rem)
 * - `--font-size-*` / `--text-*` → fontSizes entries
 * - `--font-weight-*` → fontWeights entries (parsed numeric)
 * - `--radius-*`    → radii entries
 * - `--shadow-*`    → shadows entries
 * - `--container-*` → containers entries
 *
 * Other prefixes (`--breakpoint-*`, `--ease-*`, etc.) and non-custom-property
 * names are ignored. Empty values are skipped. `classLookup` is empty —
 * class-name → token resolution needs the prefix table from `token-registry.ts`
 * and isn't a current consumer of the v4 path.
 */
export function parseTokenRegistryFromCssVars(
  pairs: Iterable<readonly [string, string]>,
): TokenRegistry {
  const colors: TokenEntry[] = []
  const spacing: TokenEntry[] = []
  const fontSizes: TokenEntry[] = []
  const fontWeights: TokenEntry[] = []
  const radii: TokenEntry[] = []
  const shadows: TokenEntry[] = []
  const containers: TokenEntry[] = []

  for (const [propName, rawValue] of pairs) {
    if (!propName.startsWith("--")) continue
    const value = rawValue.trim()
    if (!value) continue

    if (propName.startsWith("--color-")) {
      const name = propName.slice("--color-".length)
      colors.push({
        kind: "color",
        name,
        hex: value,
        isSemantic: name.includes("-"),
        family: name.split("-")[0] ?? "default",
      })
    } else if (propName.startsWith("--spacing-")) {
      spacing.push({
        kind: "spacing",
        name: propName.slice("--spacing-".length),
        rem: value,
        px: undefined,
      })
    } else if (propName.startsWith("--font-size-") || propName.startsWith("--text-")) {
      const prefix = propName.startsWith("--font-size-") ? "--font-size-" : "--text-"
      fontSizes.push({
        kind: "fontSize",
        name: propName.slice(prefix.length),
        value,
        lineHeight: undefined,
        letterSpacing: undefined,
      })
    } else if (propName.startsWith("--font-weight-")) {
      const weightNum = Number(value)
      fontWeights.push({
        kind: "fontWeight",
        name: propName.slice("--font-weight-".length),
        weight: Number.isFinite(weightNum) ? weightNum : 400,
      })
    } else if (propName.startsWith("--radius-")) {
      radii.push({
        kind: "radius",
        name: propName.slice("--radius-".length),
        value,
      })
    } else if (propName.startsWith("--shadow-")) {
      shadows.push({
        kind: "shadow",
        name: propName.slice("--shadow-".length),
        value,
      })
    } else if (propName.startsWith("--container-")) {
      containers.push({
        kind: "container",
        name: propName.slice("--container-".length),
        value,
      })
    }
  }

  return {
    colors,
    spacing,
    fontSizes,
    fontWeights,
    radii,
    shadows,
    containers,
    classLookup: {},
  }
}

/**
 * Scan `document.documentElement` computed style for Tailwind v4-shaped CSS
 * custom properties and build a minimal `TokenRegistry`. Browser-only — returns
 * an empty registry on the server. Used as a runtime alternative to
 * `buildTokenRegistry` (which only accepts a v3 `Config` object) for Tailwind
 * v4 projects that emit tokens from an `@theme` block.
 */
export function discoverTokenRegistryFromCss(): TokenRegistry {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return EMPTY_REGISTRY
  }
  const style = window.getComputedStyle(document.documentElement)
  const pairs: [string, string][] = []
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i)
    if (name.startsWith("--")) {
      pairs.push([name, style.getPropertyValue(name)])
    }
  }
  return parseTokenRegistryFromCssVars(pairs)
}

/**
 * React hook that runs `discoverTokenRegistryFromCss` after mount. Returns an
 * empty registry during SSR/first-render (no `document` available), then
 * populates after hydration. Use in v4 projects where tokens live in CSS
 * variables rather than a Tailwind config file.
 */
export function useTokenRegistryFromCss(): TokenRegistry {
  const [registry, setRegistry] = useState<TokenRegistry>(EMPTY_REGISTRY)
  useEffect(() => {
    setRegistry(discoverTokenRegistryFromCss())
  }, [])
  return registry
}
