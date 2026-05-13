"use client"

import { useEffect } from "react"
import { useIframeRegistry } from "@forkshop/components/iframe-registry"
import {
  useAgentActiveBlocks,
  useAgentSubstringsForPage,
  useAgentSubstringsForBlock,
  usePageActiveFallback,
} from "@forkshop/components/agent-activity-context"

export function AgentIframeRelay({
  pageSelectionPath,
  blockSelectionSlug,
}: {
  pageSelectionPath: string | undefined
  blockSelectionSlug: string | undefined
}) {
  const registry = useIframeRegistry()
  const activeBlocks = useAgentActiveBlocks()
  const pageSubstrings = useAgentSubstringsForPage(pageSelectionPath)
  const blockSubstrings = useAgentSubstringsForBlock(blockSelectionSlug)
  const pageActiveForSelection = usePageActiveFallback(pageSelectionPath)

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

  // Push: broadcast page-active fallback to every iframe.
  useEffect(() => {
    if (!registry) return
    for (const iframe of registry.getAll()) {
      try {
        iframe.contentWindow?.postMessage(
          { type: "forkshop:agent-page-active", active: pageActiveForSelection },
          "*",
        )
      } catch {
        // ignore
      }
    }
  }, [registry, pageActiveForSelection])

  // Push: broadcast text-substring flashes.
  useEffect(() => {
    if (!registry) return
    const strings = pageSelectionPath === undefined ? blockSubstrings : pageSubstrings
    if (strings.length === 0) return
    for (const iframe of registry.getAll()) {
      try {
        iframe.contentWindow?.postMessage({ type: "forkshop:agent-text", strings }, "*")
      } catch {
        // ignore
      }
    }
  }, [registry, pageSubstrings, blockSubstrings, pageSelectionPath])

  // Hello-replay: when an iframe says hello on mount, post the current snapshot
  // back to that specific source only.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "forkshop:agent-hello") return
      const source = event.source as Window | null
      if (!source) return
      try {
        source.postMessage({ type: "forkshop:agent-block", slugs: [...activeBlocks] }, "*")
        source.postMessage(
          { type: "forkshop:agent-page-active", active: pageActiveForSelection },
          "*",
        )
        const strings = pageSelectionPath === undefined ? blockSubstrings : pageSubstrings
        if (strings.length > 0) {
          source.postMessage({ type: "forkshop:agent-text", strings }, "*")
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [activeBlocks, pageActiveForSelection, pageSubstrings, blockSubstrings, pageSelectionPath])

  return null
}
