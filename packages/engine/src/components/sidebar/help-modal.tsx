"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { ForkshopIcon } from "@forkshop/components/icon"
import { forkshopIcons } from "@forkshop/lib/icons"

export function HelpModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => onOpenChange(false)
    dialog.addEventListener("close", handleClose)
    return () => dialog.removeEventListener("close", handleClose)
  }, [onOpenChange])

  // Close on backdrop click
  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect()
    if (!rect) return
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      onOpenChange(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      className="m-auto max-w-[440px] w-full rounded-[1.25rem] border border-forkshop-border bg-forkshop-surface p-forkshop-5 shadow-lg backdrop:bg-black/40 open:flex open:flex-col gap-forkshop-4"
      aria-label="Forkshop cheatsheet"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-forkshop-base font-forkshop-semibold text-forkshop-fg">Forkshop cheatsheet</h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-forkshop-lg p-forkshop-2 text-forkshop-fg-muted transition-colors hover:bg-forkshop-surface-2 hover:text-forkshop-fg"
          aria-label="Close"
        >
          <ForkshopIcon icon={forkshopIcons.close} className="size-forkshop-4" />
        </button>
      </div>
      <p className="sr-only">Quick reference for editing in forkshop.</p>
      <div className="flex flex-col gap-forkshop-2">
        <Tip
          visual={<KbdGlyph>T</KbdGlyph>}
          title="Edit text"
          body={
            <>
              Click any text to edit inline. <Kbd>⌘</Kbd> <Kbd>↵</Kbd> saves, <Kbd>esc</Kbd>{" "}
              discards.
            </>
          }
        />
        <Tip
          visual={
            <span className="flex items-baseline gap-forkshop-2 font-mono text-[10px] text-forkshop-fg-muted">
              <Kbd>⌥</Kbd>+click
            </span>
          }
          title="Open source"
          body="Hold Option and click any element to jump to its source file in your editor."
        />
        <Tip
          visual={<KbdGlyph>↻</KbdGlyph>}
          title="Saves are real"
          body="Every edit writes directly to the source TSX. Revert with git — there's no undo inside forkshop."
        />
      </div>
      <a
        href="https://forkshop.dev/docs"
        target="_blank"
        rel="noreferrer"
        className="text-forkshop-xs text-forkshop-fg-muted transition-colors hover:text-forkshop-fg"
      >
        More at forkshop.dev/docs →
      </a>
    </dialog>
  )
}

function Tip({ visual, title, body }: { visual: ReactNode; title: string; body: ReactNode }) {
  return (
    <div className="flex gap-forkshop-2.5 rounded-forkshop-xl px-forkshop-2 py-forkshop-1.5">
      <div className="flex w-forkshop-8 shrink-0 items-center justify-center pt-forkshop-2">{visual}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-forkshop-2">
        <span className="text-forkshop-xs font-forkshop-medium text-forkshop-fg">{title}</span>
        <span className="leading-relaxed text-forkshop-xs text-forkshop-fg-muted">{body}</span>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-forkshop-3.5 items-center justify-center rounded-forkshop-lg border border-forkshop-border bg-forkshop-surface-2 px-forkshop-1 py-[1px] text-[10px] font-forkshop-medium text-forkshop-fg-muted">
      {children}
    </kbd>
  )
}

function KbdGlyph({ children }: { children: ReactNode }) {
  return (
    <span className="size-[1.125rem] flex items-center justify-center rounded-forkshop-lg border border-forkshop-border bg-forkshop-surface-2 text-[10px] font-forkshop-semibold text-forkshop-fg-muted">
      {children}
    </span>
  )
}

