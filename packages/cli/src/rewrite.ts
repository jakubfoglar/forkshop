export type AliasMap = Record<string, string>

/**
 * Rewrites `@fogma/*` import paths in a source string to use the user's
 * project-side aliases. Pure function — no I/O.
 *
 * Strategy: for each `from "..."` / `import("...")` whose specifier starts with
 * `@fogma/`, find the longest matching alias prefix in `aliases` and swap. Also
 * strips trailing `.js` from the specifier in the same pass.
 */
export function rewriteImports(source: string, aliases: AliasMap): string {
  // Sort prefixes longest-first so e.g. "@fogma/components/canvas" beats "@fogma/components".
  const sortedPrefixes = Object.keys(aliases).sort((a, b) => b.length - a.length)

  function rewriteSpecifier(spec: string): string {
    if (!spec.startsWith("@fogma/")) return spec
    // Strip trailing .js so prefix matching ignores file-suffix style. Only used
    // when an alias matches; unmatched specifiers retain their original form.
    const noJs = spec.replace(/\.js$/, "")
    for (const prefix of sortedPrefixes) {
      if (noJs === prefix || noJs.startsWith(`${prefix}/`)) {
        const replacement = aliases[prefix]
        // Unreachable in practice: `prefix` came from Object.keys(aliases) so
        // `aliases[prefix]` is always defined. The guard exists only to satisfy
        // noUncheckedIndexedAccess; the `continue` is defensive.
        if (replacement === undefined) continue
        const suffix = noJs.slice(prefix.length) // includes leading "/" or empty
        return `${replacement}${suffix}`
      }
    }
    // No alias matched — leave the specifier untouched, including any .js suffix.
    // Callers (init/add) use this to detect missing aliases by string equality.
    return spec
  }

  // Match: from "..." | from '...'
  const fromPattern = /(\bfrom\s+)(["'])([^"']+)\2/g
  // Match: import("...") | import('...')
  const dynamicPattern = /(\bimport\s*\(\s*)(["'])([^"']+)\2/g

  let next = source
  next = next.replace(fromPattern, (_match, prefix, quote, spec) => {
    return `${prefix}${quote}${rewriteSpecifier(spec)}${quote}`
  })
  next = next.replace(dynamicPattern, (_match, prefix, quote, spec) => {
    return `${prefix}${quote}${rewriteSpecifier(spec)}${quote}`
  })
  return next
}
