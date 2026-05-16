/** Pull every string-literal token out of a TSX/TS source file. Used by the
 *  edit controller to build a per-iframe "what text in this file is editable"
 *  set. Values are trimmed — DOM textContent is also trimmed at lookup, so
 *  this normalizes both sides. Backtick literals with ${} interpolations are
 *  intentionally skipped (their rendered value depends on runtime data). */
export function extractStringLiterals(source: string): Set<string> {
  const out = new Set<string>()
  if (source.length === 0) return out
  const patterns = [
    /"([^"]*)"/g,
    /'([^']*)'/g,
    /`([^`$\\]*)`/g, // no ${, no backslash escapes — keep it dumb
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = match[1]?.trim()
      if (value && value.length > 0) out.add(value)
    }
  }
  return out
}
