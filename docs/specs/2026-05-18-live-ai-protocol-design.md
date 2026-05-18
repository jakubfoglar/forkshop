# Live AI protocol + Claude Code pack (implementation spec)

Date: 2026-05-18
Status: Approved — draft v0
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` (closes roadmap item #5)
Prerequisites:
- `docs/specs/2026-05-15-nodetype-layout-extraction-design.md` (shipped)
- `docs/specs/2026-05-16-engine-packaging-design.md` (shipped)
- `docs/specs/2026-05-17-cli-rework-design.md` (shipped)
- `docs/specs/2026-05-17-setup-skill-v2-design.md` (shipped)
- `docs/specs/2026-05-17-live-mirror-and-cadence-scope-design.md` (shipped)

## Goal

Ship Forkshop's defining "multiple agents alive on the canvas" experience at 1.0. After this spec:

- A vendor-neutral wire protocol is documented and live.
- The engine derives element-level activity signals (divs, text wrappers) server-side, regardless of how the agent saves files. Whole-file `Write` and small `Edit` both produce identical-fidelity visualization.
- A Claude Code producer pack ships via the existing scaffold flow — one bash hook + one `.claude/settings.json` entry, opt-in during `forkshop init`.
- Read activity is surfaced as a subtle breathing pulse in the same per-agent color as edit ("almost like thinking").
- Multiple concurrent agents (or multiple sessions of the same agent) get distinct colors from a Forkshop-owned palette.
- The previously-shipped `forkshop-live-editing.md` cadence skill and the strategy-prescribed reactive feedback hook are both retired. Forkshop has no opinion on how any agent saves files.

## Strategy deviations

Two amendments to strategy v2's section "Live AI awareness (multi-agent)":

**Deviation A — Engine derives element-level signals server-side (post-hoc diff), not via producer chunking.**

Strategy v2 paired the live-AI receive side with two mechanisms intended to shape *agent behavior*: the `forkshop-live-editing.md` cadence skill (auto-loaded by Claude Code to nudge many-small-edits) and the reactive feedback hook (system reminders injected back to the agent when it does whole-file writes). Both were premised on element-level highlights only being possible when the agent emitted per-region edits.

This spec replaces that premise. The engine holds in-memory file snapshots, reads the file on each activity event, and diffs against its snapshot to produce synthetic hunks. The existing iframe-side `extractStringLiterals` + `findElementContainingSubstring` pipeline runs unchanged over those hunks. Whole-file `Write` produces the same element-level decoration as small `Edit` — derivation is on the consumer side.

Consequences:
- The cadence skill is retired (no longer shipped via scaffold). One fewer file in `.claude/skills/`.
- The reactive feedback hook is dropped entirely. The protocol becomes strictly one-way: producer → engine → browser.
- Producer packs stay minimal. The Claude Code pack is one ~30-line bash script.

**Deviation B — No separate `@forkshop/agent-claude-code` npm package.**

Strategy v2 prescribed a separate npm package for the Claude Code producer pack, listed in the repo structure as `packages/agent-claude-code/`. In practice the pack is a bash hook script plus a JSON merge — no runtime, no engine dependency. The scaffold flow already drops files into the user's `.claude/` dir for skills; the producer pack rides the same channel.

The wire protocol is the public contract; producer "packs" are convenience files distributed via `forkshop init`. Future packs (Cursor, Codex) ship the same way.

A refinement entry will be added to strategy v2's "Strategy refinements" section (refinement #18) recording these deviations.

## Locked-in decisions

From the 2026-05-17 brainstorm:

1. **Constraint scope:** drop cadence skill entirely; engine derives element granularity post-hoc; Forkshop has no opinion on how any agent saves files.
2. **Observe scope:** `Read` tool only at 1.0. Grep/Glob/Bash are out (noisy in current workflows; protocol supports adding them later as additional `action` verbs).
3. **Reactive feedback hook:** dropped. One-way protocol.
4. **Read visual treatment:** subtle breathing pulse in the same per-agent color as edit, 30% opacity, slow 2.4s cadence. "Almost like thinking." No element-level highlight (no diff to extract from).
5. **Color ownership:** Forkshop owns the palette. Producers do not supply colors. Claude defaults to orange; the palette holds 8 perceptually-uniform OKLCH hues. Multi-session and multi-agent both rotate through the palette via `(agent, sessionId)` slot assignment.
6. **Producer pack distribution:** scaffold files via `forkshop init`, not a separate npm package.
7. **fs-watcher fallback:** deferred to 1.x. The killer use case (lights up manual VS Code edits too) is real but launch scope stays focused.
8. **Barrel-maintenance guidance:** folded into `app/forkshop/CLAUDE.md` as a dir-loaded one-liner, not a behavior-shaping skill.

## Wire protocol

### `POST /api/forkshop/agent-activity`

```json
{
  "agent": "claude-code",
  "agentLabel": "Claude",
  "sessionId": "f8a2…",
  "file": "components/ui/button.tsx",
  "action": "read" | "edit" | "create" | "delete",
  "ts": 1747204200000
}
```

Fields:

- `agent` (string, required). Opaque identifier the producer chooses. Engine has a small known-agents map for color reservation (`claude-code` → slot 0); unknown identifiers get round-robin slot assignment.
- `agentLabel` (string, optional). Display name. Falls back to the engine's known-agents lookup, then to the `agent` string.
- `sessionId` (string, required). Opaque identifier stable across one producer instance's lifetime. For Claude Code, sourced from the `session_id` field the PostToolUse hook receives on stdin. For other producers, anything stable (process PID, `uuidgen`, etc.) works. Two Claude sessions = two `sessionId`s = two colors.
- `file` (string, required). Absolute or project-relative path. Engine normalizes to project-relative, rejects path-escape (`startsWith(process.cwd())` check, current behavior).
- `action` (enum, required). One of `read | edit | create | delete`. Engine treats `create` as `edit` semantically when reconciling against snapshot presence; `delete` clears the snapshot entry.
- `ts` (number, required). Unix epoch in milliseconds.

Removed from strategy v2's draft shape: `color` (engine owns palette), `region` (no longer needed; engine diff produces hunks).

Dev-only endpoint. Returns 403 in production. Validation via zod; malformed payload returns 400.

### `GET /api/forkshop/agent-activity/stream`

SSE endpoint. Unchanged event/data envelope (`event: activity`, `data: { activeFiles: ActivityEntry[] }`); the entry shape grows:

```ts
type ActivityEntry = {
  filePath: string         // project-relative
  agent: string
  agentLabel: string
  sessionId: string
  color: string            // resolved server-side
  action: "read" | "edit" | "create" | "delete"
  lastSeenAt: number
  hunks?: ReadonlyArray<{ oldString?: string; newString?: string }>
  // hunks present for edit/create; absent for read/delete
}
```

Heartbeat (`:keepalive`) unchanged at 15s. Idle prune unchanged at 5s.

### Color palette

`packages/engine/src/lib/agent-color-palette.ts`. Eight perceptually-uniform OKLCH hues (constant L 0.7, C 0.18, varying H):

```ts
const PALETTE = [
  "oklch(0.7 0.18 50)",   // 0 — orange   (Claude default)
  "oklch(0.7 0.18 200)",  // 1 — cyan
  "oklch(0.7 0.18 290)",  // 2 — purple   (existing Forkshop accent)
  "oklch(0.7 0.18 130)",  // 3 — lime
  "oklch(0.7 0.18 340)",  // 4 — magenta
  "oklch(0.7 0.18 250)",  // 5 — blue
  "oklch(0.7 0.18 170)",  // 6 — teal
  "oklch(0.7 0.18 10)",   // 7 — pink
]
const KNOWN: Record<string, number> = { "claude-code": 0 }
```

Assignment: `Map<\`${agent}/${sessionId}\`, number>` on `globalThis` for HMR safety. Known-agent first session reserves its fixed slot. Subsequent sessions of the same agent (different `sessionId`) take the next free slot, round-robin. Unknown agents start at the first free slot after reservations. Palette wraps at 8+ — last-resort collision, visually acceptable.

