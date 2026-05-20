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
  return (
    <div
      className={cn(
        "w-full flex items-stretch",
        "bg-waveclash-black",
      )}
    >
      {stats.map((stat, i) => {
        const isLast = i === stats.length - 1
        return (
          <div
            key={stat.label}
            className={cn(
              "flex-1",
              // 2px red right-border between cells; last cell has no border
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
  )
}
