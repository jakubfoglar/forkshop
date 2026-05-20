"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { isNodePositions } from "@forkshop/lib/node-positions"
import type { NodePositions } from "@forkshop/lib/node-positions"

const BASE_ENDPOINT = "/api/forkshop/positions"
const DEFAULT_MOUNT_PATH = "app/forkshop"

/**
 * Loads and persists per-node drag positions via the engine's positions route.
 *
 * @param options.mountPath - Path (relative to cwd) where positions.json is
 *   stored. Defaults to "app/forkshop". Passed as a `?mount=` query param so
 *   the route handler resolves the right file without an env-var override.
 * @param options.boardId - Optional board namespace. When set, position keys
 *   are stored as `"<boardId>:<nodeId>"` in the JSON file and the hook returns
 *   a view scoped to that board. Two boards with the same node IDs but
 *   different boardIds are fully isolated.
 */
export function useForkshopPositions(options?: { mountPath?: string; boardId?: string }): {
  nodePositions: NodePositions
  onPositionChange: (id: string, x: number, y: number) => void
} {
  const mountPath = options?.mountPath ?? DEFAULT_MOUNT_PATH
  const boardId = options?.boardId
  const endpoint = `${BASE_ENDPOINT}?mount=${encodeURIComponent(mountPath)}`

  const [rawPositions, setRawPositions] = useState<NodePositions>({})

  useEffect(() => {
    let cancelled = false
    void fetch(endpoint)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (cancelled) return
        if (isNodePositions(data)) {
          setRawPositions(data)
        }
      })
      .catch(() => {
        // ignore — positions stay empty
      })
    return () => {
      cancelled = true
    }
  }, [endpoint])

  /**
   * When `boardId` is set, project the full positions map down to the keys
   * belonging to this board (stripping the "<boardId>:" prefix). Callers see
   * plain node IDs; the prefix is internal to the storage layer.
   */
  const nodePositions = useMemo<NodePositions>(() => {
    if (!boardId) return rawPositions
    const prefix = `${boardId}:`
    const result: Record<string, { x: number; y: number }> = {}
    for (const [key, value] of Object.entries(rawPositions)) {
      if (key.startsWith(prefix)) {
        result[key.slice(prefix.length)] = value
      }
    }
    return result
  }, [rawPositions, boardId])

  const onPositionChange = useCallback(
    (id: string, x: number, y: number) => {
      const storageId = boardId ? `${boardId}:${id}` : id
      setRawPositions((prev) => ({ ...prev, [storageId]: { x, y } }))
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: storageId, x, y }),
      }).catch(() => {
        // ignore network errors
      })
    },
    [endpoint, boardId],
  )

  return { nodePositions, onPositionChange }
}
