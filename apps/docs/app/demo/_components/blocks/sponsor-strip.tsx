import { cn } from "@/lib/cn"

// Source node: u9wUYn (page 2, named "Sponsors Strip")
// Full-width, 136px total, bg-waveclash-sand, vertical layout
// 2px black top+bottom border on the outer section
//
// Sub-frame 1 — header bar (w7FSUa, 49px):
//   bg-waveclash-sand, padding [16, 60], justify-between
//   Left: ◆ bullet + "OFFICIAL PARTNERS" (JetBrains Mono 11px 700, black, tracking +2)
//   Right: "OFFICIAL PARTNERS — WAVECLASH/26" (JetBrains Mono 11px 700, black, tracking +1.5)
//
// 2px black rule divider (sqvVG)
//
// Sub-frame 2 — logo row (G7ADC, 85px):
//   bg-waveclash-black, 7 equal-width cells, padding [28, 16] each, centered
//   1px cream right-border between cells (last cell has none)
//   Sponsor text: Archivo Black 20px (text-wc-3-5xl), tracking +1, cream fill

// Sponsor names sourced from pencil nodes in G7ADC (u9wUYn)
const DEFAULT_SPONSORS = [
  "BILLABONG",
  "★ RIPCURL",
  "QUIKSILVER",
  "GOPRO",
  "VOLCOM",
  "RED BULL",
  "PATAGONIA",
]

export interface SponsorStripProps {
  partnershipLabel?: string
  partnershipRight?: string
  sponsors?: string[]
}

export function SponsorStrip({
  partnershipLabel = "[ 04 / BACKED BY ]",
  partnershipRight = "OFFICIAL PARTNERS — WAVECLASH/26",
  sponsors = DEFAULT_SPONSORS,
}: SponsorStripProps) {
  return (
    <section
      className={cn(
        "w-full flex flex-col",
        "bg-waveclash-sand",
        "border-t-2 border-b-2 border-waveclash-black",
      )}
    >
      {/* Header bar (w7FSUa): label left, right label */}
      <div
        className={cn(
          "flex items-center justify-between",
          "bg-waveclash-sand",
          // Mobile: tight padding; desktop: full 60px
          "px-5 py-4 md:px-8 lg:px-[60px]",
        )}
      >
        {/* Left: ◆ + OFFICIAL PARTNERS — JetBrains Mono 11px 700, black, tracking +2 */}
        <span
          className={cn(
            "font-demo-mono font-bold text-waveclash-black uppercase",
            "tracking-label-widest",
          )}
          style={{ fontSize: "11px" }}
        >
          {partnershipLabel}
        </span>

        {/* Right: full label — hidden on mobile (mobile header is simpler), visible lg+ */}
        <span
          className={cn(
            "hidden lg:inline font-demo-mono font-bold text-waveclash-black uppercase",
            "tracking-label-wider",
          )}
          style={{ fontSize: "11px" }}
        >
          {partnershipRight}
        </span>
      </div>

      {/* 2px black rule divider (sqvVG) */}
      <div className="border-t-2 border-waveclash-black" />

      {/* Logo row (G7ADC): 3-col grid on mobile/tablet, 7-col flex on desktop.
          7th sponsor is hidden on mobile/tablet (mobile pencil shows 6 sponsors in 3×2). */}
      <div className="grid grid-cols-3 lg:flex bg-waveclash-black">
        {sponsors.map((name, i) => {
          const isLast = i === sponsors.length - 1
          const isSeventhSponsor = i === 6
          return (
            <div
              key={name}
              className={cn(
                // 7th sponsor hidden on mobile/tablet (3×2 grid shows only 6)
                isSeventhSponsor && "hidden lg:flex",
                "flex-1 flex items-center justify-center",
                // Mobile: tighter padding + smaller text; desktop: full sizing
                "py-[18px] px-2 lg:py-7 lg:px-4",
                !isLast && "border-r border-waveclash-cream",
              )}
            >
              {/* Sponsor name: 14px mobile, 20px desktop */}
              <span
                className={cn(
                  "font-display text-wc-md lg:text-wc-3-5xl text-waveclash-cream uppercase",
                  "tracking-label-wide",
                )}
              >
                {name}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
