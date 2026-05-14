export type ActivityEntry = {
  filePath: string
  oldString?: string
  newString?: string
  lastSeenAt: number
}

type Subscriber = (snapshot: ActivityEntry[]) => void

// state and subscribers live on globalThis so HMR re-execution of this module
// in Next.js dev doesn't lose subscribers or split state between module
// instances. The bug without this: an SSE connection subscribes into module
// instance A; a file edit triggers HMR; the POST handler then runs in module
// instance B; broadcast(B) iterates an empty subscriber set and the SSE never
// sees the event.
declare global {
  var __forkshopAgentActivityState: Map<string, ActivityEntry> | undefined
  var __forkshopAgentActivitySubscribers: Set<Subscriber> | undefined
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

if (!globalThis.__forkshopAgentActivityPruneTimer) {
  globalThis.__forkshopAgentActivityPruneTimer = setInterval(pruneIdle, 1000)
}
