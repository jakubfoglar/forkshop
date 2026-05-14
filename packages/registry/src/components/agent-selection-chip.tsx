"use client"

import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
  useSiteWideActivity,
} from "@forkshop/components/agent-activity-context"

// Floating "Claude · <filename>" chip rendered at the top-center of the
// canvas. Selection-aware: if the user is viewing the page/block/primitive
// Claude is editing, the label names that file. Otherwise falls back to
// the most recent site-wide edit's basename. Hidden when no activity.
//
// Also defines the @keyframes forkshop-agent-pulse globally, so the sidebar
// dot and canvas-node chip animations (both reference the same name) come
// to life whenever this chip is mounted.
export function AgentSelectionChip({
  pageSelectionPath,
  blockSelectionSlug,
  primitiveSelectionId,
}: {
  pageSelectionPath?: string
  blockSelectionSlug?: string
  primitiveSelectionId?: string
}) {
  const activePages = useAgentActivePages()
  const activeBlocks = useAgentActiveBlocks()
  const activePrimitives = useAgentActivePrimitives()
  const siteWide = useSiteWideActivity()

  const isPageActive = pageSelectionPath !== undefined && activePages.has(pageSelectionPath)
  const isBlockActive = blockSelectionSlug !== undefined && activeBlocks.has(blockSelectionSlug)
  const isPrimitiveActive =
    primitiveSelectionId !== undefined && activePrimitives.has(primitiveSelectionId)

  // Build the label. Selection-specific signal wins over site-wide.
  let label: string | undefined
  if (isPageActive) label = pageFileLabel(pageSelectionPath!)
  else if (isBlockActive) label = `${blockSelectionSlug!}.tsx`
  else if (isPrimitiveActive) label = `${primitiveSelectionId!}.tsx`
  else if (activePages.size > 0) label = pageFileLabel(firstSetEntry(activePages))
  else if (activeBlocks.size > 0) label = `${firstSetEntry(activeBlocks)}.tsx`
  else if (activePrimitives.size > 0) label = `${firstSetEntry(activePrimitives)}.tsx`
  else if (siteWide.active && siteWide.recentBasename !== undefined) label = siteWide.recentBasename

  return (
    <>
      <style>{`@keyframes forkshop-agent-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
      {label !== undefined && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2">
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 shadow-md"
            style={{ background: "oklch(0.62 0.22 280)", color: "white" }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-white"
              style={{ animation: "forkshop-agent-pulse 1.2s infinite" }}
            />
            <span className="text-xs font-semibold tracking-tight">Claude · {label}</span>
          </div>
        </div>
      )}
    </>
  )
}

function pageFileLabel(path: string): string {
  if (path === "/") return "page.tsx"
  const segments = path.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? "page"
  return `${last}/page.tsx`
}

function firstSetEntry<T>(set: ReadonlySet<T>): T {
  const iter = set.values().next()
  return iter.value as T
}
