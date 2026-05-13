export type ActivityEntry = {
  filePath: string
  oldString?: string
  newString?: string
  lastSeenAt: number
}

type Subscriber = (snapshot: ActivityEntry[]) => void

const state = new Map<string, ActivityEntry>()
const subscribers = new Set<Subscriber>()
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

export function recordActivity(input: {
  filePath: string
  oldString?: string
  newString?: string
}): void {
  pruneIdle()
  state.set(input.filePath, {
    filePath: input.filePath,
    oldString: input.oldString,
    newString: input.newString,
    lastSeenAt: Date.now(),
  })
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

// Per-process prune timer. Keyed on globalThis so HMR re-execution of this
// module doesn't spawn duplicates.
declare global {
  var __forkshopAgentActivityPruneTimer: ReturnType<typeof setInterval> | undefined
}
if (!globalThis.__forkshopAgentActivityPruneTimer) {
  globalThis.__forkshopAgentActivityPruneTimer = setInterval(pruneIdle, 1000)
}
