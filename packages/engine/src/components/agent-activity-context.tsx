"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Hunk } from "@forkshop/lib/diff-to-hunks"
import type { ActivityEntry, AgentAction } from "@forkshop/lib/agent-activity-state"
import { fileToSelection } from "@forkshop/lib/file-to-selection"
import { IframeRegistryProvider } from "@forkshop/components/iframe-registry"
import { AgentIframeRelay } from "@forkshop/components/agent-iframe-relay"

export type { Hunk, ActivityEntry, AgentAction }

// PascalCase → kebab-case: "HeroDisplay" → "hero-display".
function slugToComponentName(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ""))
    .join("")
}

// Scan a TSX substring (an Edit hunk) for block-component tags. Returns the
// slugs whose component appears as <Name … />, <Name>, or </Name>. Empty when
// the substring has no recognisable block tags.
export function deriveAffectedBlocks(
  substring: string | undefined,
  blockSlugs: readonly string[],
): string[] {
  if (substring === undefined || substring.length === 0) return []
  const matched: string[] = []
  for (const slug of blockSlugs) {
    const component = slugToComponentName(slug)
    const pattern = new RegExp(`<${component}(?:\\s|/|>|$)|</${component}>`)
    if (pattern.test(substring)) matched.push(slug)
  }
  return matched
}

export type FileMap = {
  primitives: ReadonlyArray<{ id: string; sourcePath: string }>
  blocks: ReadonlyArray<{ slug: string; sourcePath: string }>
}

type AgentActivityValue = {
  entries: readonly ActivityEntry[]
  fileMap: FileMap
  seenPagePaths: ReadonlySet<string>
}

const Context = createContext<AgentActivityValue>({
  entries: [],
  fileMap: { primitives: [], blocks: [] },
  seenPagePaths: new Set(),
})

const STALE_MS = 5500

export function AgentActivityProvider({
  fileMap,
  initialActivity,
  children,
}: {
  fileMap: FileMap
  initialActivity?: readonly ActivityEntry[]
  children: ReactNode
}) {
  const [entries, setEntries] = useState<readonly ActivityEntry[]>(
    () => initialActivity ?? [],
  )
  const [seenPagePaths, setSeenPagePaths] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const eventSource = new EventSource("/api/forkshop/agent-activity/stream")
    const handleActivity = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { activeFiles: ActivityEntry[] }
        setEntries(data.activeFiles)
      } catch (error) {
        console.error("[forkshop agent-activity] parse failed:", error)
      }
    }
    eventSource.addEventListener("activity", handleActivity)
    return () => {
      eventSource.removeEventListener("activity", handleActivity)
      eventSource.close()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setEntries((current) =>
        current.length === 0
          ? current
          : current.filter((entry) => now - entry.lastSeenAt < STALE_MS),
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (entries.length === 0) return
    setSeenPagePaths((current) => {
      let next: Set<string> | undefined
      for (const entry of entries) {
        const selection = fileToSelection(entry.filePath, fileMap)
        if (selection !== undefined && selection !== "site-wide" && selection.kind === "page") {
          if (!current.has(selection.path)) {
            if (next === undefined) next = new Set(current)
            next.add(selection.path)
          }
        }
      }
      return next ?? current
    })
  }, [entries, fileMap])

  const value = useMemo<AgentActivityValue>(
    () => ({ entries, fileMap, seenPagePaths }),
    [entries, fileMap, seenPagePaths],
  )

  return (
    <Context.Provider value={value}>
      <IframeRegistryProvider>
        <AgentIframeRelay />
        {children}
      </IframeRegistryProvider>
    </Context.Provider>
  )
}

function useAgentActivity(): AgentActivityValue {
  return useContext(Context)
}

export function useAgentSeenPagePaths(): ReadonlySet<string> {
  return useAgentActivity().seenPagePaths
}

export function useAgentActivityEntries(): readonly ActivityEntry[] {
  return useAgentActivity().entries
}

function isEditish(action: AgentAction): boolean {
  return action === "edit" || action === "create"
}

export function useAgentActivePages(): ReadonlySet<string> {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    const pages = new Set<string>()
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection && selection !== "site-wide" && selection.kind === "page") {
        pages.add(selection.path)
      }
    }
    return pages
  }, [entries, fileMap])
}

export function useAgentActiveBlocks(): ReadonlySet<string> {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    const blocks = new Set<string>()
    const blockSlugs = fileMap.blocks.map((b) => b.slug)
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === undefined || selection === "site-wide") continue
      if (selection.kind === "block") {
        blocks.add(selection.slug)
        continue
      }
      if (selection.kind === "page") {
        for (const hunk of entry.hunks ?? []) {
          for (const slug of deriveAffectedBlocks(hunk.oldString, blockSlugs)) blocks.add(slug)
          for (const slug of deriveAffectedBlocks(hunk.newString, blockSlugs)) blocks.add(slug)
        }
      }
    }
    return blocks
  }, [entries, fileMap])
}