## Engine architecture

### New files

**`packages/engine/src/lib/file-snapshot.ts`** — in-memory snapshot map + read-and-diff. ~40 LOC.

```ts
const snapshot: Map<string, string> = (globalThis.__forkshopFileSnapshot ??= new Map())

export async function readAndDiff(absolutePath: string): Promise<Hunk[]> {
  const next = await fs.readFile(absolutePath, "utf8")
  const prev = snapshot.get(absolutePath)
  snapshot.set(absolutePath, next)
  if (prev === undefined) return []        // first sighting — no diff target
  return diffToHunks(prev, next)
}

export function clearSnapshot(absolutePath: string): void {
  snapshot.delete(absolutePath)
}
```

**`packages/engine/src/lib/diff-to-hunks.ts`** — line-based diff via `diff` (jsdiff). Group consecutive `removed` + `added` blocks into `{ oldString?, newString? }` hunks. ~30 LOC.

```ts
import { diffLines } from "diff"

export type Hunk = { oldString?: string; newString?: string }

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

**`packages/engine/src/lib/agent-color-palette.ts`** — palette + slot assignment. ~50 LOC.

```ts
const assignments: Map<string, number> =
  (globalThis.__forkshopAgentColorAssignments ??= new Map())

export function getOrAssignColor(agent: string, sessionId: string): string {
  const key = `${agent}/${sessionId}`
  let slot = assignments.get(key)
  if (slot === undefined) {
    slot = pickFreeSlot(agent)
    assignments.set(key, slot)
  }
  return PALETTE[slot % PALETTE.length]
}

