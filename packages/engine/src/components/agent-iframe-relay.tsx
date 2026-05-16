"use client"

import { useEffect } from "react"
import { useIframeRegistry } from "@forkshop/components/iframe-registry"
import {
  useAgentActiveBlocks,
  useAllAgentSubstrings,
} from "@forkshop/components/agent-activity-context"

// Minimal interface so the broadcast/hello helpers can be tested without DOM.
// Real iframes / windows have many more members; we only use postMessage.
type PostMessageTarget = {
  postMessage: (message: unknown, targetOrigin: string) => void
}

// Iframe-shaped payload — the registry returns HTMLIFrameElement[], but for
// broadcast we only care that .contentWindow has postMessage.
type IframeLike = { contentWindow: PostMessageTarget | null | undefined }

// Pure helpers — extracted so the broadcast targeting and hello-replay
// behavior is unit-testable. Failures inside individual postMessage calls
// are swallowed (an iframe may be cross-origin or unloaded mid-iteration);
// the rest of the broadcast continues.

export function broadcastBlocks(iframes: readonly IframeLike[], slugs: readonly string[]): void {
  for (const iframe of iframes) {
    try {
      iframe.contentWindow?.postMessage(
        { type: "forkshop:agent-block", slugs: [...slugs] },
        "*",
      )
    } catch {
      // ignore — one bad iframe shouldn't kill the broadcast
    }
  }
}

// Each entry is one Edit/MultiEdit's old + new substrings. The receiver
// (iframe-side use-iframe-edit-wiring) walks text nodes searching for either
// substring (prefers newString) and flashes the closest containing element.
export function broadcastSubstrings(
  iframes: readonly IframeLike[],
  strings: readonly { oldString?: string; newString?: string }[],
): void {
  if (strings.length === 0) return
  for (const iframe of iframes) {
    try {
      iframe.contentWindow?.postMessage(
        { type: "forkshop:agent-text", strings: [...strings] },
        "*",
      )
    } catch {
      // ignore
    }
  }
}

// Hello-replay: when a single iframe announces itself via postMessage, reply
// with the current snapshot to that source only. Returns true if a reply was
// sent (i.e. the event was a hello with a valid source); false otherwise.
export function handleAgentHello(
  event: { data?: unknown; source?: PostMessageTarget | null },
  snapshot: { slugs: readonly string[]; strings: readonly { oldString?: string; newString?: string }[] },
): boolean {
  const data = event.data as { type?: string } | null | undefined
  if (data?.type !== "forkshop:agent-hello") return false
  const source = event.source
  if (!source) return false
  try {
    source.postMessage(
      { type: "forkshop:agent-block", slugs: [...snapshot.slugs] },
      "*",
    )
    if (snapshot.strings.length > 0) {
      source.postMessage(
        { type: "forkshop:agent-text", strings: [...snapshot.strings] },
        "*",
      )
    }
  } catch {
    // ignore — caller can't do anything about a failed reply
  }
  return true
}

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
    broadcastBlocks(registry.getAll(), [...activeBlocks])
  }, [registry, activeBlocks])

  // Push: broadcast every active substring to every iframe.
  useEffect(() => {
    if (!registry) return
    broadcastSubstrings(registry.getAll(), allSubstrings)
  }, [registry, allSubstrings])

  // Hello-replay: when an iframe says hello on mount (via use-iframe-edit-
  // wiring's synthesized message event), post the current snapshot back to
  // that specific source only.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      handleAgentHello(
        { data: event.data, source: event.source as PostMessageTarget | null },
        { slugs: [...activeBlocks], strings: allSubstrings },
      )
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [activeBlocks, allSubstrings])

  return null
}
