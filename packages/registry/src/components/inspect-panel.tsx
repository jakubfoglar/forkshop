"use client"

import { useState, type CSSProperties } from "react"
import type { AppliedToken, InspectionResult } from "@fogma/lib/inspect-element"
import type { TokenEntry, TokenRegistry } from "@fogma/lib/token-registry"

const CATEGORY_LABELS: Record<keyof Omit<TokenRegistry, "classLookup">, string> = {
  colors: "Colors",
  spacing: "Spacing",
  fontSizes: "Typography (sizes)",
  fontWeights: "Typography (weights)",
  radii: "Radii",
  shadows: "Shadows",
  containers: "Container widths",
}

export function InspectPanel({
  registry,
  inspection,
  onClose,
}: {
  registry: TokenRegistry
  inspection: InspectionResult | undefined
  onClose: () => void
}) {
  return (
    <aside className="flex w-[340px] flex-col border-l border-fogma-border bg-fogma-surface">
      <div className="flex items-center justify-between border-b border-fogma-border px-fogma-4 py-fogma-3">
        <h3 className="text-fogma-sm font-fogma-semibold text-fogma-fg">Inspect</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-fogma-xxs px-fogma-2 py-fogma-1 text-fogma-xs text-fogma-fg-muted hover:text-fogma-fg"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AppliedSection inspection={inspection} />
        <CatalogSection registry={registry} />
      </div>
    </aside>
  )
}

