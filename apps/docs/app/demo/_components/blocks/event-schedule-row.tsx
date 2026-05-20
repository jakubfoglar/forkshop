import { cn } from "@/lib/cn"
import { Badge } from "../ui/badge.js"
import type { BadgeFill } from "../ui/badge.js"

// Sub-component: one row in the EventSchedule table
// Source: rows oYcgs, Dpio8, Og8pX, R2cAZ, T0EVe, DJSDK, tDi2q
// Per-row: alignItems center, gap 24, padding [18, 16], 1px black bottom-border
// Columns: day-code+date | photo 80×60 | event name (fill) | badge | time | ↗ arrow

export interface EventScheduleRowData {
  dayCode: string    // "D01"
  date: string       // "MON 14"
  eventName: string
  fill: BadgeFill
  badgeLabel: string
  time: string       // "10:00"
}

interface EventScheduleRowProps {
  row: EventScheduleRowData
  isLast?: boolean
}

export function EventScheduleRow({ row, isLast = false }: EventScheduleRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 px-4 py-[18px]",
        !isLast && "border-b border-waveclash-black",
      )}
    >
      {/* Day code + date column */}
      <div className="flex flex-col gap-0 w-24 shrink-0">
        <span
          className={cn(
            "font-display text-wc-7xl text-waveclash-black uppercase leading-normal",
            "tracking-label-tight", // −1px @ 32px
          )}
        >
          {row.dayCode}
        </span>
        <span
          className={cn(
            "font-demo-mono text-wc-base font-bold text-waveclash-black uppercase",
            "tracking-label-wider",
          )}
        >
          {row.date}
        </span>
      </div>

      {/* Photo thumbnail 80×60 — placeholder, 2px black border */}
      <div
        className="bg-waveclash-black shrink-0 border-2 border-waveclash-black"
        style={{ width: 80, height: 60 }}
      />

      {/* Event name — fill container, Archivo Black 32px, tracking −1 */}
      <span
        className={cn(
          "font-display text-wc-7xl text-waveclash-black uppercase flex-1 leading-normal",
          "tracking-label-tight",
        )}
      >
        {row.eventName}
      </span>

      {/* Badge */}
      <div className="shrink-0">
        <Badge fill={row.fill}>{row.badgeLabel}</Badge>
      </div>

      {/* Time — JetBrains Mono 18px, right-aligned */}
      <span
        className={cn(
          "font-demo-mono text-wc-3xl font-bold text-waveclash-black uppercase",
          "tracking-label-wide",
          "w-20 text-right shrink-0",
        )}
      >
        {row.time}
      </span>

      {/* Arrow link — ↗ red, Archivo Black 24px */}
      <span
        className={cn(
          "font-display text-wc-5xl text-waveclash-red leading-none shrink-0",
        )}
        aria-hidden
      >
        ↗
      </span>
    </div>
  )
}
