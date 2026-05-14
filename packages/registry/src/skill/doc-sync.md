---
name: forkshop-doc-sync
description: User-invoked when `<aliases.mount>/CLAUDE.md` (resolves to `app/forkshop/CLAUDE.md` for flat layouts or `src/app/forkshop/CLAUDE.md` for src-dir layouts) has drifted from the actual Forkshop installation — kits added or removed, primitives renamed, hooks/exports changed in `@forkshop/registry`, opt-in features toggled, paths customized. Scans the installation, diffs against the documented surface, proposes section-by-section updates while preserving user-authored rationale. Activates on "sync Forkshop docs", "refresh Forkshop CLAUDE.md", "/forkshop-doc-sync".
---

# Forkshop — doc sync

You are refreshing the user's `app/forkshop/CLAUDE.md` so it matches the *current* state of their Forkshop installation. This is the file that gets auto-loaded into Claude Code sessions inside `app/forkshop/`. When it drifts, future agents work from stale information.

You run **on demand**, not automatically. The user invoked you because they suspect the docs are out of date — they probably added a board, swapped a kit, or noticed a hook referenced in CLAUDE.md no longer exists in `@forkshop/registry`. Your job is to surface every drift, propose a fix, and apply only what the user accepts.

The hard rule: **preserve user-authored rationale.** Anywhere the user has added their own paragraph — explaining why they forked a primitive, why they renamed a section, what their fixture data represents — that text is sacred. Re-flow around it. Never overwrite.

## Phase 0 — Read preconditions

Do all of the following before proceeding. If any check fails, exit with the indicated message.

### Check 1 — `forkshop.json` exists at the repo root

Read `forkshop.json`. If missing, exit:

> *"Forkshop's source files aren't installed yet. Run `npx forkshop init` first, then `set up Forkshop`, then come back to me when CLAUDE.md drifts."*

### Check 2 — `{{aliases.mount}}/CLAUDE.md` exists

Resolve `aliases.mount` from `forkshop.json` (defaults to `app/forkshop`). Read `<aliases.mount>/CLAUDE.md`.

If missing, exit:

> *"`<aliases.mount>/CLAUDE.md` is missing. Run `npx forkshop init --force` to restore the template, then re-run me."*

### Check 3 — `forkshop.config.ts` (or `.tsx`) exists

Locate `<aliases.mount>/forkshop.config.{ts,tsx}`. If missing or empty (still the post-`init` stub), exit:

> *"Forkshop isn't fully set up yet — your `forkshop.config` is empty. Run `set up Forkshop` first; I refresh docs for an already-configured installation."*

Both checks pass → continue to Phase 1.

## Phase 1 — Read the current installation

Gather context **silently**. No user-facing output yet.

### Step 1 — Read the current `CLAUDE.md`

