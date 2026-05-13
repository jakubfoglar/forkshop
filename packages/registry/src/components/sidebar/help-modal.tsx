"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { FogmaIcon } from "@fogma/components/icon"
import { X } from "lucide-react"

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
      className="m-auto max-w-[440px] w-full rounded-[1.25rem] border border-fogma-border bg-fogma-surface p-fogma-5 shadow-lg backdrop:bg-black/40 open:flex open:flex-col gap-fogma-4"
      aria-label="Fogma cheatsheet"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-fogma-base font-fogma-semibold text-fogma-fg">Fogma cheatsheet</h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-fogma-lg p-fogma-2 text-fogma-fg-muted transition-colors hover:bg-fogma-surface-2 hover:text-fogma-fg"
          aria-label="Close"
        >
          <FogmaIcon icon={X} className="size-fogma-4" />
        </button>
      </div>
      <p className="sr-only">Quick reference for editing in fogma.</p>
      <div className="flex flex-col gap-fogma-2">
        <Tip
          visual={<ColorSwatch className="ring-blue-500/60 bg-blue-500/30" />}
          title="Page spacing"
          body={
            <>
              Hold <Kbd>⌘</Kbd> and hover any element — blue strips are padding & gap. Click a
              strip to pick a new value. Edits save to the page file.
            </>
          }
        />
        <Tip
          visual={<ColorSwatch className="ring-purple-400 bg-purple-500/30" />}
          title="Block spacing"
          body={
            <>
              Same <Kbd>⌘</Kbd>-hover, but purple strips mean the spacing lives inside a block
              component. Edits save to components/blocks/&lt;slug&gt;.tsx — never the page.
            </>
          }
        />
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
            <span className="flex items-baseline gap-fogma-2 font-mono text-[10px] text-fogma-fg-muted">
              <Kbd>⌥</Kbd>+click
            </span>
          }
          title="Open source"
          body="Hold Option and click any element to jump to its source file in your editor."
        />
        <Tip
          visual={<KbdGlyph>2×</KbdGlyph>}
          title="Isolate"
          body={
            <>
              Double-click a page or block in the sidebar (or on a sitemap tile) to open it
              full-size. <Kbd>esc</Kbd> returns.
            </>
          }
        />
        <Tip
          visual={<KbdGlyph>↻</KbdGlyph>}
          title="Saves are real"
          body="Every edit writes directly to the source TSX. Revert with git — there's no undo inside fogma."
        />
        <Tip
          visual={<DraftPill />}
          title="Drafts"
          body={
            <>
              Pages with a <DraftPill /> pill are work-in-progress — you can still access them via
              direct link, but they won&apos;t appear in the public sitemap.
            </>
          }
        />
      </div>
    </dialog>
  )
}

function Tip({ visual, title, body }: { visual: ReactNode; title: string; body: ReactNode }) {
  return (
    <div className="flex gap-fogma-2.5 rounded-fogma-xl px-fogma-2 py-fogma-1.5">
      <div className="flex w-fogma-8 shrink-0 items-center justify-center pt-fogma-2">{visual}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-fogma-2">
        <span className="text-fogma-xs font-fogma-medium text-fogma-fg">{title}</span>
        <span className="leading-relaxed text-fogma-xs text-fogma-fg-muted">{body}</span>
      </div>
    </div>
  )
}

function ColorSwatch({ className }: { className: string }) {
  return <span className={`block size-fogma-3.5 rounded-fogma-lg ring-1 ${className}`} />
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-fogma-3.5 items-center justify-center rounded-fogma-lg border border-fogma-border bg-fogma-surface-2 px-fogma-1 py-[1px] text-[10px] font-fogma-medium text-fogma-fg-muted">
      {children}
    </kbd>
  )
}

function KbdGlyph({ children }: { children: ReactNode }) {
  return (
    <span className="size-[1.125rem] flex items-center justify-center rounded-fogma-lg border border-fogma-border bg-fogma-surface-2 text-[10px] font-fogma-semibold text-fogma-fg-muted">
      {children}
    </span>
  )
}

function DraftPill() {
  return (
    <span className="rounded-fogma-lg bg-fogma-surface-2 px-fogma-1 py-[1px] text-[9px] font-fogma-medium uppercase tracking-fogma-wider text-fogma-fg-muted">
      Draft
    </span>
  )
}
