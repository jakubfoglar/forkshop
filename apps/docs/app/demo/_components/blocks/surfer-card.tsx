import Image from "next/image"
import { cn } from "@/lib/cn"

// Sub-block: one athlete card inside SurferGrid
// Source nodes: qtCVM (Kahanu Makekai), Zpd8j (Milo Deschamps),
//               xALo4 (Indi Walker), jwezL (Noa Santos)
// Layout: vertical flex, bg-waveclash-cream, 2px inside black stroke, no border-radius
// Portrait area: 360px tall, fill_container wide — black placeholder
//   number badge top-left (black pill, JetBrains Mono 14px 700)
//   rank badge bottom-right (colored Badge primitive, Archivo Black 11px 900, tracking +1.2)
// Footer (XFxb6): bg-waveclash-cream, padding [20, 18, 22, 18], gap 8, vertical flex
//   name text, 1px rule, location/view-link row

export type SurferRankVariant = "red" | "yellow" | "navy" | "black"

export interface SurferCardData {
  number: string          // "01", "02", …
  name: string            // "KAHANU\nMAKEKAI" — may contain newline
  location: string        // "HONOLULU, HAWAII"
  rankLabel: string       // "WORLD #1"
  rankVariant: SurferRankVariant
  imageSrc?: string       // deferred to Phase 1d; omit = black placeholder
}

interface SurferCardProps {
  surfer: SurferCardData
}

export function SurferCard({ surfer }: SurferCardProps) {
  const nameParts = surfer.name.split("\n")

  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-w-0",
        "bg-waveclash-cream border-2 border-waveclash-black",
      )}
    >
      {/* Portrait area — 360px tall, position relative for badges */}
      <div className="relative h-[360px] bg-waveclash-black w-full overflow-hidden">
        {surfer.imageSrc && (
          <Image
            src={surfer.imageSrc}
            alt={surfer.name.replace("\n", " ")}
            fill
            className="object-cover object-top"
          />
        )}
        {/* Number badge — top-left, black fill, JetBrains Mono 14px bold */}
        <span
          className={cn(
            "absolute top-3 left-3",
            "font-demo-mono font-bold text-waveclash-cream uppercase",
            "bg-waveclash-black px-2 py-1",
            "tracking-label-wide",
          )}
          style={{ fontSize: "14px", letterSpacing: "+1px" }}
        >
          {surfer.number}
        </span>

        {/* Rank badge — bottom-right, using Badge primitive */}
        {/* Archivo Black 11px 900, tracking +1.2 — slightly tighter than Badge default */}
        <div className="absolute bottom-3 right-3">
          <span
            className={cn(
              "inline-block font-display font-black uppercase px-3 py-1.5",
              // tracking: +1.2 at 11px ≈ 0.1091em — approximate with tracking-label-wide
              "tracking-label-wide",
              surfer.rankVariant === "red"    && "bg-waveclash-red text-waveclash-black",
              surfer.rankVariant === "yellow" && "bg-waveclash-yellow text-waveclash-black",
              surfer.rankVariant === "navy"   && "bg-waveclash-navy text-waveclash-cream",
              surfer.rankVariant === "black"  && "bg-waveclash-black text-waveclash-cream",
            )}
            style={{ fontSize: "11px" }}
          >
            {surfer.rankLabel}
          </span>
        </div>
      </div>

      {/* Footer (XFxb6): padding [20, 18, 22, 18], gap 8 */}
      <div className="flex flex-col gap-2 px-[18px] pt-5 pb-[22px]">
        {/* Athlete name: Archivo Black 32px, tracking −1, may be two lines */}
        <div
          className={cn(
            "font-display text-wc-7xl text-waveclash-black uppercase",
            "tracking-label-tight leading-tight",
          )}
        >
          {nameParts.map((part, i) => (
            <span key={i} className="block">
              {part}
            </span>
          ))}
        </div>

        {/* 1px rule */}
        <div className="border-t border-waveclash-black" />

        {/* Location + VIEW link row */}
        <div className="flex items-center justify-between">
          {/* Location — JetBrains Mono 11px 700, tracking +1 */}
          <span
            className={cn(
              "font-demo-mono font-bold text-waveclash-black uppercase",
              "tracking-label-wide",
            )}
            style={{ fontSize: "11px" }}
          >
            {surfer.location}
          </span>

          {/* VIEW ↗ — inline text, JetBrains Mono 11px 700, red */}
          <span
            className={cn(
              "font-demo-mono font-bold text-waveclash-red uppercase",
              "tracking-label-wide",
            )}
            style={{ fontSize: "11px" }}
          >
            VIEW ↗
          </span>
        </div>
      </div>
    </div>
  )
}