Read `<aliases.mount>/CLAUDE.md` end-to-end. Identify its sections (Markdown `##` headings) and which paragraphs inside each section look user-authored (they don't match anything in the upstream template — most likely the user added them).

A practical signal for "user-authored": the paragraph references project-specific names (the user's block names, their route group names, their fixture-data variables), or it sits inside a fenced code block that the template wouldn't have shipped. Err on the side of preserving anything ambiguous — re-asking is cheap; clobbering a paragraph the user wrote is not.

### Step 2 — Read the actual installation state

Read in parallel:

- `<aliases.mount>/forkshop.config.{ts,tsx}` — the source of truth for primitives, blocks, pages, sourcePath wiring.
- `<aliases.mount>/page.tsx` — the mount page, which lists the sidebar sections and routes.
- The board files in `<aliases.mount>/*-board.tsx` — which kits are wired and how.
- `forkshop.json` — installed bundles, alias map, where files actually live.
- Top-level `tailwind.config.{ts,js,mjs}` — whether the forkshop preset is wired.
- `.claude/settings.json` and `.claude/hooks/post-tool-use.sh` — whether the live-AI hook is installed.
- Root `CLAUDE.md` — whether the cadence note is appended.

### Step 3 — Read the upstream template

The CLI ships a template at `@forkshop/templates/claude-md` (the same content the user's CLAUDE.md was seeded with at install time). Read `<aliases.mount>/CLAUDE.md`'s upstream form from the registry if available (via `npx forkshop diff <aliases.mount>/CLAUDE.md` — surface the upstream lines for comparison). The diff is the **starting point** for understanding what changed: anything in the user's file but not in upstream is a candidate for "user-authored." Anything in upstream but not in the user's file is a candidate for "you deleted it on purpose, or it drifted out."

If `forkshop diff` isn't runnable in the user's environment (offline, no network), proceed with what you can read locally — the diff is a nice-to-have, not a precondition.

## Phase 2 — Compute drift

Walk every section of CLAUDE.md and classify it as one of:

- **In sync** — the section matches the installation; no proposal needed.
- **Stale fact** — the section names a primitive / block / kit / hook / route that no longer exists, OR omits one that's now installed. Propose a targeted line edit.
- **Stale shape** — the section describes a contract (a prop signature, an API route's request body, a hook's return type) that the implementation has since changed. Propose a re-write of the relevant snippet using the current contract.
- **User-authored** — preserve verbatim. If a stale fact lives *inside* a user-authored paragraph, propose only the targeted token replacement (e.g., "the old name → the new name"), and surface that as a separate prompt so the user can confirm.
- **Newly missing** — the installation has a feature (a board, an opt-in, a hook usage) that CLAUDE.md doesn't mention at all. Propose a new section or paragraph.

Build an internal list of proposed changes, each tagged with section + class above.

### Drift sources to check explicitly

These are the highest-yield drift candidates in any Forkshop installation. Walk each:

1. **Sidebar layout** — does the "File layout" section's tree match the actual files in `<aliases.mount>/`? Boards renamed, added, removed.
2. **Kit list** — "The three kits" section. If the user dropped one or added a custom board, the heading is wrong.
3. **Consumer hooks** — every name in the "Consumer hooks" list must still be exported from `@forkshop/registry`. Cross-check against `<aliases.base>/components/forkshop/agent-activity-context.tsx` exports.
4. **API routes** — request/response shapes documented in the file should match `<aliases.api>/edit/route.ts`, `<aliases.api>/positions/route.ts`, `<aliases.api>/agent-activity/route.ts`.
5. **`forkshop.config.ts` example block** — should reflect the user's actual primitive/block/page entries, not the original placeholder names.
6. **Opt-ins** — Locator.js / live-AI hook / cadence note sections should match whether each is actually installed.

## Phase 3 — Render the proposal

Render the drift summary in the exact format below. Use the `AskUserQuestion` tool for the top-level accept/adjust/pause prompt; per-section confirmations also go through `AskUserQuestion` (one call per section, with the proposed change preview in the option labels).

```
Your `<aliases.mount>/CLAUDE.md` is out of date in <N> places.

  [1] <Section title> — <stale fact | stale shape | newly missing | user-authored token>
      Proposed change:
        <one-line summary>

  [2] <Section title> — <…>
      Proposed change:
        <one-line summary>

  …

Preserved as user-authored:
  • <list of paragraphs / sections I detected as your own — won't touch them>
```

If there are zero drifts, render:

```
`<aliases.mount>/CLAUDE.md` matches your installation. Nothing to sync.
```

…and exit.

### The top-level prompt

```ts
{
  questions: [{
    question: "Apply the proposed updates?",
    header: "Sync",
    options: [
      { label: "Apply all",          description: "Walk each section and write the proposed change" },
      { label: "Review section-by-section", description: "Confirm or skip each change one at a time" },
      { label: "Pause",              description: "Write nothing" },
    ],
  }],
}
```

If "Apply all" → proceed to Phase 4 and apply every proposed change.
If "Review section-by-section" → for each proposed change, call `AskUserQuestion` with `Apply / Skip / Show me the full diff` for that one section.
If "Pause" → exit silently.

## Phase 4 — Apply changes

Sequential. Each section's change is applied with a targeted `Edit` or `MultiEdit` over `<aliases.mount>/CLAUDE.md` — never a full rewrite. Reasons:

- A full rewrite would obliterate user-authored content that the heuristics might not have detected.
- Targeted edits preserve the file's existing formatting (line wrap, code-block style, comment markers).
- `Edit` and `MultiEdit` produce predictable diffs the user can review in git before committing.

After each successful write, print `✓ <section>`.

### Preserving user-authored paragraphs

When a stale-fact lives inside a user-authored paragraph (Phase 2 noted this), use `Edit` with:

- `old_string`: the smallest substring that captures the stale token plus enough surrounding context to be unique.
- `new_string`: the same surrounding context with only the stale token swapped.

Never replace the whole paragraph. The user's surrounding prose stays untouched.

### Markers for skill-managed content

Some content was *originally* installed by the setup skill with bracketed markers:

```markdown
<!-- forkshop:cadence-note start - managed; do not edit body, only delete the block -->
…
<!-- forkshop:cadence-note end -->
```

For content inside `<!-- forkshop:* start ... -->` markers, you may rewrite the whole block — that content is declared "managed." For everything else, treat it as the user's.

## Phase 5 — Summary

Render verbatim:

```
Sync complete.

  Applied: <N> changes
  Skipped: <M> changes (user declined)
  Preserved: <K> user-authored paragraphs

What you might want to do next:
  • Review the diff: `git diff <aliases.mount>/CLAUDE.md`
  • If a kit you customized was rewritten, restore your tweaks: I leave a TODO comment at any line I wasn't confident about.

If the docs drift again, just say "sync Forkshop docs".
```

## Edge cases

- **CLAUDE.md was deleted.** Phase 0 Check 2 catches this. Tell the user to re-run `npx forkshop init --force`, then re-invoke you.
- **CLAUDE.md was renamed / moved.** Honor `forkshop.json`'s `aliases.mount`. If the user moved CLAUDE.md outside the mount path manually, ask once where it now lives and proceed from there.
- **Multiple drifts inside the same user-authored paragraph.** Prefer one `MultiEdit` call with several small region edits over a paragraph rewrite. If the user accepts in bulk, write all regions atomically.
- **The user invokes you mid-development with `forkshop.config.ts` half-written.** Detect via syntax errors in the config file. Exit politely: *"Your `forkshop.config.ts` doesn't parse cleanly — I'd risk producing wrong docs. Fix the config, then re-invoke me."*
- **The user invokes you on a freshly-installed Forkshop (no drift yet).** Phase 3's zero-drift exit handles this. Fast and silent.

## What this skill never does

- Rewrites `<aliases.mount>/CLAUDE.md` from scratch. Always targeted edits.
- Touches files outside `<aliases.mount>/CLAUDE.md`. The doc-sync surface is exactly one file.
- Adds documentation for features the user hasn't installed. If Locator is opted-out, the Locator section gets removed, not edited.
- Asks the user about every section. Sections that are in-sync get no prompt and no mention — only drifts are surfaced.
- Mutates anything if the user picks "Pause" in Phase 3.
- Calls out to the network. Everything operates on the installed file tree.
