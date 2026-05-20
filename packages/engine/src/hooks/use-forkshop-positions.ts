"use client"

import { useCallback, useEffect, useState } from "react"
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
 */
export function useForkshopPositions(options?: { mountPath?: string }): {
  nodePositions: NodePositions
  onPositionChange: (id: string, x: number, y: number) => void
} {
  const mountPath = options?.mountPath ?? DEFAULT_MOUNT_PATH
  const endpoint = `${BASE_ENDPOINT}?mount=${encodeURIComponent(mountPath)}`

  const [nodePositions, setNodePositions] = useState<NodePositions>({})

  useEffect(() => {
    let cancelled = false
    void fetch(endpoint)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (cancelled) return
        if (isNodePositions(data)) {
          setNodePositions(data)
        }
      })
      .catch(() => {
        // ignore — positions stay empty
      })
    return () => {
      cancelled = true
    }
  }, [endpoint])

  const onPositionChange = useCallback(
    (id: string, x: number, y: number) => {
      setNodePositions((prev) => ({ ...prev, [id]: { x, y } }))
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, x, y }),
      }).catch(() => {
        // ignore network errors
      })
    },
    [endpoint],
  )

  return { nodePositions, onPositionChange }
}
