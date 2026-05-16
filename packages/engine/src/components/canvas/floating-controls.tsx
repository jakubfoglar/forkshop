"use client"

import { cn } from "@forkshop/lib/cn"

export function FloatingControls({
  zoom,
  onFit,
  onResetZoom,
  composeAvailable = false,
  composeEnabled = false,
  onToggleCompose,
}: {
  zoom: number
  onFit: () => void
  onResetZoom: () => void
  composeAvailable?: boolean
  composeEnabled?: boolean
  onToggleCompose?: () => void
}) {
  return (
    <div className="pointer-events-none absolute bottom-forkshop-4 right-forkshop-4 z-10 flex flex-col items-end gap-forkshop-1">
      <div className="pointer-events-auto flex items-center gap-forkshop-0.5 rounded-forkshop-full border border-forkshop-border bg-forkshop-surface px-forkshop-1 py-forkshop-0.5 shadow-sm">
        {composeAvailable && (
          <button
            type="button"
            onClick={onToggleCompose}
            aria-pressed={composeEnabled}
            title="Toggle compose mode (drag to reorder, + to insert, × to remove)"
            className={cn(
              "rounded-forkshop-full px-forkshop-2 py-forkshop-0.5 text-forkshop-xs font-forkshop-medium transition-colors",
              composeEnabled
                ? "bg-forkshop-accent/10 text-forkshop-accent hover:bg-forkshop-accent/20"
                : "text-forkshop-fg-muted hover:bg-forkshop-surface-2 hover:text-forkshop-fg",
            )}
          >
            Compose
          </button>
        )}
        <button
          type="button"
          onClick={onFit}
          className="rounded-forkshop-full px-forkshop-2 py-forkshop-0.5 text-forkshop-xs font-forkshop-medium text-forkshop-fg-muted hover:bg-forkshop-surface-2 hover:text-forkshop-fg"
        >
          Fit
        </button>
        <span className="min-w-forkshop-7 px-forkshop-1 text-center text-forkshop-xs tabular-nums text-forkshop-fg-muted">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onResetZoom}
          className="rounded-forkshop-full px-forkshop-2 py-forkshop-0.5 text-forkshop-xs font-forkshop-medium text-forkshop-fg-muted hover:bg-forkshop-surface-2 hover:text-forkshop-fg"
        >
          100%
        </button>
      </div>
    </div>
  )
}
