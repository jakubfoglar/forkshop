---
name: forkshop-live-editing
description: Auto-applies to any Claude session editing files under `**/forkshop/**` (matches both flat `components/forkshop/`, `lib/forkshop/`, `app/forkshop/` and the src-dir variants `src/components/forkshop/`, `src/lib/forkshop/`, `src/app/forkshop/`), `**/components/ui/**`, or any Node file referenced in `forkshop.config.ts`. Instructs Claude to chunk large rewrites into many small `Edit`s, prefer `MultiEdit` for multi-region changes, and avoid `Write` when an `Edit` would suffice. Activates implicitly when editing those paths — no invocation phrase needed.
---

# Forkshop — live-editing cadence

When you're editing files Forkshop watches (per the activation paths above), every file save produces a visible event in the user's open Forkshop tab — a sidebar dot, a Node glow, and a text pulse if your `oldString` / `newString` substring appears in the rendered DOM. The user is *watching*. Lean into it.

## Two rules

1. **Prefer `Edit` (or `MultiEdit`) over `Write`.** `Write` replaces the whole file in one operation; the user sees a single flash. `Edit` and `MultiEdit` produce one event per region; the user sees a typewriter-build sequence as you compose the page section by section.

2. **Never leave the file in a broken intermediate state.** Forkshop's iframe will render Next.js's error overlay while the file is unparseable. Sequence your edits so each step compiles. Example: when renaming a component used in three places, edit the three call sites *first* (still resolves to the old export), then rename the export last. Don't rename the export first and produce three "Cannot find name" errors visible to the user.

## How to chunk

- **Single-line text change** → one `Edit` (this is already optimal).
- **One paragraph or one Node/JSX section** → one `Edit` with the whole paragraph.
- **Multi-region change to the same file** (e.g., add a new prop and pass it in two places) → one `MultiEdit` with all regions; single disk write, multiple visual events on the user's side because the hook splits MultiEdit into per-region POSTs.
- **Replacing a 50-line Node** → if it's one contiguous block, one `Edit` is fine. The visual flash represents the new Node. If the old and new are *structurally similar* (renaming a few names, swapping some JSX), prefer many small `Edit`s — each leaf change pulses individually and the user sees what you're doing.
- **Whole-file rewrite (the only case where `Write` is the right call)** → only when the new file is structurally unrelated to the old. The user sees one flash; that's the right signal.

## Watch for

- `MultiEdit` with `replace_all: true` for some entries silently rewrites every occurrence of a string. Each match becomes its own POST → its own pulse. If a string occurs in unrelated places, the user sees pulses on unrelated frames. Prefer surgical individual edits when accuracy matters more than disk efficiency.
- The substring text-pulse only fires when `oldString` or `newString` appears as text inside one of Forkshop's rendered iframes. JSX prop changes, class changes, import edits, and config changes won't text-pulse — but they still produce the sidebar dot and frame glow. That's expected.
- The activity prune is 5 seconds. If you make 30 edits in quick succession, the pulses chain together into a continuous-feeling stream. If you make one edit per minute, each pulse is a discrete event. Both are fine; just be aware of the cadence.

## What this skill never does

- Forces a specific edit count. Sometimes one `Edit` is right; sometimes ten are right. Use judgment.
- Adds artificial delays. The live-AI loop is fire-and-forget; no waiting needed.
- Asks the user "should I chunk this?" Just chunk.
