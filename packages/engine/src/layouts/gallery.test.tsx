import { describe, it, expect } from "vitest"
import { computeGalleryPlacements, type GalleryEntry } from "@forkshop/layouts/gallery"
import type { InlineReactNode } from "@forkshop/types/node"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(nodeId: string, row?: number, column?: number): GalleryEntry {
  const node: InlineReactNode = {
    id: nodeId,
    kind: "inline-react",
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    label: nodeId,
    render: () => null,
  }
  return { node, row, column }
}

// ---------------------------------------------------------------------------
// Type-level guard: GalleryEntry must NOT have an `id` field
// ---------------------------------------------------------------------------

describe("GalleryEntry type — no separate id field", () => {
  it("entry shape has node.id but no top-level id", () => {
    const entry: GalleryEntry = makeEntry("node-a")
    expect("id" in entry).toBe(false)
    expect(entry.node.id).toBe("node-a")
  })

  it("two entries with different node.ids are distinct identities", () => {
    const a = makeEntry("node-a")
    const b = makeEntry("node-b")
    expect(a.node.id).not.toBe(b.node.id)
    // No risk of silent position collision via mismatched entry.id vs node.id
    // because there is only one id field now.
  })

  it("entry with row/column retains those fields along with node.id", () => {
    const entry = makeEntry("node-grid", 1, 2)
    expect(entry.row).toBe(1)
    expect(entry.column).toBe(2)
    expect(entry.node.id).toBe("node-grid")
    expect("id" in entry).toBe(false)
  })
})

describe("computeGalleryPlacements", () => {
  it("uses explicit row/column when set", () => {
    const placements = computeGalleryPlacements(
      [
        { id: "a", row: 0, column: 0, node: { x: 0, y: 0, width: 100, height: 100, id: "a", kind: "inline-react", render: () => null } },
        { id: "b", row: 1, column: 0, node: { x: 0, y: 0, width: 100, height: 100, id: "b", kind: "inline-react", render: () => null } },
      ],
      { columns: 2, rowGap: 10, columnGap: 10 },
    )
    expect(placements.a!.y).toBeLessThan(placements.b!.y)
  })

  it("uses node x/y when neither row/column set and node has explicit coords", () => {
    const placements = computeGalleryPlacements(
      [{ id: "a", node: { id: "a", kind: "inline-react", x: 200, y: 300, width: 100, height: 100, render: () => null } }],
      { columns: 1 },
    )
    expect(placements.a).toEqual({ x: 200, y: 300 })
  })

  it("auto-flows when no row/column/x/y given", () => {
    const placements = computeGalleryPlacements(
      [
        { id: "a", node: { id: "a", kind: "inline-react", x: 0, y: 0, width: 100, height: 100, render: () => null } },
        { id: "b", node: { id: "b", kind: "inline-react", x: 0, y: 0, width: 100, height: 100, render: () => null } },
        { id: "c", node: { id: "c", kind: "inline-react", x: 0, y: 0, width: 100, height: 100, render: () => null } },
      ],
      { columns: 2, rowGap: 10, columnGap: 10 },
    )
    expect(placements.a).toEqual({ x: 0, y: 0 })
    expect(placements.b!.x).toBeGreaterThan(0)
    expect(placements.b!.y).toBe(0)
    expect(placements.c!.x).toBe(0)
    expect(placements.c!.y).toBeGreaterThan(0)
  })
})
