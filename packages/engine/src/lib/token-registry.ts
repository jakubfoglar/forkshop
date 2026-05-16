import type { Config } from "tailwindcss"
import resolveConfig from "tailwindcss/resolveConfig"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenEntry =
  | { kind: "color"; name: string; hex: string; isSemantic: boolean; family: string }
  | { kind: "spacing"; name: string; rem: string; px: number | undefined }
  | {
      kind: "fontSize"
      name: string
      value: string
      lineHeight: string | undefined
      letterSpacing: string | undefined
    }
  | { kind: "fontWeight"; name: string; weight: number }
  | { kind: "radius"; name: string; value: string }
  | { kind: "shadow"; name: string; value: string }
  | { kind: "container"; name: string; value: string }

type CategoryKey =
  | "colors"
  | "spacing"
  | "fontSizes"
  | "fontWeights"
  | "radii"
  | "shadows"
  | "containers"

export type ClassLookupEntry = {
  category: CategoryKey
  prefix: string
  tokenName: string
  entry: TokenEntry
}

export type TokenRegistry = {
  colors: TokenEntry[]
  spacing: TokenEntry[]
  fontSizes: TokenEntry[]
  fontWeights: TokenEntry[]
  radii: TokenEntry[]
  shadows: TokenEntry[]
  containers: TokenEntry[]
  classLookup: Record<string, ClassLookupEntry>
}

// ---------------------------------------------------------------------------
// Class-prefix tables
// ---------------------------------------------------------------------------

const COLOR_PREFIXES = [
  "text",
  "bg",
  "border",
  "ring",
  "outline",
  "decoration",
  "divide",
  "placeholder",
  "fill",
  "stroke",
  "from",
  "via",
  "to",
] as const

const SPACING_PREFIXES = [
  "p",
  "pt",
  "pr",
  "pb",
  "pl",
  "px",
  "py",
  "m",
  "mt",
  "mr",
  "mb",
  "ml",
  "mx",
  "my",
  "gap",
  "gap-x",
  "gap-y",
  "space-x",
  "space-y",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-x",
  "inset-y",
  "w",
  "h",
  "min-w",
  "min-h",
  "max-w",
  "max-h",
  "size",
] as const

const RADIUS_PREFIXES = [
  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-tl",
  "rounded-tr",
  "rounded-br",
  "rounded-bl",
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnyRecord = Record<string, unknown>

function flattenColors(
  source: AnyRecord,
  family: string,
  trail: string[] = [],
): { name: string; hex: string; family: string }[] {
  const result: { name: string; hex: string; family: string }[] = []
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      const name = key === "DEFAULT" ? trail.join("-") : [...trail, key].join("-")
      if (name) result.push({ name, hex: value, family })
    } else if (value && typeof value === "object") {
      const nextFamily = trail.length === 0 ? key : family
      result.push(...flattenColors(value as AnyRecord, nextFamily, [...trail, key]))
    }
  }
  return result
}

function remToPx(value: string): number | undefined {
  const match = /^([\d.]+)rem$/.exec(value)
  if (!match) return undefined
  const rem = Number.parseFloat(match[1] ?? "0")
  return Number.isFinite(rem) ? rem * 16 : undefined
}

// ---------------------------------------------------------------------------
// Category builders
// ---------------------------------------------------------------------------

const FORKSHOP_TOKEN_PREFIX = "forkshop-"

function isForkshopToken(name: string, family?: string): boolean {
  if (name.startsWith(FORKSHOP_TOKEN_PREFIX)) return true
  if (family && (family === "forkshop" || family.startsWith(FORKSHOP_TOKEN_PREFIX))) return true
  return false
}

function buildColors(
  theme: AnyRecord,
  themeExtend: AnyRecord,
  semanticFamilies: Set<string>,
  includeForkshopTokens: boolean,
): TokenEntry[] {
  const colorsConfig = (themeExtend["colors"] ?? theme["colors"] ?? {}) as AnyRecord
  let flat = flattenColors(colorsConfig, "")
  if (!includeForkshopTokens) {
    flat = flat.filter((entry) => !isForkshopToken(entry.name, entry.family))
  }
  const seen = new Set<string>()
  const entries: TokenEntry[] = []
  for (const { name, hex, family } of flat) {
    if (seen.has(name)) continue
    seen.add(name)
    entries.push({
      kind: "color",
      name,
      hex,
      family,
      isSemantic: !semanticFamilies.has(family),
    })
  }
  entries.sort((a, b) => {
    if (a.kind !== "color" || b.kind !== "color") return 0
    if (a.isSemantic !== b.isSemantic) return a.isSemantic ? -1 : 1
    if (a.family !== b.family) return a.family.localeCompare(b.family)
    return a.name.localeCompare(b.name)
  })
  return entries
}

