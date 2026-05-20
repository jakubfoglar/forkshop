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
    imageSrc:    "/demo/surfer-1.jpg",
  },
  {
    number:      "02",
    name:        "MILO\nDESCHAMPS",
    location:    "BIARRITZ, FRANCE",
    rankLabel:   "WORLD #2",
    rankVariant: "red",
    imageSrc:    "/demo/surfer-2.jpg",
  },
  {
    number:      "03",
    name:        "INDI\nWALKER",
    location:    "COOLANGATTA, AUS",
    rankLabel:   "WORLD #3",
    rankVariant: "yellow",
    imageSrc:    "/demo/surfer-3.jpg",
  },
  {
    number:      "04",
    name:        "NOA\nSANTOS",
    location:    "PORTO, PORTUGAL",
    rankLabel:   "WORLD #4",
    rankVariant: "black",
    imageSrc:    "/demo/surfer-4.jpg",
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
  sectionMeta   = "64 ATHLETES — 12 COUNTRIES",
  sectionHeading = "MEET THE\nSURFERS.",
  sectionSubcopy = "Twenty-three nations. Sixty-four bodies. One stretch of reef on the North Shore that decides who lives this season as a name and who returns home as a number.",
  surfers       = DEFAULT_SURFERS,
}: SurferGridProps) {
  return (
    <section
      data-forkshop-block="surfer-grid"
      className={cn(
        "w-full flex flex-col gap-10",
        "bg-waveclash-sand",
        "border-t-[3px] border-b-[3px] border-waveclash-black",
        // Mobile: tight padding; tablet: medium; desktop: full 60px
        "px-5 py-10 md:px-8 md:py-12 lg:px-[60px] lg:py-20",
      )}
    >
      {/* Header strip (eZ744): section label + meta, then 2px rule */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {/* Section label — JetBrains Mono 11px 700 red */}
          <span
            className={cn(
              "font-demo-mono text-wc-sm font-bold text-waveclash-red uppercase",
              "tracking-label-widest",
            )}
          >
            {sectionLabel}
          </span>

          {/* Section meta — JetBrains Mono 11px 700 black */}
          <span
            className={cn(
              "font-demo-mono text-wc-sm font-bold text-waveclash-black uppercase",
              "tracking-label-widest",
            )}
          >
            {sectionMeta}
          </span>
        </div>

        {/* 2px black rule below header strip */}
        <div className="border-t-2 border-waveclash-black" />
      </div>

      {/* Heading block (anKrW): SectionHeadingRow with responsive heading size.
          Mobile: 64px (text-wc-8xl), tablet md: 96px (text-wc-11xl), desktop lg: 180px (text-wc-display-sm).
          Eyebrow omitted — already rendered in the sectionMeta strip above. */}
      <SectionHeadingRow
        title={sectionHeading.replace("\n", " ")}
        size="xl"
        headingClassName="text-wc-8xl md:text-wc-11xl lg:text-wc-display-sm tracking-[-.03333em] leading-dense"
      />

      {/* Subcopy (xk7we, 380px) — desktop only; hidden on mobile/tablet */}
      {sectionSubcopy && (
        <div className="hidden lg:flex justify-end">
          <p
            className={cn(
              "w-[380px] font-body text-wc-2xl text-waveclash-black leading-relaxed",
            )}
            style={{ fontWeight: 500 }}
          >
            {sectionSubcopy}
          </p>
        </div>
      )}

      {/* Card grid (ZqcnB): 1-col mobile, 2-col tablet, 4-col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
        {surfers.map((surfer) => (
          <SurferCard key={surfer.number} surfer={surfer} />
        ))}
      </div>
    </section>
  )
}
