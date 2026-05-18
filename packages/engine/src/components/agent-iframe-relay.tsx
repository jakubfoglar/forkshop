"use client"

import { useEffect } from "react"
import { useIframeRegistry } from "@forkshop/components/iframe-registry"
import {
  useAgentActiveBlocks,
  useAgentColorByFile,
  useAllAgentHunks,
} from "@forkshop/components/agent-activity-context"
import type { Hunk } from "@forkshop/lib/diff-to-hunks"

type PostMessageTarget = {
  postMessage: (message: unknown, targetOrigin: string) => void
}

type IframeLike = { contentWindow: PostMessageTarget | null | undefined }

// Most-recent edit color across all entries. The iframe-side decoration
// applies it inline to the elements it decorates.
function pickColor(colorByFile: ReadonlyMap<string, string>): string {
  // The map is ordered by insertion in the producer (entries-array iteration);
  // tail entry is most-recent. Take last.
  let color = "oklch(0.62 0.22 280)" // fallback purple
  for (const value of colorByFile.values()) color = value
  return color
}

export function broadcastBlocks(
  iframes: readonly IframeLike[],
  payload: { slugs: readonly string[]; color: string },
): void {
  for (const iframe of iframes) {
    try {
      iframe.contentWindow?.postMessage(
        { type: "forkshop:agent-block", slugs: [...payload.slugs], color: payload.color },
        "*",
      )
    } catch {
      // ignore
    }
  }
}

export function broadcastHunks(
  iframes: readonly IframeLike[],
  payload: { hunks: readonly Hunk[]; color: string },
): void {
  if (payload.hunks.length === 0) return
  for (const iframe of iframes) {
    try {
      iframe.contentWindow?.postMessage(
        { type: "forkshop:agent-text", hunks: [...payload.hunks], color: payload.color },
        "*",
      )
    } catch {
      // ignore
    }
  }
}

export function handleAgentHello(
  event: { data?: unknown; source?: PostMessageTarget | null },
  snapshot: { slugs: readonly string[]; hunks: readonly Hunk[]; color: string },
): boolean {
  const data = event.data as { type?: string } | null | undefined
  if (data?.type !== "forkshop:agent-hello") return false
  const source = event.source
  if (!source) return false
  try {
    source.postMessage(
      { type: "forkshop:agent-block", slugs: [...snapshot.slugs], color: snapshot.color },
      "*",
    )
    if (snapshot.hunks.length > 0) {
      source.postMessage(
        { type: "forkshop:agent-text", hunks: [...snapshot.hunks], color: snapshot.color },
        "*",
      )
    }
  } catch {
    // ignore
  }
  return true
}

/**
 * @deprecated AgentIframeRelay is auto-mounted by `AgentActivityProvider` since v0.x.y.
 * Manually mounting it has no effect (it's idempotent — postMessage is harmless
 * if no iframes are listening) but doesn't crash. Drop the manual mount in your code.
 * This export will be removed at the next 0.x major bump.
 */
export function AgentIframeRelay() {
  const registry = useIframeRegistry()
  const activeBlocks = useAgentActiveBlocks()
  const allHunks = useAllAgentHunks()
  const colorByFile = useAgentColorByFile()

  useEffect(() => {
    if (!registry) return
    broadcastBlocks(registry.getAll(), {
      slugs: [...activeBlocks],
      color: pickColor(colorByFile),
    })
  }, [registry, activeBlocks, colorByFile])

  useEffect(() => {
    if (!registry) return
    broadcastHunks(registry.getAll(), { hunks: allHunks, color: pickColor(colorByFile) })
  }, [registry, allHunks, colorByFile])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      handleAgentHello(
        { data: event.data, source: event.source as PostMessageTarget | null },
        { slugs: [...activeBlocks], hunks: allHunks, color: pickColor(colorByFile) },
      )
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [activeBlocks, allHunks, colorByFile])

  return null
}