function buildSpacing(
  theme: AnyRecord,
  themeExtend: AnyRecord,
  includeForkshopTokens: boolean,
): TokenEntry[] {
  const spacingConfig = (theme["spacing"] ?? {}) as Record<string, string>
  const extendPadding = (themeExtend["padding"] ?? {}) as Record<string, string>
  const merged: Record<string, string> = { ...spacingConfig, ...extendPadding }
  const entries = Object.entries(merged).map<TokenEntry>(([name, rem]) => ({
    kind: "spacing",
    name,
    rem,
    px: remToPx(rem),
  }))
  return includeForkshopTokens ? entries : entries.filter((entry) => !isForkshopToken(entry.name))
}

function buildFontSizes(theme: AnyRecord, includeForkshopTokens: boolean): TokenEntry[] {
  const fontSizeConfig = (theme["fontSize"] ?? {}) as Record<
    string,
    string | [string, { lineHeight?: string; letterSpacing?: string }]
  >
  const entries = Object.entries(fontSizeConfig).map<TokenEntry>(([name, value]) => {
    if (typeof value === "string") {
      return { kind: "fontSize", name, value, lineHeight: undefined, letterSpacing: undefined }
    }
    const [size, options] = value
    return {
      kind: "fontSize",
      name,
      value: size ?? "",
      lineHeight: options?.lineHeight,
      letterSpacing: options?.letterSpacing,
    }
  })
  return includeForkshopTokens ? entries : entries.filter((entry) => !isForkshopToken(entry.name))
}

function buildFontWeights(theme: AnyRecord, includeForkshopTokens: boolean): TokenEntry[] {
  const fontWeightConfig = (theme["fontWeight"] ?? {}) as Record<string, string>
  const entries = Object.entries(fontWeightConfig).map<TokenEntry>(([name, weight]) => ({
    kind: "fontWeight",
    name,
    weight: Number.parseInt(weight, 10),
  }))
  return includeForkshopTokens ? entries : entries.filter((entry) => !isForkshopToken(entry.name))
}

function buildRadii(
  theme: AnyRecord,
  themeExtend: AnyRecord,
  includeForkshopTokens: boolean,
): TokenEntry[] {
  const baseRadii = (theme["borderRadius"] ?? {}) as Record<string, string>
  const extendRadii = (themeExtend["borderRadius"] ?? {}) as Record<string, string>
  const merged: Record<string, string> = { ...baseRadii, ...extendRadii }
  const entries = Object.entries(merged).map<TokenEntry>(([name, value]) => ({
    kind: "radius",
    name,
    value,
  }))
  return includeForkshopTokens ? entries : entries.filter((entry) => !isForkshopToken(entry.name))
}

function buildShadows(theme: AnyRecord, includeForkshopTokens: boolean): TokenEntry[] {
  const shadowConfig = (theme["boxShadow"] ?? {}) as Record<string, string>
  const entries = Object.entries(shadowConfig).map<TokenEntry>(([name, value]) => ({
    kind: "shadow",
    name,
    value,
  }))
  return includeForkshopTokens ? entries : entries.filter((entry) => !isForkshopToken(entry.name))
}

function buildContainers(
  theme: AnyRecord,
  themeExtend: AnyRecord,
  includeForkshopTokens: boolean,
): TokenEntry[] {
  const maxWidthConfig = (themeExtend["maxWidth"] ?? theme["maxWidth"] ?? {}) as Record<
    string,
    string
  >
  const entries = Object.entries(maxWidthConfig).map<TokenEntry>(([name, value]) => ({
    kind: "container",
    name,
    value,
  }))
  return includeForkshopTokens ? entries : entries.filter((entry) => !isForkshopToken(entry.name))
}

