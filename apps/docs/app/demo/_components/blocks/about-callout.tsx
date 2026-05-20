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
  { label: "LOCATION",  value: "BANZAI PIPELINE, NORTH SHORE" },
  { label: "DATES",     value: "MAR 14 — 23, 2026" },
  { label: "FORMAT",    value: "SINGLE ELIMINATION / SURF RANCH" },
  { label: "BROADCAST", value: "WAVECLASH.TV / GLOBAL STREAM" },
]

export function AboutCallout({
  headingLines = ["THE OCEAN", "DOESN'T", "NEGOTIATE."],
  manifestoLabel = "// MANIFESTO",
  manifestoBody = "We don't sell tickets to a contest. We sell entry to a reckoning. Every wave that breaks at Pipeline has broken across centuries of human ambition and natural indifference. The ocean doesn't negotiate. It evaluates.",
  infoRows = DEFAULT_INFO_ROWS,
}: AboutCalloutProps) {
  return (
    <section
      className={cn(
        "w-full flex gap-12",
        "bg-waveclash-sand",
        "px-8 py-20",
      )}
    >
      {/* Left column: giant stacked display words (J24RQ) */}
      <div className="flex flex-col flex-1">
        {/* "THE OCEAN" — waveclash-black */}
        <span
          className={cn(
            "font-display uppercase text-waveclash-black leading-snug",
            "tracking-display-snug", // −5px tracking at 120px
          )}
          style={{ fontSize: "120px", lineHeight: 0.9, letterSpacing: "-0.04167em" }}
        >
          {headingLines[0]}
        </span>

        {/* "DOESN'T" — waveclash-red */}
        <span
          className={cn(
            "font-display uppercase text-waveclash-red leading-snug",
          )}
          style={{ fontSize: "120px", lineHeight: 0.9, letterSpacing: "-0.04167em" }}
        >
          {headingLines[1]}
        </span>

        {/* "NEGOTIATE." — waveclash-navy */}
        <span
          className={cn(
            "font-display uppercase text-waveclash-navy leading-snug",
          )}
          style={{ fontSize: "120px", lineHeight: 0.9, letterSpacing: "-0.04167em" }}
        >
          {headingLines[2]}
        </span>

        {/* 8×120px black spacer rectangle */}
        <div className="w-2 h-[120px] bg-waveclash-black mt-3" />
      </div>

      {/* Right column: manifesto + info table (nNbxc, ~420px) */}
      <div className="flex flex-col gap-6 w-[420px] shrink-0 justify-center">
        {/* "// MANIFESTO" label */}
        <span
          className={cn(
            "font-demo-mono text-wc-sm font-bold text-waveclash-red uppercase",
            "tracking-label-widest",
          )}
        >
          {manifestoLabel}
        </span>

        {/* Body copy — Inter 18px weight 500 */}
        <p
          className={cn(
            "font-body text-wc-2xl text-waveclash-black leading-relaxed",
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
