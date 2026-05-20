import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

export type SectionHeadingSize = "lg" | "xl"

export interface SectionHeadingRowProps {
  eyebrow: string
  title: string
  /** Optional right-side metadata block — two short mono lines, bottom-aligned */
  metadata?: ReactNode
  /** lg = 72px (EVENT / SCHEDULE), xl = 180px (MEET THE SURFERS.) */
  size?: SectionHeadingSize
  className?: string
}

/**
 * Two-column section opener: [eyebrow + display heading] / [metadata right].
 * Source nodes: dmqgc (EVENT/SCHEDULE, 72px), anKrW (MEET THE SURFERS., 180px).
 *
 * Design values (pencil):
 *   - Eyebrow: JetBrains Mono 11px bold red, letterSpacing +2, gap 8 below heading
 *   - Heading: Archivo Black 72–180px, letterSpacing −2 / −6, lineHeight 0.9 / 0.88
 *   - Metadata: JetBrains Mono 11px bold, two lines, bottom-aligned right column
 *   - Row: flex justify-between align-end
 */
export function SectionHeadingRow({
  eyebrow,
  title,
  metadata,
  size = "lg",
  className,
}: SectionHeadingRowProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between w-full",
        className,
      )}
    >
      {/* Left: eyebrow + heading */}
      <div className="flex flex-col gap-2">
        <span className="font-demo-mono text-sm font-bold text-waveclash-red tracking-label-widest uppercase">
          {eyebrow}
        </span>
        <span
          className={cn(
            "font-display uppercase",
            size === "lg" && "text-9xl tracking-display-normal leading-snug",
            size === "xl" && "text-display-sm tracking-[-.03333em] leading-dense",
          )}
        >
          {title}
        </span>
      </div>

      {/* Right: optional metadata, bottom-aligned */}
      {metadata && (
        <div className="flex flex-col items-end gap-1 font-demo-mono text-sm font-bold tracking-label-widest uppercase">
          {metadata}
        </div>
      )}
    </div>
  )
}
