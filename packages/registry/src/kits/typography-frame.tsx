"use client"

import type { ReactNode } from "react"

const DISPLAY_SAMPLES = [
  { className: "text-display-3xl", label: "display-3xl" },
  { className: "text-display-2xl", label: "display-2xl" },
  { className: "text-display-xl", label: "display-xl" },
  { className: "text-display-lg", label: "display-lg" },
  { className: "text-display-md", label: "display-md" },
  { className: "text-display-sm", label: "display-sm" },
  { className: "text-display-xs", label: "display-xs" },
]

const BODY_SAMPLES = [
  { className: "text-xl", label: "xl" },
  { className: "text-lg", label: "lg" },
  { className: "text-base", label: "base" },
  { className: "text-sm", label: "sm" },
  { className: "text-xs", label: "xs" },
]

export type TypographyFrameProps = {
  /** Text used for display-scale samples. Defaults to "Type Sample". */
  displaySample?: string
  /** Text used for body-scale samples. Defaults to the pangram. */
  bodySample?: string
  /** Override the display size rows rendered. */
  displaySizes?: Array<{ className: string; label: string }>
  /** Override the body size rows rendered. */
  bodySizes?: Array<{ className: string; label: string }>
  /** Optional extra content rendered below the built-in sections. */
  children?: ReactNode
}

export function TypographyFrame({
  displaySample = "Type Sample",
  bodySample = "The quick brown fox jumps over the lazy dog.",
  displaySizes = DISPLAY_SAMPLES,
  bodySizes = BODY_SAMPLES,
  children,
}: TypographyFrameProps) {
  return (
    <div className="flex flex-col gap-fogma-4 p-fogma-4">
      <section className="flex flex-col gap-fogma-2">
        <span className="font-mono text-fogma-xs uppercase tracking-fogma-wider text-fogma-fg-muted">
          Display
        </span>
        {displaySizes.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-fogma-0.5">
            <span className="font-mono text-fogma-xs text-fogma-fg-muted">{sample.label}</span>
            <span className={`${sample.className} text-fogma-fg`}>{displaySample}</span>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-fogma-2">
        <span className="font-mono text-fogma-xs uppercase tracking-fogma-wider text-fogma-fg-muted">
          Body
        </span>
        {bodySizes.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-fogma-0.5">
            <span className="font-mono text-fogma-xs text-fogma-fg-muted">{sample.label}</span>
            <span className={`${sample.className} text-fogma-fg`}>{bodySample}</span>
          </div>
        ))}
      </section>
      {children}
    </div>
  )
}
