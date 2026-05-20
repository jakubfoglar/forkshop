"use client"

import { useCallback, useEffect, useState } from "react"
import type { NodePositions } from "@forkshop/engine"
import { isNodePositions } from "@forkshop/engine"

const ENDPOINT = "/api/forkshop/positions"

export function useForkshopPositions(): {
  nodePositions: NodePositions
  onPositionChange: (id: string, x: number, y: number) => void
} {
  const [nodePositions, setNodePositions] = useState<NodePositions>({})

  useEffect(() => {
    let cancelled = false
    void fetch(ENDPOINT)
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
  }, [])

  const onPositionChange = useCallback((id: string, x: number, y: number) => {
    setNodePositions((prev) => ({ ...prev, [id]: { x, y } }))
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, x, y }),
    }).catch(() => {
      // ignore network errors
    })
  }, [])

  return { nodePositions, onPositionChange }
}
