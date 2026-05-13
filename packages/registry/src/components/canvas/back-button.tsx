"use client"

import { ArrowLeft } from "iconoir-react"
import { FogmaIcon } from "../icon.js"

export function BackButton({
  destinationLabel,
  onBack,
}: {
  destinationLabel: string
  onBack: () => void
}) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10">
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-fogma-border bg-fogma-surface px-2 py-0.5 text-xs font-medium text-fogma-fg-muted shadow-sm hover:bg-fogma-surface-2 hover:text-fogma-fg"
      >
        <FogmaIcon icon={ArrowLeft} className="size-3 shrink-0" aria-hidden={true} />
        <span className="max-w-12 truncate">Back to {destinationLabel}</span>
      </button>
    </div>
  )
}