function pickFreeSlot(agent: string): number {
  const reserved = KNOWN[agent]
  if (reserved !== undefined && !slotInUseByOtherSession(agent, reserved)) {
    return reserved
  }
  const used = new Set(assignments.values())
  for (let i = 0; i < PALETTE.length; i++) {
    if (!used.has(i)) return i
  }
  return assignments.size % PALETTE.length  // wrap
}
```

### Modified files

**`packages/engine/src/lib/agent-activity-state.ts`** — `ActivityEntry` grows the richer shape. The Map key changes from `filePath` to `${agent}/${sessionId}/${filePath}` so concurrent edits by different agents to the same file are both visible. Prune logic unchanged. Subscribers receive the same snapshot array.

**`packages/engine/src/api/agent-activity/route.ts`** — full rewrite:

1. zod-validate the new payload shape.
2. Reject in production (current behavior).
3. Normalize file path (project-relative, reject path-escape).
4. `getOrAssignColor(agent, sessionId)`.
5. Branch on action:
   - `edit` | `create` → `readAndDiff(absolutePath)`.
   - `delete` → `clearSnapshot(absolutePath)`; hunks = `[]`.
   - `read` → no disk read; hunks = `undefined`.
6. `recordActivity({ filePath, agent, agentLabel, sessionId, color, action, hunks, lastSeenAt: ts })`.

**`packages/engine/src/api/agent-activity/stream/route.ts`** — no structural change; the broadcast payload's entry shape is automatically richer through the type update.

**`packages/engine/src/components/agent-activity-context.tsx`:**
- Type updates throughout.
- `useAllAgentSubstrings` → renamed `useAllAgentHunks`. Returns the same `{ oldString?, newString? }[]` shape; just reads from `entry.hunks` instead of `entry.oldString/newString`. No external API break (was never exported beyond the relay).
- `useAgentSubstringsForPage` / `useAgentSubstringsForBlock` continue to work; internally pull from `entry.hunks`.
- New hook: `useNodeAgentColor(node) → string | undefined`. Returns the resolved color of the most-recent agent currently active on the node; `undefined` when no activity. Used by AgentSelectionChip and by `useNodeAgentActive`.
- `useNodeAgentActive` extended to return `{ agentActive, agentFileLabel, agentColor, agentAction }`.

**`packages/engine/src/components/agent-iframe-relay.tsx`** — broadcasts include per-event color:

```ts
postMessage({ type: "forkshop:agent-block", slugs, color }, "*")
postMessage({ type: "forkshop:agent-text", hunks, color }, "*")
```

New broadcast for read activity (host-side decoration, not iframe-DOM):

```ts
// dispatched as a CustomEvent on window, not postMessage — read decoration
// mounts on the iframe wrapper container in the host document, not inside
// the iframed page.
window.dispatchEvent(new CustomEvent("forkshop:agent-read-update", {
  detail: { byFile: Map<string, { color: string; agentLabel: string }> }
}))
```

The iframe-host component subscribes to this event and sets `data-forkshop-agent-reading` plus inline `--forkshop-agent-color` on its container.

**`packages/engine/src/hooks/use-iframe-edit-wiring.ts`** — message handler updates:
- `agent-block` message: when toggling `data-forkshop-agent-active`, also set `style.setProperty("--forkshop-agent-color", color)` on the same element. On timeout cleanup, the inline style is removed.
- `agent-text` message: same pattern on text-pulse target elements.
- No new message type (reads are host-side).

**`packages/engine/src/lib/edit-mode.ts`:**
- `PREVIEW_AGENT_CSS` updated: outline rules use `var(--forkshop-agent-color, oklch(0.62 0.22 280))`. The `:root` declaration of `--forkshop-agent-color` is removed (color is now per-element inline).
- New `PREVIEW_AGENT_READ_CSS` block for the breathing pulse — mounted in the host document (the iframe wrapper container), not inside iframes.

```css
.forkshop-iframe-host[data-forkshop-agent-reading] {
  outline: calc(2px / var(--canvas-zoom, 1)) solid color-mix(in oklch, var(--forkshop-agent-color) 30%, transparent) !important;
  outline-offset: calc(4px / var(--canvas-zoom, 1)) !important;
  border-radius: calc(2px / var(--canvas-zoom, 1));
  animation: forkshop-agent-read-breathe 2.4s ease-in-out infinite !important;
}

