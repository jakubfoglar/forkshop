import type { Hunk } from "@forkshop/lib/diff-to-hunks"

export type AgentAction = "read" | "edit" | "create" | "delete"

export type ActivityEntry = {
  filePath: string
  agent: string
  agentLabel: string
  sessionId: string
  color: string
  action: AgentAction
  lastSeenAt: number
  hunks?: ReadonlyArray<Hunk>
  pinned?: boolean
}

type Subscriber = (snapshot: ActivityEntry[]) => void

// Compound key — two concurrent agents (or two sessions of the same agent)
// on the same file both surface as distinct entries.
function entryKey(entry: Pick<ActivityEntry, "agent" | "sessionId" | "filePath">): string {
  return `${entry.agent}/${entry.sessionId}/${entry.filePath}`
}

declare global {
  // eslint-disable-next-line no-var
  var __forkshopAgentActivityState: Map<string, ActivityEntry> | undefined
  // eslint-disable-next-line no-var
  var __forkshopAgentActivitySubscribers: Set<Subscriber> | undefined
  // eslint-disable-next-line no-var
  var __forkshopAgentActivityPruneTimer: ReturnType<typeof setInterval> | undefined
}

const state: Map<string, ActivityEntry> = (globalThis.__forkshopAgentActivityState ??=
  new Map())
const subscribers: Set<Subscriber> = (globalThis.__forkshopAgentActivitySubscribers ??=
  new Set())

const IDLE_MS = 5000

function pruneIdle(): void {
  const now = Date.now()
  let pruned = false
  for (const [key, entry] of state) {
    if (now - entry.lastSeenAt > IDLE_MS) {
      state.delete(key)
      pruned = true
    }
  }
  if (pruned) broadcast()
}

function broadcast(): void {
  const snapshot = [...state.values()]
  for (const subscriber of subscribers) {
    try {
      subscriber(snapshot)
    } catch (error) {
      console.error("[forkshop agent-activity] subscriber threw:", error)
    }
  }
}

export function recordActivity(entry: ActivityEntry): void {
  pruneIdle()
  state.set(entryKey(entry), entry)
  broadcast()
}

export function subscribe(subscriber: Subscriber): () => void {
  subscribers.add(subscriber)
  try {
    subscriber([...state.values()])
  } catch (error) {
    console.error("[forkshop agent-activity] subscriber threw on subscribe:", error)
  }
  return () => {
    subscribers.delete(subscriber)
  }
}

if (!globalThis.__forkshopAgentActivityPruneTimer) {
  globalThis.__forkshopAgentActivityPruneTimer = setInterval(pruneIdle, 1000)
}

// Test helper. Not exported from the engine's public surface.
export function __resetActivityStateForTests(): void {
  state.clear()
  subscribers.clear()
  // Re-register the prune interval so it is captured by fake timers in tests.
  if (globalThis.__forkshopAgentActivityPruneTimer) {
    clearInterval(globalThis.__forkshopAgentActivityPruneTimer)
  }
  globalThis.__forkshopAgentActivityPruneTimer = setInterval(pruneIdle, 1000)
}