export function useAgentActivePrimitives(): ReadonlySet<string> {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    const primitives = new Set<string>()
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection && selection !== "site-wide" && selection.kind === "primitive") {
        primitives.add(selection.id)
      }
    }
    return primitives
  }, [entries, fileMap])
}

// True when the given page is being edited AND no specific block was identified
// from any of its hunks. Used by the iframe relay to decide whether to fall back
// to the diffuse "all blocks softly pulse" treatment.
export function usePageActiveFallback(pagePath: string | undefined): boolean {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return false
    const blockSlugs = fileMap.blocks.map((b) => b.slug)
    let pageHit = false
    let anyBlockIdentified = false
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection === undefined ||
        selection === "site-wide" ||
        selection.kind !== "page" ||
        selection.path !== pagePath
      ) {
        continue
      }
      pageHit = true
      for (const hunk of entry.hunks ?? []) {
        if (
          deriveAffectedBlocks(hunk.oldString, blockSlugs).length > 0 ||
          deriveAffectedBlocks(hunk.newString, blockSlugs).length > 0
        ) {
          anyBlockIdentified = true
        }
      }
    }
    return pageHit && !anyBlockIdentified
  }, [entries, fileMap, pagePath])
}

export function useSiteWideActivity(): {
  active: boolean
  recentBasename: string | undefined
} {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    let recentBasename: string | undefined
    let mostRecent = 0
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === "site-wide" && entry.lastSeenAt > mostRecent) {
        recentBasename = entry.filePath.split("/").pop()
        mostRecent = entry.lastSeenAt
      }
    }
    return { active: recentBasename !== undefined, recentBasename }
  }, [entries, fileMap])
}

// Monotonic epoch — bumps each time an edit lands for a file mapping to that
// page or block. Consumers (ResponsiveFrameView) reload iframes on bump.
export function useAgentEditEpoch(
  identity: { kind: "page"; path: string } | { kind: "block"; slug: string } | undefined,
): number {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (identity === undefined) return 0
    let max = 0
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === undefined || selection === "site-wide") continue
      const matches =
        (identity.kind === "page" &&
          selection.kind === "page" &&
          selection.path === identity.path) ||
        (identity.kind === "block" &&
          selection.kind === "block" &&
          selection.slug === identity.slug)
      if (matches && entry.lastSeenAt > max) max = entry.lastSeenAt
    }
    return max
  }, [entries, fileMap, identity])
}

// All hunks from currently-active edit-ish entries. The relay broadcasts these
// to every iframe; each iframe's text-walker filters by what actually appears
// in its own DOM.
export function useAllAgentHunks(): readonly Hunk[] {
  const { entries } = useAgentActivity()
  return useMemo(() => {
    const out: Hunk[] = []
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      for (const hunk of entry.hunks ?? []) out.push(hunk)
    }
    return out
  }, [entries])
}

// Per-file resolved color of the most-recent active entry, edit OR read.
// Used by canvas-side decorations to color the outline matching the agent.
export function useAgentColorByFile(): ReadonlyMap<string, string> {
  const { entries } = useAgentActivity()
  return useMemo(() => {
    const out = new Map<string, string>()
    const seen = new Map<string, number>() // filePath → lastSeenAt
    for (const entry of entries) {
      const prevTs = seen.get(entry.filePath) ?? 0
      if (entry.lastSeenAt > prevTs) {
        out.set(entry.filePath, entry.color)
        seen.set(entry.filePath, entry.lastSeenAt)
      }
    }
    return out
  }, [entries])
}

// File paths currently being READ (not edited) plus the agent color to draw.
// Drives the breathing-pulse decoration on iframe-host containers.
export function useAgentReadingByFile(): ReadonlyMap<string, { color: string; agentLabel: string }> {
  const { entries } = useAgentActivity()
  return useMemo(() => {
    const out = new Map<string, { color: string; agentLabel: string }>()
    for (const entry of entries) {
      if (entry.action !== "read") continue
      out.set(entry.filePath, { color: entry.color, agentLabel: entry.agentLabel })
    }
    return out
  }, [entries])
}

// Substring projections (back-compat with existing consumers): pull oldString/
// newString out of hunks. These hooks were public; preserve them as one-version
// projections.
export function useAgentSubstringsForPage(
  pagePath: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return []
    const out: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection &&
        selection !== "site-wide" &&
        selection.kind === "page" &&
        selection.path === pagePath
      ) {
        for (const hunk of entry.hunks ?? []) out.push(hunk)
      }
    }
    return out
  }, [entries, fileMap, pagePath])
}

export function useAgentSubstringsForBlock(
  slug: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (slug === undefined) return []
    const out: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection &&
        selection !== "site-wide" &&
        selection.kind === "block" &&
        selection.slug === slug
      ) {
        for (const hunk of entry.hunks ?? []) out.push(hunk)
      }
    }
    return out
  }, [entries, fileMap, slug])
}
