"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@forkshop/lib/cn";
import { ForkshopIcon, type ForkshopIconComponent } from "@forkshop/components/icon";
import { forkshopIcons } from "@forkshop/lib/icons";
import { buildPageTree, type PageTreeNode } from "@forkshop/components/sidebar/page-tree";
import { HelpModal } from "@forkshop/components/sidebar/help-modal";
import {
  useAgentSeenPagePaths,
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
} from "@forkshop/components/agent-activity-context";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ForkshopSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "page"; path: string }
  | { kind: "block"; slug: string }
  | { kind: "primitive"; id: string };

/**
 * A single entry in a custom sidebar section (e.g. a block, a design token
 * group, a navigation canvas, …).
 */
export type SidebarEntry = {
  /** Unique identifier used in ForkshopSelection.slug */
  slug: string;
  /** Human-readable label */
  name: string;
  /** Optional icon component (Central Icons or custom) */
  icon?: ForkshopIconComponent;
};

/**
 * A top-level section in the Design part of the sidebar.
 * Sections are rendered above the Pages tree.
 */
export type SidebarSection = {
  /** Unique id, e.g. "blocks", "navigation" — maps to ForkshopSelection.kind */
  id: string;
  /** Human-readable section title */
  title: string;
  /**
   * Child entries. When non-empty the section row becomes collapsible and
   * clicking an entry produces a selection of the section's `entryKind`
   * (default `"block"`).
   */
  entries?: SidebarEntry[];
  /** Optional icon for the section row itself */
  icon?: ForkshopIconComponent;
  /**
   * Selection kind emitted when an entry under this section is clicked.
   * Defaults to "block".
   */
  entryKind?: "block" | "primitive";
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ForkshopSidebar({
  selection,
  onSelect,
  sections = [],
  routes,
  otherRoutes = [],
  titleOverrides = new Map(),
}: {
  selection: ForkshopSelection;
  onSelect: (next: ForkshopSelection) => void;
  /** Design sections rendered above the Pages tree */
  sections?: SidebarSection[];
  /** Primary page routes (e.g. from your Next.js app) */
  routes: readonly string[];
  /** Secondary page routes shown in the "Other" section */
  otherRoutes?: readonly string[];
  /** Optional title overrides keyed by route path */
  titleOverrides?: ReadonlyMap<string, string>;
}) {
  // Agent edits to a file outside `routes` add that path to seenPagePaths.
  // We extend the tree silently — new entries render identically to configured
  // routes (no pill, no badge). The user can click them like any other entry.
  // Sticky for the React-component lifetime; clears on browser reload.
  const seenPagePaths = useAgentSeenPagePaths();
  const newPagePaths = useMemo(() => {
    if (seenPagePaths.size === 0) return new Set<string>();
    const known = new Set([...routes, ...otherRoutes]);
    const result = new Set<string>();
    for (const path of seenPagePaths) if (!known.has(path)) result.add(path);
    return result;
  }, [seenPagePaths, routes, otherRoutes]);
  const extendedRoutes = useMemo(
    () => (newPagePaths.size === 0 ? routes : [...routes, ...newPagePaths]),
    [routes, newPagePaths],
  );
  const tree = useMemo(
    () => buildPageTree(extendedRoutes, titleOverrides),
    [extendedRoutes, titleOverrides],
  );
  const otherTree = useMemo(
    () => buildPageTree(otherRoutes, titleOverrides),
    [otherRoutes, titleOverrides],
  );

  // Track expanded state per-section (keyed by section.id)
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [helpOpen, setHelpOpen] = useState(false);

  const activePages = useAgentActivePages();
  const activeBlocks = useAgentActiveBlocks();
  const activePrimitives = useAgentActivePrimitives();

  // Auto-expand a section when the active selection is one of its entries.
  useEffect(() => {
    for (const section of sections) {
      const entryKind = section.entryKind ?? "block";
      const isMatch =
        entryKind === "block"
          ? selection.kind === "block" && section.entries?.some((e) => e.slug === selection.slug)
          : selection.kind === "primitive" && section.entries?.some((e) => e.slug === selection.id);
      if (isMatch) {
        setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
      }
    }
  }, [selection, sections]);

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-forkshop-border bg-forkshop-surface font-forkshop-sans">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-forkshop-1.5 border-b border-forkshop-border bg-forkshop-surface px-forkshop-3 pb-forkshop-2 pt-forkshop-2.5">
        <div className="flex items-center gap-forkshop-1.5">
          <span className="text-forkshop-sm font-forkshop-semibold tracking-forkshop-tight text-forkshop-fg">
            Forkshop
          </span>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="rounded-forkshop-sm p-forkshop-2 text-forkshop-fg-muted transition-colors hover:bg-forkshop-surface-2 hover:text-forkshop-fg"
          aria-label="How to use forkshop"
          title="How to use forkshop"
        >
          <ForkshopIcon icon={forkshopIcons.info} className="size-forkshop-4" />
        </button>
        <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-forkshop-1 overflow-y-auto px-forkshop-2 pb-forkshop-2">
        {/* Design sections */}
        {sections.length > 0 && (
          <>
            <SectionHeader>Design</SectionHeader>
            {sections.map((section) => {
              const isExpanded = expandedSections[section.id] ?? false;
              const entriesSorted: SidebarEntry[] = section.entries
                ? [...section.entries].sort(
                    (a: SidebarEntry, b: SidebarEntry) =>
                      a.name.localeCompare(b.name),
                  )
                : [];
              const hasChildren = entriesSorted.length > 0;
              const entryKind = section.entryKind ?? "block";
              return (
                <div key={section.id}>
                  <SidebarRow
                    label={section.title}
                    depth={1}
                    icon={section.icon}
                    active={
                      selection.kind === "section" &&
                      selection.sectionId === section.id
                    }
                    agentActive={false}
                    hasChildren={hasChildren}
                    expanded={isExpanded}
                    onClick={() => {
                      onSelect({ kind: "section", sectionId: section.id });
                      if (hasChildren) {
                        setExpandedSections((prev) => ({
                          ...prev,
                          [section.id]: true,
                        }));
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
                        active={
                          entryKind === "block"
                            ? selection.kind === "block" && selection.slug === entry.slug
                            : selection.kind === "primitive" && selection.id === entry.slug
                        }
                        agentActive={activeBlocks.has(entry.slug) || activePrimitives.has(entry.slug)}
                        agentFileLabel={`${entry.slug}.tsx`}
                        onClick={() =>
                          onSelect(
                            entryKind === "block"
                              ? { kind: "block", slug: entry.slug }
                              : { kind: "primitive", id: entry.slug },
                          )
                        }
                      />
                    ))}
                </div>
              );
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
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Internal primitives
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="mt-forkshop-2 shrink-0 px-forkshop-1 pb-forkshop-2 text-forkshop-4xs font-forkshop-medium uppercase tracking-forkshop-wider text-forkshop-fg-muted">
      {children}
    </div>
  );
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
  onClick,
  onToggleExpand,
}: {
  label: string;
  depth: number;
  icon?: ForkshopIconComponent;
  active: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  draft?: boolean;
  agentActive?: boolean;
  agentFileLabel?: string;
  onClick: () => void;
  onToggleExpand?: () => void;
}) {
  return (
    <div className="shrink-0">
      <div
        className={cn(
          "flex items-center rounded-forkshop-md text-forkshop-xs",
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
            className="mr-forkshop-1 flex size-forkshop-4 items-center justify-center text-current opacity-70 hover:opacity-100"
          >
            {expanded ? (
              <ForkshopIcon icon={forkshopIcons.chevronDown} className="size-forkshop-4" />
            ) : (
              <ForkshopIcon icon={forkshopIcons.chevronRight} className="size-forkshop-4" />
            )}
          </button>
        ) : (
          <span className="mr-forkshop-1 size-forkshop-4" />
        )}
        {/* icon column */}
        <span className="mr-forkshop-1.5 flex size-forkshop-3.5 shrink-0 items-center justify-center text-current opacity-60">
          {Icon && <Icon className="size-full" />}
        </span>
        {agentActive && (
          <span
            aria-hidden="true"
            className="mr-forkshop-1 inline-block size-forkshop-1.5 shrink-0 rounded-forkshop-full bg-forkshop-accent"
            style={{ animation: "forkshop-agent-pulse 1.2s infinite" }}
          />
        )}
        {/* label */}
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 truncate py-forkshop-2 pr-forkshop-1 text-left"
        >
          {label}
        </button>
        {agentActive && agentFileLabel !== undefined && (
          <span className="mr-forkshop-1 shrink-0 truncate text-forkshop-5xs text-forkshop-accent">
            {agentFileLabel}
          </span>
        )}
        {draft && (
          <span className="mr-forkshop-2 shrink-0 rounded-forkshop-lg bg-forkshop-surface-2 px-forkshop-1 py-forkshop-px text-forkshop-5xs font-forkshop-medium uppercase tracking-forkshop-wider text-forkshop-fg-muted">
            Draft
          </span>
        )}
      </div>
    </div>
  );
}

function subtreeContainsPath(node: PageTreeNode, path: string): boolean {
  for (const child of node.children) {
    if (child.path === path) return true;
    if (subtreeContainsPath(child, path)) return true;
  }
  return false;
}

function PageTreeRow({
  node,
  depth,
  selection,
  onSelect,
  activePages,
}: {
  node: PageTreeNode;
  depth: number;
  selection: ForkshopSelection;
  onSelect: (next: ForkshopSelection) => void;
  activePages: ReadonlySet<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const active = selection.kind === "page" && selection.path === node.path;
  const agentActive = node.isRoute && activePages.has(node.path);
  const agentFileLabel = agentActive ? pageFileLabel(node.path) : undefined;

  // When the active page lives inside this row's subtree, expand so the
  // active row is visible — covers drill-ins from sitemap/flow canvases.
  useEffect(() => {
    if (
      hasChildren &&
      selection.kind === "page" &&
      subtreeContainsPath(node, selection.path)
    ) {
      setExpanded(true);
    }
  }, [hasChildren, selection, node]);

  return (
    <>
      <SidebarRow
        label={node.label}
        depth={depth}
        icon={forkshopIcons.page}
        active={active}
        hasChildren={hasChildren}
        expanded={expanded}
        // TODO: deferred — isDraft (Task 13 / Ravineo-specific drafts.ts)
        draft={false}
        agentActive={agentActive}
        agentFileLabel={agentFileLabel}
        onClick={() => {
          if (node.isRoute) {
            onSelect({ kind: "page", path: node.path });
            if (hasChildren) setExpanded(true);
          } else {
            setExpanded((current) => !current);
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
            />
          ))}
        </>
      )}
    </>
  );
}

function rowVariant(agentActive: boolean, active: boolean): string {
  if (agentActive)
    return "bg-forkshop-accent/10 text-forkshop-accent hover:bg-forkshop-accent/20";
  if (active) return "bg-forkshop-surface-2 font-semibold text-forkshop-fg";
  return "text-forkshop-fg-muted hover:bg-forkshop-surface-2 hover:text-forkshop-fg";
}

function pageFileLabel(path: string): string {
  if (path === "/") return "page.tsx";
  const segments = path.split("/");
  // findLast is ES2023 — use reverse-filter instead for ES2022 compat
  const nonEmpty = segments.filter((part) => part.length > 0);
  const segment = nonEmpty[nonEmpty.length - 1] ?? "page";
  return `${segment}/page.tsx`;
}
