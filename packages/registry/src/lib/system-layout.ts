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

type ColumnLayout = {
  positioned: PositionedColorNode[]
  height: number
}

function layoutColumn(nodes: ColorNode[], startX: number): ColumnLayout {
  const groups = groupByFamily(nodes)
  const familyOrder = [...groups.keys()].sort((a, b) => a.localeCompare(b))
  const positioned: PositionedColorNode[] = []
  let cursorY = 0
  for (const [familyIndex, family] of familyOrder.entries()) {
    const items = groups.get(family) ?? []
    for (const item of items) {
      positioned.push({
        id: item.id,
        node: item,
        x: startX,
        y: cursorY,
        width: COLOR_NODE_WIDTH,
        height: COLOR_NODE_HEIGHT,
      })
      cursorY += COLOR_ROW_PITCH
    }
    if (familyIndex < familyOrder.length - 1) cursorY += COLOR_FAMILY_GAP
  }
  return { positioned, height: cursorY }
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
  const left = layoutColumn(graph.rawColors, 0)
  const right = layoutColumn(graph.semanticColors, COLOR_NODE_WIDTH + COLOR_COLUMN_GAP)

  const idIndex = new Map<string, PositionedColorNode>()
  for (const node of left.positioned) idIndex.set(node.id, node)
  for (const node of right.positioned) idIndex.set(node.id, node)

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

  const colorsWidth = COLOR_NODE_WIDTH * 2 + COLOR_COLUMN_GAP
  const colorsHeight = Math.max(left.height, right.height)

  const stageWidth = Math.max(colorsWidth, VIEWPORT_DESKTOP)

  const primitivesBodyY = colorsHeight + SECTION_GAP
  const primitiveGroups: PositionedPrimitiveGroup[] = PRIMITIVE_GROUP_DEFAULTS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    x: spec.relativeX,
    y: primitivesBodyY + spec.relativeY,
    width: spec.width,
    height: spec.height,
  }))
  let primitivesBodyHeight = PRIMITIVES_BODY_HEIGHT
  for (const group of primitiveGroups) {
    const groupBottomRelative = group.y + group.height - primitivesBodyY
    if (groupBottomRelative > primitivesBodyHeight) primitivesBodyHeight = groupBottomRelative
  }
  const blocksContentStart = primitivesBodyY + primitivesBodyHeight + SECTION_GAP

  const { rows, endY } = layoutBlockRows(
    blockEntries,
    blockBodyHeights,
    blocksContentStart,
    stageWidth,
  )

  return {
    width: stageWidth,
    height: endY,
    rawColorNodes: left.positioned,
    semanticColorNodes: right.positioned,
    colorEdgePaths,
    colorsHeight,
    primitivesBodyY,
    primitivesBodyHeight,
    primitiveGroups,
    blockRows: rows,
  }
}
