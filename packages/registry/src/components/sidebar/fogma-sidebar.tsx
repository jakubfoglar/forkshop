"use client"

import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react"
import { NavArrowDown, NavArrowRight, InfoCircle, Page } from "iconoir-react"
import { cn } from "../../lib/cn.js"
import { buildPageTree, type PageTreeNode } from "./page-tree.js"
import { HelpModal } from "./help-modal.js"

// TODO: deferred — agent-activity-state (Task 13). These hooks will be
// wired up once the agent-activity context shell is ported.
function useAgentSeenPagePaths(): ReadonlySet<string> {
  return new Set()
}
function useAgentActivePages(): ReadonlySet<string> {
  return new Set()
}
function useAgentActiveBlocks(): ReadonlySet<string> {
  return new Set()
}
function useIsNavigationActive(): boolean {
  return false
}

type IconoirComponent = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FogmaSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "page"; path: string }
  | { kind: "block"; slug: string }

/**
 * A single entry in a custom sidebar section (e.g. a block, a design token
 * group, a navigation canvas, …).
 */
export type SidebarEntry = {
  /** Unique identifier used in FogmaSelection.slug */
  slug: string
  /** Human-readable label */
  name: string
  /** Optional icon component (Iconoir or custom) */
  icon?: IconoirComponent
}

/**
 * A top-level section in the Design part of the sidebar.
 * Sections are rendered above the Pages tree.
 */
