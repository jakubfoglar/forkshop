import { cn } from "@/lib/cn"

export type TickerBeltFill = "yellow" | "black"
export type TickerBeltSize = "md" | "lg"

export interface TickerBeltProps {
  fill?: TickerBeltFill
  items: string[]
  separator: string  // required — both design instances choose explicitly
  size?: TickerBeltSize  // "lg" = text-wc-6xl (28px, hero default); "md" = text-wc-4xl (22px, footer)
  className?: string
}

/**
 * Full-width horizontal ticker bar. Static (no animation) — marquee deferred.
 * Source nodes: YmRZq (hero, yellow, ◆ sep, 28px), SZ1De (footer, yellow, ★ sep, 22px).
 *
 * Design values (pencil):
 *   - Font: Archivo Black, 28px (hero/lg) / 22px (footer/md)
 *   - Padding: [16, 0] (hero) / [18, 60] (footer) — we expose via className
 *   - Border: 3px solid black top+bottom
 *   - Gap between items: 32–36px — implemented as gap-8
 *   - Letter spacing: +1 (hero) / +1.5 (footer) — tracking-label-wide default
 */
export function TickerBelt({
  fill = "yellow",
  items,
  separator,
  size = "lg",
  className,
}: TickerBeltProps) {
  const textClass = size === "md" ? "text-wc-4xl" : "text-wc-6xl"

  return (
    <div
      className={cn(
        "flex items-center overflow-hidden",
        "border-t-[3px] border-b-[3px] border-waveclash-black",
        "py-4",
        fill === "yellow" && "bg-waveclash-yellow",
        fill === "black" && "bg-waveclash-black",
        className,
      )}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-8 flex-shrink-0">
          <span
            className={cn(
              "font-display tracking-label-wide uppercase",
              textClass,
              fill === "yellow" && "text-waveclash-black",
              fill === "black" && "text-waveclash-cream",
            )}
          >
            {item}
          </span>
          <span
            className={cn(
              "font-display flex-shrink-0",
              textClass,
              fill === "yellow" && "text-waveclash-black",
              fill === "black" && "text-waveclash-red",
            )}
          >
            {separator}
          </span>
        </span>
      ))}
    </div>
  )
}
