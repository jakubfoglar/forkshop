/** Pull every string-literal token out of a TSX/TS source file. Used by the
 *  edit controller to build a per-iframe "what text in this file is editable"
 *  set. Values are trimmed — DOM textContent is also trimmed at lookup, so
 *  this normalizes both sides. Backtick literals with ${} interpolations are
 *  intentionally skipped (their rendered value depends on runtime data). */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
}

function decodeHtmlEntities(s: string): string {
  return s.replace(/&(apos|quot|amp|lt|gt|nbsp);/g, (m) => HTML_ENTITY_MAP[m] ?? m)
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

/** Resolve a decoded+normalized "user-facing" text back to the verbatim source
 *  span it came from. Used by the edit controller before sending a JSX text edit
 *  to the API — the API does a verbatim search, but the user's textContent is
 *  the decoded/normalized form. Returns the literal source span (between `>` and
 *  `<`, with entities + whitespace intact) so the API can find and replace it.
 *  Returns undefined if no JSX text span normalizes to the target. */
export function resolveJsxTextSpan(source: string, normalizedTarget: string): string | undefined {
  if (normalizedTarget.length === 0) return undefined
  const jsxTextPattern = />([^<>{}]+)</g
  for (const match of source.matchAll(jsxTextPattern)) {
    const raw = match[1] ?? ""
    const normalized = normalizeWhitespace(decodeHtmlEntities(raw))
    if (normalized === normalizedTarget) return raw
  }
  return undefined
}

export function extractStringLiterals(source: string): Set<string> {
  const out = new Set<string>()
  if (source.length === 0) return out
  // String / template literal patterns.
  const literalPatterns = [
    /"([^"]*)"/g,
    /'([^']*)'/g,
    /`([^`$\\]*)`/g, // no ${, no backslash escapes — keep it dumb
  ]
  for (const pattern of literalPatterns) {
    for (const match of source.matchAll(pattern)) {
      const value = match[1]?.trim()
      if (value && value.length > 0) out.add(value)
    }
  }
  // JSX text-content pattern — text between `>` and `<` that doesn't contain
  // JSX expressions ({...}) or nested tags. Decodes common HTML entities so
  // the set's strings match rendered DOM textContent, which uses decoded
  // characters. Normalizes whitespace (multi-line indented JSX renders as a
  // single space-joined string in the DOM).
  const jsxTextPattern = />([^<>{}]+)</g
  for (const match of source.matchAll(jsxTextPattern)) {
    const raw = match[1] ?? ""
    const normalized = normalizeWhitespace(decodeHtmlEntities(raw))
    if (normalized.length > 0) out.add(normalized)
  }
  return out
}
