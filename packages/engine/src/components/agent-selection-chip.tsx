"use client"

import { useMemo } from "react"
import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
  useAgentActivityEntries,
  useSiteWideActivity,
} from "@forkshop/components/agent-activity-context"

export type ChipInput = {
  agentLabel: string
  sessionId: string
  color: string
  fileLabel: string | undefined
  ts: number
}

// Pure: collapse to one chip per (agentLabel, sessionId), sort by ts desc,
// cap at maxVisible, count overflow. Exported for unit tests.
export function deriveChipStack(
  inputs: readonly ChipInput[],
  maxVisible: number,
): { chips: ChipInput[]; overflow: number } {
  const bySession = new Map<string, ChipInput>()
  for (const input of inputs) {
    const key = `${input.agentLabel}/${input.sessionId}`
    const prev = bySession.get(key)
    if (prev === undefined || input.ts > prev.ts) bySession.set(key, input)
  }
  const sorted = [...bySession.values()].sort((a, b) => b.ts - a.ts)
  const chips = sorted.slice(0, maxVisible)
  const overflow = Math.max(0, sorted.length - maxVisible)
  return { chips, overflow }
}

// Selection-aware chip stack. Each chip names the agent + the file (label
// preferred from selection match; falls back to site-wide basename).
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
  const inputs = useChipInputs({
    pageSelectionPath,
    blockSelectionSlug,
    primitiveSelectionId,
    activePages,
    activeBlocks,
    activePrimitives,
    siteWide,
  })

  const { chips, overflow } = useMemo(() => deriveChipStack(inputs, 3), [inputs])

  if (chips.length === 0) return null

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes forkshop-agent-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
        }
      `}</style>
      <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 flex items-center gap-1.5">
        {chips.map((chip) => (
          <div
            key={`${chip.agentLabel}-${chip.sessionId}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 shadow-md"
            style={{ background: chip.color, color: "white" }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-white"
              style={{ animation: "forkshop-agent-pulse 1.2s infinite" }}
            />
            <span className="text-xs font-semibold tracking-tight">
              {chip.agentLabel}
              {chip.fileLabel !== undefined ? ` · ${chip.fileLabel}` : ""}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="rounded-full px-2 py-1 text-xs font-semibold text-white shadow-md"
            style={{ background: "oklch(0.5 0.05 250)" }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </>
  )
}

function useChipInputs(_args: {
  pageSelectionPath?: string
  blockSelectionSlug?: string
  primitiveSelectionId?: string
  activePages: ReadonlySet<string>
  activeBlocks: ReadonlySet<string>
  activePrimitives: ReadonlySet<string>
  siteWide: { active: boolean; recentBasename?: string }
}): ChipInput[] {
  const entries = useAgentActivityEntries()
  return useMemo(() => {
    const result: ChipInput[] = []
    for (const entry of entries) {
      result.push({
        agentLabel: entry.agentLabel,
        sessionId: entry.sessionId,
        color: entry.color,
        fileLabel: deriveFileLabel(entry.filePath),
        ts: entry.lastSeenAt,
      })
    }
    return result
  }, [entries])
}

// page.tsx files always get parent+basename ("auth/page.tsx") so the user can
// tell which route. Everything else uses the bare basename.
function deriveFileLabel(filePath: string): string {
  if (filePath.endsWith("page.tsx")) {
    return filePath.split("/").slice(-2).join("/")
  }
  return filePath.split("/").pop() ?? filePath
}
