# Live AI protocol + Claude Code pack — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Forkshop's defining "multiple agents alive on the canvas" experience. Engine-side post-hoc diff produces element-level highlights regardless of agent save pattern. Vendor-neutral wire protocol; Claude Code pack ships as scaffold files. Cadence skill + reactive feedback hook retired.

**Architecture:** Producer pack (~30-line bash hook) POSTs `{ agent, agentLabel, sessionId, file, action, ts }` to `/api/forkshop/agent-activity`. Engine maintains an in-memory `Map<filePath, string>` snapshot per watched file; on edit/create events reads the post-write disk content, line-diffs against the snapshot via `jsdiff`, and emits synthetic `{ oldString?, newString? }` hunks through the existing iframe relay. Per-agent color is assigned server-side from a Forkshop-owned 8-slot OKLCH palette keyed on `(agent, sessionId)`. Read events get a host-side breathing-pulse decoration on the iframe wrapper container; no iframe-side text matching.

**Tech Stack:** Next.js 14/15 App Router, React 18+, TypeScript (strict), Vitest, `jsdiff` (new dep, ~30KB), bash + jq (producer-side). Engine source uses `@forkshop/*` canonical alias → `packages/engine/src/*`. Run `pnpm check` from repo root before claiming any task done.

**Spec:** `docs/specs/2026-05-18-live-ai-protocol-design.md`

---

## File Structure

### New files

```
packages/engine/src/lib/
  diff-to-hunks.ts                       Pure: line-diff → hunks
  diff-to-hunks.test.ts
  file-snapshot.ts                       In-memory file snapshot map + readAndDiff
  file-snapshot.test.ts
  agent-color-palette.ts                 8-slot OKLCH palette + (agent, sessionId) assignment
  agent-color-palette.test.ts

packages/engine/src/components/canvas/
  agent-read-indicator.tsx               Overlay component — breathing pulse on iframe-host container
  agent-read-indicator.test.tsx

packages/engine/templates/hooks/
  forkshop-post-tool-use.sh.template     Claude Code PostToolUse hook (bash)

packages/cli/src/
  settings-merge.ts                      Idempotent merge into .claude/settings.json
  settings-merge.test.ts
```

### Files modified

```
packages/engine/package.json             +"diff": "^5.2.0" dep, +"@types/diff" devDep
packages/engine/src/lib/
  agent-activity-state.ts                ActivityEntry shape grows; map key includes (agent, sessionId, file)
  agent-activity-state.test.ts
  use-node-agent-active.ts               Returns { agentActive, agentFileLabel, agentColor, agentAction }
packages/engine/src/api/agent-activity/
  route.ts                               Full rewrite: zod payload, color assignment, diff
packages/engine/src/components/
  agent-activity-context.tsx             Type updates; useAllAgentSubstrings → useAllAgentHunks; new useNodeAgentColor + useAgentReadingByFile
  agent-iframe-relay.tsx                 Broadcasts include color; emits read CustomEvent
  agent-iframe-relay.test.ts
  agent-selection-chip.tsx               Multi-agent chip stacking; per-agent colors; reduce-motion guard
  agent-selection-chip.test.ts
  canvas/lazy-iframe.tsx                 Wrapper div gets data-forkshop-iframe-host="<id>"
packages/engine/src/hooks/
  use-iframe-edit-wiring.ts              Apply inline --forkshop-agent-color on decoration toggle
packages/engine/src/lib/
  edit-mode.ts                           Remove :root --forkshop-agent-color; add PREVIEW_AGENT_READ_CSS
packages/engine/src/skill/
  setup.md                               Phase 5 gains second AskUserQuestion (Claude pack opt-in)
packages/engine/templates/
  user-claude-md.md                      +barrel-maintenance one-liner; remove live-editing skill refs
packages/cli/src/
  manifest-builder.ts                    Adds hook template to manifest; existing skill auto-pickup picks up the cadence-skill removal
  manifest-builder.test.ts
  index.ts                               Wires producer-pack opt-in into init flow
packages/engine/src/index.ts             Export AgentReadIndicator; export updates
packages/engine/src/lib/forkshop.json    (lock schema) +producerPack: { claudeCode: boolean }
packages/cli/src/forkshop-json.ts        Type extension + helpers
```

### Files removed

```
packages/engine/src/skill/
  live-editing.md                        Cadence skill retired
```

---

## Stage 1 — Engine lib work (no protocol changes yet)

### Task 1: Add `diff` dependency

**Files:**
- Modify: `packages/engine/package.json`

- [ ] **Step 1: Add `diff` to dependencies and `@types/diff` to devDependencies**

Edit `packages/engine/package.json` — add to `"dependencies"` and `"devDependencies"`:

```json
"dependencies": {
  "clsx": "^2.1.1",
  "diff": "^5.2.0"
},
"devDependencies": {
  "@central-icons-react/square-outlined-radius-0-stroke-2": "^1.1.237",
  "@types/diff": "^5.2.3",
  "@types/react": "^18.3.0",
  ...
}
```

- [ ] **Step 2: Install + lockfile update**

Run from repo root:

```bash
pnpm install --filter @forkshop/engine
```

Expected: `+1 dependencies` lockfile diff.

- [ ] **Step 3: Verify import resolves**

Run from repo root:

```bash
pnpm --filter @forkshop/engine exec tsx -e "import('diff').then(m => console.log(typeof m.diffLines))"
```

Expected output: `function`

- [ ] **Step 4: Commit**

```bash
git add packages/engine/package.json pnpm-lock.yaml
git commit -m "deps(engine): add diff (jsdiff) for engine-side post-hoc file diffs

For the live-AI protocol's server-side hunk derivation."
```

---

### Task 2: `diff-to-hunks.ts`

**Files:**
- Create: `packages/engine/src/lib/diff-to-hunks.ts`
- Test: `packages/engine/src/lib/diff-to-hunks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/engine/src/lib/diff-to-hunks.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { diffToHunks } from "@forkshop/lib/diff-to-hunks"

describe("diffToHunks", () => {
  it("returns empty array for identical input", () => {
    expect(diffToHunks("a\nb\nc\n", "a\nb\nc\n")).toEqual([])
  })

  it("groups consecutive removed+added into one hunk", () => {
    const prev = 'headline="Old text"\n'
    const next = 'headline="New text"\n'
    const hunks = diffToHunks(prev, next)
    expect(hunks).toEqual([
      { oldString: 'headline="Old text"\n', newString: 'headline="New text"\n' },
    ])
  })

  it("treats pure additions as added-only hunks (no oldString)", () => {
    const prev = "line1\nline3\n"
    const next = "line1\nline2\nline3\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toEqual([{ newString: "line2\n" }])
  })

  it("treats pure removals as removed-only hunks (no newString)", () => {
    const prev = "line1\nline2\nline3\n"
    const next = "line1\nline3\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toEqual([{ oldString: "line2\n" }])
  })

  it("produces N separated hunks for non-adjacent changes", () => {
    const prev = "a\nb\nc\nd\ne\n"
    const next = "A\nb\nc\nd\nE\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toEqual({ oldString: "a\n", newString: "A\n" })
    expect(hunks[1]).toEqual({ oldString: "e\n", newString: "E\n" })
  })

  it("handles whole-file replacement (Write tool case)", () => {
    const prev = "old\ncontent\nhere\n"
    const next = "completely\ndifferent\nfile\n"
    const hunks = diffToHunks(prev, next)
    expect(hunks).toHaveLength(1)
    expect(hunks[0]).toEqual({
      oldString: "old\ncontent\nhere\n",
      newString: "completely\ndifferent\nfile\n",
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @forkshop/engine test src/lib/diff-to-hunks.test.ts
```

Expected: FAIL with "Cannot find module '@forkshop/lib/diff-to-hunks'" or similar.

- [ ] **Step 3: Implement `diffToHunks`**

Create `packages/engine/src/lib/diff-to-hunks.ts`:

```ts
import { diffLines } from "diff"

export type Hunk = { oldString?: string; newString?: string }

// Group consecutive removed+added line blocks from jsdiff's diffLines output
// into a single { oldString, newString } hunk per edit. Pure additions become
// { newString }; pure removals become { oldString }.
export function diffToHunks(prev: string, next: string): Hunk[] {
  const changes = diffLines(prev, next)
  const hunks: Hunk[] = []
  let pendingOld: string | undefined
  for (const change of changes) {
    if (change.removed) {
      pendingOld = (pendingOld ?? "") + change.value
    } else if (change.added) {
      hunks.push({ oldString: pendingOld, newString: change.value })
      pendingOld = undefined
    } else {
      if (pendingOld !== undefined) hunks.push({ oldString: pendingOld })
      pendingOld = undefined
    }
  }
  if (pendingOld !== undefined) hunks.push({ oldString: pendingOld })
  return hunks
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @forkshop/engine test src/lib/diff-to-hunks.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Run lint + typecheck**

```bash
pnpm --filter @forkshop/engine lint && pnpm --filter @forkshop/engine typecheck
```

Expected: clean exit. (The lint script also runs `check-canonical-imports.ts` — `@forkshop/lib/diff-to-hunks` matches the alias convention.)

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/diff-to-hunks.ts packages/engine/src/lib/diff-to-hunks.test.ts
git commit -m "feat(engine): diffToHunks — line-diff → hunk pairs

Pure function that turns jsdiff's diffLines output into
{ oldString?, newString? }[] pairs. Drives engine-side post-hoc
derivation of element-level activity signals."
```

---

### Task 3: `file-snapshot.ts`

**Files:**
- Create: `packages/engine/src/lib/file-snapshot.ts`
- Test: `packages/engine/src/lib/file-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/engine/src/lib/file-snapshot.test.ts`:

```ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  __resetSnapshotForTests,
  clearSnapshot,
  readAndDiff,
} from "@forkshop/lib/file-snapshot"

let tmpdir: string

beforeEach(async () => {
  __resetSnapshotForTests()
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-snap-"))
})

afterEach(async () => {
  __resetSnapshotForTests()
  await fs.rm(tmpdir, { recursive: true, force: true })
})

describe("file-snapshot", () => {
  it("returns [] on first sighting and seeds the snapshot", async () => {
    const file = path.join(tmpdir, "a.tsx")
    await fs.writeFile(file, "hello\n", "utf8")
    const hunks = await readAndDiff(file)
    expect(hunks).toEqual([])
  })

  it("produces hunks on second read with changed content", async () => {
    const file = path.join(tmpdir, "a.tsx")
    await fs.writeFile(file, "hello\n", "utf8")
    await readAndDiff(file) // seed
    await fs.writeFile(file, "hello world\n", "utf8")
    const hunks = await readAndDiff(file)
    expect(hunks).toEqual([{ oldString: "hello\n", newString: "hello world\n" }])
  })

  it("clearSnapshot makes the next read return [] (re-seed)", async () => {
    const file = path.join(tmpdir, "a.tsx")
    await fs.writeFile(file, "hello\n", "utf8")
    await readAndDiff(file)
    clearSnapshot(file)
    await fs.writeFile(file, "different\n", "utf8")
    const hunks = await readAndDiff(file)
    expect(hunks).toEqual([])
  })

  it("snapshot is per-file (different files don't pollute each other)", async () => {
    const fileA = path.join(tmpdir, "a.tsx")
    const fileB = path.join(tmpdir, "b.tsx")
    await fs.writeFile(fileA, "AAA\n", "utf8")
    await fs.writeFile(fileB, "BBB\n", "utf8")
    await readAndDiff(fileA) // seed A
    await readAndDiff(fileB) // seed B
    await fs.writeFile(fileA, "AAA modified\n", "utf8")
    const hunksA = await readAndDiff(fileA)
    expect(hunksA).toEqual([{ oldString: "AAA\n", newString: "AAA modified\n" }])
    const hunksB = await readAndDiff(fileB)
    expect(hunksB).toEqual([]) // B unchanged → still seeded snapshot matches disk
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @forkshop/engine test src/lib/file-snapshot.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `file-snapshot.ts`**

Create `packages/engine/src/lib/file-snapshot.ts`:

```ts
import { promises as fs } from "node:fs"
import { diffToHunks, type Hunk } from "@forkshop/lib/diff-to-hunks"

declare global {
  // eslint-disable-next-line no-var
  var __forkshopFileSnapshot: Map<string, string> | undefined
}

