import { cn } from "@/lib/cn"
import type { ComponentProps } from "react"

export type ButtonVariant = "primary" | "secondary" | "ghost"
export type ButtonWidth = "compact" | "wide"

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant
  /** compact = intrinsic width (nav); wide = full container width (hero / ticket) */
  width?: ButtonWidth
}

/**
 * WAVECLASH CTA button. Always sharp corners (border-radius: 0). Always has → suffix.
 * Source nodes:
 *   primary compact: i9Ino (nav GET PASS) — padding [12,20], gap 6
 *   primary wide:    xm0Gd (hero WATCH LIVE) — padding [16,20], justify-between
 *   secondary wide:  y5PC1 (7-DAY PASS) — cream fill, padding [16,20], justify-between
 *   ghost compact:   ff1pZ (ALL ATHLETES) — black fill, cream label, red →, padding [14,22], gap 10
 *   ghost wide:      rE6Uq (ticket BUY DAY PASS) — black fill, cream label, cream →, padding [14,18]
 *
 * Design values (pencil):
 *   - Font: Archivo Black, 13–16px, weight 900, letterSpacing +1 to +1.5
 *   - Arrow: "→" text glyph, same fill as label (ghost: arrow is red on compact, cream on wide)
 *   - No border-radius on any instance
 */
export function Button({
  variant = "primary",
  width = "compact",
  className,
  children,
  ...props
}: ButtonProps) {
  const isWide = width === "wide"

  return (
    <button
      className={cn(
        "inline-flex items-center font-display uppercase font-black",
        // Width behaviour
        isWide ? "justify-between w-full" : "gap-2",
        // Padding: wide primary/secondary use [16,20]; ghost wide uses [14,18] (pencil rE6Uq)
        isWide && variant !== "ghost" && "px-5 py-4",
        isWide && variant === "ghost" && "px-[18px] py-[14px]",
        !isWide && variant !== "ghost" && "px-5 py-3",
        !isWide && variant === "ghost" && "px-[22px] py-[14px]",
        // Variant fills
        variant === "primary"   && "bg-waveclash-red text-waveclash-black",
        variant === "secondary" && "bg-waveclash-cream text-waveclash-black border-2 border-waveclash-cream",
        variant === "ghost"     && "bg-waveclash-black text-waveclash-cream",
        className,
      )}
      {...props}
    >
      <span className="text-wc-md tracking-label-wide">{children}</span>
      <span
        aria-hidden
        className={cn(
          "text-wc-3-5xl leading-none",
          // Ghost compact arrow is red; ghost wide and all others match label
          variant === "ghost" && !isWide
            ? "text-waveclash-red"
            : variant === "ghost"
            ? "text-waveclash-cream"
            : undefined,
        )}
      >
        →
      </span>
    </button>
  )
}
