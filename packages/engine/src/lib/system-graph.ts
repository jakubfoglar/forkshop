import type { TokenRegistry } from "@forkshop/lib/token-registry"

export type ColorNode = {
  id: string
  name: string
  hex: string
  family: string
  kind: "raw" | "semantic"
}

export type ColorEdge = {
  id: string
  fromId: string
  toId: string
}

export type SystemGraph = {
  rawColors: ColorNode[]
  semanticColors: ColorNode[]
  colorEdges: ColorEdge[]
}

function normalizeHex(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ")
}

export function buildSystemGraph(tokenRegistry: TokenRegistry): SystemGraph {
  const rawColors: ColorNode[] = []
  const semanticColors: ColorNode[] = []

  for (const entry of tokenRegistry.colors) {
    if (entry.kind !== "color") continue
    const family = entry.family || entry.name
    const node: ColorNode = {
      id: entry.isSemantic ? `sem:${entry.name}` : `raw:${entry.name}`,
      name: entry.name,
      hex: entry.hex,
      family,
      kind: entry.isSemantic ? "semantic" : "raw",
    }
    if (entry.isSemantic) semanticColors.push(node)
    else rawColors.push(node)
  }

  const rawByHex = new Map<string, ColorNode[]>()
  for (const raw of rawColors) {
    const key = normalizeHex(raw.hex)
    const existing = rawByHex.get(key)
    if (existing) existing.push(raw)
    else rawByHex.set(key, [raw])
  }

  const colorEdges: ColorEdge[] = []
  for (const semantic of semanticColors) {
    const matches = rawByHex.get(normalizeHex(semantic.hex))
    if (!matches) continue
    for (const raw of matches) {
      colorEdges.push({
        id: `${raw.id}->${semantic.id}`,
        fromId: raw.id,
        toId: semantic.id,
      })
    }
  }

  return { rawColors, semanticColors, colorEdges }
}