function buildClassLookup(
  registry: Omit<TokenRegistry, "classLookup">,
): TokenRegistry["classLookup"] {
  const lookup: TokenRegistry["classLookup"] = {}

  for (const entry of registry.colors) {
    if (entry.kind !== "color") continue
    for (const prefix of COLOR_PREFIXES) {
      lookup[`${prefix}-${entry.name}`] = { category: "colors", prefix, tokenName: entry.name, entry }
    }
  }

  for (const entry of registry.spacing) {
    if (entry.kind !== "spacing") continue
    for (const prefix of SPACING_PREFIXES) {
      lookup[`${prefix}-${entry.name}`] = { category: "spacing", prefix, tokenName: entry.name, entry }
    }
  }

  for (const entry of registry.fontSizes) {
    if (entry.kind !== "fontSize") continue
    lookup[`text-${entry.name}`] = { category: "fontSizes", prefix: "text", tokenName: entry.name, entry }
  }

  for (const entry of registry.fontWeights) {
    if (entry.kind !== "fontWeight") continue
    lookup[`font-${entry.name}`] = { category: "fontWeights", prefix: "font", tokenName: entry.name, entry }
  }

  for (const entry of registry.radii) {
    if (entry.kind !== "radius") continue
    for (const prefix of RADIUS_PREFIXES) {
      const className = entry.name === "DEFAULT" ? prefix : `${prefix}-${entry.name}`
      lookup[className] = { category: "radii", prefix, tokenName: entry.name, entry }
    }
  }

  for (const entry of registry.shadows) {
    if (entry.kind !== "shadow") continue
    const className = entry.name === "DEFAULT" ? "shadow" : `shadow-${entry.name}`
    lookup[className] = { category: "shadows", prefix: "shadow", tokenName: entry.name, entry }
  }

  for (const entry of registry.containers) {
    if (entry.kind !== "container") continue
    lookup[`max-w-${entry.name}`] = { category: "containers", prefix: "max-w", tokenName: entry.name, entry }
  }

  return lookup
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type BuildTokenRegistryOptions = {
  /**
   * Color family names that should be treated as raw scale families
   * (non-semantic). Defaults to an empty set so all colors are treated as
   * semantic unless you specify otherwise.
   */
  rawScaleFamilies?: Set<string>
  /**
   * When true, tokens whose names start with `forkshop-` (or whose family is
   * `forkshop`) are kept in the registry. Defaults to `false` so Forkshop's own
   * chrome tokens — wired in by the setup skill via `forkshop-preset` — don't
   * leak into the user-facing design system view.
   */
  includeForkshopTokens?: boolean
}

/**
 * Builds a complete TokenRegistry from any Tailwind CSS config.
 *
 * The config is resolved via `tailwindcss/resolveConfig` so all default
 * theme values are merged before extraction.
 *
 * @param tailwindConfig - Your project's Tailwind config object.
 * @param options - Optional configuration. See `BuildTokenRegistryOptions`.
 */
export function buildTokenRegistry(
  tailwindConfig: Config,
  options: BuildTokenRegistryOptions = {},
): TokenRegistry {
  const { rawScaleFamilies = new Set<string>(), includeForkshopTokens = false } = options
  const resolved = resolveConfig(tailwindConfig)
  const theme = (resolved.theme ?? {}) as AnyRecord
  // `resolveConfig` merges `extend` into the top-level theme, so there is no
  // separate `extend` in the resolved output. We keep `themeExtend` as an
  // empty record here to preserve the builder signatures unchanged.
  const themeExtend: AnyRecord = {}

  const partial = {
    colors: buildColors(theme, themeExtend, rawScaleFamilies, includeForkshopTokens),
    spacing: buildSpacing(theme, themeExtend, includeForkshopTokens),
    fontSizes: buildFontSizes(theme, includeForkshopTokens),
    fontWeights: buildFontWeights(theme, includeForkshopTokens),
    radii: buildRadii(theme, themeExtend, includeForkshopTokens),
    shadows: buildShadows(theme, includeForkshopTokens),
    containers: buildContainers(theme, themeExtend, includeForkshopTokens),
  }

  return { ...partial, classLookup: buildClassLookup(partial) }
}

// ---------------------------------------------------------------------------
// Active-catalog singleton (for consumers that can't thread the registry)
// ---------------------------------------------------------------------------

let _activeCatalog: TokenRegistry | null = null

/**
 * Set the active token catalog. Call this once during your app's forkshop setup
 * (e.g., from `forkshop.config.ts`) so consumers can retrieve it via
 * `getActiveTokenRegistry()` without threading it through every prop.
 */
export function setActiveTokenRegistry(registry: TokenRegistry): void {
  _activeCatalog = registry
}

/**
 * Get the active token catalog previously set by `setActiveTokenRegistry`.
 * Throws if no catalog has been set.
 */
export function getActiveTokenRegistry(): TokenRegistry {
  if (!_activeCatalog) {
    throw new Error(
      "No token registry set. Call setActiveTokenRegistry(buildTokenRegistry(yourConfig)) during your forkshop setup.",
    )
  }
  return _activeCatalog
}

/**
 * Look up a token entry by Tailwind utility class name using the active catalog.
 */
export function findTokenForClass(className: string): TokenEntry | undefined {
  return getActiveTokenRegistry().classLookup[className]?.entry
}
