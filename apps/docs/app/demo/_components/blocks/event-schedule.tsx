import { cn } from "@/lib/cn"
import { SectionHeadingRow } from "../ui/section-heading-row.js"
import { EventScheduleRow } from "./event-schedule-row.js"
import type { EventScheduleRowData } from "./event-schedule-row.js"

// Source node: WRu0j (page 1, named "SCHEDULE")
// 1440×980px, bg-waveclash-cream, padding [64, 32], gap 32, vertical layout
// Section bordered top+bottom 3px solid black
// SectionHeadingRow: eyebrow "// 003", title "EVENT / SCHEDULE", size="lg"
// Schedule table (m5x5sG): 7 rows (oYcgs, Dpio8, Og8pX, R2cAZ, T0EVe, DJSDK, tDi2q)

// Row data sourced from pencil nodes oYcgs, Dpio8, Og8pX, R2cAZ, T0EVe, DJSDK, tDi2q
// Date format: "MAR DD" (JetBrains Mono 10px, pencil nodes EDuWL, yhnjK, …)
const DEFAULT_SCHEDULE: EventScheduleRowData[] = [
  { dayCode: "D01", date: "MAR 14", eventName: "OPENING CEREMONY",    fill: "yellow", badgeLabel: "CULTURE",     time: "06:30", imageSrc: "/demo/gallery-1.jpg" },
  { dayCode: "D02", date: "MAR 15", eventName: "MEN'S QUALIFYING",    fill: "red",    badgeLabel: "COMPETITION", time: "07:00", imageSrc: "/demo/gallery-2.jpg" },
  { dayCode: "D03", date: "MAR 16", eventName: "WOMEN'S QUALIFYING",  fill: "red",    badgeLabel: "COMPETITION", time: "07:00", imageSrc: "/demo/gallery-4.jpg" },
  { dayCode: "D04", date: "MAR 17", eventName: "BIG WAVE INVITATIONAL", fill: "navy", badgeLabel: "PREMIER",     time: "05:30", imageSrc: "/demo/gallery-5.jpg" },
  { dayCode: "D05", date: "MAR 18", eventName: "AIRSHOW EXPRESSION",  fill: "yellow", badgeLabel: "CULTURE",     time: "10:00", imageSrc: "/demo/gallery-6.jpg" },
  { dayCode: "D06", date: "MAR 21", eventName: "SEMIFINALS / BOTH",   fill: "red",    badgeLabel: "COMPETITION", time: "08:00", imageSrc: "/demo/gallery-7.jpg" },
  { dayCode: "D07", date: "MAR 23", eventName: "GRAND FINAL",         fill: "black",  badgeLabel: "FINAL",       time: "14:00", imageSrc: "/demo/gallery-3.jpg" },
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
      data-forkshop-block="event-schedule"
      className={cn(
        "w-full flex flex-col gap-8",
        "bg-waveclash-cream",
        "border-t-[3px] border-b-[3px] border-waveclash-black",
        // Mobile: [32,20] padding; tablet: [40,24]; desktop: [64,32]
        "px-5 pt-8 pb-4 md:px-8 md:pt-10 md:pb-6 lg:px-8 lg:pt-16 lg:pb-8",
      )}
    >
      {/* Section heading row (dmqgc): eyebrow + responsive title + right metadata
          Mobile: 48px; tablet (md): 56px; desktop (lg): 72px */}
      <SectionHeadingRow
        eyebrow={sectionLabel}
        title={sectionHeading}
        headingClassName={cn(
          "text-wc-8xl md:text-wc-9xl lg:text-wc-9xl",
          "tracking-display-normal leading-snug",
        )}
        metadata={
          <>
            <span className="text-waveclash-black">TEN DAYS</span>
            <span className="text-waveclash-red">OF CARNAGE</span>
          </>
        }
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
