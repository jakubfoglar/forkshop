import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

export type SectionHeadingSize = "lg" | "xl"

export interface SectionHeadingRowProps {
  /** Optional — omit when the eyebrow is already rendered in a sibling strip */
  eyebrow?: string
  title?: string
  /** Optional right-side metadata block — two short mono lines, bottom-aligned */
  metadata?: ReactNode
  /** lg = 72px (EVENT / SCHEDULE), xl = 180px (MEET THE SURFERS.) */
  size?: SectionHeadingSize
  /** Title fill color — "dark" = waveclash-black (#0A0A0A), "light" = waveclash-cream. Defaults to "dark". */
  tone?: "dark" | "light"
  className?: string
  /** Override the heading font-size classes (e.g. responsive ramp). Replaces the size-derived classes when provided. */
  headingClassName?: string
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
  title = "SECTION TITLE",
  metadata,
  size = "lg",
  tone = "dark",
  className,
  headingClassName,
}: SectionHeadingRowProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between w-full",
        className,
      )}
    >
      {/* Left: eyebrow (optional) + heading */}
      <div className="flex flex-col gap-2">
        {eyebrow && (
          <span className="font-demo-mono text-wc-sm font-bold text-waveclash-red tracking-label-widest uppercase">
            {eyebrow}
          </span>
        )}
        <span
          className={cn(
            "font-display uppercase",
            tone === "dark"  && "text-waveclash-black",
            tone === "light" && "text-waveclash-cream",
            // headingClassName overrides the size-derived classes when provided
            headingClassName
              ? headingClassName
              : cn(
                  size === "lg" && "text-wc-9xl tracking-display-normal leading-snug",
                  size === "xl" && "text-wc-display-sm tracking-[-.03333em] leading-dense",
                ),
          )}
          style={{ color: tone === "dark" ? "var(--waveclash-black)" : undefined }}
        >
          {title}
        </span>
      </div>

      {/* Right: optional metadata, bottom-aligned */}
      {metadata && (
        <div className="flex flex-col items-end gap-1 font-demo-mono text-wc-sm font-bold tracking-label-widest uppercase">
          {metadata}
        </div>
      )}
    </div>
  )
}
