import type { SpacingSide } from "@fogma/hooks/use-iframe-spacing-wiring"

// Tailwind default breakpoints. The project hasn't overridden them; if it ever
// does, this map needs updating.
const BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
}

// Order matters: most specific first. The first class on the element matching
// one of these prefixes (for the given side) is the one we edit.
const PADDING_SPECIFICITY: Record<SpacingSide, readonly string[]> = {
  top: ["pt-", "py-", "p-"],
  right: ["pr-", "px-", "p-"],
  bottom: ["pb-", "py-", "p-"],
  left: ["pl-", "px-", "p-"],
}

const GAP_SPECIFICITY: Record<"x" | "y", readonly string[]> = {
  x: ["gap-x-", "gap-"],
  y: ["gap-y-", "gap-"],
}

export type ResolvedSpacingClass = {
  prefix: string
  fullClass: string
  tokenName: string
}

type TokenParts = {
  variant: string | undefined // "md", "lg", etc., or undefined for base
  variantWidth: number // 0 for base, otherwise the breakpoint min-width
  base: string // e.g. "py-4" (with the responsive prefix stripped)
}

function parseToken(token: string): TokenParts {
  // Tailwind responsive variants like `md:py-7`, `lg:gap-4`, `2xl:p-2`.
  // Multi-segment variants (e.g. `dark:md:py-4`) are rare in this codebase;
  // we handle only the breakpoint segment, taking the FIRST recognized one.
  const segments = token.split(":")
  let variant: string | undefined
  let variantWidth = 0
  while (segments.length > 1) {
    const candidate = segments[0]
    if (candidate === undefined) break
    const width = BREAKPOINTS[candidate]
    if (width !== undefined && variant === undefined) {
      variant = candidate
      variantWidth = width
    }
    // We strip the segment regardless so non-breakpoint variants (hover, dark)
    // get peeled off and we focus on the base class. They're not editable
    // through the picker today; the resolver will skip them naturally.
    segments.shift()
  }
  return { variant, variantWidth, base: segments.join(":") }
}

function resolveByPrefix(
  className: string,
  prefixes: readonly string[],
  viewportWidth: number,
): ResolvedSpacingClass | undefined {
  const tokens = className.split(/\s+/).filter(Boolean)
  // Find all tokens whose base matches one of the prefixes AND whose breakpoint
  // applies at this viewport. Return the most specific:
  //   1. highest viewport width that still applies (md > base, lg > md, ...)
  //   2. tie-break by specificity within the prefix array (e.g. pt- > py- > p-)
  let best: { token: string; prefix: string; prefixIndex: number; width: number } | undefined
  for (const token of tokens) {
    const parsed = parseToken(token)
    if (parsed.variantWidth > viewportWidth) continue
    for (const [prefixIndex, prefix] of prefixes.entries()) {
      if (!parsed.base.startsWith(prefix)) continue
      const wins =
        !best ||
        parsed.variantWidth > best.width ||
        (parsed.variantWidth === best.width && prefixIndex < best.prefixIndex)
      if (wins) {
        best = { token, prefix, prefixIndex, width: parsed.variantWidth }
      }
      break
    }
  }
  if (!best) return undefined
  const parsed = parseToken(best.token)
  const fullPrefix = parsed.variant === undefined ? best.prefix : `${parsed.variant}:${best.prefix}`
  return {
    prefix: fullPrefix,
    fullClass: best.token,
    tokenName: parsed.base.slice(best.prefix.length),
  }
}

export function resolvePaddingClass(
  className: string,
  side: SpacingSide,
  viewportWidth: number,
): ResolvedSpacingClass | undefined {
  return resolveByPrefix(className, PADDING_SPECIFICITY[side], viewportWidth)
}

export function resolveGapClass(
  className: string,
  axis: "x" | "y",
  viewportWidth: number,
): ResolvedSpacingClass | undefined {
  return resolveByPrefix(className, GAP_SPECIFICITY[axis], viewportWidth)
}

// All margin classes present on the element, in source order, each as its own
// resolved entry. Order of prefix checks (longer first) avoids matching
// `mt-4` as both `m-` and `mt-`.
const MARGIN_PREFIXES = ["mt-", "mr-", "mb-", "ml-", "mx-", "my-", "m-"] as const

export function extractMarginClasses(className: string): ResolvedSpacingClass[] {
  const tokens = className.split(/\s+/).filter(Boolean)
  const result: ResolvedSpacingClass[] = []
  for (const token of tokens) {
    const parsed = parseToken(token)
    for (const prefix of MARGIN_PREFIXES) {
      if (parsed.base.startsWith(prefix)) {
        const fullPrefix = parsed.variant === undefined ? prefix : `${parsed.variant}:${prefix}`
        result.push({
          prefix: fullPrefix,
          fullClass: token,
          tokenName: parsed.base.slice(prefix.length),
        })
        break
      }
    }
  }
  return result
}
