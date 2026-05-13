"use client"

import { cn } from "../../lib/cn.js"

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
    <div className="pointer-events-none absolute bottom-1 right-1 z-10 flex flex-col items-end gap-0.25">
      <div className="pointer-events-auto flex items-center gap-0.125 rounded-full border border-fogma-border bg-fogma-surface px-0.25 py-0.125 shadow-sm">
        {composeAvailable && (
          <button
            type="button"
            onClick={onToggleCompose}
            aria-pressed={composeEnabled}
            title="Toggle compose mode (drag to reorder, + to insert, × to remove)"
            className={cn(
              "rounded-full px-0.5 py-0.125 text-xs font-medium transition-colors",
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
          className="rounded-full px-0.5 py-0.125 text-xs font-medium text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg"
        >
          Fit
        </button>
        <span className="min-w-1.75 px-0.25 text-center text-xs tabular-nums text-fogma-fg-muted">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onResetZoom}
          className="rounded-full px-0.5 py-0.125 text-xs font-medium text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg"
        >
          100%
        </button>
      </div>
    </div>
  )
}
