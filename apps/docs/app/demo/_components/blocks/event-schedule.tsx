import { cn } from "@/lib/cn"
import { SectionHeadingRow } from "../ui/section-heading-row.js"
import { EventScheduleRow } from "./event-schedule-row.js"
import type { EventScheduleRowData } from "./event-schedule-row.js"

// Source node: WRu0j (page 1, named "SCHEDULE")
// 1440×980px, bg-waveclash-cream, padding [64, 32], gap 32, vertical layout
// Section bordered top+bottom 3px solid black
// SectionHeadingRow: eyebrow "// 003", title "EVENT / SCHEDULE", size="lg"
// Schedule table (m5x5sG): 7 rows (oYcgs, Dpio8, Og8pX, R2cAZ, T0EVe, DJSDK, tDi2q)

const DEFAULT_SCHEDULE: EventScheduleRowData[] = [
  { dayCode: "D01", date: "MON 14 MAR", eventName: "OPENING CEREMONY",    fill: "yellow", badgeLabel: "CULTURE",     time: "09:00" },
  { dayCode: "D02", date: "TUE 15 MAR", eventName: "ROUND OF 32",         fill: "red",    badgeLabel: "COMPETITION", time: "10:00" },
  { dayCode: "D03", date: "WED 16 MAR", eventName: "ROUND OF 32 CONT.",   fill: "red",    badgeLabel: "COMPETITION", time: "10:00" },
  { dayCode: "D04", date: "THU 17 MAR", eventName: "ROUND OF 16",         fill: "navy",   badgeLabel: "PREMIER",     time: "11:00" },
  { dayCode: "D05", date: "FRI 18 MAR", eventName: "FREESURF SESSION",    fill: "yellow", badgeLabel: "FREESURF",    time: "08:00" },
  { dayCode: "D06", date: "SAT 21 MAR", eventName: "QUARTERFINALS",       fill: "navy",   badgeLabel: "PREMIER",     time: "10:00" },
  { dayCode: "D07", date: "SUN 23 MAR", eventName: "SEMIFINALS + FINAL",  fill: "black",  badgeLabel: "FINAL",       time: "09:30" },
]

export interface EventScheduleProps {
  sectionLabel?: string
  sectionHeading?: string
  schedule?: EventScheduleRowData[]
}

export function EventSchedule({
  sectionLabel = "// 003",
  sectionHeading = "EVENT / SCHEDULE",
  schedule = DEFAULT_SCHEDULE,
}: EventScheduleProps) {
  return (
    <section
      className={cn(
        "w-full flex flex-col gap-8",
        "bg-waveclash-cream",
        "border-t-[3px] border-b-[3px] border-waveclash-black",
        "px-8 py-16",
      )}
    >
      {/* Section heading row (dmqgc): eyebrow + 72px title */}
      <SectionHeadingRow
        eyebrow={sectionLabel}
        title={sectionHeading}
        size="lg"
      />

      {/* Schedule table (m5x5sG) */}
      <div className="flex flex-col">
        {schedule.map((row, i) => (
          <EventScheduleRow
            key={row.dayCode}
            row={row}
            isLast={i === schedule.length - 1}
          />
        ))}
      </div>
    </section>
  )
}
