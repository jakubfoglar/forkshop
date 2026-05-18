import type { TokenEntry, TokenRegistry } from "@forkshop/lib/token-registry"

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

