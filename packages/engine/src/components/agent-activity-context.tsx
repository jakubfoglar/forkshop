"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { fileToSelection } from "@forkshop/lib/file-to-selection"

// PascalCase → kebab-case: "HeroDisplay" → "hero-display".
// Used to map a block slug to the component name Claude would write in a
// page's JSX (e.g. <HeroDisplay …/>).
function slugToComponentName(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ""))
    .join("")
}

// Scan a TSX substring (Edit tool's old_string/new_string) for usages of known
// block components. Returns the slugs whose component appears as <Name … />,
// <Name>, or </Name>. Empty when the substring has no recognisable block tags
// (e.g. Claude touched only className or non-JSX code).
export function deriveAffectedBlocks(
  substring: string | undefined,
  blockSlugs: readonly string[],
): string[] {
  if (substring === undefined || substring.length === 0) return []
  const matched: string[] = []
  for (const slug of blockSlugs) {
    const component = slugToComponentName(slug)
    // \b before <Name, then must be followed by whitespace, >, /, or end —
    // avoids matching prefixes like <Heroic when looking for <Hero.
    const pattern = new RegExp(`<${component}(?:\\s|/|>|$)|</${component}>`)
    if (pattern.test(substring)) matched.push(slug)
  }
  return matched
}

export type ActivityEntry = {
  filePath: string
  oldString?: string
  newString?: string
  lastSeenAt: number
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
  children,
}: {
  fileMap: FileMap
  children: ReactNode
}) {
  const [entries, setEntries] = useState<readonly ActivityEntry[]>([])
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

  // Accumulate page paths the agent has touched — sticky so newly-created
  // pages stay surfaced after the 5s activity window closes. The sidebar reads
  // this set via `useAgentSeenPagePaths` to extend its routes list silently;
  // entries surfaced this way render identically to configured routes (no pill,
  // no badge). Sticky across the React-component lifetime, clears on reload.
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

  return <Context.Provider value={value}>{children}</Context.Provider>
}

function useAgentActivity(): AgentActivityValue {
  return useContext(Context)
}

// Sticky set of every page path Claude has touched during this session.
// Sidebar uses it (minus the already-known server-side routes) to surface
// newly-created pages mid-build as silent synthetic entries.
export function useAgentSeenPagePaths(): ReadonlySet<string> {
  return useAgentActivity().seenPagePaths
}

export function useAgentActivePages(): ReadonlySet<string> {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    const pages = new Set<string>()
    for (const entry of entries) {
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
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === undefined || selection === "site-wide") continue
      if (selection.kind === "block") {
        blocks.add(selection.slug)
        continue
      }
      // For page edits, infer affected blocks by scanning the substring for
      // <ComponentName> usages — Claude touching `<Hero …/>` flags Hero.
      if (selection.kind === "page") {
        for (const slug of deriveAffectedBlocks(entry.oldString, blockSlugs)) blocks.add(slug)
        for (const slug of deriveAffectedBlocks(entry.newString, blockSlugs)) blocks.add(slug)
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
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection && selection !== "site-wide" && selection.kind === "primitive") {
        primitives.add(selection.id)
      }
    }
    return primitives
  }, [entries, fileMap])
}

// True when the given page is being edited AND no specific block could be
// identified from the edit substrings. Used by the iframe relay to decide
// whether to fall back to the diffuse "all blocks softly pulse" treatment.
// When a specific block IS identified, the tier-2 outline on that single
// block is enough — we don't want every block competing for attention.
export function usePageActiveFallback(pagePath: string | undefined): boolean {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return false
    const blockSlugs = fileMap.blocks.map((b) => b.slug)
    let pageHit = false
    let anyBlockIdentified = false
    for (const entry of entries) {
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
      if (
        deriveAffectedBlocks(entry.oldString, blockSlugs).length > 0 ||
        deriveAffectedBlocks(entry.newString, blockSlugs).length > 0
      ) {
        anyBlockIdentified = true
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
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === "site-wide" && entry.lastSeenAt > mostRecent) {
        recentBasename = entry.filePath.split("/").pop()
        mostRecent = entry.lastSeenAt
      }
    }
    return { active: recentBasename !== undefined, recentBasename }
  }, [entries, fileMap])
}

// Monotonic epoch (lastSeenAt of the most recent matching entry) for the given
// iframe identity. Bumps each time an edit lands for a file mapping to that
// page or block. Consumers (ResponsiveFrameView) treat each bump as a signal
// to reload the iframe — Next.js Fast Refresh doesn't propagate into the
// iframe documents reliably in Forkshop's nested setup, so we force a fresh
// load instead.
export function useAgentEditEpoch(
  identity: { kind: "page"; path: string } | { kind: "block"; slug: string } | undefined,
): number {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (identity === undefined) return 0
    let max = 0
    for (const entry of entries) {
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

export function useAgentSubstringsForPage(
  pagePath: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return []
    const result: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection &&
        selection !== "site-wide" &&
        selection.kind === "page" &&
        selection.path === pagePath
      ) {
        result.push({ oldString: entry.oldString, newString: entry.newString })
      }
    }
    return result
  }, [entries, fileMap, pagePath])
}

export function useAgentSubstringsForBlock(
  slug: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (slug === undefined) return []
    const result: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection &&
        selection !== "site-wide" &&
        selection.kind === "block" &&
        selection.slug === slug
      ) {
        result.push({ oldString: entry.oldString, newString: entry.newString })
      }
    }
    return result
  }, [entries, fileMap, slug])
}

// All substrings from currently-active entries, regardless of which page or
// block they belong to. The relay broadcasts this set to every iframe; each
// iframe's text-walker filters by what actually appears in its own DOM, which
// is a more reliable filter than selection-state matching.
export function useAllAgentSubstrings(): readonly {
  oldString?: string
  newString?: string
}[] {
  const { entries } = useAgentActivity()
  return useMemo(() => {
    const result: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      if (entry.oldString !== undefined || entry.newString !== undefined) {
        result.push({ oldString: entry.oldString, newString: entry.newString })
      }
    }
    return result
  }, [entries])
}
