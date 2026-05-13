"use client"

import { ArrowLeft } from "lucide-react"
import { ForkshopIcon } from "@forkshop/components/icon"

export function BackButton({
  destinationLabel,
  onBack,
}: {
  destinationLabel: string
  onBack: () => void
}) {
  return (
    <div className="pointer-events-none absolute left-forkshop-4 top-forkshop-4 z-10">
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto flex items-center gap-forkshop-1 rounded-forkshop-full border border-forkshop-border bg-forkshop-surface px-forkshop-2 py-forkshop-0.5 text-forkshop-xs font-forkshop-medium text-forkshop-fg-muted shadow-sm hover:bg-forkshop-surface-2 hover:text-forkshop-fg"
      >
        <ForkshopIcon icon={ArrowLeft} className="size-forkshop-3 shrink-0" aria-hidden={true} />
        <span className="truncate">Back to {destinationLabel}</span>
      </button>
    </div>
  )
}
