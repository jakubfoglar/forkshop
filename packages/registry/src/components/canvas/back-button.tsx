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
    <div className="pointer-events-none absolute left-1 top-1 z-10">
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto flex items-center gap-0.25 rounded-full border border-fogma-border bg-fogma-surface px-0.5 py-0.125 text-xs font-medium text-fogma-fg-muted shadow-sm hover:bg-gray-100 hover:text-fogma-fg"
      >
        <FogmaIcon icon={ArrowLeft} className="size-0.75 shrink-0" aria-hidden={true} />
        <span className="max-w-12 truncate">Back to {destinationLabel}</span>
      </button>
    </div>
  )
}
