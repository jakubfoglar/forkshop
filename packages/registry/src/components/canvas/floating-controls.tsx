"use client"

import { cn } from "@fogma/lib/cn"

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
    <div className="pointer-events-none absolute bottom-fogma-4 right-fogma-4 z-10 flex flex-col items-end gap-fogma-1">
      <div className="pointer-events-auto flex items-center gap-fogma-0.5 rounded-fogma-full border border-fogma-border bg-fogma-surface px-fogma-1 py-fogma-0.5 shadow-sm">
        {composeAvailable && (
          <button
            type="button"
            onClick={onToggleCompose}
            aria-pressed={composeEnabled}
            title="Toggle compose mode (drag to reorder, + to insert, × to remove)"
            className={cn(
              "rounded-fogma-full px-fogma-2 py-fogma-0.5 text-fogma-xs font-fogma-medium transition-colors",
              composeEnabled
                ? "bg-fogma-accent/10 text-fogma-accent hover:bg-fogma-accent/20"
                : "text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg",
            )}
          >
            Compose
          </button>
        )}
        <button
          type="button"
          onClick={onFit}
          className="rounded-fogma-full px-fogma-2 py-fogma-0.5 text-fogma-xs font-fogma-medium text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg"
        >
          Fit
        </button>
        <span className="min-w-fogma-7 px-fogma-1 text-center text-fogma-xs tabular-nums text-fogma-fg-muted">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onResetZoom}
          className="rounded-fogma-full px-fogma-2 py-fogma-0.5 text-fogma-xs font-fogma-medium text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg"
        >
          100%
        </button>
      </div>
    </div>
  )
}