function AppliedSection({ inspection }: { inspection: InspectionResult | undefined }) {
  if (!inspection) {
    return (
      <div className="border-b border-fogma-border px-fogma-4 py-fogma-3">
        <p className="text-fogma-xs text-fogma-fg-muted">
          Click any element in the desktop frame to inspect.
        </p>
      </div>
    )
  }
  return (
    <div className="border-b border-fogma-border px-fogma-4 py-fogma-3">
      <div className="mb-fogma-3 flex items-baseline justify-between">
        <h4 className="text-fogma-xs font-fogma-semibold uppercase tracking-fogma-wider text-fogma-fg-muted">
          Selected
        </h4>
        <code className="text-fogma-xs text-fogma-fg">{`<${inspection.tagName}>`}</code>
      </div>
      {inspection.textPreview && (
        <p className="mb-fogma-3 truncate text-fogma-xs text-fogma-fg">"{inspection.textPreview}"</p>
      )}
      {inspection.applied.length === 0 && inspection.unknownClasses.length === 0 && (
        <p className="text-fogma-xs text-fogma-fg-muted">No tokenized classes on this element.</p>
      )}
      <ul className="space-y-fogma-2">
        {inspection.applied.map((token) => (
          <li key={token.className}>
            <AppliedRow token={token} />
          </li>
        ))}
        {inspection.unknownClasses.map((className) => (
          <li key={className} className="flex items-center gap-fogma-2">
            <code className="text-fogma-xs text-fogma-fg-muted">{className}</code>
            <span className="text-fogma-xs text-fogma-fg-muted">(non-token)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AppliedRow({ token }: { token: AppliedToken }) {
  return (
    <div className="flex items-center justify-between gap-fogma-2 rounded-fogma-xxs px-fogma-2 py-fogma-1 hover:bg-gray-50">
      <div className="flex min-w-0 items-center gap-fogma-2">
        <TokenSwatch entry={token.entry} />
        <code className="truncate font-mono text-fogma-xs text-fogma-fg">{token.className}</code>
      </div>
      <TokenValue entry={token.entry} />
    </div>
  )
}

function CatalogSection({ registry }: { registry: TokenRegistry }) {
  return (
    <div>
      {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((key) => (
        <CatalogCategory
          key={String(key)}
          label={CATEGORY_LABELS[key] as string}
          entries={registry[key]}
          defaultOpen={false}
        />
      ))}
    </div>
  )
}

function CatalogCategory({
  label,
  entries,
  defaultOpen,
}: {
  label: string
  entries: TokenEntry[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-fogma-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-fogma-4 py-fogma-3 text-left hover:bg-gray-50"
      >
        <span className="text-fogma-xs font-fogma-semibold text-fogma-fg">{label}</span>
        <span className="text-fogma-xs text-fogma-fg-muted">
          {entries.length} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <ul className="space-y-fogma-2 px-fogma-4 pb-fogma-3">
          {entries.map((entry) => (
            <li key={tokenKey(entry)}>
              <CatalogRow entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function tokenKey(entry: TokenEntry): string {
  return `${entry.kind}-${entry.name}`
}

function CatalogRow({ entry }: { entry: TokenEntry }) {
  return (
    <div className="flex items-center justify-between gap-fogma-2 rounded-fogma-xxs px-fogma-2 py-fogma-1 hover:bg-gray-50">
      <div className="flex min-w-0 items-center gap-fogma-2">
        <TokenSwatch entry={entry} />
        <code className="truncate font-mono text-fogma-xs text-fogma-fg">{entry.name}</code>
      </div>
      <TokenValue entry={entry} />
    </div>
  )
}

function TokenSwatch({ entry }: { entry: TokenEntry }) {
  if (entry.kind === "color") {
    return (
      <span
        aria-hidden
        className="inline-block size-fogma-4 shrink-0 rounded-fogma-md border border-fogma-border"
        style={{ background: entry.hex }}
      />
    )
  }
  if (entry.kind === "spacing" && entry.px !== undefined) {
    const widthRem = Math.min(Math.max(entry.px / 16, 0.125), 2)
    const style: CSSProperties = {
      width: `${widthRem}rem`,
      height: "0.25rem",
      background: "#cbd5e1",
      borderRadius: "1px",
    }
    return <span aria-hidden className="inline-block shrink-0" style={style} />
  }
  if (entry.kind === "fontSize") {
    return (
      <span
        aria-hidden
        className="inline-block w-fogma-6 shrink-0 text-center font-fogma-semibold text-fogma-fg"
        style={{ fontSize: "0.875rem", lineHeight: 1 }}
      >
        Aa
      </span>
    )
  }
  if (entry.kind === "fontWeight") {
    return (
      <span
        aria-hidden
        className="inline-block w-fogma-6 shrink-0 text-center text-fogma-fg"
        style={{ fontSize: "0.875rem", lineHeight: 1, fontWeight: entry.weight }}
      >
        Aa
      </span>
    )
  }
  if (entry.kind === "radius") {
    return (
      <span
        aria-hidden
        className="inline-block size-fogma-4 shrink-0 border border-fogma-border-strong"
        style={{ borderTopLeftRadius: entry.value, background: "#f8fafc" }}
      />
    )
  }
  if (entry.kind === "shadow") {
    return (
      <span
        aria-hidden
        className="inline-block size-fogma-4 shrink-0 rounded-fogma-md"
        style={{ background: "#fff", boxShadow: entry.value }}
      />
    )
  }
  if (entry.kind === "container") {
    return (
      <span
        aria-hidden
        className="inline-block shrink-0"
        style={{ width: "0.875rem", height: "0.25rem", background: "#cbd5e1", borderRadius: "1px" }}
      />
    )
  }
  return <></>
}

function TokenValue({ entry }: { entry: TokenEntry }) {
  switch (entry.kind) {
    case "color": {
      return <span className="text-fogma-xs tabular-nums text-fogma-fg-muted">{entry.hex}</span>
    }
    case "spacing": {
      return (
        <span className="text-fogma-xs tabular-nums text-fogma-fg-muted">
          {entry.px === undefined ? entry.rem : `${entry.px}px`}
        </span>
      )
    }
    case "fontSize": {
      return (
        <span className="truncate text-fogma-xs tabular-nums text-fogma-fg-muted" title={entry.value}>
          {entry.value.startsWith("clamp") ? "fluid" : entry.value}
        </span>
      )
    }
    case "fontWeight": {
      return <span className="text-fogma-xs tabular-nums text-fogma-fg-muted">{entry.weight}</span>
    }
    case "radius": {
      return <span className="text-fogma-xs tabular-nums text-fogma-fg-muted">{entry.value}</span>
    }
    case "shadow": {
      return (
        <span className="max-w-fogma-6 truncate text-fogma-xs text-fogma-fg-muted" title={entry.value}>
          shadow
        </span>
      )
    }
    case "container": {
      return <span className="text-fogma-xs tabular-nums text-fogma-fg-muted">{entry.value}</span>
    }
    default: {
      return <></>
    }
  }
}
