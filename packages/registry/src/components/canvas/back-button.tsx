"use client"

import { ArrowLeft } from "lucide-react"
import { FogmaIcon } from "../icon.js"

export function BackButton({
  destinationLabel,
  onBack,
}: {
  destinationLabel: string
  onBack: () => void
}) {
  return (
    <div className="pointer-events-none absolute left-fogma-4 top-fogma-4 z-10">
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto flex items-center gap-fogma-1 rounded-fogma-full border border-fogma-border bg-fogma-surface px-fogma-2 py-fogma-0.5 text-fogma-xs font-fogma-medium text-fogma-fg-muted shadow-sm hover:bg-fogma-surface-2 hover:text-fogma-fg"
      >
        <FogmaIcon icon={ArrowLeft} className="size-fogma-3 shrink-0" aria-hidden={true} />
        <span className="truncate">Back to {destinationLabel}</span>
      </button>
    </div>
  )
}
