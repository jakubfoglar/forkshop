import { cn } from "@/lib/cn"
import type { ComponentProps } from "react"

export type BadgeFill = "yellow" | "red" | "navy" | "black"
export type BadgeSize = "md" | "sm"

export interface BadgeProps extends ComponentProps<"span"> {
  fill?: BadgeFill
  size?: BadgeSize
}

/**
 * Small flat event-type tag.
 * Source nodes: iIHE3 (yellow/CULTURE), o70xu (red/COMPETITION),
 *               gHqrV (navy/PREMIER), YV0Rp (black/FINAL).
 *
 * Design values (pencil):
 *   - Font: JetBrains Mono, 10px, weight 700, letterSpacing +1.5
 *   - Padding: [6, 12] desktop / [3, 6] mobile (size="sm")
 *   - Border-radius: 0 (sharp corners)
 *   - navy fill uses black text (pencil: fill "#0A0A0A" on PREMIER badge text)
 */
export function Badge({
  fill = "yellow",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block font-demo-mono font-bold tracking-label-wider uppercase",
        size === "md" && "text-xs px-3 py-1.5",
        size === "sm" && "text-xs px-1.5 py-0.5",
        fill === "yellow" && "bg-waveclash-yellow text-waveclash-black",
        fill === "red"    && "bg-waveclash-red text-waveclash-black",
        fill === "navy"   && "bg-waveclash-navy text-waveclash-black",
        fill === "black"  && "bg-waveclash-black text-waveclash-cream",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
