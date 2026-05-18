"use client"

import { useEffect, useRef } from "react"
import { useAgentReadingByFile } from "@forkshop/components/agent-activity-context"

// Walks up from itself to the closest [data-forkshop-iframe-host] ancestor,
// then toggles data-forkshop-agent-reading + inline --forkshop-agent-color on
// it whenever a read event maps to hostFileLabel. The decoration is purely
// host-side — no reaching into the iframe document — so it works regardless
// of iframe cross-origin or load state.
export function AgentReadIndicator({ hostFileLabel }: { hostFileLabel: string }) {
  const sentinelRef = useRef<HTMLSpanElement | null>(null)
  const readingByFile = useAgentReadingByFile()

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const host = sentinel.closest<HTMLElement>("[data-forkshop-iframe-host]")
    if (!host) return

    let match: { color: string; agentLabel: string } | undefined
    for (const [file, value] of readingByFile) {
      if (file.endsWith(hostFileLabel)) {
        match = value
        break
      }
    }

    if (match !== undefined) {
      host.dataset.forkshopAgentReading = ""
      host.style.setProperty("--forkshop-agent-color", match.color)
    } else {
      delete host.dataset.forkshopAgentReading
      host.style.removeProperty("--forkshop-agent-color")
    }

    return () => {
      delete host.dataset.forkshopAgentReading
      host.style.removeProperty("--forkshop-agent-color")
    }
  }, [hostFileLabel, readingByFile])

  return <span ref={sentinelRef} style={{ display: "none" }} aria-hidden="true" />
}