@media (prefers-reduced-motion: no-preference) {
  @keyframes forkshop-agent-read-breathe {
    0%, 100% { outline-color: color-mix(in oklch, var(--forkshop-agent-color) 30%, transparent); }
    50%      { outline-color: color-mix(in oklch, var(--forkshop-agent-color) 60%, transparent); }
  }
}
```

All other decorations already use `calc(N / var(--canvas-zoom, 1))` for zoom-invariant on-screen thickness — preserved.

**`packages/engine/src/components/agent-selection-chip.tsx`** — multi-agent stacking:
- Layout shifts from a single centered chip to a horizontal stack at top-center, in `lastSeenAt` desc order.
- Up to 3 chips visible; a "+N" pill renders if more.
- Each chip uses its agent's resolved color as background.
- Chip dot animation uses `prefers-reduced-motion` guard.

### Removed files

- `packages/engine/src/skill/live-editing.md` — cadence skill retired.
- Its references in `packages/cli/src/manifest-builder.ts` and `packages/cli/src/manifest-builder.test.ts`.
- Its references in `packages/engine/templates/user-claude-md.md` (any link to the skill name).

### Memory budget

Snapshot map ≈ N × file_size. Typical 5-50 watched files × 5-50KB each ≤ 2.5MB. Negligible.

Color assignment map ≈ `(agent, session)` pairs × ~40 bytes. Bounded by the user's concurrent agent count. Negligible.

## Visual treatments

### Tier model (existing preserved, two new behaviors)

| Tier | Trigger | Decoration | Color source |
|---|---|---|---|
| Frame outline | Active `edit` event on a file mapping to a Node | Solid 2px (zoom-invariant) outline, persists ~2s after last event | Per-event resolved color |
| Page-active soft pulse | `edit` on a page TSX with no block-substring match | Slow box-shadow pulse on every block on that page (existing) | Per-event resolved color |
| Text-pulse | Hunk substring found in iframe DOM text | 2px outline + offset on the smallest text-containing element, 2s | Per-event resolved color |
| **Read breathing** *(new)* | `action: "read"` event on a file mapping to a Node | Slow 2.4s breathing outline in 30%-opacity per-agent color, persists ~3s after last event | Per-event resolved color |
| Floating chip | Any active activity | Stacked per-agent chips at top-center | Per-agent resolved color |

### Where each tier mounts

- Frame outline, page-active soft pulse, text-pulse → inside the iframe (existing `use-iframe-edit-wiring` machinery, now with per-event color via inline `--forkshop-agent-color`).
- Read breathing → on the iframe-host wrapper container, in the host document. Simpler than reaching into the iframe; the host has all the state.
- Floating chip → top-center of the canvas, unchanged location.

### Multi-agent stacking

- Frame outline: last-write-wins on the same Node. Two simultaneous agents on different Nodes don't collide.
- Chip stack: ordered by `lastSeenAt` desc; cap 3 visible + "+N" overflow.
- Read breathing layers on regardless of any edit-tier decoration (different decoration channel).
- No concentric outlines at 1.0. Polish for 1.x if multi-agent flows actually arrive.

### Reduce-motion

All new keyframes wrapped in `@media (prefers-reduced-motion: no-preference)`. Existing keyframes (`forkshop-agent-pulse`, `forkshop-agent-page-block-pulse`) updated to match.

## Producer pack — Claude Code

### Files dropped by `forkshop init` (opt-in)

```
.claude/hooks/forkshop-post-tool-use.sh    # new — ~30 lines bash
```

Plus an idempotent merge into:

```
.claude/settings.json
```

### Hook script

`packages/engine/templates/hooks/forkshop-post-tool-use.sh.template`:

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

Notes:
- `Write` maps to `create`; engine reconciles to `edit` if a snapshot already exists for that path.
- `MultiEdit` collapses to one event per file. The engine diff surfaces all changed regions as hunks regardless of how the agent batched the writes.
- jq missing → silent exit 0 (acceptable degradation; user installs jq if they care).
- Forkshop dev server down → curl `--max-time 1` fails silently; zero impact on Claude.

### Settings merge

`packages/cli/src/settings-merge.ts` — new file. ~50 LOC.

Behavior:
1. Read `.claude/settings.json` (or `{}` if missing).
2. Ensure `hooks.PostToolUse` is an array.
3. Match on exact entry shape: `{ "command": ".claude/hooks/forkshop-post-tool-use.sh" }`. If present, no-op. If absent, append.
4. Preserve all other keys verbatim. Write back with 2-space indent and stable key ordering.
5. If the file existed but wasn't valid JSON, bail with a clear error rather than overwrite.

### Opt-in flow

Setup skill's Phase 5 (`packages/engine/src/skill/setup.md`) gains one question, using the single-panel Yes / No / Show-me consent format (matching the Locator opt-in established by polish spec refinement #15):

> *"Install Claude Code live-AI hook? Adds `.claude/hooks/forkshop-post-tool-use.sh` (~30-line bash) and one entry to `.claude/settings.json`. No effect on agent behavior — only forwards file paths to your dev server's Forkshop tab so Nodes light up as you work. Reversible. [Yes / No / Show me]"*

Phase 6 installs the script + merges settings only on Yes.

`forkshop update` re-prompts only if the producer pack wasn't installed at init time. If it was installed, `update` refreshes the script file in place (`.claude/hooks/forkshop-post-tool-use.sh`) but leaves `settings.json` alone.

## Migration & breaking changes

### For existing Forkshop installs

- `pnpm forkshop update` no longer drops `.claude/skills/forkshop-live-editing.md` and flags any existing copy for deletion in its confirm-all prompt.
- First post-bump `forkshop update` prompts the producer-pack opt-in (Yes / No / Show me).
- No changes to `app/forkshop/*` or `app/api/forkshop/*` files. Existing route stubs are one-line re-exports and continue to work.
- `forkshop.json` lock gains a `producerPack: { claudeCode: boolean }` field recording install state so updates know whether to re-prompt.

### Engine surface changes (semver-major in 0.x)

- `ActivityEntry` public type grows (`agent`, `agentLabel`, `sessionId`, `color`, `action`, `hunks?`) and drops the previously-public `oldString` / `newString`. The hooks that returned `{oldString?, newString?}[]` continue to do so — they now project from `entry.hunks` internally.
- `useAllAgentSubstrings` → renamed `useAllAgentHunks`. Internal-only hook (relay-side); no external consumers. Straight rename.
- `useNodeAgentActive` return shape grows: `{ agentActive, agentFileLabel, agentColor, agentAction }`. Existing consumers reading `agentActive` and `agentFileLabel` continue to work.

### What does NOT change

- `AgentActivityProvider`'s `fileMap` prop.
- The SSE wire envelope (still `event: activity`, `data: { activeFiles: [...] }`).
- Existing `app/api/forkshop/agent-activity/*` route stubs.
- `forkshop.config.tsx` shape.
- `app/forkshop/page.tsx` shape.
- `globals.css`, `tailwind.config.*`, `next.config.*`.

## Testing

### Unit — `packages/engine/src/**/*.test.ts`

- `agent-color-palette.test.ts` — known-agent slot reservation, round-robin assignment, palette wrap-around, deterministic by `(agent, sessionId)`, second session of same agent gets a different color.
- `file-snapshot.test.ts` — first sighting returns no hunks; subsequent diff produces expected hunks for line insert / delete / modify; `clearSnapshot` removes the entry; HMR re-import preserves state via `globalThis`.
- `diff-to-hunks.test.ts` — consecutive removed+added grouped into one hunk; removed-only and added-only edges; large rewrite (Write tool case) reduces to N hunks correctly; empty diff returns `[]`.
- `agent-activity-state.test.ts` — extended for richer ActivityEntry; map key includes `(agent, sessionId, filePath)`; prune behavior preserved.
- `agent-iframe-relay.test.ts` — broadcasts include `color` and `hunks`; hello-replay carries them; read events emit the host-side CustomEvent, not postMessage.
- `use-node-agent-active.test.ts` — returns `agentColor` and `agentAction`; multi-agent picks the most-recent agent's color.

### Unit — `packages/cli/src/**/*.test.ts`

- `settings-merge.test.ts` — idempotent merge into `.claude/settings.json`; existing entries preserved verbatim; empty / missing file handled; duplicate entry not appended twice; malformed JSON bails clean.
- `manifest-builder.test.ts` — extended to confirm the cadence skill is no longer in the bundle, and the new hook template is.

### Smoke — manual, against `apps/playground`

- Edit a TSX in `apps/playground/components/blocks/`. Verify frame outline + text-pulse fires.
- Open two Claude Code sessions, edit different files concurrently. Verify two chips with different colors stack at top-center.
- Read a TSX. Verify breathing pulse on the matching iframe-host container; no element-level text-pulse.
- Create a brand-new page via `Write`. Verify the sidebar gains a sticky entry; no element-level highlight on the first event; second edit produces normal element-level decoration.
- Zoom canvas to 0.25× and 4×. Verify outline thickness stays 2px on-screen across all tiers.
- Stop `pnpm dev` mid-session. Verify hook curls fail silently and Claude continues working uninterrupted.

### No e2e at 1.0

Playwright against multi-iframe canvas with simulated SSE events is more work than the value justifies for a launch feature. Smoke + unit coverage is the bar.

## Files touched

### Added

- `packages/engine/src/lib/file-snapshot.ts`
- `packages/engine/src/lib/file-snapshot.test.ts`
- `packages/engine/src/lib/diff-to-hunks.ts`
- `packages/engine/src/lib/diff-to-hunks.test.ts`
- `packages/engine/src/lib/agent-color-palette.ts`
- `packages/engine/src/lib/agent-color-palette.test.ts`
- `packages/engine/templates/hooks/forkshop-post-tool-use.sh.template`
- `packages/cli/src/settings-merge.ts`
- `packages/cli/src/settings-merge.test.ts`

### Modified

- `packages/engine/src/lib/agent-activity-state.ts`
- `packages/engine/src/lib/agent-activity-state.test.ts`
- `packages/engine/src/api/agent-activity/route.ts`
- `packages/engine/src/api/agent-activity/stream/route.ts` (type-only)
- `packages/engine/src/lib/use-node-agent-active.ts`
- `packages/engine/src/components/agent-activity-context.tsx`
- `packages/engine/src/components/agent-iframe-relay.tsx`
- `packages/engine/src/components/agent-iframe-relay.test.ts`
- `packages/engine/src/components/agent-selection-chip.tsx`
- `packages/engine/src/components/agent-selection-chip.test.ts`
- `packages/engine/src/hooks/use-iframe-edit-wiring.ts`
- `packages/engine/src/lib/edit-mode.ts`
- `packages/engine/src/index.ts` (export updates)
- `packages/engine/src/skill/setup.md` (Phase 5 opt-in question; references to live-editing skill removed)
- `packages/engine/templates/user-claude-md.md` (barrel-maintenance hint folded in; live-editing skill references removed)
- `packages/cli/src/manifest-builder.ts` (live-editing skill removed from manifest; producer-pack template added)
- `packages/cli/src/manifest-builder.test.ts`
- `packages/cli/src/init.ts` (producer-pack opt-in wired)
- `packages/cli/src/update.ts` (refresh hook script; never re-merge settings)
- `packages/engine/package.json` (add `diff` dependency)

### Removed

- `packages/engine/src/skill/live-editing.md`
- Its references in `packages/cli/src/manifest-builder.ts` and `packages/cli/src/manifest-builder.test.ts`.

## Out of scope at 1.0

- Grep/Glob/Bash observe events (protocol supports it via additional `action` verbs; no producer emits them at 1.0).
- Coalesced session-activity tray ("Claude · searching for 'Hero'…") — paired with the above; 1.x design conversation.
- `forkshop watch` fs-watcher subcommand for manual-VS-Code-edit feedback and universal agent compatibility — 1.x.
- `@forkshop/agent-codex`, `@forkshop/agent-cursor` producer packs — 1.x per strategy v2.
- AST-aware diff (Approach B from the brainstorm) — protocol supports swapping the diff algorithm internally; defer until line-diff produces visible fidelity gaps.
- Multi-agent concentric outlines on the same Node — current design is last-write-wins on the frame outline. Concentric stacking is polish for 1.x.
- Activity timeline panel in the sidebar (strategy v2's 1.x candidate; unchanged status).
- Reactive feedback hook (system reminders to agent) — out entirely.
- `forkshop-live-editing.md` skill — out entirely; replaced by a barrel-maintenance hint in `app/forkshop/CLAUDE.md`.
- Bundling producer pack as `@forkshop/agent-claude-code` npm package — files-via-CLI scaffold is sufficient at 1.0.

## Sequencing

Implementation can land in 4 stages, each independently mergeable:

1. **Engine snapshot + diff + color palette** (no protocol changes yet; pure lib work). ~1 day.
2. **Protocol revision + route handler + context updates** (wire new shape; update consumers; existing producer keeps working against the old shape until the cadence-skill removal step). ~2 days.
3. **Visual treatments + multi-agent chip stacking + read breathing pulse**. ~1 day.
4. **Producer pack + CLI settings merge + setup-skill Phase-5 update + cadence-skill removal**. ~1 day.

Total: ~5 days focused work. Matches the "~1 week" estimate in strategy v2's sequencing block.

## Open questions deferred to implementation

- Exact zod schema for the new payload (straightforward; settled in code).
- Whether to vendor the `diff` package or implement `diffLines` ourselves (~50 LOC). Default: vendor for battle-testedness.
- Whether the engine should provide an explicit eager-seed endpoint (`POST /api/forkshop/agent-activity/seed` from the Provider mount) so the very first edit produces element-level highlights. Default: lazy seeding (first event has no hunks); promote to eager only if smoke reveals it's missed.
- Whether `app/forkshop/CLAUDE.md`'s barrel-maintenance hint should also mention page-route file naming conventions (App Router intricacies). Default: keep the hint short; defer Router-specific guidance to the user-CLAUDE.md template's main body.

These are implementation details, not design choices.
