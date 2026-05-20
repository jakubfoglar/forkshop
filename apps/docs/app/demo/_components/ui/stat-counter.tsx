import { cn } from "@/lib/cn"

export interface StatCounterProps {
  value?: string
  label?: string
  /** highlight=true renders with red background (e.g. COUNTRIES cell) */
  highlight?: boolean
  className?: string
}

/**
 * Two-line stacked stat: large number on top, short all-caps label below.
 * Source nodes: Nc0i9 (ATHLETES — black bg variant),
 *               F0N5N (COUNTRIES — red bg highlight variant).
 *
 * Design values (pencil):
 *   - Number: Archivo Black, 64px, lineHeight 0.9, letterSpacing −2
 *   - Label: JetBrains Mono, 11px, weight 700, fill red (on default) / black (on highlight)
 *   - Gap: 6px between number and label
 *   - Padding: [24, 18]
 *   - Default bg: waveclash-black / Highlight bg: waveclash-red
 */
export function StatCounter({ value = "42", label = "STAT", highlight = false, className }: StatCounterProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-[18px] py-6",
        highlight ? "bg-waveclash-red" : "bg-waveclash-black",
        className,
      )}
    >
      <span
        className={cn(
          "font-display text-wc-8xl tracking-display-normal leading-snug",
          highlight ? "text-waveclash-black" : "text-waveclash-cream",
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "font-demo-mono text-wc-sm font-bold uppercase",
          highlight ? "text-waveclash-black" : "text-waveclash-red",
        )}
      >
        {label}
      </span>
    </div>
  )
}
