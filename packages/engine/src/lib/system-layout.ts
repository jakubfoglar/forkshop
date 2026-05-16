import type { ColorNode, SystemGraph } from "@forkshop/lib/system-graph"

// ---------------------------------------------------------------------------
// Block descriptor — generic shape consumed by layoutSystem
// ---------------------------------------------------------------------------

/** Minimal descriptor for a renderable block (section/component). */
export type BlockEntry = {
  slug: string
  name: string
  description: string
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

export const COLOR_NODE_HEIGHT = 26
export const COLOR_NODE_WIDTH = 168
export const COLOR_ROW_PITCH = 32
export const COLOR_FAMILY_GAP = 20
export const COLOR_COLUMN_GAP = 360
export const COLOR_GRID_H_GAP = 12
export const COLOR_GRID_V_GAP = 6

export const TYPOGRAPHY_DEFAULT_WIDTH = 720
export const TYPOGRAPHY_DEFAULT_HEIGHT = 920
export const TYPOGRAPHY_SECTION_GAP = 80
export const PRIMITIVES_SECTION_GAP = 80

export const SECTION_GAP = 160
export const SECTION_HEADER_HEIGHT = 56
export const PRIMITIVES_BODY_HEIGHT = 720
export const BLOCK_LABEL_HEIGHT = 48
export const BLOCK_BODY_DEFAULT_HEIGHT = 720
export const BLOCK_ROW_GAP = 96
export const BLOCK_VIEWPORT_GAP = 32

export const VIEWPORT_DESKTOP = 1440
export const VIEWPORT_TABLET = 768
export const VIEWPORT_MOBILE = 375

const CANVAS_VIEWPORTS = [{ label: "Desktop · 1440", width: VIEWPORT_DESKTOP }] as const

// ---------------------------------------------------------------------------
// Layout result types
// ---------------------------------------------------------------------------

export type PositionedColorNode = {
  id: string
  node: ColorNode
  x: number
  y: number
  width: number
  height: number
}

export type ColorEdgePath = {
  id: string
  fromId: string
  toId: string
  d: string
}

export type PositionedBlockViewport = {
  width: number
  height: number
  x: number
  label: string
}

export type PositionedBlockRow = {
  slug: string
  name: string
  description: string
  rowY: number
  labelHeight: number
  bodyY: number
  bodyHeight: number
  rowWidth: number
  rowX: number
  viewports: PositionedBlockViewport[]
}

export type PrimitiveGroupId =
  | "primitive:buttons"
  | "primitive:badges"
  | "primitive:inputs"
  | "primitive:logotype"

export type PositionedPrimitiveGroup = {
  id: PrimitiveGroupId
  name: string
  x: number
  y: number
  width: number
  height: number
}

export type SystemLayout = {
  width: number
  height: number
  rawColorNodes: PositionedColorNode[]
  semanticColorNodes: PositionedColorNode[]
  colorEdgePaths: ColorEdgePath[]
  colorsWidth: number
  colorsHeight: number
  primitivesBodyY: number
  primitivesBodyHeight: number
  primitiveGroups: PositionedPrimitiveGroup[]
  blockRows: PositionedBlockRow[]
}

// ---------------------------------------------------------------------------
// Primitive group defaults
// ---------------------------------------------------------------------------

const PRIMITIVE_GROUP_DEFAULTS: readonly {
  id: PrimitiveGroupId
  name: string
  width: number
  height: number
  relativeX: number
  relativeY: number
}[] = [
  { id: "primitive:buttons", name: "Buttons", width: 720, height: 480, relativeX: 0, relativeY: 0 },
  { id: "primitive:badges", name: "Badges", width: 720, height: 140, relativeX: 760, relativeY: 0 },
  {
    id: "primitive:inputs",
    name: "Inputs",
    width: 520,
    height: 280,
    relativeX: 760,
    relativeY: 160,
  },
  {
    id: "primitive:logotype",
    name: "Logotype",
    width: 520,
    height: 200,
    relativeX: 760,
    relativeY: 480,
  },
]

// ---------------------------------------------------------------------------
// Generic auto-layout (simpler grid-wrap alternative to layoutSystem)
// ---------------------------------------------------------------------------

export type SystemLayoutOptions = {
  primitives: { id: string; name: string; width: number; height: number }[]
  startX?: number
  startY?: number
  gap?: number
}

export function computeSystemLayout(options: SystemLayoutOptions): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const startX = options.startX ?? 0
  const startY = options.startY ?? 0
  const gap = options.gap ?? 24
  let cursorX = startX
  let cursorY = startY
  let rowMaxH = 0
  const wrapAt = 1200
  for (const p of options.primitives) {
    if (cursorX + p.width > wrapAt) {
      cursorX = startX
      cursorY += rowMaxH + gap
      rowMaxH = 0
    }
    positions.set(p.id, { x: cursorX, y: cursorY })
    cursorX += p.width + gap
    rowMaxH = Math.max(rowMaxH, p.height)
  }
  return positions
}

