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
  blockSlugs: readonly string[]
  projectRoot: string
  // Page paths the agent has touched during this session. Sticky — never
  // pruned, so a newly-created page stays in the sidebar even after the 5s
  // activity window closes (until full reload picks it up from disk).
  seenPagePaths: ReadonlySet<string>
}

const Context = createContext<AgentActivityValue>({
  entries: [],
  blockSlugs: [],
  projectRoot: "",
  seenPagePaths: new Set(),
})

const STALE_MS = 5500

export function AgentActivityProvider({
  blockSlugs,
  projectRoot,
  children,
}: {
  blockSlugs: readonly string[]
  projectRoot: string
  children: ReactNode
}) {
  const [entries, setEntries] = useState<readonly ActivityEntry[]>([])
  const [seenPagePaths, setSeenPagePaths] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    // Live AI awareness SSE subscription wired in a separate spec.
    // The endpoint at /api/forkshop/agent-activity/stream is a no-op until then.
    return
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
  // pages stay in the sidebar after the 5s activity window closes.
  useEffect(() => {
    if (entries.length === 0) return
    setSeenPagePaths((current) => {
      let next: Set<string> | undefined
      for (const entry of entries) {
        const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
        if (selection !== undefined && selection !== "site-wide" && selection.kind === "page") {
          if (!current.has(selection.path)) {
            if (next === undefined) next = new Set(current)
            next.add(selection.path)
          }
        }
      }
      return next ?? current
    })
  }, [entries, projectRoot, blockSlugs])

  const value = useMemo<AgentActivityValue>(
    () => ({ entries, blockSlugs, projectRoot, seenPagePaths }),
    [entries, blockSlugs, projectRoot, seenPagePaths],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

function useAgentActivity(): AgentActivityValue {
  return useContext(Context)
}

// Sticky set of every page path Claude has touched during this session.
// Sidebar uses it (minus the already-known server-side routes) to surface
// newly-created pages mid-build.
export function useAgentSeenPagePaths(): ReadonlySet<string> {
  return useAgentActivity().seenPagePaths
}

export function useAgentActivePages(): ReadonlySet<string> {
  const { entries, blockSlugs, projectRoot } = useAgentActivity()
  return useMemo(() => {
    const pages = new Set<string>()
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
      if (selection && selection !== "site-wide" && selection.kind === "page") {
        pages.add(selection.path)
      }
    }
    return pages
  }, [entries, blockSlugs, projectRoot])
}

export function useAgentActiveBlocks(): ReadonlySet<string> {
  const { entries, blockSlugs, projectRoot } = useAgentActivity()
  return useMemo(() => {
    const blocks = new Set<string>()
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
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
  }, [entries, blockSlugs, projectRoot])
}

// True when the given page is being edited AND no specific block could be
// identified from the edit substrings. Used by the iframe relay to decide
// whether to fall back to the diffuse "all blocks softly pulse" treatment.
// When a specific block IS identified, the tier-2 outline on that single
// block is enough — we don't want every block competing for attention.
export function usePageActiveFallback(pagePath: string | undefined): boolean {
  const { entries, blockSlugs, projectRoot } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return false
    let pageHit = false
    let anyBlockIdentified = false
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
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
  }, [entries, blockSlugs, projectRoot, pagePath])
}

export function useIsNavigationActive(): boolean {
  const { entries, blockSlugs, projectRoot } = useAgentActivity()
  return useMemo(
    () =>
      entries.some((entry) => {
        const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
        return (
          selection !== undefined &&
          selection !== "site-wide" &&
          selection.kind === "section" &&
          selection.sectionId === "navigation"
        )
      }),
    [entries, blockSlugs, projectRoot],
  )
}

export function useSiteWideActivity(): {
  active: boolean
  recentBasename: string | undefined
} {
  const { entries, blockSlugs, projectRoot } = useAgentActivity()
  return useMemo(() => {
    let recentBasename: string | undefined
    let mostRecent = 0
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
      if (selection === "site-wide" && entry.lastSeenAt > mostRecent) {
        recentBasename = entry.filePath.split("/").pop()
        mostRecent = entry.lastSeenAt
      }
    }
    return { active: recentBasename !== undefined, recentBasename }
  }, [entries, blockSlugs, projectRoot])
}

export function useAgentSubstringsForPage(
  pagePath: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, blockSlugs, projectRoot } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return []
    const result: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
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
  }, [entries, blockSlugs, projectRoot, pagePath])
}

export function useAgentSubstringsForBlock(
  slug: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, blockSlugs, projectRoot } = useAgentActivity()
  return useMemo(() => {
    if (slug === undefined) return []
    const result: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      const selection = fileToSelection(entry.filePath, projectRoot, blockSlugs)
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
  }, [entries, blockSlugs, projectRoot, slug])
}
