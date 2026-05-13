"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "@fogma/lib/cn"
import type { ResolvedSpacingClass } from "@fogma/lib/spacing-classes"

// Lists the "non-zone" editable spacing classes on the clicked element
// (currently: margins). Each row, when clicked, opens the regular
// SpacingPicker for that class.
export function SpacingBodyMenu({
  anchor,
  items,
  containingBlock,
  onPick,
  onClose,
}: {
  anchor: { left: number; top: number; width: number; height: number }
  items: readonly ResolvedSpacingClass[]
  containingBlock: string | undefined
  onPick: (item: ResolvedSpacingClass) => void
  onClose: () => void
}) {
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
      <div className="fixed inset-fogma-0 z-[99]" onClick={onClose} />
      <div
        className={cn(
          "fixed z-[100] flex flex-col gap-fogma-0.5 rounded-fogma-xl border bg-fogma-surface p-fogma-1.5 shadow-lg",
          // purple-300: intentional block-scope indicator colour (matches spacing-picker convention)
          isBlock ? "border-purple-300" : "border-fogma-border",
        )}
        style={{
          left: anchor.left + anchor.width / 2,
          top: anchor.top + anchor.height + 4,
          transform: "translateX(-50%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {isBlock && (
          <div className="px-fogma-1 pb-fogma-0.5">
            {/* purple-100/purple-700: intentional block-scope indicator colour (see comment above) */}
            <span className="rounded-fogma-lg bg-purple-100 px-fogma-1 py-[1px] font-mono text-[10px] font-fogma-medium uppercase tracking-wide text-purple-700">
              {containingBlock}
            </span>
          </div>
        )}
        {items.map((item) => (
          <button
            key={item.fullClass}
            type="button"
            onClick={() => onPick(item)}
            className="rounded-fogma-xxs px-fogma-1.5 py-fogma-1 text-left font-mono text-fogma-xs text-fogma-fg-muted transition-colors hover:bg-fogma-surface-2 hover:text-fogma-fg"
          >
            {item.fullClass}
          </button>
        ))}
      </div>
    </>,
    document.body,
  )
}
