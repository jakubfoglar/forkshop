"use client"

import { useEffect } from "react"
import { useIframeRegistry } from "@forkshop/components/iframe-registry"
import {
  useAgentActiveBlocks,
  useAllAgentSubstrings,
} from "@forkshop/components/agent-activity-context"

// Pushes agent-activity state into every registered iframe via postMessage.
// Broadcasts unfiltered: each iframe's text-walker decides whether the
// substring matches anything in its own DOM. This removes coupling to
// selection state and means the relay works in any canvas regardless of
// whether the host knows which page/block the user is viewing.
export function AgentIframeRelay() {
  const registry = useIframeRegistry()
  const activeBlocks = useAgentActiveBlocks()
  const allSubstrings = useAllAgentSubstrings()

  // Push: broadcast block highlights to every iframe.
  useEffect(() => {
    if (!registry) return
    const slugs = [...activeBlocks]
    for (const iframe of registry.getAll()) {
      try {
        iframe.contentWindow?.postMessage({ type: "forkshop:agent-block", slugs }, "*")
      } catch {
        // ignore
      }
    }
  }, [registry, activeBlocks])

  // Push: broadcast every active substring to every iframe.
  useEffect(() => {
    if (!registry) return
    if (allSubstrings.length === 0) return
    for (const iframe of registry.getAll()) {
      try {
        iframe.contentWindow?.postMessage(
          { type: "forkshop:agent-text", strings: allSubstrings },
          "*",
        )
      } catch {
        // ignore
      }
    }
  }, [registry, allSubstrings])

  // Hello-replay: when an iframe says hello on mount (via use-iframe-edit-
  // wiring's synthesized message event), post the current snapshot back to
  // that specific source only.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "forkshop:agent-hello") return
      const source = event.source as Window | null
      if (!source) return
      try {
        source.postMessage(
          { type: "forkshop:agent-block", slugs: [...activeBlocks] },
          "*",
        )
        if (allSubstrings.length > 0) {
          source.postMessage(
            { type: "forkshop:agent-text", strings: allSubstrings },
            "*",
          )
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [activeBlocks, allSubstrings])

  return null
}
