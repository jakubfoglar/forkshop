import { cn } from "@/lib/cn"

// Source node: ThXku (page 1), 1440×600px
// bg-waveclash-sand, padding [80, 32], gap 48, two-column flex
// Left col (J24RQ, ~908px): 3 display words stacked at 120px Archivo Black,
//   leading 0.9, tracking −5 → "THE OCEAN" (black), "DOESN'T" (red), "NEGOTIATE." (navy)
//   + 8×120px black spacer below
// Right col (nNbxc, ~420px): "// MANIFESTO" red label, Inter 18px body,
//   bordered info table (4 rows: LOCATION, DATES, FORMAT, BROADCAST)
//   Row border: 2px top (first), 1px bottom dividers
//   Label: JetBrains Mono 11px 700 tracking +2; Value: Archivo Black 13px tracking +0.5

export interface InfoRow {
  label: string
  value: string
}

export interface AboutCalloutProps {
  headingLines?: [string, string, string]
  manifestoLabel?: string
  manifestoBody?: string
  infoRows?: InfoRow[]
}

const DEFAULT_INFO_ROWS: InfoRow[] = [
  { label: "LOCATION",  value: "BANZAI PIPELINE / O'AHU" },
  { label: "DATES",     value: "MAR 14 — MAR 23, 2026" },
  { label: "FORMAT",    value: "4 ROUNDS / DBL ELIM" },
  { label: "BROADCAST", value: "WSL+ / WAVECLASH.TV" },
]

export function AboutCallout({
  headingLines = ["THE OCEAN", "DOESN'T", "NEGOTIATE."],
  manifestoLabel = "// MANIFESTO",
  manifestoBody = "For ten days in March, the world's most fearless surfers gather at the most punishing reef break on earth. No script. No mercy. Just the ocean, the board, and the line between greatness and the rocks.",
  infoRows = DEFAULT_INFO_ROWS,
}: AboutCalloutProps) {
  return (
    <section
      data-forkshop-block="about-callout"
      className={cn(
        "w-full",
        // Mobile: single column (flex-col); lg: two-column side-by-side (flex-row)
        "flex flex-col lg:flex-row gap-12",
        "bg-waveclash-sand",
        // Mobile: [40,20] padding; tablet (md): tighter horizontal grow; desktop: [80,32]
        "px-5 py-10 md:px-8 md:py-12 lg:px-8 lg:py-20",
      )}
    >
      {/* Left column: giant stacked display words (J24RQ)
          Mobile: 64px heading; tablet (md): 80px; desktop (lg): 96px; xl: 120px */}
      <div className="flex flex-col flex-1">
        {/* "THE OCEAN" — waveclash-black */}
        <span
          className="font-display uppercase text-waveclash-black"
          style={{
            fontSize: "clamp(64px, 9.375vw, 120px)",
            lineHeight: 0.9,
            letterSpacing: "-0.04167em",
          }}
        >
          {headingLines[0]}
        </span>

        {/* "DOESN'T" — waveclash-red */}
        <span
          className="font-display uppercase text-waveclash-red"
          style={{
            fontSize: "clamp(64px, 9.375vw, 120px)",
            lineHeight: 0.9,
            letterSpacing: "-0.04167em",
          }}
        >
          {headingLines[1]}
        </span>

        {/* "NEGOTIATE." — waveclash-navy */}
        <span
          className="font-display uppercase text-waveclash-navy"
          style={{
            fontSize: "clamp(64px, 9.375vw, 120px)",
            lineHeight: 0.9,
            letterSpacing: "-0.04167em",
          }}
        >
          {headingLines[2]}
        </span>
      </div>

      {/* Right column: manifesto + info table (nNbxc)
          Mobile: full-width; desktop: fixed 420px column */}
      <div className="flex flex-col gap-6 w-full lg:w-[420px] lg:shrink-0 justify-center">
        {/* "// MANIFESTO" label */}
        <span
          className={cn(
            "font-demo-mono text-wc-sm font-bold text-waveclash-red uppercase",
            "tracking-label-widest",
          )}
        >
          {manifestoLabel}
        </span>

        {/* Body copy
            Mobile: Inter 14px weight 400; tablet: 16px; desktop: 18px weight 500 */}
        <p
          className={cn(
            "font-body text-wc-lg md:text-wc-2xl lg:text-wc-3xl text-waveclash-black leading-relaxed",
          )}
          style={{ fontWeight: 500 }}
        >
          {manifestoBody}
        </p>

        {/* Info table (K9ujIn) — 4 rows, top border 2px, dividers 1px bottom */}
        <div className="flex flex-col border-t-2 border-waveclash-black mt-2">
          {infoRows.map((row, i) => {
            const isLast = i === infoRows.length - 1
            return (
              <div
                key={row.label}
                className={cn(
                  "flex items-center justify-between py-3",
                  !isLast && "border-b border-waveclash-black",
                )}
              >
                <span
                  className={cn(
                    "font-demo-mono text-wc-sm font-bold text-waveclash-black uppercase",
                    "tracking-label-widest",
                  )}
                >
                  {row.label}
                </span>
                <span
                  className={cn(
                    "font-display text-wc-md text-waveclash-black uppercase",
                    "tracking-label-normal",
                  )}
                >
                  {row.value}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
