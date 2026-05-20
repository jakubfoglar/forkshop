import { cn } from "@/lib/cn"
import { SectionHeadingRow } from "../ui/section-heading-row.js"
import { SurferCard } from "./surfer-card.js"
import type { SurferCardData } from "./surfer-card.js"

// Source node: C7T9Cw (page 2, named "Athletes Section")
// 1440×1115px, bg-waveclash-sand, padding [80, 60], gap 40, vertical layout
// Header strip (eZ744): label/meta row + 2px black rule
// Heading block (anKrW): two-column — 180px display heading left + subcopy right (xk7we, 380px)
// Card grid (ZqcnB): horizontal flex row of 4 SurferCards, gap 20, padding-top 20
// Surfer section border: top 3px, bottom 3px, solid black

const DEFAULT_SURFERS: SurferCardData[] = [
  {
    number:      "01",
    name:        "KAHANU\nMAKEKAI",
    location:    "HONOLULU, HAWAII",
    rankLabel:   "WORLD #1",
    rankVariant: "navy",
  },
  {
    number:      "02",
    name:        "MILO\nDESCHAMPS",
    location:    "BIARRITZ, FRANCE",
    rankLabel:   "WORLD #2",
    rankVariant: "red",
  },
  {
    number:      "03",
    name:        "INDI\nWALKER",
    location:    "COOLANGATTA, AUS",
    rankLabel:   "WORLD #3",
    rankVariant: "yellow",
  },
  {
    number:      "04",
    name:        "NOA\nSANTOS",
    location:    "PORTO, PORTUGAL",
    rankLabel:   "WORLD #4",
    rankVariant: "black",
  },
]

export interface SurferGridProps {
  sectionLabel?:  string
  sectionMeta?:   string
  sectionHeading?: string
  sectionSubcopy?: string
  surfers?:       SurferCardData[]
}

export function SurferGrid({
  sectionLabel  = "[ 02 / ROSTER ]",
  sectionMeta   = "64 ATHLETES — 23 COUNTRIES",
  sectionHeading = "MEET THE\nSURFERS.",
  sectionSubcopy = "The world's 64 best surfers compete for surf supremacy at the most unforgiving break on the planet. One reef, zero mercy.",
  surfers       = DEFAULT_SURFERS,
}: SurferGridProps) {
  return (
    <section
      className={cn(
        "w-full flex flex-col gap-10",
        "bg-waveclash-sand",
        "border-t-[3px] border-b-[3px] border-waveclash-black",
        "px-[60px] py-20",
      )}
    >
      {/* Header strip (eZ744): section label + meta, then 2px rule */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {/* Section label — JetBrains Mono 11px 700 red */}
          <span
            className={cn(
              "font-demo-mono text-sm font-bold text-waveclash-red uppercase",
              "tracking-label-widest",
            )}
          >
            {sectionLabel}
          </span>

          {/* Section meta — JetBrains Mono 11px 700 black */}
          <span
            className={cn(
              "font-demo-mono text-sm font-bold text-waveclash-black uppercase",
              "tracking-label-widest",
            )}
          >
            {sectionMeta}
          </span>
        </div>

        {/* 2px black rule below header strip */}
        <div className="border-t-2 border-waveclash-black" />
      </div>

      {/* Heading block (anKrW): 180px heading left + subcopy right (xk7we, 380px) */}
      <div className="flex items-end justify-between">
        {/* Left: 180px display heading, tracking −6, leading 0.88 (dense) */}
        <div className="flex-1">
          {sectionHeading.split("\n").map((line, i) => (
            <div
              key={i}
              className={cn(
                "font-display text-display-sm text-waveclash-black uppercase",
                "leading-dense",
              )}
              style={{ letterSpacing: "-0.03333em" }} // −6px at 180px
            >
              {line}
            </div>
          ))}
        </div>

        {/* Right: subcopy column (xk7we, 380px) — Inter 16px 500 */}
        <div className="w-[380px] shrink-0 ml-8">
          <p
            className={cn(
              "font-body text-2xl text-waveclash-black leading-relaxed",
            )}
            style={{ fontWeight: 500 }}
          >
            {sectionSubcopy}
          </p>
        </div>
      </div>

      {/* Card grid (ZqcnB): 4 cards, gap 20, padding-top 20 */}
      <div className="flex gap-5 pt-5">
        {surfers.map((surfer) => (
          <SurferCard key={surfer.number} surfer={surfer} />
        ))}
      </div>
    </section>
  )
}
