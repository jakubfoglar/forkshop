# Live-AI install-path closeout — issues found

Captured during the cold-fixture verification described in the live-AI design spec
(`docs/superpowers/specs/2026-05-13-forkshop-live-ai-design.md`, validation step 8).
Method: scaffolded a fresh `create-next-app@14` fixture, ran `npx forkshop init`
against the local docs registry, walked the setup skill in Claude Code.

Each issue links to the commit that resolved it (one commit per fix).

---

## Issue 1 — `forkshop init` crashes installing the skill bundle

**Symptom.** Running `npx forkshop init` against a fresh Next.js fixture exits
immediately with:

```
Cannot resolve destination for @forkshop/skill/live-editing (no matching alias prefix)
```

No files are written; the fixture stays clean.

**Cause.** `packages/cli/src/manifest-builder.ts` only sets a `destOverride` for
`@forkshop/skill/setup`. Every other skill file (currently only `live-editing.md`)
falls through to `resolveDestination`, which looks for a matching namespace alias
in the `namespaceMap` — but `@forkshop/skill` isn't in the map. The throw is
correct (catches typos); the missing override is the bug.

The `skill` bundle is auto-populated from every `@forkshop/skill/*` address it
finds in the registry, so any new skill file silently joins the install — and
silently breaks the install — until an override is added.

**Fix.** Pattern-based destOverride in `manifest-builder.ts`: every address that
starts with `@forkshop/skill/` gets `.claude/skills/forkshop-<name>.md` written
into its manifest entry. The explicit `@forkshop/skill/setup` line in the
`overrides` map becomes redundant and is removed.
