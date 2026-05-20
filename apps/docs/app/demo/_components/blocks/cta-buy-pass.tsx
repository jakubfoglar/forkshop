import { cn } from "@/lib/cn"
import { TicketCard } from "./ticket-card.js"
import type { TicketCardData } from "./ticket-card.js"

// Source node: lHnti (page 2, named "CTA Buy Pass")
// 1440×1002px, bg-waveclash-red, padding [90, 60], gap 28, centered vertical layout
//
// Section label: JetBrains Mono 13px 700, black, tracking +2
// Display heading "BE ON THE SAND.": Archivo Black 220px, tracking −8, leading 0.85, centered, black
// Subcopy: Inter 18px 500, centered, black
// Card row (ZihNf): 3 TicketCard instances, gap 18
//   D9Ai3 = DAY PASS (cream surface)
//   y1ImGi = 7-DAY PASS (black/invert surface) — featured
//   tjjH2 = ALL-IN PASS (cream surface)

const DEFAULT_TICKETS: TicketCardData[] = [
  {
    tierTitle:   "DAY PASS",
    tierIndex:   "01/03",
    price:       "$95",
    priceUnit:   "/DAY",
    description: "Full access to one competition day at Pipeline. Standing room + beach zones included. Valid for one calendar date.",
    ctaLabel:    "BUY DAY PASS",
    surface:     "cream",
  },
  {
    tierTitle:   "7-DAY PASS",
    tierIndex:   "02/03",
    price:       "$420",
    priceUnit:   "/WEEK",
    description: "The full run. Access every day of competition, all FREESURF sessions, and the ceremonial opening and closing events. Best value for committed watchers.",
    ctaLabel:    "BUY 7-DAY PASS",
    surface:     "black",
  },
  {
    tierTitle:   "ALL-IN PASS",
    tierIndex:   "03/03",
    price:       "$890",
    priceUnit:   "/EVENT",
    description: "Everything in the 7-Day Pass plus athlete access zones, the official after-beach party series, and a WAVECLASH/26 commemorative print.",
    ctaLabel:    "BUY ALL-IN PASS",
    surface:     "cream",
  },
]

export interface CtaBuyPassProps {
  sectionLabel?:  string
  sectionHeading?: string
  sectionSubcopy?: string
  tickets?:       TicketCardData[]
}

export function CtaBuyPass({
  sectionLabel  = "[ 05 / TICKETS ON SALE ]",
  sectionHeading = "BE ON THE\nSAND.",
  sectionSubcopy = "Three tiers. One reef. Zero live streams substitute for the thing itself.",
  tickets       = DEFAULT_TICKETS,
}: CtaBuyPassProps) {
  return (
    <section
      className={cn(
        "w-full flex flex-col items-center gap-7",
        "bg-waveclash-red",
        "px-[60px] py-[90px]",
      )}
    >
      {/* Section label — JetBrains Mono 13px 700, black, tracking +2 */}
      <span
        className={cn(
          "font-demo-mono font-bold text-waveclash-black uppercase",
          "tracking-label-widest",
        )}
        style={{ fontSize: "13px" }}
      >
        {sectionLabel}
      </span>

      {/* Display heading "BE ON THE SAND." — 220px Archivo Black, tracking −8, leading 0.85, centered */}
      <div className="text-center">
        {sectionHeading.split("\n").map((line, i) => (
          <div
            key={i}
            className="font-display text-waveclash-black uppercase"
            style={{
              fontSize:      "220px",
              letterSpacing: "-0.03636em", // −8px at 220px
              lineHeight:    0.85,
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Subcopy — Inter 18px 500, centered, black */}
      <p
        className="font-body text-wc-3xl text-waveclash-black text-center"
        style={{ fontWeight: 500 }}
      >
        {sectionSubcopy}
      </p>

      {/* Card row (ZihNf): 3 ticket cards, gap 18 */}
      <div className="flex gap-[18px] w-full mt-1">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.tierTitle} ticket={ticket} />
        ))}
      </div>
    </section>
  )
}
