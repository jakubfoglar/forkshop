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
//   Sponsor text: Archivo Black 20px (text-3-5xl), tracking +1, cream fill

const DEFAULT_SPONSORS = [
  "BILLABONG",
  "RIPCURL",
  "QUIKSILVER",
  "HURLEY",
  "PATAGONIA",
  "OAKLEY",
  "GoPro",
]

export interface SponsorStripProps {
  partnershipLabel?: string
  partnershipRight?: string
  sponsors?: string[]
}

export function SponsorStrip({
  partnershipLabel = "◆ OFFICIAL PARTNERS",
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
          "px-[60px] py-4",
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

        {/* Right: full label — JetBrains Mono 11px 700, black, tracking +1.5 */}
        <span
          className={cn(
            "font-demo-mono font-bold text-waveclash-black uppercase",
            "tracking-label-wider",
          )}
          style={{ fontSize: "11px" }}
        >
          {partnershipRight}
        </span>
      </div>

      {/* 2px black rule divider (sqvVG) */}
      <div className="border-t-2 border-waveclash-black" />

      {/* Logo row (G7ADC): bg-waveclash-black, 7 equal cells */}
      <div className="flex bg-waveclash-black">
        {sponsors.map((name, i) => {
          const isLast = i === sponsors.length - 1
          return (
            <div
              key={name}
              className={cn(
                "flex-1 flex items-center justify-center",
                "py-7 px-4",
                !isLast && "border-r border-waveclash-cream",
              )}
            >
              {/* Sponsor name: Archivo Black 20px (text-3-5xl), tracking +1, cream */}
              <span
                className={cn(
                  "font-display text-3-5xl text-waveclash-cream uppercase",
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
