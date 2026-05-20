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
    description: "Beach access, food zone, finals coverage on the boardwalk.",
    ctaLabel:    "BUY DAY PASS",
    surface:     "cream",
  },
  {
    tierTitle:   "7-DAY PASS",
    tierIndex:   "02/03",
    price:       "$420",
    priceUnit:   "/WEEK",
    description: "Full week, VIP deck, athlete autograph sessions, merch drop access.",
    ctaLabel:    "BUY 7-DAY PASS",
    surface:     "black",
  },
  {
    tierTitle:   "ALL-IN PASS",
    tierIndex:   "03/03",
    price:       "$890",
    priceUnit:   "/EVENT",
    description: "Every heat. Every party. Plus a backstage bay with the broadcast team.",
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
  sectionSubcopy = "Three pass tiers. One reef. Ten unforgettable days.",
  tickets       = DEFAULT_TICKETS,
}: CtaBuyPassProps) {
  return (
    <section className="w-full">
      {/* ── Mobile / Tablet layout (< lg): condensed tickets banner ──────────────────────
          bg-waveclash-yellow, stacked display heading + 2-option horizontal bar.
          Pencil source: SZ6LH (390×391px). */}
      <div className={cn("lg:hidden flex flex-col", "bg-waveclash-yellow")}>

        {/* Tickets ticker bar (x6kkN, 35px): black bg, mono text left/right */}
        <div
          className={cn(
            "flex items-center justify-between",
            "bg-waveclash-black",
            "px-5 py-[10px]",
          )}
        >
          <span
            className="font-demo-mono text-wc-sm font-bold text-waveclash-yellow uppercase tracking-label-widest"
          >
            // TICKETS — DROPPING NOW
          </span>
          <span
            className="font-demo-mono text-wc-sm font-bold text-waveclash-red uppercase tracking-label-widest"
          >
            23 LEFT
          </span>
        </div>

        {/* Heading block (lxJMx): "DON'T / WATCH / FROM A SCREEN." */}
        <div className="flex flex-col gap-2 px-5 pt-7 pb-5">
          {/* "DON'T" — Archivo Black 80px (text-wc-10xl), black */}
          <div
            className="font-display text-wc-10xl text-waveclash-black uppercase leading-[0.9]"
            style={{ letterSpacing: "-0.0375em" }} // −3px at 80px
          >
            DON&apos;T
          </div>

          {/* "WATCH" — Archivo Black 80px, red */}
          <div
            className="font-display text-wc-10xl text-waveclash-red uppercase leading-[0.9]"
            style={{ letterSpacing: "-0.0375em" }}
          >
            WATCH
          </div>

          {/* "FROM A SCREEN." — Archivo Black 48px, black */}
          <div
            className="font-display text-waveclash-black uppercase leading-[0.92]"
            style={{ fontSize: "48px", letterSpacing: "-0.04167em" }} // −2px at 48px
          >
            FROM A SCREEN.
          </div>
        </div>

        {/* Ticket options strip (DhRRe, 52px): 2-col horizontal bar, 3px black top border */}
        <div className="grid grid-cols-2 border-t-[3px] border-waveclash-black">
          {/* SINGLE DAY — black bg */}
          <div
            className={cn(
              "flex flex-col items-center justify-center",
              "bg-waveclash-black",
              "py-[18px] px-4",
              "border-r-2 border-waveclash-black",
            )}
          >
            <span
              className="font-display text-wc-md text-waveclash-cream uppercase tracking-label-wider"
              style={{ fontSize: "14px" }}
            >
              SINGLE DAY
            </span>
            <span
              className="font-demo-mono text-wc-base font-bold text-waveclash-yellow uppercase tracking-label-wide"
              style={{ fontSize: "12px" }}
            >
              $45
            </span>
          </div>

          {/* 10-DAY PASS — red bg */}
          <div
            className={cn(
              "flex flex-col items-center justify-center",
              "bg-waveclash-red",
              "py-[18px] px-4",
            )}
          >
            <span
              className="font-display text-wc-md text-waveclash-black uppercase tracking-label-wider"
              style={{ fontSize: "14px" }}
            >
              10-DAY PASS
            </span>
            <span
              className="font-demo-mono text-wc-base font-bold text-waveclash-black uppercase tracking-label-wide"
              style={{ fontSize: "12px" }}
            >
              $210
            </span>
          </div>
        </div>
      </div>

      {/* ── Desktop layout (lg+): full 3-card ticket layout ──────────────────────────────
          bg-waveclash-red, centered heading + subcopy + 3 TicketCard components.
          Pencil source: lHnti (1440×1002px). */}
      <div
        className={cn(
          "hidden lg:flex flex-col items-center gap-7",
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
                whiteSpace:    "nowrap",
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
      </div>
    </section>
  )
}
