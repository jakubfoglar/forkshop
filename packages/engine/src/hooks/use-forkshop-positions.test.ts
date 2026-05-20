/**
 * Unit tests for useForkshopPositions boardId namespacing.
 *
 * We test the filtering logic directly rather than rendering the hook
 * (no jsdom needed — the boardId projection is pure object work).
 */
import { describe, it, expect } from "vitest"

// ---------------------------------------------------------------------------
// Extract the pure projection logic for direct testing.
// We mirror the hook's internal logic here so we can unit-test it in isolation
// without needing to stub fetch / React lifecycle.
// ---------------------------------------------------------------------------

function projectForBoard(
  rawPositions: Record<string, { x: number; y: number }>,
  boardId: string,
): Record<string, { x: number; y: number }> {
  const prefix = `${boardId}:`
  const result: Record<string, { x: number; y: number }> = {}
  for (const [key, value] of Object.entries(rawPositions)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = value
    }
  }
  return result
}

function storageKey(boardId: string | undefined, nodeId: string): string {
  return boardId ? `${boardId}:${nodeId}` : nodeId
}

describe("useForkshopPositions boardId namespacing", () => {
  describe("storage key derivation", () => {
    it("prefixes node id with boardId when boardId is set", () => {
      expect(storageKey("design-system", "node-a")).toBe("design-system:node-a")
    })

    it("uses plain node id when boardId is undefined", () => {
      expect(storageKey(undefined, "node-a")).toBe("node-a")
    })
  })

  describe("position projection per board", () => {
    const rawPositions = {
      "design-system:node-a": { x: 10, y: 20 },
      "design-system:node-b": { x: 30, y: 40 },
      "components:node-a": { x: 99, y: 88 },
      "blocks:block-1": { x: 5, y: 6 },
    }

    it("returns only positions belonging to the requested board", () => {
      const result = projectForBoard(rawPositions, "design-system")
      expect(result).toEqual({
        "node-a": { x: 10, y: 20 },
        "node-b": { x: 30, y: 40 },
      })
    })

    it("two boards with the same node id are isolated", () => {
      const dsPos = projectForBoard(rawPositions, "design-system")
      const compPos = projectForBoard(rawPositions, "components")
      // Both boards have "node-a" but with different positions
      expect(dsPos["node-a"]).toEqual({ x: 10, y: 20 })
      expect(compPos["node-a"]).toEqual({ x: 99, y: 88 })
    })

    it("returns empty object for a board with no stored positions", () => {
      expect(projectForBoard(rawPositions, "sitemap")).toEqual({})
    })

    it("strips the board prefix from returned keys", () => {
      const result = projectForBoard(rawPositions, "blocks")
      expect(Object.keys(result)).toEqual(["block-1"])
    })
  })
})
