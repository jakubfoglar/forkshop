import Image from "next/image"
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
  imageSrc?: string  // optional thumbnail photo
}

interface EventScheduleRowProps {
  row: EventScheduleRowData
  isLast?: boolean
}

export function EventScheduleRow({ row, isLast = false }: EventScheduleRowProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        // Mobile: tighter gap + padding; desktop: wider
        "gap-3 md:gap-4 lg:gap-6",
        "px-4 py-[14px] md:py-[16px] lg:py-[18px]",
        !isLast && "border-b border-waveclash-black",
      )}
    >
      {/* Day code + date column
          Mobile: 62px wide; tablet: 70px; desktop: 88px */}
      <div className="flex flex-col gap-0.5 w-[62px] md:w-[70px] lg:w-[88px] shrink-0">
        <span
          className={cn(
            // Mobile: Archivo Black 16px; desktop: 28px
            "font-display text-wc-2xl lg:text-wc-6xl text-waveclash-black uppercase leading-none",
          )}
          style={{ letterSpacing: "-0.03571em" }}
        >
          {row.dayCode}
        </span>
        <span
          className={cn(
            "font-demo-mono text-wc-xs font-bold text-waveclash-black uppercase",
            "tracking-label-widest",
          )}
        >
          {row.date}
        </span>
      </div>

      {/* Photo thumbnail
          Mobile: 54×54px; tablet: 64×48px; desktop: 80×60px */}
      {row.imageSrc ? (
        <div
          className={cn(
            "shrink-0 relative overflow-hidden border-2 border-waveclash-black",
            "w-[54px] h-[54px] md:w-16 md:h-12 lg:w-20 lg:h-[60px]",
          )}
        >
          <Image src={row.imageSrc} alt="" fill className="object-cover" />
        </div>
      ) : (
        <div
          className={cn(
            "bg-waveclash-black shrink-0 border-2 border-waveclash-black",
            "w-[54px] h-[54px] md:w-16 md:h-12 lg:w-20 lg:h-[60px]",
          )}
        />
      )}

      {/* Event name
          Mobile: Archivo Black 14px; tablet: 18px; desktop: 32px */}
      <span
        className={cn(
          "font-display text-wc-lg md:text-wc-3xl lg:text-wc-7xl",
          "text-waveclash-black uppercase flex-1 leading-tight",
          "tracking-label-tight",
        )}
      >
        {row.eventName}
      </span>

      {/* Badge — hidden on mobile to save horizontal space, visible from md */}
      <div className="hidden md:block shrink-0">
        <Badge fill={row.fill}>{row.badgeLabel}</Badge>
      </div>

      {/* Time — hidden on mobile; visible from md */}
      <span
        className={cn(
          "hidden md:block",
          "font-demo-mono text-wc-base md:text-wc-3xl font-bold text-waveclash-black uppercase",
          "tracking-label-wide",
          "w-16 md:w-20 text-right shrink-0",
        )}
      >
        {row.time}
      </span>

      {/* Arrow link — always visible, but smaller on mobile */}
      <span
        className={cn(
          "font-display text-wc-3xl lg:text-wc-5xl text-waveclash-red leading-none shrink-0",
        )}
        aria-hidden
      >
        ↗
      </span>
    </div>
  )
}