export type SidebarSection = {
  /** Unique id, e.g. "blocks", "navigation" — maps to FogmaSelection.kind */
  id: string
  /** Human-readable section title */
  title: string
  /**
   * Child entries. When non-empty the section row becomes collapsible and
   * clicking an entry produces `{ kind: "block", slug: entry.slug }`.
   */
  entries?: SidebarEntry[]
  /** Optional icon for the section row itself */
  icon?: IconoirComponent
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FogmaSidebar({
  selection,
  onSelect,
  sections = [],
  routes,
  otherRoutes = [],
  titleOverrides = new Map(),
}: {
  selection: FogmaSelection
  onSelect: (next: FogmaSelection) => void
  /** Design sections rendered above the Pages tree */
  sections?: SidebarSection[]
  /** Primary page routes (e.g. from your Next.js app) */
  routes: readonly string[]
  /** Secondary page routes shown in the "Other" section */
  otherRoutes?: readonly string[]
  /** Optional title overrides keyed by route path */
  titleOverrides?: ReadonlyMap<string, string>
}) {
  const seenPagePaths = useAgentSeenPagePaths()
  const newPagePaths = useMemo(() => {
    if (seenPagePaths.size === 0) return new Set<string>()
    const known = new Set([...routes, ...otherRoutes])
    const result = new Set<string>()
    for (const path of seenPagePaths) if (!known.has(path)) result.add(path)
    return result
  }, [seenPagePaths, routes, otherRoutes])
  const extendedRoutes = useMemo(
    () => (newPagePaths.size === 0 ? routes : [...routes, ...newPagePaths]),
    [routes, newPagePaths],
  )
  const tree = useMemo(
    () => buildPageTree(extendedRoutes, titleOverrides),
    [extendedRoutes, titleOverrides],
  )
  const otherTree = useMemo(
    () => buildPageTree(otherRoutes, titleOverrides),
    [otherRoutes, titleOverrides],
  )

  // Track expanded state per-section (keyed by section.id)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [helpOpen, setHelpOpen] = useState(false)

  const activePages = useAgentActivePages()
  const activeBlocks = useAgentActiveBlocks()
  const navigationActive = useIsNavigationActive()

  // Auto-expand a section when the active selection is one of its entries.
  useEffect(() => {
    if (selection.kind === "block") {
      for (const section of sections) {
        if (section.entries?.some((e) => e.slug === selection.slug)) {
          setExpandedSections((prev) => ({ ...prev, [section.id]: true }))
        }
      }
    }
  }, [selection, sections])

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-fogma-border bg-fogma-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-fogma-border bg-fogma-surface px-3 pb-2 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold tracking-tight text-fogma-fg">Fogma</span>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="rounded-lg p-2 text-fogma-fg-muted transition-colors hover:bg-fogma-surface-2 hover:text-fogma-fg"
          aria-label="How to use fogma"
          title="How to use fogma"
        >
          <InfoCircle className="size-4" strokeWidth={2} />
        </button>
        <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
        {/* Design sections */}
        {sections.length > 0 && (
          <>
            <SectionHeader>Design</SectionHeader>
            {sections.map((section) => {
              const isExpanded = expandedSections[section.id] ?? false
              const entriesSorted: SidebarEntry[] = section.entries
                ? [...section.entries].sort((a: SidebarEntry, b: SidebarEntry) =>
                    a.name.localeCompare(b.name),
                  )
                : []
              const hasChildren = entriesSorted.length > 0
              // Determine agent activity for "navigation"-kind sections
              const sectionAgentActive =
                section.id === "navigation" ? navigationActive : false

              return (
                <div key={section.id}>
                  <SidebarRow
                    label={section.title}
                    depth={1}
                    icon={section.icon}
                    active={selection.kind === "section" && selection.sectionId === section.id}
                    agentActive={sectionAgentActive}
                    hasChildren={hasChildren}
                    expanded={isExpanded}
                    onClick={() => {
                      onSelect({ kind: "section", sectionId: section.id })
                      if (hasChildren) {
                        setExpandedSections((prev) => ({ ...prev, [section.id]: true }))
                      }
                    }}
                    onToggleExpand={
                      hasChildren
                        ? () =>
                            setExpandedSections((prev) => ({
                              ...prev,
                              [section.id]: !prev[section.id],
                            }))
                        : undefined
                    }
                  />
                  {hasChildren &&
                    isExpanded &&
                    entriesSorted.map((entry) => (
                      <SidebarRow
                        key={entry.slug}
                        label={entry.name}
                        depth={2}
                        icon={entry.icon}
                        active={selection.kind === "block" && selection.slug === entry.slug}
                        agentActive={activeBlocks.has(entry.slug)}
                        agentFileLabel={`${entry.slug}.tsx`}
                        onClick={() => onSelect({ kind: "block", slug: entry.slug })}
                      />
                    ))}
                </div>
              )
            })}
          </>
        )}

        {/* Pages section */}
        <SectionHeader>Pages</SectionHeader>
        {tree.map((node) => (
          <PageTreeRow
            key={node.path}
            node={node}
            depth={1}
            selection={selection}
            onSelect={onSelect}
            activePages={activePages}
            newPagePaths={newPagePaths}
          />
        ))}

        {/* Other section (only rendered when otherRoutes are provided) */}
        {otherTree.length > 0 && (
          <>
            <SectionHeader>Other</SectionHeader>
            {otherTree.map((node) => (
              <PageTreeRow
                key={node.path}
                node={node}
                depth={1}
                selection={selection}
                onSelect={onSelect}
                activePages={activePages}
                newPagePaths={newPagePaths}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Internal primitives
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="mt-2 shrink-0 px-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-fogma-fg-muted">
      {children}
    </div>
  )
}

function SidebarRow({
  label,
  depth,
  icon: Icon,
  active,
  hasChildren = false,
  expanded = false,
  draft = false,
  agentActive = false,
  agentFileLabel,
  isNew = false,
  onClick,
  onToggleExpand,
}: {
  label: string
  depth: number
  icon?: IconoirComponent
  active: boolean
  hasChildren?: boolean
  expanded?: boolean
  draft?: boolean
  agentActive?: boolean
  agentFileLabel?: string
  isNew?: boolean
  onClick: () => void
  onToggleExpand?: () => void
}) {
  return (
    <div className="shrink-0">
      <div
        className={cn(
          "flex items-center rounded py-2 text-xs",
          rowVariant(agentActive, active),
        )}
        style={{ paddingLeft: `${Math.max(0, depth - 1) * 0.75}rem` }}
      >
        {/* chevron column */}
        {hasChildren && onToggleExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="mr-1 flex size-4 items-center justify-center text-current opacity-70 hover:opacity-100"
          >
            {expanded ? (
              <NavArrowDown className="size-4" strokeWidth={2} />
            ) : (
              <NavArrowRight className="size-4" strokeWidth={2} />
            )}
          </button>
        ) : (
          <span className="mr-1 size-4" />
        )}
        {/* icon column */}
        <span className="mr-1.5 flex size-3.5 shrink-0 items-center justify-center text-current opacity-60">
          {Icon && <Icon className="size-full" strokeWidth={2} />}
        </span>
        {agentActive && (
          <span
            aria-hidden="true"
            className="mr-1 inline-block size-1.5 shrink-0 rounded-full bg-fogma-accent"
            style={{ animation: "fogma-agent-pulse 1.2s infinite" }}
          />
        )}
        {/* label */}
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 truncate py-2 pr-1 text-left"
        >
          {label}
        </button>
        {agentActive && agentFileLabel !== undefined && (
          <span className="mr-1 shrink-0 truncate text-[9px] text-fogma-accent">
            {agentFileLabel}
          </span>
        )}
        {isNew && (
          <span
            className="mr-1 shrink-0 rounded-lg px-1 py-[1px] text-[9px] font-medium uppercase tracking-wider"
            style={{ background: "oklch(0.62 0.22 280)", color: "white" }}
          >
            New
          </span>
        )}
        {draft && (
          <span className="mr-2 shrink-0 rounded-lg bg-fogma-surface-2 px-1 py-[1px] text-[9px] font-medium uppercase tracking-wider text-fogma-fg-muted">
            Draft
          </span>
        )}
      </div>
    </div>
  )
}

function subtreeContainsPath(node: PageTreeNode, path: string): boolean {
  for (const child of node.children) {
    if (child.path === path) return true
    if (subtreeContainsPath(child, path)) return true
  }
  return false
}

function PageTreeRow({
  node,
  depth,
  selection,
  onSelect,
  activePages,
  newPagePaths,
}: {
  node: PageTreeNode
  depth: number
  selection: FogmaSelection
  onSelect: (next: FogmaSelection) => void
  activePages: ReadonlySet<string>
  newPagePaths: ReadonlySet<string>
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children.length > 0
  const active = selection.kind === "page" && selection.path === node.path
  const agentActive = node.isRoute && activePages.has(node.path)
  const agentFileLabel = agentActive ? pageFileLabel(node.path) : undefined
  const isNew = node.isRoute && newPagePaths.has(node.path)

  // When the active page lives inside this row's subtree, expand so the
  // active row is visible — covers drill-ins from sitemap/flow canvases.
  useEffect(() => {
    if (hasChildren && selection.kind === "page" && subtreeContainsPath(node, selection.path)) {
      setExpanded(true)
    }
  }, [hasChildren, selection, node])

  return (
    <>
      <SidebarRow
        label={node.label}
        depth={depth}
        icon={Page}
        active={active}
        hasChildren={hasChildren}
        expanded={expanded}
        // TODO: deferred — isDraft (Task 13 / Ravineo-specific drafts.ts)
        draft={false}
        agentActive={agentActive}
        agentFileLabel={agentFileLabel}
        isNew={isNew}
        onClick={() => {
          if (node.isRoute) {
            onSelect({ kind: "page", path: node.path })
            if (hasChildren) setExpanded(true)
          } else {
            setExpanded((current) => !current)
          }
        }}
        onToggleExpand={() => setExpanded((current) => !current)}
      />
      {hasChildren && expanded && (
        <>
          {node.children.map((child) => (
            <PageTreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              activePages={activePages}
              newPagePaths={newPagePaths}
            />
          ))}
        </>
      )}
    </>
  )
}

function rowVariant(agentActive: boolean, active: boolean): string {
  if (agentActive) return "bg-fogma-accent/10 text-fogma-accent hover:bg-fogma-accent/20"
  if (active) return "bg-fogma-surface-2 font-semibold text-fogma-fg"
  return "text-fogma-fg-muted hover:bg-fogma-surface-2 hover:text-fogma-fg"
}

function pageFileLabel(path: string): string {
  if (path === "/") return "page.tsx"
  const segments = path.split("/")
  // findLast is ES2023 — use reverse-filter instead for ES2022 compat
  const nonEmpty = segments.filter((part) => part.length > 0)
  const segment = nonEmpty[nonEmpty.length - 1] ?? "page"
  return `${segment}/page.tsx`
}
