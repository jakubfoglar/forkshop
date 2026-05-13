"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { FogmaIcon } from "../icon.js"
import { Xmark } from "iconoir-react"

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
      className="m-auto max-w-[440px] w-full rounded-[1.25rem] border border-fogma-border bg-fogma-surface p-5 shadow-lg backdrop:bg-black/40 open:flex open:flex-col gap-4"
      aria-label="Fogma cheatsheet"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-fogma-fg">Fogma cheatsheet</h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg p-2 text-fogma-fg-muted transition-colors hover:bg-fogma-surface-2 hover:text-fogma-fg"
          aria-label="Close"
        >
          <FogmaIcon icon={Xmark} className="size-4" />
        </button>
      </div>
      <p className="sr-only">Quick reference for editing in fogma.</p>
      <div className="flex flex-col gap-2">
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
            <span className="flex items-baseline gap-2 font-mono text-[10px] text-fogma-fg-muted">
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
    <div className="flex gap-2.5 rounded-xl px-2 py-1.5">
      <div className="flex w-8 shrink-0 items-center justify-center pt-2">{visual}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-xs font-medium text-fogma-fg">{title}</span>
        <span className="leading-relaxed text-xs text-fogma-fg-muted">{body}</span>
      </div>
    </div>
  )
}

function ColorSwatch({ className }: { className: string }) {
  return <span className={`block size-3.5 rounded-lg ring-1 ${className}`} />
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-3.5 items-center justify-center rounded-lg border border-fogma-border bg-fogma-surface-2 px-1 py-[1px] text-[10px] font-medium text-fogma-fg-muted">
      {children}
    </kbd>
  )
}

function KbdGlyph({ children }: { children: ReactNode }) {
  return (
    <span className="size-[1.125rem] flex items-center justify-center rounded-lg border border-fogma-border bg-fogma-surface-2 text-[10px] font-semibold text-fogma-fg-muted">
      {children}
    </span>
  )
}

function DraftPill() {
  return (
    <span className="rounded-lg bg-fogma-surface-2 px-1 py-[1px] text-[9px] font-medium uppercase tracking-wider text-fogma-fg-muted">
      Draft
    </span>
  )
}
