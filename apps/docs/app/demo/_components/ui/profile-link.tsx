import { cn } from "@/lib/cn"
import type { ComponentProps } from "react"

export interface ProfileLinkProps extends ComponentProps<"a"> {
  href?: string
}

/**
 * Compact inline link: text + arrow-right, side by side.
 * Source nodes: Y1YAER, yo8d4 (mobile athlete cards).
 *
 * Design values (pencil):
 *   - Font: JetBrains Mono, 11px, weight 700, fill red
 *   - Icon: Lucide arrow-right 14×14, fill red (substituted with → glyph)
 *   - Gap: 6px between label and icon
 *   - No background, no border, no padding
 */
export function ProfileLink({ href = "#", className, children = "VIEW PROFILE", ...props }: ProfileLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5",
        "font-demo-mono text-wc-sm font-bold text-waveclash-red uppercase",
        "no-underline",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <span aria-hidden className="text-wc-sm leading-none">→</span>
    </a>
  )
}