// ---------------------------------------------------------------------------
// Internal helpers for layoutSystem
// ---------------------------------------------------------------------------

function compareWithinFamily(a: ColorNode, b: ColorNode): number {
  const aParts = a.name.split("-")
  const bParts = b.name.split("-")
  const aLast = aParts.at(-1) ?? ""
  const bLast = bParts.at(-1) ?? ""
  const aHasNumber = /^\d+$/.test(aLast)
  const bHasNumber = /^\d+$/.test(bLast)
  const aPrefix = aHasNumber ? aParts.slice(0, -1).join("-") : a.name
  const bPrefix = bHasNumber ? bParts.slice(0, -1).join("-") : b.name
  if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix)
  if (aHasNumber && bHasNumber) return Number.parseInt(aLast, 10) - Number.parseInt(bLast, 10)
  return a.name.localeCompare(b.name)
}

function groupByFamily(nodes: ColorNode[]): Map<string, ColorNode[]> {
  const groups = new Map<string, ColorNode[]>()
  for (const node of nodes) {
    const list = groups.get(node.family)
    if (list) list.push(node)
    else groups.set(node.family, [node])
  }
  for (const list of groups.values()) list.sort(compareWithinFamily)
  return groups
}

type GridLayout = {
  positioned: PositionedColorNode[]
  width: number
  height: number
}

function sortByFamilyOrder(nodes: ColorNode[]): ColorNode[] {
  const groups = groupByFamily(nodes)
  const familyOrder = [...groups.keys()].sort((a, b) => a.localeCompare(b))
  const ordered: ColorNode[] = []
  for (const family of familyOrder) {
    const items = groups.get(family) ?? []
    for (const item of items) ordered.push(item)
  }
  return ordered
}

// Place a set of color nodes in a near-square row-major grid. Family clustering
// is preserved by sorting (sortByFamilyOrder) before slotting — adjacent grid
// cells stay within the same family until a family boundary is hit.
function layoutGrid(nodes: ColorNode[], startX: number, startY: number): GridLayout {
  if (nodes.length === 0) return { positioned: [], width: 0, height: 0 }
  const ordered = sortByFamilyOrder(nodes)
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length)))
  const stepX = COLOR_NODE_WIDTH + COLOR_GRID_H_GAP
  const stepY = COLOR_NODE_HEIGHT + COLOR_GRID_V_GAP
  const positioned: PositionedColorNode[] = ordered.map((node, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    return {
      id: node.id,
      node,
      x: startX + col * stepX,
      y: startY + row * stepY,
      width: COLOR_NODE_WIDTH,
      height: COLOR_NODE_HEIGHT,
    }
  })
  const rowsUsed = Math.ceil(ordered.length / columns)
  const width = columns * COLOR_NODE_WIDTH + (columns - 1) * COLOR_GRID_H_GAP
  const height = rowsUsed * COLOR_NODE_HEIGHT + (rowsUsed - 1) * COLOR_GRID_V_GAP
  return { positioned, width, height }
}

function layoutBlockRows(
  blockEntries: readonly BlockEntry[],
  blockBodyHeights: Readonly<Record<string, number>>,
  startY: number,
  stageWidth: number,
): { rows: PositionedBlockRow[]; endY: number } {
  const rows: PositionedBlockRow[] = []
  let cursorY = startY
  for (const entry of blockEntries) {
    const bodyHeight = blockBodyHeights[entry.slug] ?? BLOCK_BODY_DEFAULT_HEIGHT
    const rowWidth =
      CANVAS_VIEWPORTS.reduce((sum, viewport) => sum + viewport.width, 0) +
      BLOCK_VIEWPORT_GAP * Math.max(0, CANVAS_VIEWPORTS.length - 1)
    const rowX = (stageWidth - rowWidth) / 2

    let viewportCursorX = 0
    const viewports: PositionedBlockViewport[] = CANVAS_VIEWPORTS.map((viewport) => {
      const positioned: PositionedBlockViewport = {
        width: viewport.width,
        height: bodyHeight,
        x: viewportCursorX,
        label: viewport.label,
      }
      viewportCursorX += viewport.width + BLOCK_VIEWPORT_GAP
      return positioned
    })

    const rowY = cursorY
    const labelHeight = BLOCK_LABEL_HEIGHT
    const bodyY = rowY + labelHeight
    rows.push({
      slug: entry.slug,
      name: entry.name,
      description: entry.description,
      rowY,
      labelHeight,
      bodyY,
      bodyHeight,
      rowWidth,
      rowX,
      viewports,
    })
    cursorY = bodyY + bodyHeight + BLOCK_ROW_GAP
  }
  return { rows, endY: cursorY }
}

