"use client"

import { useEffect, useState } from "react"
import { parseTokenRegistryFromCssVars } from "@forkshop/lib/parse-token-registry-from-css-vars"
import { buildTokenRegistry, type TokenRegistry } from "@forkshop/lib/token-registry"
import type { Config } from "tailwindcss"

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

export type UseDesignTokensOptions = {
  /**
   * Token source:
   * - "auto" (default) — reads CSS vars from :root after hydration. Works for
   *   Tailwind v4 projects and any project that emits design tokens as
   *   custom properties.
   * - { tailwindConfig } — pass a Tailwind v3 Config object to extract tokens
   *   from the resolved theme.
   */
  source?: "auto" | { tailwindConfig: Config }
  /**
   * Convenience shorthand for `{ source: { tailwindConfig } }`. Either form
   * works; this matches what the setup skill scaffolds for Tailwind v3
   * projects and is the natural way to write it.
   */
  tailwindConfig?: Config
}

export function useDesignTokens(
  options: UseDesignTokensOptions = {},
): TokenRegistry {
  const [registry, setRegistry] = useState<TokenRegistry>(EMPTY_REGISTRY)

  useEffect(() => {
    // Top-level tailwindConfig (shorthand) wins over source.
    if (options.tailwindConfig) {
      setRegistry(buildTokenRegistry(options.tailwindConfig))
      return
    }
    if (
      typeof options.source === "object" &&
      "tailwindConfig" in options.source
    ) {
      setRegistry(buildTokenRegistry(options.source.tailwindConfig))
      return
    }
    if (typeof window === "undefined") return
    const style = window.getComputedStyle(document.documentElement)
    const pairs: [string, string][] = []
    for (let i = 0; i < style.length; i++) {
      const name = style.item(i)
      if (name.startsWith("--")) {
        pairs.push([name, style.getPropertyValue(name).trim()])
      }
    }
    setRegistry(parseTokenRegistryFromCssVars(pairs))
    // We deliberately exclude `options.source` and `options.tailwindConfig`
    // from deps — changing source mid-mount is not a supported operation.
    // Re-mount the hook instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return registry
}
