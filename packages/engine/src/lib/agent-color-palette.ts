// 8 perceptually-uniform OKLCH hues (constant L 0.7, C 0.18, varying H).
// Slot 0 is reserved for Claude (orange), matching the user's design call.
export const AGENT_PALETTE: readonly string[] = [
  "oklch(0.7 0.18 50)",   // 0 — orange   (Claude default)
  "oklch(0.7 0.18 200)",  // 1 — cyan
  "oklch(0.7 0.18 290)",  // 2 — purple   (legacy Forkshop accent)
  "oklch(0.7 0.18 130)",  // 3 — lime
  "oklch(0.7 0.18 340)",  // 4 — magenta
  "oklch(0.7 0.18 250)",  // 5 — blue
  "oklch(0.7 0.18 170)",  // 6 — teal
  "oklch(0.7 0.18 10)",   // 7 — pink
]

const KNOWN_AGENT_SLOTS: Record<string, number> = {
  "claude-code": 0,
}

declare global {
  // eslint-disable-next-line no-var
  var __forkshopAgentColorAssignments: Map<string, number> | undefined
}

const assignments: Map<string, number> = (globalThis.__forkshopAgentColorAssignments ??=
  new Map())

function key(agent: string, sessionId: string): string {
  return `${agent}/${sessionId}`
}

export function getOrAssignColor(agent: string, sessionId: string): string {
  const k = key(agent, sessionId)
  let slot = assignments.get(k)
  if (slot === undefined) {
    slot = pickFreeSlot(agent)
    assignments.set(k, slot)
  }
  return AGENT_PALETTE[slot % AGENT_PALETTE.length]!
}

function pickFreeSlot(agent: string): number {
  const used = new Set(assignments.values())
  const reserved = KNOWN_AGENT_SLOTS[agent]
  if (reserved !== undefined && !used.has(reserved)) return reserved
  for (let i = 0; i < AGENT_PALETTE.length; i++) {
    if (!used.has(i)) return i
  }
  // All slots taken — wrap deterministically based on insertion order.
  return assignments.size % AGENT_PALETTE.length
}

// Test helper. Not exported from the engine's public surface.
export function __resetPaletteForTests(): void {
  assignments.clear()
}
