"use client"

import type { TokenEntry, TokenRegistry } from "@forkshop/lib/token-registry"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type TypographyShowcaseProps = {
  tokens: TokenRegistry
  /** Sample text shown beside each font-size. Defaults to a pangram. */
  sampleText?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type FontSizeEntry = Extract<TokenEntry, { kind: "fontSize" }>

function TypographyRow({
  entry,
  sampleText,
}: {
  entry: FontSizeEntry
  sampleText: string
}) {
  return (
    <div className="flex flex-col gap-forkshop-0.5">
      <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">{entry.name}</span>
      <span
        className="text-forkshop-fg"
        style={{
          fontSize: entry.value,
          lineHeight: entry.lineHeight,
          letterSpacing: entry.letterSpacing,
        }}
      >
        {sampleText}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Standalone typography showcase. Renders a row per `fontSize` token: the
 * token name (as plain text, for queryability) plus a sample string rendered
 * at the token's font-size, line-height, and letter-spacing.
 *
 * No canvas / NodeView dependency — the component lays itself out as a
 * vertical flex column, so the parent only needs to give it space.
 */
export function TypographyShowcase({
  tokens,
  sampleText = "The quick brown fox",
}: TypographyShowcaseProps) {
  const fontSizes = tokens.fontSizes as FontSizeEntry[]

  return (
    <div className="flex flex-col gap-forkshop-4 bg-white p-forkshop-4 shadow-md">
      {fontSizes.map((entry) => (
        <TypographyRow key={entry.name} entry={entry} sampleText={sampleText} />
      ))}
    </div>
  )
}
