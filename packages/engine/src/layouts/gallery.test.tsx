import { describe, it, expect } from "vitest"
import type { GalleryEntry } from "@forkshop/layouts/gallery"
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
