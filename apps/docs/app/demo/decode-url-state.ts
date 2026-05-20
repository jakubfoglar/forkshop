export type AgentSeed =
  | { kind: "file"; path: string }
  | { kind: "page"; path: string }
  | { kind: "block"; slug: string }
  | { kind: "primitive"; id: string }

export interface DemoUrlState {
  viewport?: "responsive" | "mobile" | "single"
  zoom?: number
  pan?: { x: number; y: number }
  agents: AgentSeed[]
}

export function decodeUrlState(search: string): DemoUrlState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)

  const viewport = params.get("viewport") as DemoUrlState["viewport"] | null
  const zoomRaw = params.get("zoom")
  const panX = params.get("panX")
  const panY = params.get("panY")
  const agentsRaw = params.get("agents")

  return {
    viewport: viewport ?? undefined,
    zoom: zoomRaw !== null ? Number(zoomRaw) : undefined,
    pan: panX !== null && panY !== null ? { x: Number(panX), y: Number(panY) } : undefined,
    agents: agentsRaw
      ? agentsRaw.split(",").map((entry) => {
          const colonIdx = entry.indexOf(":")
          const kind = entry.slice(0, colonIdx)
          const rest = entry.slice(colonIdx + 1)
          if (kind === "file" || kind === "page") return { kind, path: rest }
          if (kind === "block") return { kind, slug: rest }
          if (kind === "primitive") return { kind, id: rest }
          throw new Error(`unknown agent kind: ${kind}`)
        })
      : [],
  }
}
