import { cn } from "@/lib/cn"
import { StatCounter } from "../ui/stat-counter.js"

// Source node: fi42O (page 1), immediately below Hero
// Full-width, 140px tall, bg-waveclash-black, justifyContent: space_between
// Five equal-width StatCounter cells, each separated by 2px red right-border
// Last cell has no right border. Padding per cell: [24, 32]
// One cell (COUNTRIES / F0N5N) has highlight={true}

export interface StatsBeltStat {
  value: string
  label: string
  highlight?: boolean
}

export interface StatsBeltProps {
  stats?: StatsBeltStat[]
}

const DEFAULT_STATS: StatsBeltStat[] = [
  { value: "64",    label: "ATHLETES",   highlight: false },
  { value: "23",    label: "COUNTRIES",  highlight: true  }, // F0N5N — red highlight
  { value: "10",    label: "DAYS",       highlight: false },
  { value: "$1.2M", label: "PRIZE POOL", highlight: false },
  { value: "∞",     label: "WAVES",      highlight: false },
]

export function StatsBelt({ stats = DEFAULT_STATS }: StatsBeltProps) {
  // Mobile/tablet (< lg): 2×2 grid of first 4 stats; 5th stat hidden
  // Desktop (lg+): 5-column single-row flex showing all stats
  const mobileStats = stats.slice(0, 4)

  return (
    <div className="w-full bg-waveclash-black" data-forkshop-block="stats-belt">
      {/* Mobile/tablet: 2×2 grid */}
      <div className="grid grid-cols-2 lg:hidden">
        {mobileStats.map((stat, i) => {
          const isLeftCol = i % 2 === 0   // left col gets right border
          const isTopRow  = i < 2          // top row gets bottom border
          return (
            <div
              key={stat.label}
              className={cn(
                isLeftCol && "border-r-2 border-waveclash-cream",
                isTopRow  && "border-b-2 border-waveclash-cream",
              )}
            >
              <StatCounter
                value={stat.value}
                label={stat.label}
                highlight={stat.highlight}
                className="px-[18px] py-6 h-full"
              />
            </div>
          )
        })}
      </div>

      {/* Desktop: 5-column single-row flex */}
      <div className="hidden lg:flex items-stretch">
        {stats.map((stat, i) => {
          const isLast = i === stats.length - 1
          return (
            <div
              key={stat.label}
              className={cn(
                "flex-1",
                !isLast && "border-r-2 border-waveclash-red",
              )}
            >
              <StatCounter
                value={stat.value}
                label={stat.label}
                highlight={stat.highlight}
                className="px-8 py-6 h-full"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
