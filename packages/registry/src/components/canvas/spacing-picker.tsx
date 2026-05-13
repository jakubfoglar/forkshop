"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "../../lib/cn.js"
import type { TokenEntry } from "../../lib/token-registry.js"

// Picker for swapping one spacing class (e.g. `p-4`) for another in the same
// family (e.g. `p-6`). Renders below an anchor rect in host (page) coords.
// The caller computes the anchor from a zone/element rect inside the iframe
// already accounting for canvas scale.

function formatPxLabel(entry: Extract<TokenEntry, { kind: "spacing" }>): string {
  if (entry.px === undefined) return entry.rem
  if (entry.px === 0) return "0"
  return `${entry.px}px`
}
export function SpacingPicker({
  anchor,
  currentClass,
  prefix,
  spacing,
  containingBlock,
  onSelect,
  onClose,
}: {
  anchor: { left: number; top: number; width: number; height: number }
  currentClass: string
  prefix: string
  spacing: readonly TokenEntry[]
  containingBlock: string | undefined
  onSelect: (newClass: string) => void
  onClose: () => void
}) {
  const currentName = currentClass.slice(prefix.length)
  const entries = spacing.filter(
    (entry): entry is Extract<TokenEntry, { kind: "spacing" }> => entry.kind === "spacing",
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    globalThis.addEventListener("keydown", onKeyDown)
    return () => globalThis.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const isBlock = containingBlock !== undefined
  return createPortal(
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div
        className={cn(
          "fixed z-[100] flex flex-col gap-1 rounded-xl border bg-fogma-surface p-1.5 shadow-lg",
          // purple-300 / purple-100 / purple-700 are intentional overlay colours that
          // visually distinguish block-scoped spacing zones (purple) from page zones (fogma-border).
          isBlock ? "border-purple-300" : "border-fogma-border",
        )}
        style={{
          left: anchor.left + anchor.width / 2,
          top: anchor.top + anchor.height + 4,
          transform: "translateX(-50%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-1 px-1 pb-0.5 font-mono text-xs">
          {isBlock && (
            // purple-100/purple-700: intentional block-scope indicator colour (see comment above)
            <span className="rounded-lg bg-purple-100 px-1 py-[1px] text-[10px] font-medium uppercase tracking-wide text-purple-700">
              {containingBlock}
            </span>
          )}
          <span className="text-fogma-fg-muted">{currentClass}</span>
        </div>
        <div className="flex max-w-[28rem] flex-wrap gap-0.5">
          {entries.map((entry) => {
            const isCurrent = entry.name === currentName
            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => onSelect(`${prefix}${entry.name}`)}
                className={cn(
                  "flex flex-col items-center rounded px-1.5 py-1 text-center font-mono text-xs leading-tight transition-colors",
                  // purple-600: intentional block-scope selected state (see comment above)
                  isCurrent && isBlock && "bg-purple-600 text-fogma-surface",
                  isCurrent && !isBlock && "bg-fogma-fg text-fogma-surface",
                  !isCurrent && "text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg",
                )}
                title={`${prefix}${entry.name} — ${entry.rem}`}
              >
                <span className="tabular-nums">{entry.name}</span>
                <span
                  className={cn(
                    "text-[9px] tabular-nums",
                    isCurrent ? "text-fogma-surface/70" : "text-fogma-fg-muted",
                  )}
                >
                  {formatPxLabel(entry)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>,
    document.body,
  )
}
