import { cn } from "@/lib/cn"
import { Button } from "../ui/button.js"

// Sub-block: one ticket tier card inside CtaBuyPass
// Source nodes: D9Ai3 (DAY PASS, cream bg), y1ImGi (7-DAY PASS, black bg / invert),
//               tjjH2 (ALL-IN PASS, cream bg — same structure as D9Ai3)
//
// Layout: vertical flex, padding [28, 26], gap 20, 2px black stroke
//   Fill: cream (DAY, ALL-IN) or black (7-DAY invert)
//   Header row: tier title (Archivo Black 15px 900, tracking +1.5) + tier index (JetBrains Mono 11px 500, tracking +1)
//   Price row: price figure (Archivo Black 72px, tracking −3, leading 0.9) + unit label (mono 13px 500, tracking +1.2)
//   1px rule divider
//   Description (Inter 14px 500, leading 1.45)
//   CTA Button full-width, justify-between
//     ghost variant on cream cards (DAY, ALL-IN)
//     primary variant on invert card (7-DAY)

export type TicketCardSurface = "cream" | "black"

export interface TicketCardData {
  tierTitle:   string      // "DAY PASS", "7-DAY PASS", "ALL-IN PASS"
  tierIndex:   string      // "01/03", "02/03", "03/03"
  price:       string      // "$95", "$420", "$890"
  priceUnit:   string      // "/DAY", "/WEEK", "/EVENT"
  description: string
  ctaLabel:    string      // "BUY DAY PASS", "BUY 7-DAY PASS", "BUY ALL-IN PASS"
  surface?:    TicketCardSurface
}

interface TicketCardProps {
  ticket: TicketCardData
}

export function TicketCard({ ticket }: TicketCardProps) {
  const surface = ticket.surface ?? "cream"
  const isInvert = surface === "black"

  return (
    <div
      className={cn(
        "flex flex-col gap-5 flex-1",
        "border-2 border-waveclash-black",
        "px-[26px] py-7",
        isInvert ? "bg-waveclash-black" : "bg-waveclash-cream",
      )}
    >
      {/* Header row: tier title + tier index */}
      <div className="flex items-start justify-between">
        {/* Tier title: Archivo Black 15px (text-xl), tracking +1.5 */}
        <span
          className={cn(
            "font-display uppercase",
            "tracking-label-wider",
            isInvert ? "text-waveclash-cream" : "text-waveclash-black",
          )}
          style={{ fontSize: "15px" }}
        >
          {ticket.tierTitle}
        </span>

        {/* Tier index: JetBrains Mono 11px 500, tracking +1 */}
        <span
          className={cn(
            "font-demo-mono uppercase",
            "tracking-label-wide",
            isInvert ? "text-waveclash-cream" : "text-waveclash-black",
          )}
          style={{ fontSize: "11px", fontWeight: 500 }}
        >
          {ticket.tierIndex}
        </span>
      </div>

      {/* Price row: price figure + unit label, baseline-aligned */}
      <div className="flex items-baseline gap-2">
        {/* Price: Archivo Black 72px (text-9xl), tracking −3, leading 0.9 */}
        <span
          className={cn(
            "font-display text-9xl uppercase",
            isInvert ? "text-waveclash-cream" : "text-waveclash-black",
          )}
          style={{ letterSpacing: "-0.04167em", lineHeight: 0.9 }} // −3px at 72px
        >
          {ticket.price}
        </span>

        {/* Unit label: JetBrains Mono 13px 500, tracking +1.2 */}
        <span
          className={cn(
            "font-demo-mono uppercase",
            isInvert ? "text-waveclash-cream" : "text-waveclash-black",
          )}
          style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "0.09231em" }} // +1.2px at 13px
        >
          {ticket.priceUnit}
        </span>
      </div>

      {/* 1px rule divider */}
      <div
        className={cn(
          "border-t",
          isInvert ? "border-waveclash-cream" : "border-waveclash-black",
        )}
      />

      {/* Description: Inter 14px 500, leading 1.45 */}
      <p
        className={cn(
          "font-body text-lg leading-loose flex-1",
          isInvert ? "text-waveclash-cream" : "text-waveclash-black",
        )}
        style={{ fontWeight: 500, lineHeight: 1.45 }}
      >
        {ticket.description}
      </p>

      {/* CTA Button: ghost on cream cards, primary on invert card */}
      <Button
        variant={isInvert ? "primary" : "ghost"}
        width="wide"
      >
        {ticket.ctaLabel}
      </Button>
    </div>
  )
}