// ---------------------------------------------------------------------------
// Full design-system canvas layout
// ---------------------------------------------------------------------------

export function layoutSystem(
  graph: SystemGraph,
  blockEntries: readonly BlockEntry[],
  blockBodyHeights: Readonly<Record<string, number>>,
): SystemLayout {
  // Combine raw + semantic into a single near-square grid (~sqrt(N) columns).
  // Family clustering is preserved within each group; raw and semantic stay
  // separate sub-grids to keep edge routing legible.
  const rawGrid = layoutGrid(graph.rawColors, 0, 0)
  const semanticStartX = rawGrid.width + COLOR_GRID_H_GAP * 2
  const semanticGrid = layoutGrid(graph.semanticColors, semanticStartX, 0)

  const idIndex = new Map<string, PositionedColorNode>()
  for (const node of rawGrid.positioned) idIndex.set(node.id, node)
  for (const node of semanticGrid.positioned) idIndex.set(node.id, node)

  const colorEdgePaths: ColorEdgePath[] = []
  for (const edge of graph.colorEdges) {
    const from = idIndex.get(edge.fromId)
    const to = idIndex.get(edge.toId)
    if (!from || !to) continue
    const fromX = from.x + from.width
    const fromY = from.y + from.height / 2
    const toX = to.x
    const toY = to.y + to.height / 2
    const midX = (fromX + toX) / 2
    const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
    colorEdgePaths.push({ id: edge.id, fromId: edge.fromId, toId: edge.toId, d })
  }

  const colorsWidth = semanticStartX + semanticGrid.width
  const colorsHeight = Math.max(rawGrid.height, semanticGrid.height)

  // Typography sits to the right of the colors block.
  const typographyX = colorsWidth + TYPOGRAPHY_SECTION_GAP
  const typographyWidth = TYPOGRAPHY_DEFAULT_WIDTH
  const typographyHeight = TYPOGRAPHY_DEFAULT_HEIGHT

  // Primitive groups stack vertically to the right of typography.
  const primitivesStartX = typographyX + typographyWidth + PRIMITIVES_SECTION_GAP
  let primitivesStackHeight = 0
  const primitiveGroups: PositionedPrimitiveGroup[] = PRIMITIVE_GROUP_DEFAULTS.map((spec) => {
    const y = primitivesStackHeight
    primitivesStackHeight += spec.height + 40
    return {
      id: spec.id,
      name: spec.name,
      x: primitivesStartX,
      y,
      width: spec.width,
      height: spec.height,
    }
  })
  const primitivesBodyY = 0
  const primitivesBodyHeight = Math.max(primitivesStackHeight - 40, PRIMITIVES_BODY_HEIGHT)
  const stageContentHeight = Math.max(colorsHeight, typographyHeight, primitivesBodyHeight)

  const primitivesRightEdge =
    primitiveGroups.length === 0
      ? primitivesStartX
      : Math.max(...primitiveGroups.map((g) => g.x + g.width))
  const stageWidth = Math.max(primitivesRightEdge, VIEWPORT_DESKTOP)

  const blocksContentStart = stageContentHeight + SECTION_GAP
  const { rows, endY } = layoutBlockRows(
    blockEntries,
    blockBodyHeights,
    blocksContentStart,
    stageWidth,
  )

  return {
    width: stageWidth,
    height: endY || stageContentHeight,
    rawColorNodes: rawGrid.positioned,
    semanticColorNodes: semanticGrid.positioned,
    colorEdgePaths,
    colorsWidth,
    colorsHeight,
    primitivesBodyY,
    primitivesBodyHeight,
    primitiveGroups,
    blockRows: rows,
  }
}