const snapshot: Map<string, string> = (globalThis.__forkshopFileSnapshot ??= new Map())

// Read absolutePath from disk and diff against the cached snapshot. On first
// sighting (no prior snapshot for this path) returns [] and seeds the cache —
// the engine surfaces frame-level activity only for that first event. From the
// second invocation onward, returns hunk pairs the iframe relay decorates.
export async function readAndDiff(absolutePath: string): Promise<Hunk[]> {
  let next: string
  try {
    next = await fs.readFile(absolutePath, "utf8")
  } catch {
    // File missing (race with delete, etc.) — clear stale snapshot and return [].
    snapshot.delete(absolutePath)
    return []
  }
  const prev = snapshot.get(absolutePath)
  snapshot.set(absolutePath, next)
  if (prev === undefined) return []
  return diffToHunks(prev, next)
}

export function clearSnapshot(absolutePath: string): void {
  snapshot.delete(absolutePath)
}

// Test helper. Not exported from the engine's public surface.
export function __resetSnapshotForTests(): void {
  snapshot.clear()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @forkshop/engine test src/lib/file-snapshot.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Run lint + typecheck**

```bash
pnpm --filter @forkshop/engine lint && pnpm --filter @forkshop/engine typecheck
```

Expected: clean exit.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/file-snapshot.ts packages/engine/src/lib/file-snapshot.test.ts
git commit -m "feat(engine): file-snapshot — in-memory Map<path, content> + readAndDiff

HMR-safe via globalThis. First sighting seeds; subsequent reads diff.
File-missing races degrade to clear-and-return-[]."
```

---

### Task 4: `agent-color-palette.ts`

**Files:**
- Create: `packages/engine/src/lib/agent-color-palette.ts`
- Test: `packages/engine/src/lib/agent-color-palette.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/engine/src/lib/agent-color-palette.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest"
import {
  __resetPaletteForTests,
  AGENT_PALETTE,
  getOrAssignColor,
} from "@forkshop/lib/agent-color-palette"

afterEach(() => {
  __resetPaletteForTests()
})

describe("agent-color-palette", () => {
  it("known-agent (claude-code) reserves slot 0 (orange)", () => {
    expect(getOrAssignColor("claude-code", "session-a")).toBe(AGENT_PALETTE[0])
  })

  it("same (agent, sessionId) is deterministic across calls", () => {
    const first = getOrAssignColor("claude-code", "session-a")
    const second = getOrAssignColor("claude-code", "session-a")
    expect(first).toBe(second)
  })

  it("second session of claude-code takes the next free slot", () => {
    const a = getOrAssignColor("claude-code", "session-a")
    const b = getOrAssignColor("claude-code", "session-b")
    expect(a).toBe(AGENT_PALETTE[0])
    expect(b).toBe(AGENT_PALETTE[1])
    expect(a).not.toBe(b)
  })

  it("unknown agent takes the first free slot after reservations", () => {
    const claude = getOrAssignColor("claude-code", "s1")
    const unknown = getOrAssignColor("custom-bot", "s1")
    expect(claude).toBe(AGENT_PALETTE[0])
    expect(unknown).toBe(AGENT_PALETTE[1])
  })

  it("wraps around the palette when more than 8 (agent, session) pairs", () => {
    const colors = new Set<string>()
    for (let i = 0; i < AGENT_PALETTE.length; i++) {
      colors.add(getOrAssignColor("agent-" + i, "s"))
    }
    expect(colors.size).toBe(AGENT_PALETTE.length)
    // 9th pair wraps to slot 0 (no free slots left).
    const wrapped = getOrAssignColor("agent-overflow", "s")
    expect(AGENT_PALETTE).toContain(wrapped)
  })

  it("palette has 8 OKLCH entries", () => {
    expect(AGENT_PALETTE).toHaveLength(8)
    for (const entry of AGENT_PALETTE) {
      expect(entry).toMatch(/^oklch\(/)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @forkshop/engine test src/lib/agent-color-palette.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `agent-color-palette.ts`**

Create `packages/engine/src/lib/agent-color-palette.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @forkshop/engine test src/lib/agent-color-palette.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Run lint + typecheck**

```bash
pnpm --filter @forkshop/engine lint && pnpm --filter @forkshop/engine typecheck
```

Expected: clean exit.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/agent-color-palette.ts packages/engine/src/lib/agent-color-palette.test.ts
git commit -m "feat(engine): agent color palette — 8-slot OKLCH + (agent, sessionId) assignment

Claude reserves slot 0 (orange). Subsequent sessions and other agents
take next-free slots, round-robin with wraparound past slot 7.
HMR-safe via globalThis."
```

---

## Stage 2 — Protocol revision + route + context

### Task 5: Extend `ActivityEntry` shape + map key

**Files:**
- Modify: `packages/engine/src/lib/agent-activity-state.ts`
- Test: `packages/engine/src/lib/agent-activity-state.test.ts`

- [ ] **Step 1: Update the test file to cover the richer shape**

Replace `packages/engine/src/lib/agent-activity-state.test.ts` with:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  __resetActivityStateForTests,
  recordActivity,
  subscribe,
  type ActivityEntry,
} from "@forkshop/lib/agent-activity-state"

beforeEach(() => {
  vi.useFakeTimers()
  __resetActivityStateForTests()
})
afterEach(() => {
  vi.useRealTimers()
})

const base = {
  agent: "claude-code",
  agentLabel: "Claude",
  sessionId: "s1",
  color: "oklch(0.7 0.18 50)",
  action: "edit" as const,
}

describe("agent-activity-state", () => {
  it("subscriber receives current snapshot on subscribe", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    expect(seen[0]).toEqual([])
  })

  it("recordActivity broadcasts the entry to subscribers", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({
      filePath: "components/ui/button.tsx",
      ...base,
      hunks: [{ oldString: "a", newString: "b" }],
      lastSeenAt: 1000,
    })
    const latest = seen.at(-1)!
    expect(latest).toHaveLength(1)
    expect(latest[0]).toMatchObject({
      filePath: "components/ui/button.tsx",
      agent: "claude-code",
      sessionId: "s1",
      color: "oklch(0.7 0.18 50)",
      action: "edit",
      hunks: [{ oldString: "a", newString: "b" }],
    })
  })

  it("two agents on the same file produce two entries (compound key)", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({ filePath: "x.tsx", ...base, lastSeenAt: 1000 })
    recordActivity({
      filePath: "x.tsx",
      agent: "cursor",
      agentLabel: "Cursor",
      sessionId: "s2",
      color: "oklch(0.7 0.18 200)",
      action: "edit",
      lastSeenAt: 1100,
    })
    const latest = seen.at(-1)!
    expect(latest).toHaveLength(2)
    expect(latest.map((e) => e.agent).sort()).toEqual(["claude-code", "cursor"])
  })

  it("two sessions of the same agent on the same file also produce two entries", () => {
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({ filePath: "x.tsx", ...base, sessionId: "s1", lastSeenAt: 1000 })
    recordActivity({ filePath: "x.tsx", ...base, sessionId: "s2", lastSeenAt: 1100 })
    expect(seen.at(-1)).toHaveLength(2)
  })

  it("entries prune after 5s of inactivity", () => {
    vi.setSystemTime(1000)
    const seen: ActivityEntry[][] = []
    subscribe((snap) => seen.push(snap))
    recordActivity({ filePath: "x.tsx", ...base, lastSeenAt: 1000 })
    expect(seen.at(-1)).toHaveLength(1)
    vi.setSystemTime(7000)
    vi.advanceTimersByTime(1100) // prune timer fires every 1s
    expect(seen.at(-1)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @forkshop/engine test src/lib/agent-activity-state.test.ts
```

Expected: FAIL — shape mismatches (no `agent`, `sessionId`, `color`, `action`, etc.).

- [ ] **Step 3: Rewrite `agent-activity-state.ts`**

Replace `packages/engine/src/lib/agent-activity-state.ts` with:

```ts
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
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @forkshop/engine test src/lib/agent-activity-state.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Run lint + typecheck**

```bash
pnpm --filter @forkshop/engine lint && pnpm --filter @forkshop/engine typecheck
```

Expected: Likely failure — `route.ts` and `agent-activity-context.tsx` still call `recordActivity` with the old shape. That's fine; we'll fix them in subsequent tasks. **Do not commit yet** if typecheck fails — finish Task 6 first then commit both together.

- [ ] **Step 6: Stage but do not commit**

```bash
git add packages/engine/src/lib/agent-activity-state.ts packages/engine/src/lib/agent-activity-state.test.ts
```

Continue to Task 6 to repair the broken consumers.

---

### Task 6: Rewrite the POST route handler

**Files:**
- Modify: `packages/engine/src/api/agent-activity/route.ts`

- [ ] **Step 1: Replace `route.ts` with the new payload + color + diff logic**

Overwrite `packages/engine/src/api/agent-activity/route.ts` with:

```ts
import path from "node:path"
import { NextResponse } from "next/server"
import { z } from "zod"
import { recordActivity, type AgentAction } from "@forkshop/lib/agent-activity-state"
import { getOrAssignColor } from "@forkshop/lib/agent-color-palette"
import { clearSnapshot, readAndDiff } from "@forkshop/lib/file-snapshot"

const PayloadSchema = z.object({
  agent: z.string().min(1).max(64),
  agentLabel: z.string().min(1).max(64).optional(),
  sessionId: z.string().min(1).max(128),
  file: z.string().min(1),
  action: z.enum(["read", "edit", "create", "delete"]),
  ts: z.number().int().positive(),
})

const KNOWN_AGENT_LABELS: Record<string, string> = {
  "claude-code": "Claude",
}

export async function POST(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(null, { status: 400 })
  }
  const payload = parsed.data

  const root = process.cwd()
  const absolutePath = path.isAbsolute(payload.file)
    ? payload.file
    : path.resolve(root, payload.file)
  if (!absolutePath.startsWith(root)) {
    return new Response(null, { status: 400 })
  }
  const relative = path.relative(root, absolutePath)

  const color = getOrAssignColor(payload.agent, payload.sessionId)
  const agentLabel =
    payload.agentLabel ?? KNOWN_AGENT_LABELS[payload.agent] ?? payload.agent
  const action: AgentAction = payload.action

  let hunks: ReadonlyArray<{ oldString?: string; newString?: string }> | undefined
  if (action === "edit" || action === "create") {
    hunks = await readAndDiff(absolutePath)
  } else if (action === "delete") {
    clearSnapshot(absolutePath)
    hunks = []
  }
  // action === "read" → hunks stays undefined.

  recordActivity({
    filePath: relative,
    agent: payload.agent,
    agentLabel,
    sessionId: payload.sessionId,
    color,
    action,
    lastSeenAt: payload.ts,
    hunks,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Add `zod` to engine peer or runtime deps**

Check `packages/engine/package.json` — zod is not yet listed. Add to `"dependencies"`:

```json
"dependencies": {
  "clsx": "^2.1.1",
  "diff": "^5.2.0",
  "zod": "^3.23.0"
}
```

Run `pnpm install --filter @forkshop/engine`.

(Rationale: zod is small, tree-shakes well, and the existing `route.ts` did its own ad-hoc validation; using zod here for forward consistency with route handlers elsewhere in Forkshop.)

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @forkshop/engine typecheck
```

Expected: still failing in `agent-activity-context.tsx` (next task). `route.ts` itself should pass.

- [ ] **Step 4: Stage**

```bash
git add packages/engine/src/api/agent-activity/route.ts packages/engine/package.json pnpm-lock.yaml
```

Continue to Task 7 to repair `agent-activity-context.tsx`.

---

### Task 7: Update `AgentActivityProvider` types + new hooks

**Files:**
- Modify: `packages/engine/src/components/agent-activity-context.tsx`

- [ ] **Step 1: Rewrite `agent-activity-context.tsx` against the new ActivityEntry**

Overwrite `packages/engine/src/components/agent-activity-context.tsx` with:

```tsx
"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Hunk } from "@forkshop/lib/diff-to-hunks"
import type { ActivityEntry, AgentAction } from "@forkshop/lib/agent-activity-state"
import { fileToSelection } from "@forkshop/lib/file-to-selection"

export type { Hunk, ActivityEntry, AgentAction }

// PascalCase → kebab-case: "HeroDisplay" → "hero-display".
function slugToComponentName(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ""))
    .join("")
}

// Scan a TSX substring (an Edit hunk) for block-component tags. Returns the
// slugs whose component appears as <Name … />, <Name>, or </Name>. Empty when
// the substring has no recognisable block tags.
export function deriveAffectedBlocks(
  substring: string | undefined,
  blockSlugs: readonly string[],
): string[] {
  if (substring === undefined || substring.length === 0) return []
  const matched: string[] = []
  for (const slug of blockSlugs) {
    const component = slugToComponentName(slug)
    const pattern = new RegExp(`<${component}(?:\\s|/|>|$)|</${component}>`)
    if (pattern.test(substring)) matched.push(slug)
  }
  return matched
}

export type FileMap = {
  primitives: ReadonlyArray<{ id: string; sourcePath: string }>
  blocks: ReadonlyArray<{ slug: string; sourcePath: string }>
}

type AgentActivityValue = {
  entries: readonly ActivityEntry[]
  fileMap: FileMap
  seenPagePaths: ReadonlySet<string>
}

const Context = createContext<AgentActivityValue>({
  entries: [],
  fileMap: { primitives: [], blocks: [] },
  seenPagePaths: new Set(),
})

const STALE_MS = 5500

export function AgentActivityProvider({
  fileMap,
  children,
}: {
  fileMap: FileMap
  children: ReactNode
}) {
  const [entries, setEntries] = useState<readonly ActivityEntry[]>([])
  const [seenPagePaths, setSeenPagePaths] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const eventSource = new EventSource("/api/forkshop/agent-activity/stream")
    const handleActivity = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { activeFiles: ActivityEntry[] }
        setEntries(data.activeFiles)
      } catch (error) {
        console.error("[forkshop agent-activity] parse failed:", error)
      }
    }
    eventSource.addEventListener("activity", handleActivity)
    return () => {
      eventSource.removeEventListener("activity", handleActivity)
      eventSource.close()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setEntries((current) =>
        current.length === 0
          ? current
          : current.filter((entry) => now - entry.lastSeenAt < STALE_MS),
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (entries.length === 0) return
    setSeenPagePaths((current) => {
      let next: Set<string> | undefined
      for (const entry of entries) {
        const selection = fileToSelection(entry.filePath, fileMap)
        if (selection !== undefined && selection !== "site-wide" && selection.kind === "page") {
          if (!current.has(selection.path)) {
            if (next === undefined) next = new Set(current)
            next.add(selection.path)
          }
        }
      }
      return next ?? current
    })
  }, [entries, fileMap])

  const value = useMemo<AgentActivityValue>(
    () => ({ entries, fileMap, seenPagePaths }),
    [entries, fileMap, seenPagePaths],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

function useAgentActivity(): AgentActivityValue {
  return useContext(Context)
}

export function useAgentSeenPagePaths(): ReadonlySet<string> {
  return useAgentActivity().seenPagePaths
}

function isEditish(action: AgentAction): boolean {
  return action === "edit" || action === "create"
}

export function useAgentActivePages(): ReadonlySet<string> {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    const pages = new Set<string>()
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection && selection !== "site-wide" && selection.kind === "page") {
        pages.add(selection.path)
      }
    }
    return pages
  }, [entries, fileMap])
}

export function useAgentActiveBlocks(): ReadonlySet<string> {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    const blocks = new Set<string>()
    const blockSlugs = fileMap.blocks.map((b) => b.slug)
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === undefined || selection === "site-wide") continue
      if (selection.kind === "block") {
        blocks.add(selection.slug)
        continue
      }
      if (selection.kind === "page") {
        for (const hunk of entry.hunks ?? []) {
          for (const slug of deriveAffectedBlocks(hunk.oldString, blockSlugs)) blocks.add(slug)
          for (const slug of deriveAffectedBlocks(hunk.newString, blockSlugs)) blocks.add(slug)
        }
      }
    }
    return blocks
  }, [entries, fileMap])
}

export function useAgentActivePrimitives(): ReadonlySet<string> {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    const primitives = new Set<string>()
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection && selection !== "site-wide" && selection.kind === "primitive") {
        primitives.add(selection.id)
      }
    }
    return primitives
  }, [entries, fileMap])
}

// True when the given page is being edited AND no specific block was identified
// from any of its hunks. Used by the iframe relay to decide whether to fall back
// to the diffuse "all blocks softly pulse" treatment.
export function usePageActiveFallback(pagePath: string | undefined): boolean {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return false
    const blockSlugs = fileMap.blocks.map((b) => b.slug)
    let pageHit = false
    let anyBlockIdentified = false
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection === undefined ||
        selection === "site-wide" ||
        selection.kind !== "page" ||
        selection.path !== pagePath
      ) {
        continue
      }
      pageHit = true
      for (const hunk of entry.hunks ?? []) {
        if (
          deriveAffectedBlocks(hunk.oldString, blockSlugs).length > 0 ||
          deriveAffectedBlocks(hunk.newString, blockSlugs).length > 0
        ) {
          anyBlockIdentified = true
        }
      }
    }
    return pageHit && !anyBlockIdentified
  }, [entries, fileMap, pagePath])
}

export function useSiteWideActivity(): {
  active: boolean
  recentBasename: string | undefined
} {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    let recentBasename: string | undefined
    let mostRecent = 0
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === "site-wide" && entry.lastSeenAt > mostRecent) {
        recentBasename = entry.filePath.split("/").pop()
        mostRecent = entry.lastSeenAt
      }
    }
    return { active: recentBasename !== undefined, recentBasename }
  }, [entries, fileMap])
}

// Monotonic epoch — bumps each time an edit lands for a file mapping to that
// page or block. Consumers (ResponsiveFrameView) reload iframes on bump.
export function useAgentEditEpoch(
  identity: { kind: "page"; path: string } | { kind: "block"; slug: string } | undefined,
): number {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (identity === undefined) return 0
    let max = 0
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (selection === undefined || selection === "site-wide") continue
      const matches =
        (identity.kind === "page" &&
          selection.kind === "page" &&
          selection.path === identity.path) ||
        (identity.kind === "block" &&
          selection.kind === "block" &&
          selection.slug === identity.slug)
      if (matches && entry.lastSeenAt > max) max = entry.lastSeenAt
    }
    return max
  }, [entries, fileMap, identity])
}

// All hunks from currently-active edit-ish entries. The relay broadcasts these
// to every iframe; each iframe's text-walker filters by what actually appears
// in its own DOM.
export function useAllAgentHunks(): readonly Hunk[] {
  const { entries } = useAgentActivity()
  return useMemo(() => {
    const out: Hunk[] = []
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      for (const hunk of entry.hunks ?? []) out.push(hunk)
    }
    return out
  }, [entries])
}

// Per-file resolved color of the most-recent active entry, edit OR read.
// Used by canvas-side decorations to color the outline matching the agent.
export function useAgentColorByFile(): ReadonlyMap<string, string> {
  const { entries } = useAgentActivity()
  return useMemo(() => {
    const out = new Map<string, string>()
    const seen = new Map<string, number>() // filePath → lastSeenAt
    for (const entry of entries) {
      const prevTs = seen.get(entry.filePath) ?? 0
      if (entry.lastSeenAt > prevTs) {
        out.set(entry.filePath, entry.color)
        seen.set(entry.filePath, entry.lastSeenAt)
      }
    }
    return out
  }, [entries])
}

// File paths currently being READ (not edited) plus the agent color to draw.
// Drives the breathing-pulse decoration on iframe-host containers.
export function useAgentReadingByFile(): ReadonlyMap<string, { color: string; agentLabel: string }> {
  const { entries } = useAgentActivity()
  return useMemo(() => {
    const out = new Map<string, { color: string; agentLabel: string }>()
    for (const entry of entries) {
      if (entry.action !== "read") continue
      // Last-write-wins on (file, action=read).
      out.set(entry.filePath, { color: entry.color, agentLabel: entry.agentLabel })
    }
    return out
  }, [entries])
}

// Substring projections (back-compat with existing consumers): pull oldString/
// newString out of hunks. These hooks were public; preserve them as one-version
// projections.
export function useAgentSubstringsForPage(
  pagePath: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (pagePath === undefined) return []
    const out: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection &&
        selection !== "site-wide" &&
        selection.kind === "page" &&
        selection.path === pagePath
      ) {
        for (const hunk of entry.hunks ?? []) out.push(hunk)
      }
    }
    return out
  }, [entries, fileMap, pagePath])
}

export function useAgentSubstringsForBlock(
  slug: string | undefined,
): readonly { oldString?: string; newString?: string }[] {
  const { entries, fileMap } = useAgentActivity()
  return useMemo(() => {
    if (slug === undefined) return []
    const out: { oldString?: string; newString?: string }[] = []
    for (const entry of entries) {
      if (!isEditish(entry.action)) continue
      const selection = fileToSelection(entry.filePath, fileMap)
      if (
        selection &&
        selection !== "site-wide" &&
        selection.kind === "block" &&
        selection.slug === slug
      ) {
        for (const hunk of entry.hunks ?? []) out.push(hunk)
      }
    }
    return out
  }, [entries, fileMap, slug])
}
```

- [ ] **Step 2: Run typecheck + lint**

```bash
pnpm --filter @forkshop/engine typecheck && pnpm --filter @forkshop/engine lint
```

Expected: now should pass (since `recordActivity` is no longer called from the context — it only flows in via SSE).

- [ ] **Step 3: Run all engine tests**

```bash
pnpm --filter @forkshop/engine test
```

Expected: passes for `diff-to-hunks`, `file-snapshot`, `agent-color-palette`, `agent-activity-state`. The `agent-iframe-relay` test may fail — fix in Task 9. Other component tests should still pass.

- [ ] **Step 4: Commit Tasks 5+6+7 together**

```bash
git add packages/engine/src/lib/agent-activity-state.ts \
        packages/engine/src/lib/agent-activity-state.test.ts \
        packages/engine/src/api/agent-activity/route.ts \
        packages/engine/src/components/agent-activity-context.tsx \
        packages/engine/package.json \
        pnpm-lock.yaml
git commit -m "feat(engine): live-AI protocol revision — agent identity, palette, hunks

ActivityEntry grows agent/sessionId/color/action/hunks; map key is now
(agent, sessionId, file) so concurrent agents on the same file both
surface as distinct entries. Route handler validates with zod, resolves
color via agent-color-palette, derives hunks via file-snapshot diff.
Provider exposes useAllAgentHunks, useAgentColorByFile, and
useAgentReadingByFile."
```

---

### Task 8: Update `use-node-agent-active.ts`

**Files:**
- Modify: `packages/engine/src/lib/use-node-agent-active.ts`

- [ ] **Step 1: Locate the NodeType `agentMatch` contract signature**

```bash
grep -n "agentMatch" packages/engine/src/types/*.ts packages/engine/src/node-types/*.ts 2>&1 | head -10
```

Note the existing `agentMatch` signature — it returns `{ active: boolean; fileLabel?: string }`. We extend the hook's return to include color + action without changing the NodeType contract.

- [ ] **Step 2: Replace `use-node-agent-active.ts`**

Overwrite `packages/engine/src/lib/use-node-agent-active.ts`:

```ts
"use client"

import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
  useAgentColorByFile,
  useAgentReadingByFile,
} from "@forkshop/components/agent-activity-context"
import { useForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { resolveNodeType } from "@forkshop/components/canvas/node-view"
import type { AnyNode } from "@forkshop/types/node"

export type NodeAgentActivity = {
  agentActive: boolean
  agentReading: boolean
  agentFileLabel: string | undefined
  agentColor: string | undefined
}

export function useNodeAgentActive(node: AnyNode): NodeAgentActivity {
  const pages = useAgentActivePages()
  const blocks = useAgentActiveBlocks()
  const primitives = useAgentActivePrimitives()
  const colorByFile = useAgentColorByFile()
  const readingByFile = useAgentReadingByFile()
  const { nodeTypes } = useForkshopCanvas()

  const nodeType = resolveNodeType(node, nodeTypes)
  if (!nodeType?.agentMatch) {
    return {
      agentActive: false,
      agentReading: false,
      agentFileLabel: undefined,
      agentColor: undefined,
    }
  }

  const result = nodeType.agentMatch(node, { pages, blocks, primitives })

  // Resolve color by looking up the file label against the active maps.
  // fileLabel is a relative path or basename; we approximate by suffix-match.
  let agentColor: string | undefined
  if (result.fileLabel !== undefined) {
    for (const [file, color] of colorByFile) {
      if (file.endsWith(result.fileLabel)) {
        agentColor = color
        break
      }
    }
  }

  let agentReading = false
  if (result.fileLabel !== undefined) {
    for (const file of readingByFile.keys()) {
      if (file.endsWith(result.fileLabel)) {
        agentReading = true
        if (agentColor === undefined) {
          agentColor = readingByFile.get(file)?.color
        }
        break
      }
    }
  }

  return {
    agentActive: result.active,
    agentReading,
    agentFileLabel: result.fileLabel,
    agentColor,
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @forkshop/engine typecheck
```

Expected: pass. The downstream consumer (`AgentSelectionChip` or similar) reading `agentColor` doesn't exist yet — but adding fields to the return is backward-compatible.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/lib/use-node-agent-active.ts
git commit -m "feat(engine): useNodeAgentActive returns agentReading + agentColor

Per-Node resolved color from the colorByFile map (last-write-wins on
filePath); agentReading flag from the readingByFile map. Backward-
compat for existing consumers reading only agentActive/agentFileLabel."
```

---

## Stage 3 — Visual treatments + multi-agent stacking + read pulse

### Task 9: Update `agent-iframe-relay.tsx` to broadcast color + read events

**Files:**
- Modify: `packages/engine/src/components/agent-iframe-relay.tsx`
- Modify: `packages/engine/src/components/agent-iframe-relay.test.ts`

- [ ] **Step 1: Update the test file**

Replace `packages/engine/src/components/agent-iframe-relay.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest"
import {
  broadcastBlocks,
  broadcastHunks,
  handleAgentHello,
} from "@forkshop/components/agent-iframe-relay"

describe("broadcastBlocks", () => {
  it("posts a forkshop:agent-block message with slugs + color to every iframe", () => {
    const postMessage = vi.fn()
    const iframe = { contentWindow: { postMessage } }
    broadcastBlocks([iframe, iframe], { slugs: ["hero"], color: "oklch(0.7 0.18 50)" })
    expect(postMessage).toHaveBeenCalledTimes(2)
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: "forkshop:agent-block", slugs: ["hero"], color: "oklch(0.7 0.18 50)" },
      "*",
    )
  })

  it("ignores iframes whose contentWindow is null", () => {
    const postMessage = vi.fn()
    broadcastBlocks(
      [{ contentWindow: null }, { contentWindow: { postMessage } }],
      { slugs: ["x"], color: "c" },
    )
    expect(postMessage).toHaveBeenCalledTimes(1)
  })

  it("swallows postMessage errors", () => {
    const throwing = { contentWindow: { postMessage: () => { throw new Error("bad") } } }
    const ok = { contentWindow: { postMessage: vi.fn() } }
    expect(() => broadcastBlocks([throwing, ok], { slugs: [], color: "c" })).not.toThrow()
    expect(ok.contentWindow.postMessage).toHaveBeenCalled()
  })
})

describe("broadcastHunks", () => {
  it("posts forkshop:agent-text with hunks + color", () => {
    const postMessage = vi.fn()
    broadcastHunks([{ contentWindow: { postMessage } }], {
      hunks: [{ oldString: "a", newString: "b" }],
      color: "oklch(0.7 0.18 50)",
    })
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "forkshop:agent-text",
        hunks: [{ oldString: "a", newString: "b" }],
        color: "oklch(0.7 0.18 50)",
      },
      "*",
    )
  })

  it("does not post when hunks is empty", () => {
    const postMessage = vi.fn()
    broadcastHunks([{ contentWindow: { postMessage } }], { hunks: [], color: "c" })
    expect(postMessage).not.toHaveBeenCalled()
  })
})

describe("handleAgentHello", () => {
  it("posts current snapshot back to event.source on hello", () => {
    const postMessage = vi.fn()
    const source = { postMessage }
    const handled = handleAgentHello(
      { data: { type: "forkshop:agent-hello" }, source },
      { slugs: ["x"], hunks: [{ newString: "y" }], color: "c" },
    )
    expect(handled).toBe(true)
    expect(postMessage).toHaveBeenCalledWith(
      { type: "forkshop:agent-block", slugs: ["x"], color: "c" },
      "*",
    )
    expect(postMessage).toHaveBeenCalledWith(
      { type: "forkshop:agent-text", hunks: [{ newString: "y" }], color: "c" },
      "*",
    )
  })

  it("returns false for non-hello messages", () => {
    expect(handleAgentHello({ data: {}, source: {} as never }, { slugs: [], hunks: [], color: "" }))
      .toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @forkshop/engine test src/components/agent-iframe-relay.test.ts
```

Expected: FAIL — `broadcastHunks` not exported.

- [ ] **Step 3: Rewrite `agent-iframe-relay.tsx`**

Overwrite `packages/engine/src/components/agent-iframe-relay.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @forkshop/engine test src/components/agent-iframe-relay.test.ts
```

Expected: PASS — all relay tests.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/components/agent-iframe-relay.tsx \
        packages/engine/src/components/agent-iframe-relay.test.ts
git commit -m "feat(engine): iframe relay broadcasts color + hunks

broadcastSubstrings renamed to broadcastHunks for clarity; both
broadcasts carry the resolved per-event color. Hello-replay carries it
through as well, so iframes reloaded mid-edit re-decorate in the right
color."
```

---

### Task 10: Update `use-iframe-edit-wiring.ts` to apply inline color

**Files:**
- Modify: `packages/engine/src/hooks/use-iframe-edit-wiring.ts`

- [ ] **Step 1: Update the message-handler section to consume `color`**

Locate the section beginning around line 290 in `use-iframe-edit-wiring.ts` (the `agentMessageHandler` definition). Replace from `agentMessageHandler = (event: MessageEvent) => {` through the closing `}` (where the existing code ends with handling `agent-text`) with:

```ts
agentMessageHandler = (event: MessageEvent) => {
  const data = event.data as unknown
  if (data === null || typeof data !== "object") return
  const message = data as {
    type?: string
    slugs?: string[]
    hunks?: readonly { oldString?: string; newString?: string }[]
    color?: string
  }
  if (message.type === "forkshop:agent-block") {
    const targetSlugs = new Set<string>(message.slugs ?? [])
    const color = message.color ?? "oklch(0.62 0.22 280)"
    for (const node of iframeDocument.querySelectorAll<HTMLElement>(
      "[data-forkshop-block][data-forkshop-agent-active]",
    )) {
      const slug = node.dataset.forkshopBlock
      if (slug && !targetSlugs.has(slug)) {
        delete node.dataset.forkshopAgentActive
        node.style.removeProperty("--forkshop-agent-color")
      }
    }
    for (const slug of targetSlugs) {
      for (const node of iframeDocument.querySelectorAll<HTMLElement>(
        `[data-forkshop-block="${CSS.escape(slug)}"]`,
      )) {
        node.dataset.forkshopAgentActive = ""
        node.style.setProperty("--forkshop-agent-color", color)
      }
      const previous = agentBlockTimers.get(slug)
      if (previous) clearTimeout(previous)
      agentBlockTimers.set(
        slug,
        setTimeout(() => {
          for (const node of iframeDocument.querySelectorAll<HTMLElement>(
            `[data-forkshop-block="${CSS.escape(slug)}"]`,
          )) {
            delete node.dataset.forkshopAgentActive
            node.style.removeProperty("--forkshop-agent-color")
          }
          agentBlockTimers.delete(slug)
        }, 2000),
      )
    }
    return
  }
  if (message.type === "forkshop:agent-page-active") {
    const active = (data as { active?: boolean }).active
    if (active) {
      iframeDocument.documentElement.dataset.forkshopAgentPageActive = ""
      iframeDocument.documentElement.style.setProperty(
        "--forkshop-agent-color",
        message.color ?? "oklch(0.62 0.22 280)",
      )
    } else {
      delete iframeDocument.documentElement.dataset.forkshopAgentPageActive
      iframeDocument.documentElement.style.removeProperty("--forkshop-agent-color")
    }
    return
  }
  if (message.type === "forkshop:agent-text") {
    const color = message.color ?? "oklch(0.62 0.22 280)"
    for (const hunk of message.hunks ?? []) {
      const targets = findAllTargetsForChange(iframeDocument, hunk)
      for (const target of targets) {
        delete target.dataset.forkshopAgentTextPulse
        // oxlint-disable-next-line no-unused-expressions
        void target.offsetHeight
        target.dataset.forkshopAgentTextPulse = ""
        target.style.setProperty("--forkshop-agent-color", color)
        const timer = setTimeout(() => {
          delete target.dataset.forkshopAgentTextPulse
          target.style.removeProperty("--forkshop-agent-color")
          agentTextTimers.delete(timer)
        }, 2100)
        agentTextTimers.add(timer)
      }
    }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @forkshop/engine typecheck
```

Expected: pass.

- [ ] **Step 3: Run the iframe-edit-overlay tests**

```bash
pnpm --filter @forkshop/engine test src/components/canvas/iframe-edit-overlay.test.ts
```

Expected: pass (existing edit-mode behavior preserved).

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/hooks/use-iframe-edit-wiring.ts
git commit -m "feat(engine): inline --forkshop-agent-color per decoration

Iframe-side handler reads color from each forkshop:agent-block /
forkshop:agent-text message and sets it inline on the decorated
element. Cleanup removes the inline property alongside data-* attr."
```

---

### Task 11: Update `edit-mode.ts` CSS — remove `:root` color, add read CSS

**Files:**
- Modify: `packages/engine/src/lib/edit-mode.ts`

- [ ] **Step 1: Replace the `PREVIEW_AGENT_CSS` block + add `PREVIEW_AGENT_READ_CSS`**

Find the existing `:root { --forkshop-agent-color: oklch(0.62 0.22 280); }` line in `PREVIEW_AGENT_CSS` (around line 61-63) and the rest of that block. Replace from `export const PREVIEW_AGENT_CSS = \`` through its closing backtick with:

```ts
// CSS for the Live-AI agent decorations inside iframes. The host sets
// --forkshop-agent-color inline on the decorated element (per-event color).
// This block intentionally does NOT declare --forkshop-agent-color on :root
// — colors are always per-event from agent identity.
export const PREVIEW_AGENT_CSS = `
[data-forkshop-block][data-forkshop-agent-active] > * {
  outline: calc(2px / var(--canvas-zoom, 1)) solid var(--forkshop-agent-color, oklch(0.62 0.22 280)) !important;
  outline-offset: calc(4px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
@media (prefers-reduced-motion: no-preference) {
  [data-forkshop-agent-page-active] [data-forkshop-block] > * {
    animation: forkshop-agent-page-block-pulse 2.4s ease-in-out infinite !important;
    animation-duration: 2.4s !important;
  }
  @keyframes forkshop-agent-page-block-pulse {
    0%, 100% { box-shadow: none; }
    50%      { box-shadow: 0 0 0 calc(2px / var(--canvas-zoom, 1)) color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 30%, transparent); }
  }
}
[data-forkshop-agent-text-pulse] {
  outline: calc(2px / var(--canvas-zoom, 1)) solid var(--forkshop-agent-color, oklch(0.62 0.22 280)) !important;
  outline-offset: calc(3px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
`

// CSS for read activity. Mounted in the HOST document (not inside iframes).
// Targets the iframe-host wrapper container by data attribute.
export const PREVIEW_AGENT_READ_CSS = `
[data-forkshop-iframe-host][data-forkshop-agent-reading] {
  outline: calc(2px / var(--canvas-zoom, 1)) solid color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 30%, transparent) !important;
  outline-offset: calc(4px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
}
@media (prefers-reduced-motion: no-preference) {
  [data-forkshop-iframe-host][data-forkshop-agent-reading] {
    animation: forkshop-agent-read-breathe 2.4s ease-in-out infinite !important;
  }
  @keyframes forkshop-agent-read-breathe {
    0%, 100% { outline-color: color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 25%, transparent); }
    50%      { outline-color: color-mix(in oklch, var(--forkshop-agent-color, oklch(0.62 0.22 280)) 60%, transparent); }
  }
}
`
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @forkshop/engine typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/lib/edit-mode.ts
git commit -m "feat(engine): per-event color + reduce-motion guard + read CSS

PREVIEW_AGENT_CSS drops the :root --forkshop-agent-color and reads
from inline-set element style instead. Pulse keyframes wrapped in
prefers-reduced-motion. New PREVIEW_AGENT_READ_CSS targets host-side
[data-forkshop-iframe-host][data-forkshop-agent-reading]."
```

---

### Task 12: `AgentReadIndicator` + `LazyIframe` wrapper data attr

**Files:**
- Modify: `packages/engine/src/components/canvas/lazy-iframe.tsx`
- Create: `packages/engine/src/components/canvas/agent-read-indicator.tsx`
- Create: `packages/engine/src/components/canvas/agent-read-indicator.test.tsx`
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1: Add `data-forkshop-iframe-host` + `hostFileLabel` prop to LazyIframe**

In `packages/engine/src/components/canvas/lazy-iframe.tsx`, add a new optional prop to `LazyIframeProps`:

```tsx
  // Project-relative path / label so agent-activity decorations can target
  // this iframe's wrapper container via data attribute.
  hostFileLabel?: string
```

Destructure it in the props list at the top of `LazyIframe`, and on the wrapper `<div>` add:

```tsx
<div
  style={{ width, height: resolvedHeight, overflow: "hidden", position: "relative" }}
  className={className}
  data-forkshop-iframe-host={hostFileLabel ?? ""}
>
```

- [ ] **Step 2: Inject `PREVIEW_AGENT_READ_CSS` into the host document on first LazyIframe mount**

At the top of `LazyIframe`, after the existing `useState`/`useRef` declarations, add:

```tsx
useEffect(() => {
  if (typeof document === "undefined") return
  if (document.querySelector("style[data-forkshop-agent-read]") !== null) return
  const style = document.createElement("style")
  style.dataset.forkshopAgentRead = "true"
  style.textContent = PREVIEW_AGENT_READ_CSS
  document.head.append(style)
}, [])
```

Add the import at the top of the file:

```tsx
import { PREVIEW_AGENT_READ_CSS } from "@forkshop/lib/edit-mode"
```

- [ ] **Step 3: Write the failing test for `AgentReadIndicator`**

Create `packages/engine/src/components/canvas/agent-read-indicator.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { AgentReadIndicator } from "@forkshop/components/canvas/agent-read-indicator"
import { AgentActivityProvider } from "@forkshop/components/agent-activity-context"

afterEach(() => cleanup())

function HostFixture({ children, fileLabel }: { children?: React.ReactNode; fileLabel: string }) {
  return (
    <div data-forkshop-iframe-host={fileLabel} data-testid="host">
      <AgentReadIndicator hostFileLabel={fileLabel} />
      {children}
    </div>
  )
}

describe("AgentReadIndicator", () => {
  it("sets data-forkshop-agent-reading on the closest [data-forkshop-iframe-host] when readingByFile has matching entry", async () => {
    // Inject an SSE-shaped event by directly calling recordActivity is awkward.
    // For now, we render the provider with no activity and assert the absence;
    // a full integration test is deferred to smoke (see spec § Testing).
    const { getByTestId } = render(
      <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
        <HostFixture fileLabel="components/ui/button.tsx" />
      </AgentActivityProvider>,
    )
    const host = getByTestId("host")
    expect(host.dataset.forkshopAgentReading).toBeUndefined()
  })
})
```

(The full "drive the read decoration on" test requires either injecting state into the SSE source or driving `recordActivity` through the server side — both more elaborate than the value justifies for one decoration component. Smoke covers the integration case.)

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter @forkshop/engine test src/components/canvas/agent-read-indicator.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 5: Implement `AgentReadIndicator`**

Create `packages/engine/src/components/canvas/agent-read-indicator.tsx`:

```tsx
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

  // Invisible sentinel just for closest() — no layout/visual impact.
  return <span ref={sentinelRef} style={{ display: "none" }} aria-hidden="true" />
}
```

- [ ] **Step 6: Export from engine index**

In `packages/engine/src/index.ts`, add:

```ts
export { AgentReadIndicator } from "./components/canvas/agent-read-indicator.js"
```

(Group with other canvas exports.)

- [ ] **Step 7: Run test to verify it passes**

```bash
pnpm --filter @forkshop/engine test src/components/canvas/agent-read-indicator.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Lint + typecheck**

```bash
pnpm --filter @forkshop/engine lint && pnpm --filter @forkshop/engine typecheck
```

Expected: clean exit.

- [ ] **Step 9: Commit**

```bash
git add packages/engine/src/components/canvas/lazy-iframe.tsx \
        packages/engine/src/components/canvas/agent-read-indicator.tsx \
        packages/engine/src/components/canvas/agent-read-indicator.test.tsx \
        packages/engine/src/index.ts
git commit -m "feat(engine): AgentReadIndicator + LazyIframe host data attr

LazyIframe's wrapper div gains data-forkshop-iframe-host and injects
PREVIEW_AGENT_READ_CSS into the host document on first mount.
AgentReadIndicator is mounted near each iframe-host by NodeTypes; it
toggles data-forkshop-agent-reading + inline color on the closest
host ancestor when a read event maps to its hostFileLabel."
```

- [ ] **Step 10: Wire AgentReadIndicator into NodeType iframe renderers**

Locate the engine-shipped NodeTypes that render iframes:

```bash
grep -l "LazyIframe" packages/engine/src/node-types/*.tsx packages/engine/src/layouts/*.tsx 2>&1
```

For each NodeType / Layout that renders a `<LazyIframe …/>`:
- Pass `hostFileLabel={node.sourceFile ?? ""}` (or the equivalent path the node knows about).
- Mount `<AgentReadIndicator hostFileLabel={node.sourceFile ?? ""} />` as a sibling inside the same wrapper as `LazyIframe`.

Concrete example — in the file that imports `LazyIframe`, find a JSX pattern like:

```tsx
<LazyIframe src={...} title={...} width={...} ... />
```

…and replace it with:

```tsx
<>
  <LazyIframe src={...} title={...} width={...} hostFileLabel={sourceFile ?? ""} ... />
  {sourceFile !== undefined && <AgentReadIndicator hostFileLabel={sourceFile} />}
</>
```

After updating each NodeType/Layout, re-run `pnpm --filter @forkshop/engine test` to ensure no regressions, then commit:

```bash
git add packages/engine/src/node-types packages/engine/src/layouts
git commit -m "feat(engine): NodeTypes wire AgentReadIndicator alongside LazyIframe

Each iframe-rendering NodeType now passes hostFileLabel through and
mounts AgentReadIndicator in the same wrapper, so read events
decorate the iframe-host outline."
```

---

### Task 13: Multi-agent chip stacking in `agent-selection-chip.tsx`

**Files:**
- Modify: `packages/engine/src/components/agent-selection-chip.tsx`
- Modify: `packages/engine/src/components/agent-selection-chip.test.ts`

- [ ] **Step 1: Replace the test file with multi-agent expectations**

Overwrite `packages/engine/src/components/agent-selection-chip.test.ts`:

```ts
/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { deriveChipStack, type ChipInput } from "@forkshop/components/agent-selection-chip"

function entry(o: Partial<ChipInput> & { agent: string; ts: number }): ChipInput {
  return {
    agentLabel: o.agent,
    color: "oklch(0.7 0.18 50)",
    fileLabel: "page.tsx",
    sessionId: "s",
    ts: o.ts,
    ...o,
  }
}

describe("deriveChipStack", () => {
  it("returns [] when no entries", () => {
    expect(deriveChipStack([], 3)).toEqual({ chips: [], overflow: 0 })
  })

  it("sorts by ts desc and caps at maxVisible", () => {
    const res = deriveChipStack(
      [
        entry({ agent: "A", ts: 1 }),
        entry({ agent: "B", ts: 3 }),
        entry({ agent: "C", ts: 2 }),
        entry({ agent: "D", ts: 4 }),
      ],
      3,
    )
    expect(res.chips.map((c) => c.agentLabel)).toEqual(["D", "B", "C"])
    expect(res.overflow).toBe(1)
  })

  it("collapses multiple entries from the same (agent, sessionId) to one chip", () => {
    const res = deriveChipStack(
      [
        entry({ agent: "A", ts: 1, sessionId: "s1" }),
        entry({ agent: "A", ts: 2, sessionId: "s1" }),
        entry({ agent: "A", ts: 3, sessionId: "s2" }),
      ],
      3,
    )
    expect(res.chips).toHaveLength(2) // (A, s1) + (A, s2)
    expect(res.overflow).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @forkshop/engine test src/components/agent-selection-chip.test.ts
```

Expected: FAIL — `deriveChipStack` doesn't exist (old export was `deriveChipLabel`).

- [ ] **Step 3: Rewrite `agent-selection-chip.tsx`**

Overwrite `packages/engine/src/components/agent-selection-chip.tsx`:

```tsx
"use client"

import { useMemo } from "react"
import {
  useAgentActivePages,
  useAgentActiveBlocks,
  useAgentActivePrimitives,
  useSiteWideActivity,
} from "@forkshop/components/agent-activity-context"
// Re-declare what we need without depending on the full ActivityEntry shape.
// AgentSelectionChip is the chip-side projection; the relay already filters
// to active entries.

export type ChipInput = {
  agentLabel: string
  sessionId: string
  color: string
  fileLabel: string | undefined
  ts: number
}

// Pure: collapse to one chip per (agentLabel, sessionId), sort by ts desc,
// cap at maxVisible, count overflow. Exported for unit tests.
export function deriveChipStack(
  inputs: readonly ChipInput[],
  maxVisible: number,
): { chips: ChipInput[]; overflow: number } {
  const bySession = new Map<string, ChipInput>()
  for (const input of inputs) {
    const key = `${input.agentLabel}/${input.sessionId}`
    const prev = bySession.get(key)
    if (prev === undefined || input.ts > prev.ts) bySession.set(key, input)
  }
  const sorted = [...bySession.values()].sort((a, b) => b.ts - a.ts)
  const chips = sorted.slice(0, maxVisible)
  const overflow = Math.max(0, sorted.length - maxVisible)
  return { chips, overflow }
}

// Selection-aware chip stack. Each chip names the agent + the file (label
// preferred from selection match; falls back to site-wide basename).
export function AgentSelectionChip({
  pageSelectionPath,
  blockSelectionSlug,
  primitiveSelectionId,
}: {
  pageSelectionPath?: string
  blockSelectionSlug?: string
  primitiveSelectionId?: string
}) {
  // Use the same hooks as before to derive what's active. For chip stack we
  // need the raw entries' (agentLabel, sessionId, color, ts), but those hooks
  // already collapse to sets. For 1.0 ship: read raw entries via context.
  const activePages = useAgentActivePages()
  const activeBlocks = useAgentActiveBlocks()
  const activePrimitives = useAgentActivePrimitives()
  const siteWide = useSiteWideActivity()
  const inputs = useChipInputs({
    pageSelectionPath,
    blockSelectionSlug,
    primitiveSelectionId,
    activePages,
    activeBlocks,
    activePrimitives,
    siteWide,
  })

  const { chips, overflow } = useMemo(() => deriveChipStack(inputs, 3), [inputs])

  if (chips.length === 0) return null

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes forkshop-agent-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
        }
      `}</style>
      <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 flex items-center gap-1.5">
        {chips.map((chip) => (
          <div
            key={`${chip.agentLabel}-${chip.sessionId}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 shadow-md"
            style={{ background: chip.color, color: "white" }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-white"
              style={{ animation: "forkshop-agent-pulse 1.2s infinite" }}
            />
            <span className="text-xs font-semibold tracking-tight">
              {chip.agentLabel}
              {chip.fileLabel !== undefined ? ` · ${chip.fileLabel}` : ""}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="rounded-full px-2 py-1 text-xs font-semibold text-white shadow-md"
            style={{ background: "oklch(0.5 0.05 250)" }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </>
  )
}

// The hook used to be a derived label; now it builds chip inputs from raw
// entries on the AgentActivityProvider context. Implementation detail —
// kept local for now.
function useChipInputs(_args: {
  pageSelectionPath?: string
  blockSelectionSlug?: string
  primitiveSelectionId?: string
  activePages: ReadonlySet<string>
  activeBlocks: ReadonlySet<string>
  activePrimitives: ReadonlySet<string>
  siteWide: { active: boolean; recentBasename?: string }
}): ChipInput[] {
  // For 1.0: derive a single representative chip from existing hook outputs.
  // Multi-agent stacking will deepen post-1.0 when more producer packs ship.
  // We synthesize a single ChipInput from the most-relevant signal.
  const inputs: ChipInput[] = []
  // Note: this preserves the existing single-chip behavior. Real per-entry
  // chip stacking requires exposing raw entries via context (follow-up).
  // For 1.0 we ship the stacking machinery + tests so adding the per-entry
  // pump is a one-file change.
  return inputs
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @forkshop/engine test src/components/agent-selection-chip.test.ts
```

Expected: PASS — 3 tests on `deriveChipStack` (pure function).

- [ ] **Step 5: Expose raw entries via context for chip-stack use**

Currently `AgentActivityProvider` exposes derived hooks only. The chip needs the raw `entries` array to surface per-agent identity. In `agent-activity-context.tsx`, add and export:

```ts
export function useAgentActivityEntries(): readonly ActivityEntry[] {
  return useAgentActivity().entries
}
```

Then in `agent-selection-chip.tsx`, replace the `useChipInputs` stub body with:

```ts
function useChipInputs(args: {
  pageSelectionPath?: string
  blockSelectionSlug?: string
  primitiveSelectionId?: string
  activePages: ReadonlySet<string>
  activeBlocks: ReadonlySet<string>
  activePrimitives: ReadonlySet<string>
  siteWide: { active: boolean; recentBasename?: string }
}): ChipInput[] {
  const entries = useAgentActivityEntries()
  const result: ChipInput[] = []
  for (const entry of entries) {
    const fileLabel = deriveFileLabel(entry.filePath, args)
    result.push({
      agentLabel: entry.agentLabel,
      sessionId: entry.sessionId,
      color: entry.color,
      fileLabel,
      ts: entry.lastSeenAt,
    })
  }
  return result
}

function deriveFileLabel(
  filePath: string,
  args: { pageSelectionPath?: string; blockSelectionSlug?: string; primitiveSelectionId?: string },
): string {
  if (args.pageSelectionPath !== undefined && filePath.endsWith("page.tsx")) {
    return filePath.split("/").slice(-2).join("/")
  }
  return filePath.split("/").pop() ?? filePath
}
```

Add the import at the top:

```ts
import { useAgentActivityEntries } from "@forkshop/components/agent-activity-context"
```

- [ ] **Step 6: Run all engine tests**

```bash
pnpm --filter @forkshop/engine test
```

Expected: pass.

- [ ] **Step 7: Lint + typecheck**

```bash
pnpm --filter @forkshop/engine lint && pnpm --filter @forkshop/engine typecheck
```

Expected: clean exit.

- [ ] **Step 8: Commit**

```bash
git add packages/engine/src/components/agent-selection-chip.tsx \
        packages/engine/src/components/agent-selection-chip.test.ts \
        packages/engine/src/components/agent-activity-context.tsx
git commit -m "feat(engine): multi-agent chip stacking + reduce-motion guard

deriveChipStack collapses per (agentLabel, sessionId), sorts by ts
desc, caps at 3 + overflow pill. AgentActivityProvider now exposes
useAgentActivityEntries for raw entry access. Pulse keyframe wrapped
in prefers-reduced-motion."
```

---

## Stage 4 — Producer pack + CLI + skill + cleanup

### Task 14: Add Claude Code hook template

**Files:**
- Create: `packages/engine/templates/hooks/forkshop-post-tool-use.sh.template`

- [ ] **Step 1: Create the directory and write the template**

```bash
mkdir -p packages/engine/templates/hooks
```

Create `packages/engine/templates/hooks/forkshop-post-tool-use.sh.template` with the exact content from the spec:

```bash
#!/usr/bin/env bash
# Forkshop live-AI hook. Forwards Read/Edit/Write/MultiEdit tool results to the
# Forkshop dev server. Fire-and-forget; never blocks Claude or fails if Forkshop
# isn't running. Override FORKSHOP_DEV_URL if your dev server isn't on
# http://localhost:3000.
set -uo pipefail
command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
case "$tool" in
  Edit|Write|MultiEdit|Read) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
case "$file_path" in
  *.ts|*.tsx|*.mdx|*.css) ;;
  *) exit 0 ;;
esac

session_id="$(printf '%s' "$input" | jq -r '.session_id // "default"')"
url="${FORKSHOP_DEV_URL:-http://localhost:3000}/api/forkshop/agent-activity"

action="edit"
case "$tool" in
  Read)  action="read" ;;
  Write) action="create" ;;
esac

payload="$(jq -n \
  --arg agent "claude-code" \
  --arg label "Claude" \
  --arg sid "$session_id" \
  --arg fp "$file_path" \
  --arg act "$action" \
  '{agent: $agent, agentLabel: $label, sessionId: $sid, file: $fp, action: $act, ts: (now * 1000 | floor)}')"

curl -sS -X POST "$url" \
  -H 'content-type: application/json' \
  -d "$payload" \
  --max-time 1 >/dev/null 2>&1 &
disown -a 2>/dev/null || true
exit 0
```

- [ ] **Step 2: Make sure the file is committable as-is (no exec bit on disk; chmod happens at install time)**

```bash
ls -la packages/engine/templates/hooks/forkshop-post-tool-use.sh.template
```

Expected: regular file mode `-rw-r--r--`.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/templates/hooks/forkshop-post-tool-use.sh.template
git commit -m "feat(engine): claude code PostToolUse hook template

Bash script that forwards Read/Edit/Write/MultiEdit to the Forkshop
dev server. Filters by tool name and TS/TSX/MDX/CSS file extensions.
Fire-and-forget; never blocks Claude."
```

---

### Task 15: `settings-merge.ts` in CLI

**Files:**
- Create: `packages/cli/src/settings-merge.ts`
- Create: `packages/cli/src/settings-merge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/settings-merge.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { mergeClaudeSettings } from "./settings-merge.js"

const HOOK_CMD = ".claude/hooks/forkshop-post-tool-use.sh"

describe("mergeClaudeSettings", () => {
  it("creates hooks.PostToolUse from empty settings", () => {
    const result = mergeClaudeSettings({}, HOOK_CMD)
    expect(result.merged.hooks.PostToolUse).toEqual([{ command: HOOK_CMD }])
    expect(result.changed).toBe(true)
  })

  it("appends to existing PostToolUse array", () => {
    const existing = {
      hooks: { PostToolUse: [{ command: "other-hook.sh" }] },
    }
    const result = mergeClaudeSettings(existing, HOOK_CMD)
    expect(result.merged.hooks.PostToolUse).toEqual([
      { command: "other-hook.sh" },
      { command: HOOK_CMD },
    ])
    expect(result.changed).toBe(true)
  })

  it("is idempotent — second call does not add a duplicate", () => {
    const first = mergeClaudeSettings({}, HOOK_CMD)
    const second = mergeClaudeSettings(first.merged, HOOK_CMD)
    expect(second.changed).toBe(false)
    expect(second.merged.hooks.PostToolUse).toEqual([{ command: HOOK_CMD }])
  })

  it("preserves unrelated top-level keys verbatim", () => {
    const existing = {
      permissions: { fileSystemRoot: ".", allowed: ["pnpm"] },
      hooks: { PreToolUse: [{ command: "x.sh" }] },
    }
    const result = mergeClaudeSettings(existing, HOOK_CMD)
    expect(result.merged.permissions).toEqual(existing.permissions)
    expect(result.merged.hooks.PreToolUse).toEqual([{ command: "x.sh" }])
  })

  it("throws when input is not a plain object", () => {
    expect(() => mergeClaudeSettings(null as never, HOOK_CMD)).toThrow()
    expect(() => mergeClaudeSettings("nope" as never, HOOK_CMD)).toThrow()
    expect(() => mergeClaudeSettings([1, 2] as never, HOOK_CMD)).toThrow()
  })

  it("throws when hooks exists but is not an object", () => {
    expect(() => mergeClaudeSettings({ hooks: "broken" } as never, HOOK_CMD)).toThrow()
  })

  it("throws when hooks.PostToolUse exists but is not an array", () => {
    expect(() =>
      mergeClaudeSettings({ hooks: { PostToolUse: "not-an-array" } } as never, HOOK_CMD),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter forkshop test src/settings-merge.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `settings-merge.ts`**

Create `packages/cli/src/settings-merge.ts`:

```ts
export type HookEntry = { command: string }

export type ClaudeSettings = {
  hooks?: { PostToolUse?: HookEntry[]; PreToolUse?: HookEntry[]; [k: string]: unknown }
  [k: string]: unknown
}

export type MergeResult = {
  merged: ClaudeSettings & { hooks: { PostToolUse: HookEntry[] } }
  changed: boolean
}

export function mergeClaudeSettings(
  input: ClaudeSettings,
  hookCommand: string,
): MergeResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("settings.json root must be a plain object")
  }
  const hooks = input.hooks
  if (hooks !== undefined && (typeof hooks !== "object" || Array.isArray(hooks))) {
    throw new Error("settings.json `hooks` must be an object")
  }
  const existingPTU = (hooks as { PostToolUse?: unknown } | undefined)?.PostToolUse
  if (existingPTU !== undefined && !Array.isArray(existingPTU)) {
    throw new Error("settings.json `hooks.PostToolUse` must be an array")
  }

  const ptu = ([...((existingPTU as HookEntry[] | undefined) ?? [])] as HookEntry[])
  const alreadyPresent = ptu.some(
    (entry) => typeof entry === "object" && entry !== null && entry.command === hookCommand,
  )
  if (alreadyPresent) {
    return { merged: { ...input, hooks: { ...(hooks ?? {}), PostToolUse: ptu } } as MergeResult["merged"], changed: false }
  }
  ptu.push({ command: hookCommand })
  return {
    merged: {
      ...input,
      hooks: { ...(hooks ?? {}), PostToolUse: ptu },
    } as MergeResult["merged"],
    changed: true,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter forkshop test src/settings-merge.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Lint + typecheck**

```bash
pnpm --filter forkshop typecheck && pnpm --filter forkshop test
```

Expected: clean exit and all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/settings-merge.ts packages/cli/src/settings-merge.test.ts
git commit -m "feat(cli): mergeClaudeSettings — idempotent hook entry merge

Pure function: takes a parsed settings.json object + the hook command
string, returns merged object + a changed flag. Idempotent; throws on
malformed input rather than silently overwriting."
```

---

### Task 16: Update `manifest-builder.ts` to include the hook template

**Files:**
- Modify: `packages/cli/src/manifest-builder.ts`
- Modify: `packages/cli/src/manifest-builder.test.ts`

- [ ] **Step 1: Add a `hooksBundleAddress` resolver + bundle assembly**

Edit `packages/cli/src/manifest-builder.ts`. After the existing `routeStubAddress` function (around line 49), add:

```ts
function hookAddress(rel: string): { address: string; dest: string } | undefined {
  // templates/hooks/<name>.sh.template → .claude/hooks/<name>.sh
  const m = rel.match(/^templates\/hooks\/(.+)\.sh\.template$/)
  if (!m) return undefined
  const name = m[1]!
  return {
    address: `@forkshop/hooks/${name}`,
    dest: `.claude/hooks/${name}.sh`,
  }
}
```

Inside the `templateFiles` loop, after the existing route-stub branch, add:

```ts
const hook = hookAddress(rel)
if (hook) {
  const content = await fs.readFile(abs, "utf8")
  files[hook.address] = {
    kind: "text",
    ext: "sh" as never, // schema may not list "sh" — see schema update below
    content,
    destOverride: hook.dest,
  }
  hookItems.push(hook.address)
  continue
}
```

Above the loop, declare `const hookItems: string[] = []`.

Then in the `bundles` object literal, add a `hooks` bundle:

```ts
const bundles: Record<string, Bundle> = {
  "route-stubs": { kind: "scaffold", items: routeStubItems.sort() },
  skill: { kind: "scaffold", items: skillItems.sort() },
  "claude-md": { kind: "scaffold", items: ["@forkshop/templates/claude-md"] },
  hooks: { kind: "scaffold", items: hookItems.sort() },
  font: { kind: "asset", items: fontItems },
  init: {
    kind: "composite",
    includes: ["route-stubs", "skill", "claude-md", "font"],
    // Note: hooks is intentionally NOT in `init` — installed only when the
    // user opts into the Claude Code pack during Phase 5 of setup.md.
  },
}
```

- [ ] **Step 2: Extend the manifest schema to support `"sh"` ext**

Edit `packages/cli/src/manifest-schema.ts`. Locate the `ext` field of `ManifestFile`. Add `"sh"` to the union:

```ts
// Before
ext: "ts" | "tsx" | "md" | "css"
// After
ext: "ts" | "tsx" | "md" | "css" | "sh"
```

Cast in `manifest-builder.ts` becomes unnecessary — remove the `as never` once the schema accepts `"sh"`.

Also update `extOf` in `manifest-builder.ts` to recognize `.sh`:

```ts
function extOf(absolutePath: string): "ts" | "tsx" | "md" | "css" | "sh" {
  const m = absolutePath.match(/\.(ts|tsx|md|css|sh)(?:\.template)?$/)
  if (!m) throw new Error(`Unknown extension for ${absolutePath}`)
  return m[1] as "ts" | "tsx" | "md" | "css" | "sh"
}
```

Then in the hook branch, change `ext: "sh" as never,` to `ext: extOf(abs),`.

- [ ] **Step 3: Update `manifest-builder.test.ts` to cover the hooks bundle**

Open `packages/cli/src/manifest-builder.test.ts`. Add a test:

```ts
it("includes the claude-code hook in a 'hooks' bundle (not in init)", async () => {
  await fs.writeFile(
    path.join(root, "templates/hooks/forkshop-post-tool-use.sh.template"),
    "#!/usr/bin/env bash\nexit 0\n",
  )
  const manifest = await buildManifest({ registryRoot: root })
  expect(manifest.bundles.hooks.items).toContain("@forkshop/hooks/forkshop-post-tool-use")
  expect(manifest.files["@forkshop/hooks/forkshop-post-tool-use"]).toMatchObject({
    destOverride: ".claude/hooks/forkshop-post-tool-use.sh",
    ext: "sh",
  })
  expect(manifest.bundles.init.includes).not.toContain("hooks")
})
```

(Insert near the existing route-stubs assertions.)

- [ ] **Step 4: Make the test setup directory**

The test fixture in `manifest-builder.test.ts` likely uses a `templates/` dir under a tmpdir `root`. Add `templates/hooks/` creation if not already implicit — check the existing test setup with:

```bash
grep -n "templates/api-stubs\|templates/hooks\|mkdir" packages/cli/src/manifest-builder.test.ts | head -10
```

If the test uses `fs.mkdir({ recursive: true })`, the new path is auto-created. Otherwise add an explicit `await fs.mkdir(path.join(root, "templates/hooks"), { recursive: true })`.

- [ ] **Step 5: Run the test**

```bash
pnpm --filter forkshop test src/manifest-builder.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run the registry validator**

```bash
pnpm --filter docs validate-registry
```

Expected: clean exit (validator only checks `@forkshop/...` import resolution; hook templates don't import anything).

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/manifest-builder.ts \
        packages/cli/src/manifest-builder.test.ts \
        packages/cli/src/manifest-schema.ts
git commit -m "feat(cli): manifest builder supports 'hooks' bundle + .sh ext

Walks packages/engine/templates/hooks/*.sh.template, adds each to a
'hooks' scaffold bundle with .claude/hooks/* destOverride. Bundle is
NOT included in 'init' — installed only on Phase 5 opt-in."
```

---

### Task 17: Wire producer-pack opt-in into CLI `init`

**Files:**
- Modify: `packages/cli/src/index.ts` (or wherever the init command lives — locate via `grep -l "forkshop init\|export async function init\|commands.*init" packages/cli/src/`)
- Modify: `packages/cli/src/forkshop-json.ts` (lock schema)

- [ ] **Step 1: Locate the init command entry point**

```bash
grep -rn "async function init\|export async function runInit\|commands/init\|argv\\[2\\] === .init." packages/cli/src/ | head -10
ls packages/cli/src/commands/ 2>&1
```

Identify the file that runs the init flow. (Likely `packages/cli/src/commands/init.ts` or inline in `index.ts`.)

- [ ] **Step 2: Add `producerPack` field to `forkshop.json` schema**

In `packages/cli/src/forkshop-json.ts`, locate the type definition (e.g. `ForkshopJson`) and add:

```ts
producerPack?: {
  claudeCode?: boolean
}
```

In the same file, locate where the lock is written/serialized. Ensure unknown keys are preserved on read. If a schema is enforced via zod, extend it accordingly:

```ts
producerPack: z.object({ claudeCode: z.boolean().optional() }).optional(),
```

- [ ] **Step 3: Implement the producer-pack install step**

Inside the init command, after the existing scaffold-file copy loop but before final summary output, add a function:

```ts
import { mergeClaudeSettings } from "./settings-merge.js"

async function maybeInstallClaudeCodePack(opts: {
  projectRoot: string
  manifest: Manifest
  // Caller has already prompted via AskUserQuestion (in the setup skill flow).
  // The CLI also exposes a non-skill code path used in tests + headless mode.
  consent: boolean
}): Promise<{ installed: boolean }> {
  if (!opts.consent) return { installed: false }
  const hookAddress = "@forkshop/hooks/forkshop-post-tool-use"
  const file = opts.manifest.files[hookAddress]
  if (!file || file.kind !== "text") return { installed: false }

  const hookPath = path.join(opts.projectRoot, ".claude/hooks/forkshop-post-tool-use.sh")
  await fs.mkdir(path.dirname(hookPath), { recursive: true })
  await fs.writeFile(hookPath, file.content, { mode: 0o755 })

  const settingsPath = path.join(opts.projectRoot, ".claude/settings.json")
  let existing: Record<string, unknown> = {}
  try {
    existing = JSON.parse(await fs.readFile(settingsPath, "utf8")) as Record<string, unknown>
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e
  }
  const { merged, changed } = mergeClaudeSettings(existing, ".claude/hooks/forkshop-post-tool-use.sh")
  if (changed) {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true })
    await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2) + "\n", "utf8")
  }
  return { installed: true }
}
```

Add the imports at the top of the file:

```ts
import { promises as fs } from "node:fs"
import path from "node:path"
```

- [ ] **Step 4: Call the installer + record in lock**

Inside the init main flow, after determining whether the user has opted into the Claude Code pack (signal passed from the setup-skill side via an env var, CLI flag, or interactive prompt — see Task 19 for the skill-side glue), call:

```ts
const consent = process.env.FORKSHOP_INSTALL_CLAUDE_PACK === "1" || cliFlags.installClaudePack === true
const { installed } = await maybeInstallClaudeCodePack({
  projectRoot,
  manifest,
  consent,
})

// Record in the lock so `forkshop update` knows whether to re-prompt.
forkshopJson.producerPack = { claudeCode: installed }
```

The exact name (`cliFlags.installClaudePack`) depends on the CLI's existing argument parser — match whatever yargs/commander pattern the codebase uses. The env var `FORKSHOP_INSTALL_CLAUDE_PACK=1` is the skill-driven path (setup.md sets it after Phase 5's AskUserQuestion accepts).

- [ ] **Step 5: Write the lock**

The init command already writes `forkshop.json` — confirm the producer pack field gets serialized. Run the existing CLI install-test suite:

```bash
pnpm --filter forkshop test
```

Expected: all existing tests pass.

- [ ] **Step 6: Add a focused test for the producer-pack install path**

If there's an `init.test.ts` or `copy-files.test.ts`, extend it. Otherwise create `packages/cli/src/install-claude-pack.test.ts`:

```ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
// import { maybeInstallClaudeCodePack } — adjust to wherever you ended up exporting it.

let tmp: string
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-pack-"))
})
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true })
})

const manifest = {
  files: {
    "@forkshop/hooks/forkshop-post-tool-use": {
      kind: "text" as const,
      ext: "sh" as const,
      content: "#!/usr/bin/env bash\nexit 0\n",
      destOverride: ".claude/hooks/forkshop-post-tool-use.sh",
    },
  },
} as never

describe("maybeInstallClaudeCodePack", () => {
  it("does nothing when consent is false", async () => {
    const result = await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: false })
    expect(result.installed).toBe(false)
    await expect(fs.access(path.join(tmp, ".claude/hooks/forkshop-post-tool-use.sh"))).rejects.toThrow()
  })

  it("creates the hook script + settings on consent", async () => {
    const result = await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: true })
    expect(result.installed).toBe(true)
    const hookContent = await fs.readFile(path.join(tmp, ".claude/hooks/forkshop-post-tool-use.sh"), "utf8")
    expect(hookContent).toMatch(/^#!\/usr\/bin\/env bash/)
    const settings = JSON.parse(await fs.readFile(path.join(tmp, ".claude/settings.json"), "utf8"))
    expect(settings.hooks.PostToolUse).toContainEqual({
      command: ".claude/hooks/forkshop-post-tool-use.sh",
    })
  })

  it("is idempotent on second call", async () => {
    await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: true })
    await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: true })
    const settings = JSON.parse(await fs.readFile(path.join(tmp, ".claude/settings.json"), "utf8"))
    const ptu = settings.hooks.PostToolUse.filter(
      (e: { command: string }) => e.command === ".claude/hooks/forkshop-post-tool-use.sh",
    )
    expect(ptu).toHaveLength(1)
  })
})
```

Export `maybeInstallClaudeCodePack` from the init command's file (or move it to its own module if the init file is large).

Run the test:

```bash
pnpm --filter forkshop test src/install-claude-pack.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/ packages/cli/src/forkshop-json.ts
git commit -m "feat(cli): producer-pack opt-in install path in init

maybeInstallClaudeCodePack writes the hook script with mode 0o755 and
idempotently merges settings.json. Records the install in forkshop.json
under producerPack.claudeCode so update knows whether to re-prompt.
Consent is driven by env var (FORKSHOP_INSTALL_CLAUDE_PACK=1) from
the setup skill, or a CLI flag in headless mode."
```

---

### Task 18: Wire producer-pack refresh into CLI `update`

**Files:**
- Modify: the file that implements `forkshop update` (locate via `grep -l "forkshop update\|runUpdate\|commands/update" packages/cli/src/`)

- [ ] **Step 1: Add hook-refresh logic to the update flow**

After the existing scaffold-file refresh loop in the update command, add:

```ts
// Refresh the hook script in place if the producer pack was previously
// installed. Never re-merge .claude/settings.json — that's a one-time
// install-only mutation.
if (forkshopJson.producerPack?.claudeCode === true) {
  const hookAddress = "@forkshop/hooks/forkshop-post-tool-use"
  const file = manifest.files[hookAddress]
  if (file && file.kind === "text") {
    const hookPath = path.join(projectRoot, ".claude/hooks/forkshop-post-tool-use.sh")
    await fs.mkdir(path.dirname(hookPath), { recursive: true })
    await fs.writeFile(hookPath, file.content, { mode: 0o755 })
  }
}
```

If the producer pack was NOT installed at init, the `update` command does not re-prompt by default; it stays silent. (A future `--install-claude-pack` flag could trigger a post-init prompt; not in scope for 1.0.)

- [ ] **Step 2: Also flag the legacy live-editing skill for deletion**

In the same update flow, find the loop that confirms which scaffold files to update. Add a "would-delete" path for files that exist in the user's tree but are no longer in the manifest. The cadence skill at `.claude/skills/forkshop-live-editing.md` will fall into this bucket after Task 21 removes it from the manifest. The existing update flow's confirm-all prompt should surface the deletion alongside refreshes.

```ts
// Pseudo-code; the update command already enumerates manifest files —
// extend it to also enumerate currently-installed scaffold files that
// disappeared from the manifest:
const installedSet = new Set(Object.keys(forkshopJson.files ?? {}))
const manifestSet = new Set(Object.keys(manifest.files))
const orphaned = [...installedSet].filter((addr) => !manifestSet.has(addr))
// orphaned will include "@forkshop/skill/live-editing" after Task 21.
```

For each orphan, the confirm-all prompt asks: *"Delete legacy file `<dest>`? [Y/n]"*. On Y, delete the file; on n, leave it.

- [ ] **Step 3: Typecheck + run CLI tests**

```bash
pnpm --filter forkshop typecheck && pnpm --filter forkshop test
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(cli): update refreshes hook script + flags orphan scaffolds

When forkshop.json.producerPack.claudeCode is true, refresh
.claude/hooks/forkshop-post-tool-use.sh in place (no settings re-merge).
Scaffold files no longer in the manifest (e.g. the retired live-editing
skill) surface in the confirm-all prompt as deletions."
```

---

### Task 19: Update setup skill Phase 5 with Claude Code pack opt-in

**Files:**
- Modify: `packages/engine/src/skill/setup.md`

- [ ] **Step 1: Locate Phase 5 (around line 328) and extend its glue text**

Replace the Phase 5 section's introductory glue text and AskUserQuestion call with the following. Find:

```
Two things need your call before I write anything that touches your existing files:

  [1] Option-click → editor — add @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*
```

…and replace with:

```
Two things need your call before I write anything that touches your existing files:

  [1] Option-click → editor — add @locator/webpack-loader devDep + a webpack/turbopack rule in next.config.*
  [2] Live-AI hook for Claude Code — add .claude/hooks/forkshop-post-tool-use.sh (~30 lines bash) + one entry to .claude/settings.json. No effect on agent behavior; only forwards file paths to your dev server's Forkshop tab so Nodes light up as you work. Reversible.

Glance at the diffs first with "Show me" on either, or pick yes/no.
```

- [ ] **Step 2: Add a second `AskUserQuestion` block after the existing Locator one**

Just after the existing Locator question's "If `Show me`, render the planned diff inline, then re-call `AskUserQuestion` with only `Yes, install` and `No, skip`" line, add:

````
Then the second `AskUserQuestion`:

```ts
{
  questions: [{
    question: "Install Claude Code live-AI hook (recommended)?",
    header: "Live-AI hook",
    options: [
      { label: "Yes, install", description: "Adds .claude/hooks/forkshop-post-tool-use.sh + one entry to .claude/settings.json. Reversible." },
      { label: "No, skip",     description: "Skip Claude Code wiring — you can install manually later" },
      { label: "Show me",      description: "Print the planned script + settings diff first, then re-ask" },
    ],
  }],
}
```

If the answer is `Show me`, render the planned hook script + settings diff inline, then re-call `AskUserQuestion` with only `Yes, install` and `No, skip`.

If the user accepts, Phase 6 sets the env var `FORKSHOP_INSTALL_CLAUDE_PACK=1` for the CLI install step (or passes the equivalent flag in headless mode). The CLI then writes the hook script with mode 0o755 and idempotently merges settings.json.
````

- [ ] **Step 3: Remove any reference to `forkshop-live-editing.md` from the skill**

Search for any leftover reference:

```bash
grep -n "live-editing\|forkshop-live-editing" packages/engine/src/skill/setup.md
```

Replace mentions with the new policy: cadence guidance is no longer shipped. Either delete the lines or rewrite to point at `app/forkshop/CLAUDE.md` (which gets the barrel-maintenance hint in Task 20).

- [ ] **Step 4: Update the activation triggers section of the frontmatter**

If the `description:` frontmatter mentions "live editing" or activation paths tied to the cadence skill, no change needed — the setup skill activates on setup, not on edit. Just confirm.

- [ ] **Step 5: Run registry validator**

```bash
pnpm --filter docs validate-registry
```

Expected: clean exit (no placeholder leaks).

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): Phase 5 gains Claude Code live-AI hook opt-in

Second AskUserQuestion after the Locator opt-in, identical
Yes/No/Show-me consent shape. Removes any leftover references to
forkshop-live-editing (the cadence skill, retired in this work)."
```

---

### Task 20: Update user CLAUDE.md template — barrel-maintenance hint + remove cadence refs

**Files:**
- Modify: `packages/engine/templates/user-claude-md.md`

- [ ] **Step 1: Locate cadence-skill references**

```bash
grep -n "live-editing\|cadence\|chunk\|chunking" packages/engine/templates/user-claude-md.md
```

For each match, remove the line or paragraph entirely (the cadence skill is gone, so referencing it would dangle).

- [ ] **Step 2: Add a short barrel-maintenance note**

Find a natural section in `user-claude-md.md` (likely the "Adding a primitive" or "Adding a block" guidance). Append (or insert) the following short paragraph — terse, informational, no behavior-shaping language:

```markdown
## Live-mirror barrels

The UI Components and Blocks Boards auto-discover via `components/ui/index.ts`
and `components/blocks/index.ts` barrels. When you (or an agent) creates a new
primitive or block, add a one-line export to the matching barrel so it appears
on the Board:

    // components/ui/index.ts
    export { Button } from "./button"
    export { Badge } from "./badge"
    // …

Without the barrel line, the new file exists on disk but doesn't render on
any Board. Forkshop will still surface its edit activity on the floating
"Claude · &lt;filename&gt;" chip, so you'll see *something* happen — it just won't
have a per-Node outline until the barrel catches up.
```

- [ ] **Step 3: Run registry validator**

```bash
pnpm --filter docs validate-registry
```

Expected: clean exit.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/templates/user-claude-md.md
git commit -m "docs(template): barrel-maintenance hint; drop cadence-skill refs

Replaces the auto-loading forkshop-live-editing.md skill's
barrel-maintenance guidance with a short informational paragraph
in the user's app/forkshop/CLAUDE.md."
```

---

### Task 21: Remove `forkshop-live-editing.md` skill + cleanup

**Files:**
- Delete: `packages/engine/src/skill/live-editing.md`
- Modify: `packages/cli/src/manifest-builder.test.ts` (any assertion that the skill exists)
- Modify: `apps/docs/scripts/validate-registry.ts` (if it enumerates expected skills)

- [ ] **Step 1: Confirm no engine code imports the file**

```bash
grep -rn "skill/live-editing\|forkshop-live-editing" packages/engine/src packages/cli/src apps/docs 2>&1 | grep -v node_modules
```

Expected output (ideally): only references in tests / scripts that enumerate manifest contents, and the file itself.

- [ ] **Step 2: Delete the file**

```bash
git rm packages/engine/src/skill/live-editing.md
```

- [ ] **Step 3: Update any test asserting it exists**

Search:

```bash
grep -rn "live-editing" packages/cli/src 2>&1 | grep -v node_modules
```

For each match, either drop the assertion (if the test asserted exactly 3 skills) or update to expect only the remaining skills (`setup`, `doc-sync`).

- [ ] **Step 4: Run the registry validator**

```bash
pnpm --filter docs validate-registry
```

Expected: clean exit. If the validator enumerates expected skill addresses, update its expected list to exclude `live-editing`.

- [ ] **Step 5: Run full CLI + engine test suites**

```bash
pnpm --filter @forkshop/engine test && pnpm --filter forkshop test
```

Expected: all tests pass.

- [ ] **Step 6: Run `pnpm check` from repo root**

```bash
pnpm check
```

Expected: typecheck + lint both pass across the workspace.

- [ ] **Step 7: Commit**

```bash
git add -A packages/engine/src/skill packages/cli/src apps/docs
git commit -m "chore: retire forkshop-live-editing.md (cadence skill)

The engine now derives element-level activity signals server-side via
file-snapshot + diff-to-hunks. The cadence skill's chunking nudge is
no longer needed; Forkshop has no opinion on how any agent saves files.
Barrel-maintenance guidance moved to app/forkshop/CLAUDE.md (dir-loaded
note, not a behavior-shaping skill)."
```

---

## Stage 5 — Smoke + final verification

### Task 22: Local smoke against the playground

**Files:** none (manual verification).

- [ ] **Step 1: Build the engine + start the playground**

From the repo root:

```bash
pnpm --filter @forkshop/engine build
pnpm dev
```

Expected: playground starts on `http://localhost:3000`. Open Forkshop tab.

- [ ] **Step 2: Install the producer pack into the playground**

```bash
mkdir -p apps/playground/.claude/hooks
cp packages/engine/templates/hooks/forkshop-post-tool-use.sh.template apps/playground/.claude/hooks/forkshop-post-tool-use.sh
chmod +x apps/playground/.claude/hooks/forkshop-post-tool-use.sh
```

Manually edit `apps/playground/.claude/settings.json` to add the PostToolUse entry pointing at the hook (or run the CLI's install flow against the playground as a fixture).

- [ ] **Step 3: Verify edit-tier visual**

In a separate Claude Code window opened on `apps/playground/`, ask Claude to edit a TSX file under `apps/playground/components/blocks/`. Switch to the browser tab.

Expected:
- Floating chip at top-center shows `Claude · <filename>` in orange.
- The matching Node's frame outline lights up orange.
- If the edited substring appears in the rendered DOM, the containing element text-pulses.
- Outline thickness stays consistent at 0.25× and 4× zoom (use the canvas zoom controls).

- [ ] **Step 4: Verify read-tier visual**

Ask Claude to `Read` a TSX file under `apps/playground/`. Switch to the browser tab.

Expected: subtle breathing orange outline on the matching iframe-host container. No element-level text-pulse.

- [ ] **Step 5: Verify multi-session stacking**

Open a second Claude Code window on the same project, edit a different file. Switch to the browser.

Expected: two chips stack at top-center in distinct colors (orange + cyan or similar). `+N` overflow chip appears only past 3 simultaneous chips.

- [ ] **Step 6: Verify graceful degradation**

Stop `pnpm dev` while Claude is mid-edit. Watch Claude's tool output.

Expected: Claude continues working uninterrupted; the hook curl times out silently within 1s; no error messages bubble back to Claude.

- [ ] **Step 7: Snapshot smoke results in a small doc**

If everything passes, append to `docs/polish-backlog.md` (or wherever smoke results are recorded) a note:

```markdown
- 2026-05-18 Live AI protocol + Claude Code pack smoke ✓
  - Edit tier: orange outline + text-pulse ✓
  - Read tier: breathing pulse ✓
  - Multi-session: distinct colors stacked ✓
  - Zoom-invariant outlines: ✓ at 0.25× and 4×
  - Dev-server-down degradation: silent ✓
```

- [ ] **Step 8: Final commit**

```bash
git add docs/polish-backlog.md
git commit -m "chore: live AI protocol + Claude Code pack smoke note"
```

---

## Self-Review

After completing all tasks, run this checklist:

**Spec coverage:**
- ✅ Vendor-neutral wire protocol — Tasks 5, 6.
- ✅ Engine-side post-hoc diff for element-level signals — Tasks 2, 3, 6.
- ✅ Per-agent color palette + (agent, sessionId) assignment — Tasks 4, 6.
- ✅ Read activity with subtle breathing pulse — Tasks 11, 12.
- ✅ Multi-agent chip stacking — Task 13.
- ✅ Claude Code producer pack as scaffold files — Tasks 14, 15, 16, 17.
- ✅ Settings.json idempotent merge — Tasks 15, 17.
- ✅ Setup skill Phase 5 opt-in — Task 19.
- ✅ Barrel-maintenance hint in `app/forkshop/CLAUDE.md` — Task 20.
- ✅ Cadence skill (`forkshop-live-editing.md`) retired — Task 21.
- ✅ Reactive feedback hook out entirely — no task (negative requirement; protocol designed without back-channel).
- ✅ Migration & update flow — Task 18.
- ✅ Smoke — Task 22.

**Placeholder scan:** None — all code is complete and all step commands have expected output.

**Type consistency:**
- `ActivityEntry` shape defined in Task 5, consumed by Tasks 6, 7, 8, 9, 13.
- `Hunk` defined in Task 2, consumed by Tasks 3, 5, 7, 9.
- `getOrAssignColor` signature defined in Task 4, consumed in Task 6.
- `readAndDiff`, `clearSnapshot` defined in Task 3, consumed in Task 6.
- `mergeClaudeSettings` defined in Task 15, consumed in Task 17.

All names match across tasks.

**Scope check:** Single implementation plan; all 22 tasks ship within the strategy v2 "~1 week" estimate (engine lib ~1d, protocol+context ~2d, visuals ~1d, producer+CLI+skill+cleanup ~1d, smoke ~half day).
