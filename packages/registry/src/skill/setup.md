---
name: forkshop-setup
description: Wires Forkshop into a Next.js + Tailwind project after `npx forkshop init`. Detects project type, scans components and routes, proposes a sidebar, asks before mutating next.config.ts / .claude/settings.json / root CLAUDE.md, writes per-board files, populates forkshop.config.ts. Activates on "set up Forkshop", "finish Forkshop setup", "configure Forkshop", "wire up Forkshop".
---

# Forkshop — first-run setup

You are setting up Forkshop in the user's project. The CLI (`npx forkshop init`) has already dropped Forkshop's source files (primitives, kits, fonts, API routes, an empty `forkshop.config.ts` stub, and a CLAUDE.md). Your job is to walk the user through the *configuration* — what their Forkshop's sidebar contains, which kits power each section, and which opt-in features to install — then write the per-board files and populate `forkshop.config.ts`.

You run **once** per project. After this, your work is mostly historical: the user reads `app/forkshop/CLAUDE.md` for ongoing customization, the sibling `forkshop-live-editing` skill auto-applies when Claude edits Forkshop-watched files, and the user-invoked `forkshop-doc-sync` skill refreshes documentation if it drifts.

The user owns every file you produce. They will fork freely. This file (the skill itself) is in their repo too — they can edit it. Lean toward shorter outputs, explicit user consent on every config mutation, and language that frames Forkshop as something they *have*, not something they *use*.

## Phase 0 — Read preconditions

Do **all** of the following before proceeding to Phase 1. If any check fails, exit with the indicated message and stop.

### Check 1 — `forkshop.json` exists at the repo root

Read `forkshop.json` from the working directory. If missing, exit:

> *"Forkshop's source files aren't installed yet. Run `npx forkshop init` first."*

`forkshop.json` is the source of truth for the `aliases.mount` path (where Forkshop's mount route lives) and the alias map needed to resolve all other paths. Without it, every subsequent step would be guessing.

### Check 2 — Read `{{aliases.mount}}/CLAUDE.md`

Resolve `{{aliases.mount}}` from `forkshop.json` (defaults to `app/forkshop` if absent). Read the file at `<aliases.mount>/CLAUDE.md`.

If missing, exit:

> *"Forkshop's installation seems incomplete — `<aliases.mount>/CLAUDE.md` is missing. Re-run `npx forkshop init --force` or restore the file manually."*

That CLAUDE.md documents the kit API (`design-system-board`, `iframe-gallery`, `page-tree`), the selection model, and the conventions you'll write code against. You will rely on it instead of duplicating its content here.

### Check 3 — App Router only

Confirm `app/` exists at the repo root (or under the workspace specified by `aliases.mount` in monorepos). If only `pages/` exists, exit:

> *"Forkshop v1 only supports Next.js App Router. Pages Router support is on the roadmap but not shipped."*

If `vite.config.{ts,js,mjs}` exists at the repo root, exit:

> *"This looks like a Vite project. Forkshop v1 supports Next.js App Router only."*

If `remix.config.{ts,js}` exists, exit:

> *"This looks like a Remix project. Forkshop v1 supports Next.js App Router only."*

If neither `app/` nor `pages/` exists and no framework config is found, exit:

> *"This doesn't look like a Next.js project. Forkshop requires App Router."*

### Check 4 — Re-run detection

If `forkshop.config.ts` (or `.tsx`) at `<aliases.mount>/` contains a non-empty `config` export — that is, more than the stub the CLI dropped — switch to **Adjust mode** (see the section near the bottom of this file) and skip Phases 1–7.

A "non-empty" config means: any of `designSystem.primitives`, `components.entries`, or `pages.autoDiscover` has been populated past the stub's defaults. The CLI's stub has empty arrays.

Once all four checks pass, continue to Phase 1.

## Phase 1 — Read the project, build understanding

You will gather context *first*, then reason. Produce a narrative description of what kind of project this is — never a category lookup. Two sentences of "this is the marketing site for X" beats any dependency-graph inference.

### Step 1 — Read the project's own words

In order, whatever exists:

- Repo-root `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`
- Repo-root `README.md` (first ~150 lines)
- The index file of `docs/` if present (`docs/README.md`, `docs/index.md`, or the alphabetically first `.md`)

**If the project's own docs describe what it is, trust them.** A line like "Ravineo's marketing surface and a few internal tools" is worth more than the entire `package.json`.

### Step 2 — Read structural hints

Five quick reads:

1. `package.json` — dependencies, `name`, `description`, `scripts`.
2. `app/layout.tsx` — fonts loaded, head exports, metadata pattern.
3. `app/page.tsx` if present — is this a landing page or a redirect?
4. `tailwind.config.{ts,js,mjs}` — is the theme defaults-only or heavily customized (many semantic tokens, custom font families)?
5. `next.config.{ts,js,mjs}` — bundler, redirects, output mode, anything unusual.

### Step 3 — Scan two directories one level deep

`ls app/` and `ls components/`. Note route-group names (parentheses), subfolder names. **Do not recurse yet** — Phase 2 will do that.

### Step 4 — Signals to weigh, not rules to fire

The following observations are *inputs to your reasoning*. Let any one of them update your picture; never let one of them decide for you.

- **Auth packages** (any of these) suggests an authenticated surface: `@clerk/nextjs`, `next-auth`, `@auth/core`, `lucia`, `@lucia-auth/*`, `iron-session`, `@auth0/nextjs-auth0`, `@workos-inc/authkit-nextjs`, `@supabase/auth-helpers-nextjs`, `@supabase/ssr`.
- **Authenticated-style route groups**: `(auth)`, `(authenticated)`, `(dashboard)`, `(app)`, `(protected)`, `(private)`.
- **Marketing-style route groups**: `(marketing)`, `(public)`, `(home)`, `(www)`.
- **Both kinds of route groups present** → this is most likely a hybrid project, which is the norm in production codebases, not an edge case.
- **Mobile-web signals** — in `app/layout.tsx` or a `viewport` export: `maximumScale: 1` AND `userScalable: false`, plus breakpoint usage in the top-edited TSX files staying under `md:`. If both fire, set a *mobile profile* flag (changes `iframe-gallery` default to single-width 375 px).

### Step 5 — Produce a narrative

Write a 2–3 sentence description of the project. This is what the user sees in Phase 3's proposal — make it concrete and observable.

**Good (concrete, observable):**

> *"This is a hybrid: a `(marketing)` surface (~8 static pages + blog MDX) plus an `(authenticated)` surface using Clerk (~12 routes). Tailwind config is heavily customized with semantic tokens. The README emphasizes the marketing site; CLAUDE.md documents the design system."*

**Bad (categorical, abstract):**

> *"This is a SaaS marketing hybrid."*

The narrative is the proposal's first paragraph. Users correct narratives faster than they correct sidebar trees.

### Step 6 — Carry the narrative forward

Hold the narrative + the raw signals (auth lib name, route-group names, mobile-profile flag, Tailwind v3-vs-v4) as Phase 2's input. Do not show the user the signal list — show the narrative.

## Phase 2 — Scan for primitives, blocks, routes

Three scans, all silent. Output is data for Phase 3 — do not show progress to the user.

### Scan A — Primitives

1. If `components/ui/` exists (the shadcn convention), list its direct `.tsx` files. Filter out filenames that are clearly not primitives (`use-toast.ts`, `index.ts`, `utils.ts`, anything under a `_` prefix).
2. Otherwise, grep `components/**/*.tsx` for filenames matching this canonical set (case-insensitive): `button`, `badge`, `input`, `select`, `card`, `dialog`, `tooltip`, `avatar`, `tabs`, `switch`, `checkbox`, `radio`, `label`, `textarea`, `separator`, `skeleton`, `popover`, `dropdown`, `typography`, `heading`.
3. For each candidate, briefly open the file (head ~30 lines) and confirm there's a default or named export of the same name. This guards against false positives like `button-helpers.ts`, `dialog-context.ts`.
4. Cap at ~12 primitives. If more candidates exist, sort by import-count across `app/**/*.tsx` and keep the top 12. Note the cap in the proposal so the user knows you trimmed.

### Scan B — Blocks

1. Look for any of: `components/blocks/`, `components/sections/`, `components/marketing/`, `components/site/`. If multiple match, prefer `blocks/` over `sections/` over the others.
2. List direct `.tsx` exports of the chosen folder.
3. For each block, find its first usage in `app/**/*.tsx`. Capture the *literal* props passed in that usage — those become the **fixture** the proposal references. If no usage exists, mark the block as "no fixture; will use empty props."
4. If none of the candidate folders exist, skip the Blocks section in the proposal. Note this in the narrative ("I didn't find an obvious blocks folder").

### Scan C — Routes

1. Recurse `app/**` for `page.tsx`. Group by the closest enclosing route group (the nearest parent directory wrapped in parentheses).
2. Static routes (no `[slug]` in the path) → list directly.
3. Dynamic routes (`[slug]`, `[id]`, etc.) → flag as needing an enumeration source. The proposal will offer `autoDiscover: true` with a TODO marker for the user to add explicit enumeration if needed.
4. Surface in the proposal as **counts only** ("8 routes under `(marketing)`"). The per-route list will render in the actual sidebar after install — no need to dump it into the proposal.

### Output shape

After Phase 2, you hold an internal data structure roughly like:

```
narrative: "<2-3 sentence narrative from Phase 1>"
projectFlags: { mobileProfile: false, tailwindMajor: 3, monorepo: false }
primitives: [
  { name: "Button", sourcePath: "components/ui/button.tsx" },
  { name: "Badge", sourcePath: "components/ui/badge.tsx" },
]
blocks: [
  { name: "Hero", sourcePath: "components/blocks/hero.tsx", fixture: "title=\"...\" eyebrow=\"...\"" },
]
routes: [
  { group: "(marketing)", count: 8, hasDynamic: false },
  { group: "(authenticated)", count: 12, hasDynamic: true },
]
```

> `sourcePath` is project-relative (no `@/` alias). The live-AI loop uses it to map file edits back to sidebar entries.

Do not render this to the user. It is the input to Phase 3.

## Phase 3 — Build the consolidated proposal

Render the proposal in the exact format below. Use box-drawing characters (`┌ ├ └ │ •`) for the sidebar tree. Do **not** improvise a different layout — designers reading this proposal compare it visually across runs.

### Proposal template

```
I've read your project. Here's what I see:

  <narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

  /forkshop sidebar
  ┌─ <Section 1 name>          (<kit name> kit<, layout: "<layout>" if iframe-gallery>)
  │   • <bullet 1>
  │   • <bullet 2>
  ├─ <Section 2 name>          (<kit name> kit)
  │   • <bullet 1>
  └─ <Section N name>          (<kit name> kit)
      • <bullet 1>

Mount path:    <aliases.mount, abbreviated to project-relative>
               (or app/(tools)/forkshop/ — say "use tools group" to switch)

Also touching (automatic — required for Forkshop to render right):
  • tailwind.config.ts — adds `presets: [require("./lib/forkshop/tailwind/forkshop-preset")]`
    so Forkshop's UI styles itself via `forkshop-*` tokens without leaking into your tokens.

Opt-ins (I'll confirm each one after you accept):
  [1] Locator.js — Option-click any element to open its file in your editor
  [2] Live-AI hook — sidebar pulses + canvas glows where Claude is editing
  [3] Cadence note — teaches Claude to use small Edits on Forkshop-watched files

```

### How to ask the user what's next

After rendering the proposal template above, use the **`AskUserQuestion` tool** (not an inline text prompt) to collect the next action:

```ts
{
  questions: [{
    question: "Look right?",
    header: "Proposal",
    options: [
      { label: "Accept all", description: "Proceed to consent prompts" },
      { label: "Adjust",     description: "Refine sections, toggle opt-ins, change mount path" },
      { label: "Pause",      description: "Stop, write nothing" },
    ],
  }],
}
```

If "Adjust" → switch to free-form chat (Phase 4). Claude interprets natural language ("rename Foundations to Colors", "skip Blocks", "use the tools route group", "this is actually a SaaS — the marketing routes are stale") without requiring exact phrasings.

If the user types a free-form change at any time instead of using the menu, just interpret it and re-render. The `AskUserQuestion` is a convenience, not a gate.

### Section composition rules

For each scanned input, propose:

- **Foundations** section — `design-system-board` kit — IFF Phase 2 found ≥ 1 primitive OR Tailwind config is non-default. Bullets: "<N> colors found in tailwind.config (<sample names>)" + "<N> primitives: <sample names>". If primitives but no notable colors, omit the colors bullet. If colors but no primitives, omit the primitives bullet.
- **Blocks** section — `iframe-gallery` kit, layout `"stack"` — IFF Phase 2 found ≥ 1 block. Bullets: "<N> blocks: <sample names>" + "Fixtures pulled from <files where fixtures were captured>".
- **Pages** section — `page-tree` kit — always proposed. Bullets: "<N> routes under <group>" per route group, or "<N> routes total" if no groups.

For **hybrid** projects (both marketing and SaaS signals), propose one Foundations section + one Blocks (or Components) section *per surface* + one Pages section per surface. Name them with surface qualifiers: "Marketing Blocks", "Dashboard Components", "Marketing Pages", "App Pages". The user may merge or rename during iteration.

For the **mobile profile** flag from Phase 1: in any Blocks section, append `, layout: "stack" (375px single-width — mobile profile)` after the kit name. The user can override via `"three-viewport"` in iteration.

### Empty-section handling

If a category has zero discovered entries (e.g., no primitives + default Tailwind → empty Foundations), do not propose it. Mention the gap in the narrative paragraph: *"I didn't find any primitives — start by adding a Foundations board later via `npx forkshop add kits/design-system-board` and ask me to rescan."*

### After rendering

Wait for user input. Do not proceed to Phase 4 until you receive a reply. If the user is silent, do not write anything — `forkshop.config.ts` and the board files stay untouched.

## Phase 4 — Iterate

After rendering the Phase 3 proposal, wait for the user's reply. Loop:

1. Read the user's reply.
2. Classify it as one of:
   - **Full acceptance** ("looks good", "accept all", "yes", "go", "ship it") → exit the loop and proceed to Phase 5.
   - **Section rename** ("rename Foundations to Colors", "call it Tokens instead") → update the section name in the internal proposal state.
   - **Section drop** ("skip Blocks", "remove Pages", "don't include Foundations") → drop the section from the proposal state.
   - **Section add** ("also add a Layouts board", "add a Flows section") → propose a new section. If no scanned data fits, ask: *"I'd add it with what content? An empty starter, or pull from a folder you point me at?"*
   - **Opt-in toggle** ("no Locator", "yes hook", "skip the cadence note") → flip the opt-in flag.
   - **Mount path change** ("tools group", "use app/(tools)/forkshop/", "put it under apps/web") → update `mountPath` in the proposal state.
   - **Narrative correction** ("this is actually a SaaS", "the (marketing) routes are stale, don't include them") → return to Phase 1 with the correction as an explicit hint; re-run Steps 1-5; produce a new narrative; re-render.
   - **"explain why you chose X"** → describe the heuristic that produced the choice, briefly. Do not modify state.
   - **"pause"** → stop, write nothing, tell the user how to resume: *"Paused. Type 'set up Forkshop' again to resume from the current proposal."* Hold the proposal state if you can; otherwise the next invocation re-runs Phase 1.
   - **Ambiguous** → ask one short clarifying question. Do not assume.
3. Re-render the proposal with the new state. Use the exact Phase 3 template.
4. Go to step 1.

### Rules

- **No writes during iteration.** All changes live in-memory until full acceptance. The user can experiment freely.
- **Narrative pushback restarts Phase 1.** A correction to *what kind of project this is* invalidates downstream choices. Don't try to patch the narrative; re-derive it.
- **After every re-render, re-invoke `AskUserQuestion`** with the same `Accept all / Adjust / Pause` options so the user can pick the next move without having to remember a phrasing. Free-form text replies are still accepted whenever the user prefers them.
- **Soft cap at 5 iterations.** If you've re-rendered the proposal 5 times without acceptance, ask: *"We've gone back and forth a few times. Want to pause and come back, or keep refining?"* This is a check-in, not a hard stop — if the user says keep going, keep going.

## Phase 5 — Consent for config mutations

Run *after* the user picks "Accept all" in Phase 3, but *before* any writes. **Use the `AskUserQuestion` tool** — never inline `y / n` prompts. All three opt-ins go in a **single** `AskUserQuestion` call with three questions; the user clicks through one panel and proceeds.

Before the `AskUserQuestion` call, render a short markdown paragraph describing each opt-in's benefit + the brief what/where. No code diffs in the preamble. The user can request the full diff via the "Show me" option on any question.

### The consolidated consent panel

Render this preamble verbatim:

```
Three opt-ins to confirm. I'll only touch the noted files for each one you
say yes to.

  [1] Locator.js — Option-click any element to open its file at the right line.
        Adds a turbopack rule to next.config.js, mounts <LocatorInit /> in
        app/forkshop/layout.tsx, installs @locator/runtime + @locator/webpack-loader.

  [2] Live-AI hook — sidebar pulses + canvas glows where Claude is editing.
        Adds one hook entry to .claude/settings.json, writes a small
        .claude/hooks/post-tool-use.sh script.

  [3] Cadence note — teaches Claude to use many small Edits instead of one
        big Write on Forkshop-watched files, so you watch the page take shape
        live instead of a single flash. Appends ~20 bracketed lines to your
        root CLAUDE.md.

Pick for each — or "Show me" to see the exact changes first.
```

Then call `AskUserQuestion`:

```ts
{
  questions: [
    {
      question: "Add Locator.js?",
      header: "Locator.js",
      options: [
        { label: "Yes, add it",         description: "Option-click → editor jump" },
        { label: "No, skip",            description: "Don't touch next.config.js" },
        { label: "Show me the changes", description: "Render the diff first, then re-ask" },
      ],
    },
    {
      question: "Install the live-AI hook?",
      header: "Live-AI hook",
      options: [
        { label: "Yes, install",        description: "Sidebar pulses + canvas glow on edits" },
        { label: "No, skip",            description: "Don't touch .claude/settings.json" },
        { label: "Show me the changes", description: "Render the diff first, then re-ask" },
      ],
    },
    {
      question: "Append the cadence note?",
      header: "Cadence note",
      options: [
        { label: "Yes, append",         description: "Adds ~20 lines to root CLAUDE.md" },
        { label: "No, skip",            description: "Don't touch root CLAUDE.md" },
        { label: "Show me the snippet", description: "Render the snippet first, then re-ask" },
      ],
    },
  ],
}
```

### Handling "Show me…" answers

If any answer is `Show me…`, render the full code diff or snippet inline (the same `─────` boxed blocks used in v1 of this spec). Then re-call `AskUserQuestion` for **just that question** with only the `Yes` and `No` options (no third "Show me" — the user has already seen it).

The full-diff content for each:

**Locator.js full diff** — `next.config.{ts,js,mjs}` turbopack rule (or merge proposal if `experimental` already exists), plus the new `<aliases.mount>/layout.tsx` mounting `<LocatorInit />` (or merged into existing file if present), plus the two devDependencies for `package.json`.

**Live-AI hook full diff** — render the full `.claude/hooks/post-tool-use.sh` content (Template 6) as a code-fenced block. Then render the proposed merged `.claude/settings.json` content as a code-fenced JSON block, with the Forkshop additions prefixed `+` for visibility. If `.claude/settings.json` is absent, the diff shows the to-be-created file. If a hook referencing `post-tool-use.sh` already exists, show *"Hook already wired — no changes needed."* and skip the diff.

**Cadence note full snippet** — the bracketed `<!-- forkshop:cadence-note start ... -->` block (see Template 8).

Render these as inline fenced code blocks with `─────` boxes around them so the user can see the proposed changes at the line level.

### Edge cases

- **If `next.config.ts` already has `experimental.turbopack.rules`:** the "Show me" diff shows a *merge proposal* (new loader added to existing rules object) rather than a raw append. The skill never overwrites existing rules.
- **If the next config is `.js`/`.mjs`:** convert the turbopack rule snippet to that module format.
- **If `.claude/settings.json` does not exist:** note this in the preamble for [2]: *"`.claude/settings.json` doesn't exist — I'll create it with just the hook entry."* The diff path shows the full file content.
- **If `.claude/settings.json` already has a `PostToolUse` matcher covering `Edit|Write|MultiEdit`:** show a merge proposal that adds Forkshop's hook entry alongside any existing entries.
- **If root `CLAUDE.md` doesn't exist:** offer to create with just the cadence note. Note in the preamble: *"No root CLAUDE.md found — I'll create it with the cadence note as a starter."*
- **If root `CLAUDE.md` already contains a `<!-- forkshop:cadence-note start -->` marker:** skip the cadence question entirely (don't include it in the `AskUserQuestion` call). Mention in the Phase 7 summary that the note is already in place.

### Rules for the consent panel

- **One short benefit line per opt-in in the preamble**, never more. A justification, not a tutorial.
- **Frame each benefit as the user-visible win**, not the technical mechanism. The user is trading a config mutation for a feature; name the feature.
- **Don't oversell.** Honest opt-outs build trust; the skill is for share-and-forget, not lock-in.
- **Use `AskUserQuestion` for the consent step** — single call, three questions, three options each. Never inline `y / n` prompts.
- **Each "No" is local.** Skipping Locator doesn't cancel the hook or cadence questions.
- **"Show me…" renders the full diff inline, then re-asks just that question** with `Yes` / `No` (no third "Show me" — the user has already seen it).
- **The user can also hand-edit the file before answering** and say *"I did it myself, skip this"*. Accept and move on.

## Phase 6 — Write the artifacts

Sequential. Failures stop the sequence — no transactional rollback. Order minimizes half-broken states (config before its consumers, kit-supporting writes before opt-in tweaks).

For each step, after a successful write, print a single `✓ <action> <path>` line. After all steps, print a blank line and move to Phase 7.

### Step 1 — `<aliases.mount>/forkshop.config.ts` (or `.tsx`)

Render from Template 1 (`## Scaffolding templates` below). Substitute placeholders using the rules in that section. Resolve primitive/block import paths against the user's actual `components/` paths captured in Phase 2.

For the import group, prefer a single `from "@/components/ui"` barrel import if `components/ui/index.ts` exists; otherwise per-file imports.

### Step 2 — Per-board files

For each accepted sidebar section, write `<aliases.mount>/<board-slug>-board.tsx`. The slug is the section name kebab-cased ("Foundations" → `foundations`, "Marketing Blocks" → `marketing-blocks`).

Pick the right template (Template 2 for design-system-board, Template 3 for iframe-gallery, Template 4 for page-tree).

### Step 3 — `<aliases.mount>/page.tsx`

Render from Template 5. Replace any CLI-dropped stub. Import every board file written in Step 2, list them in `sidebar_entries` in the order the user accepted.

### Step 4 — `tailwind.config.ts` (automatic, no opt-in gate)

The strategy spec's "never silently mutate" list covers `next.config.ts`, `.claude/settings.json`, and root `CLAUDE.md`. `tailwind.config.ts` is *not* on that list — it's an automatic write, surfaced in Phase 3's "Also touching" callout.

Read the existing file. If `presets` already exists in `module.exports`/`export default`, append `require("./lib/forkshop/tailwind/forkshop-preset")` to that array. Otherwise add a new top-level `presets: [require("./lib/forkshop/tailwind/forkshop-preset")]` property.

For TypeScript configs (`.ts`), use the same syntax inside the `Config` typed object.

If the file's syntax is unusual (heavy comments, dynamic imports, exotic factory patterns) and a clean edit isn't safe, stop and print:

> *"I couldn't safely edit `tailwind.config.ts` — please add this manually: `presets: [require('./lib/forkshop/tailwind/forkshop-preset')]` to your config's `presets` array."*

Then continue to Step 5.

### Step 5 — `<aliases.mount>/forkshop.css`

If the CLI already wrote this file (it likely did during `npx forkshop init`), leave it alone. Otherwise write from Template 9 (the CSS template — added below in `## Scaffolding templates`).

The file imports the Raveo `@font-face` declarations and defines `forkshop-*` CSS variables. The user-mounted `app/forkshop/layout.tsx` is expected to import it (the CLI handles that mount).

### Step 6 — Locator.js wiring (only if opt-in 5a was consented)

Apply Template 7a to `next.config.{ts,js,mjs}`.
Apply Template 7b to `<aliases.mount>/layout.tsx` (create the file if absent).
Detect the package manager from lockfile presence (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, otherwise npm) and run `<pm> add -D @locator/runtime @locator/webpack-loader`. If the install fails, print the install command for the user to retry manually and proceed (files are already wired; the user just needs the dep).

### Step 7 — Live-AI hook installation (only if opt-in 5b was consented)

Two writes — both idempotent.

**Step 7a — Write `.claude/hooks/post-tool-use.sh`** from Template 6. After write, `chmod +x .claude/hooks/post-tool-use.sh`.

**Step 7b — Merge `.claude/settings.json`** with this algorithm:

The Forkshop hook entry shape:

```json
{
  "matcher": "Edit|Write|MultiEdit",
  "hooks": [
    {
      "type": "command",
      "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-tool-use.sh",
      "timeout": 5
    }
  ]
}
```

Algorithm:

1. **File absent** → write a fresh `{ "hooks": { "PostToolUse": [<entry>] } }`.
2. **File present but JSON parse fails** → refuse the write; print: *"`.claude/settings.json` is not valid JSON. Fix the file and run setup again, or add the hook entry manually."* Continue to next setup step.
3. **File present, no `hooks.PostToolUse` array** → add the array containing the Forkshop entry.
4. **Idempotency check** — scan every `hooks.PostToolUse[*].hooks[*].command` string for the substring `post-tool-use.sh`. If found, skip the write; print: *"Hook already wired — no changes."*
5. **Matching matcher exists** (exact string `"Edit|Write|MultiEdit"`) → append Forkshop's `{ type: "command", command: …, timeout: 5 }` to that matcher's `hooks` array.
6. **No matching matcher** → append the entire Forkshop entry (matcher + hooks array) as a new element of `PostToolUse`.

Write the result back with `JSON.stringify(merged, null, 2)`.

### Step 8 — Root `CLAUDE.md` cadence note (only if opt-in 5c was consented)

Append Template 8 verbatim to root `CLAUDE.md`. Create the file if absent. The template includes start/end comment markers so `forkshop-doc-sync` can refresh it later.

### Failure handling

If any step throws (file write error, parse error on existing config, etc.):

1. Print: `✗ <step name> — <one-line reason>`
2. Stop the sequence (do not attempt later steps).
3. Tell the user: *"I stopped at <step>. Earlier steps succeeded and are on disk. After fixing the issue (or asking me what to fix), say 'continue setup' and I'll resume from the failed step."*
4. On a "continue setup" reply, jump back to the failed step.

Steps are idempotent enough that re-running a single step after the user manually fixes the input is safe.

## Phase 7 — Final summary

After Phase 6 completes (or partially completes with failures), render the summary verbatim:

```
Forkshop is set up. Here's what you have:

  Mount:   <aliases.mount, abbreviated>  →  http://localhost:3000/forkshop
  Config:  <aliases.mount>/forkshop.config.ts
  Boards:  <comma-separated section names>
  Opt-ins: <✓ Locator.js | ✗ Locator.js (skipped)>   <✓ Live-AI hook | ✗ Live-AI hook (skipped)>   <✓ Cadence note | ✗ Cadence note (skipped)>

Try this first:
  1. pnpm dev   (or your package manager's dev command)
  2. Open /forkshop in your browser
  3. Click any text on a block → edit in place → save
  4. <if Locator opted in:> Option-click any element → opens the file at the right line

Customize Forkshop:
  • Rename a board       → edit the section title in forkshop.config.ts
  • Add a board          → ask Claude: "add a Layouts board"
  • Restyle the sidebar  → fork components/forkshop/sidebar/
  • Change kit defaults  → fork the kit in components/forkshop/kits/
  Everything Forkshop generated is in your repo. You own all of it.

Sibling skills available:
  • forkshop-live-editing  — auto-applies cadence guidance when Claude edits
                          Forkshop-watched files (active without invocation)
  • forkshop-doc-sync      — invoke when app/forkshop/CLAUDE.md drifts:
                          "sync Forkshop docs" or "/forkshop-doc-sync"

Notes for later:
  • For previewing logged-out / locked / per-user states, see the Auth
    section of <aliases.mount>/CLAUDE.md.
  • Forkshop updates aren't automatic. To compare your files against the
    latest upstream: npx forkshop diff <path>.
  <if Tailwind v4 detected:> • Tailwind v4 detected — `presets:` wasn't auto-wired. Add the preset manually per <aliases.mount>/CLAUDE.md.
  <if any Phase 6 step failed:> • <list the outstanding manual steps from failed Phase 6 actions>
```

### Rules

- **"You own all of it" is mandatory.** That line lands the share-and-forget posture. Do not paraphrase or skip.
- **Skipped opt-ins are surfaced as `✗ Name (skipped)`** so the user knows what they can opt into later via adjust mode.
- **Sibling skills get named once with their invocation phrasing.** Beats discoverability gaps when the user comes back two weeks later.
- **The Tailwind v4 line and the Phase 6 failure list only appear when relevant.** Drop the entire line if the condition isn't met — don't show empty bullets.

## Adjust mode (re-runs)

If Phase 0's Check 4 detected a non-empty `forkshop.config.ts`, you are in adjust mode. Skip Phases 1–7. Render:

```
Looks like Forkshop is already set up. Here's your current config:

  Mount:   <aliases.mount>
  Boards:  <comma-separated section names from current forkshop.config.ts>
  Opt-ins: <state observed: ✓/✗ for Locator (presence of next.config.ts turbopack rule),
            ✓/✗ for hook (presence of .claude/hooks/post-tool-use.sh + matching entry in settings.json),
            ✓/✗ for cadence note (presence of the marker in root CLAUDE.md)>

What would you like to change?
  • "add Layouts board"           → propose a new board
  • "remove Blocks"               → drop a board
  • "install hook"                → walk Phase 5b again
  • "install cadence note"        → walk Phase 5c again
  • "rescan components"           → re-run Phase 2 and propose a diff
  • "open config"                 → just open forkshop.config.ts, do nothing

Or describe what you want.
```

### Adjust-mode actions

- **Add a board** → Run Phase 2 against the relevant folder (ask the user *"where should I scan?"* if non-obvious), produce a single-section proposal, walk the user through it, and on accept: write a new `*-board.tsx` file, append an entry to `forkshop.config.ts` (`designSystem.primitives`, `components.entries`, or a new top-level board section), update `<aliases.mount>/page.tsx` to import and mount the new board.
- **Remove a board** → Delete the `*-board.tsx` file, remove the entry from `forkshop.config.ts`, remove the import/mount from `<aliases.mount>/page.tsx`. Confirm before deleting.
- **Install an opt-in** → Walk the corresponding Phase 5 prompt (5a / 5b / 5c). On accept, apply the Phase 6 step for that opt-in. Do not re-run other Phase 6 steps.
- **Rescan components** → Run Phase 2. Diff the new scan against the current `forkshop.config.ts`. Show: *"I found 3 new primitives (Avatar, Tabs, Card) and 1 missing (Skeleton was removed). Update forkshop.config.ts to add/remove?"*
- **Open config** → Just print the path. Do not modify anything.
- **A free-form description** → Interpret as best you can. If unclear, ask one short clarifying question.

### Rules for adjust mode

- **Never re-run Phase 6 wholesale.** Only the specific changes requested.
- **Never re-write `forkshop.config.ts` from scratch.** Always patch in place. If the user edited fields beyond what you wrote, preserve their edits.
- **For a full reset:** tell the user to delete `forkshop.config.ts` (or move it aside) and re-run the skill — Phase 0's re-run detection will see the stub and run the full first-time flow.

## Edge cases

Explicit guidance for situations Claude is likely to hit. Each row has one canonical response.

### Empty `components/` or no primitives found

Skip the Foundations section in the proposal. Mention in the narrative: *"I didn't find any primitives — start by `npx forkshop add kits/design-system-board` once you have a few components, then say 'rescan components' and I'll add the board."*

### Empty `components/blocks/` (or equivalent) found

Skip the Blocks section. Same kind of recovery hint in the narrative.

### Too many discovered entries

If Phase 2 finds more than ~30 primitives or ~50 blocks, propose the top 12 / 20 by import-count and tell the user in the proposal: *"I capped Foundations at 12 primitives sorted by import-count. You can add the rest manually in `forkshop.config.ts` or ask me to use different criteria."*

### Dynamic-only routes (`[slug]` without statics)

In the Pages section, set `autoDiscover: true` and add a TODO comment in `forkshop.config.ts`:

```ts
pages: {
  autoDiscover: true,
  // TODO: dynamic routes detected. Add an `entries: [...]` array with explicit
  // slugs to render, or wire your enumeration source into the page-tree kit.
},
```

In the proposal, mention: *"All routes under <group> are dynamic — I'll set `autoDiscover` and leave a TODO for you to add enumeration."*

### `tailwind.config.*` missing (likely Tailwind v4)

Proceed with everything else. Skip the Phase 6 Step 4 write. Surface in the Phase 7 summary: *"Tailwind v4 detected — `presets:` wasn't auto-wired. To style Forkshop, add `@import "./lib/forkshop/tailwind/forkshop-preset.css"` to your CSS (or follow the v4 migration guide in <aliases.mount>/CLAUDE.md)."*

### Monorepo (no repo-root `app/`, but `pnpm-workspace.yaml` or `turbo.json`)

In Phase 0 / 1, ask the user: *"This looks like a monorepo. Which workspace should I scan and mount in?"* Wait for the answer. Adjust every path lookup (Phase 1 docs, Phase 2 scans, `aliases.mount`) to that workspace.

If the user already has `aliases.mount` pointing into a workspace in `forkshop.json`, skip the question.

### `<aliases.mount>/` already populated with non-stub content

If Phase 0's re-run check found a populated config, this is the adjust-mode path. But if `<aliases.mount>/` has user-written files that don't match Forkshop's expected layout (e.g., the user repurposed the folder), refuse and exit:

> *"`<aliases.mount>/` already contains files that aren't from Forkshop. Move them aside or set `aliases.mount` in `forkshop.json` to a different path, then re-run."*

### `forkshop.json` present but no `<aliases.mount>/CLAUDE.md`

Exit (Phase 0 Check 2). Already handled. Re-state here for completeness.

### Pages Router / Vite / Remix detected

Hard bail. Phase 0 Check 3 handles. Re-state here for completeness.

## What this skill never does

This skill never:

- Silently mutates `next.config.ts` (always asks via Phase 5a).
- Silently mutates `.claude/settings.json` (always asks via Phase 5b).
- Silently mutates the root `CLAUDE.md` (always asks via Phase 5c).
- Touches files outside the Forkshop surface (`app/forkshop/`, `components/forkshop/`, `lib/forkshop/`, `app/api/forkshop/`) without consent.
- Installs npm packages without consent — the always-on deps (`iconoir-react`, `clsx`, `motion`) are installed by `npx forkshop init`; the opt-in deps (`@locator/runtime`, `@locator/webpack-loader`) are installed only after Phase 5a consent.
- Reverts user edits — re-runs are additive; if the user edited `forkshop.config.ts`, adjust mode proposes deltas, never overwrites.
- Calls out to the network.

## Scaffolding templates

Templates use `{{snake_case}}` placeholder substitution. Multi-line placeholders (`{{primitive_entries}}`) expand to comma-separated, indented blocks. Boolean placeholders (`{{has_locator}}`) gate whole template sections. Replace every `{{…}}` before writing; if a placeholder has no value, drop the surrounding line.

### Substitution rules

- **`{{board_name}}`** — PascalCase from the user's section title (e.g., "Foundations" → `Foundations`; "Design System" → `DesignSystem`; "Marketing Blocks" → `MarketingBlocks`). The rendered function/component name is `{{board_name}}BoardView` — the `View` suffix is baked into the templates.
- **`{{board_slug}}`** — kebab-case from the user's section title ("Marketing Blocks" → `marketing-blocks`). The board file lives at `<aliases.mount>/<board_slug>-board.tsx`.
- **`{{primitive_imports}}`** — one named import per line. Prefer a barrel `import { Button, Badge } from "@/components/ui"` if `components/ui/index.ts` exports them; otherwise per-file imports.
- **`{{primitive_entries}}`** — comma-terminated, 4-space indented, one entry per line. Each entry is `{ id: "<kebab-id>", name: "<Name>", render: () => <Name /> },` (with usage JSX appropriate to the primitive — e.g., `<Button>Click me</Button>`, `<Badge>Label</Badge>`, `<Input placeholder="Type here..." />`). The `id` is kebab-case from `name`. Each entry includes `sourcePath: "<relative-path>"` immediately after the `id` field. The path is what Phase 2's Scan A captured.
- **`{{block_entries}}`** — comma-terminated, 4-space indented, one entry per line. Each entry is `{ slug: "<kebab-slug>", name: "<Name>", iframeSrc: "<route>" },`. `iframeSrc` is the route on the user's site where the block exists standalone — `"/"` (home) is the default if a block is used on the home page. If a block lives on a different route, point `iframeSrc` at that route (e.g., the first usage captured in Phase 2). Each entry includes `sourcePath: "<relative-path>"` after the `slug` field.
- **`{{page_entries}}`** — comma-terminated, 4-space indented, one `{ path: "<route>" },` per static route discovered in Phase 2 Scan C.
- **`{{page_routes}}`** — comma-separated list of route strings for the `PAGE_ROUTES` `as const` array in the mount page: `"/", "/about", "/pricing"`. Quoted, no surrounding brackets.
- **`{{first_section_id}}`** — the kebab-case id of the first accepted sidebar section (e.g., `"design-system"`, `"foundations"`, `"components"`). Used as the initial `selection.sectionId` and as the fallback in the discriminated `view` expression.
- **`{{view_union}}`** — TypeScript union of every accepted section id plus `"pages"`, e.g. `"design-system" | "components" | "pages"`.
- **`{{sidebar_sections}}`** — one entry per accepted section, comma-terminated, 12-space indented. Each line is `{ id: "<slug>", title: <BoardKit>.defaultTitle, icon: <BoardKit>.icon },` where `<BoardKit>` is `DesignSystemBoard` for the foundations kit, `IframeGallery` for the blocks/components kit, and `PageTree` for the pages kit. (These imports are listed in the mount page's top import block.)
- **`{{board_imports}}`** — one `import {{board_name}}BoardView from "./{{board_slug}}-board"` per accepted section. Default imports, in sidebar order.
- **`{{board_renders}}`** — one conditional render per accepted section, 10-space indented. Pattern: `{view === "<slug>" && <{{board_name}}BoardView />}`. The pages board gets the extra `isolatedPath` + `onBack` props (see Template 5).
- **`{{aliases.mount}}`** — resolved from `forkshop.json` aliases at write time; defaults to `app/forkshop` if absent.

**Note on the tailwind config import path in Template 1:** the template assumes the create-next-app default `"@/*": ["./*"]` tsconfig mapping, where `@/tailwind.config` resolves to the repo-root `tailwind.config.{ts,js}`. If the project's `@/*` maps somewhere other than the repo root (e.g. to `./src/*`), replace the import with the explicit relative path that lands on `tailwind.config.{ts,js}` from the mount directory.

### Template 1 — `forkshop.config.tsx` (always `.tsx` — primitives use JSX)

```tsx
import type { Config } from "tailwindcss"
import tailwindConfig from "@/tailwind.config"
{{primitive_imports}}

export const forkshopConfig = {
  tailwindConfig: tailwindConfig as Config,
  primitives: [
{{primitive_entries}}
  ],
  blocks: [
{{block_entries}}
  ],
  pages: [
{{page_entries}}
  ],
} as const
```

`primitive_entries` example expansion:

```
    { id: "button", name: "Button", sourcePath: "components/ui/button.tsx", render: () => <Button>Click me</Button> },
    { id: "badge", name: "Badge", sourcePath: "components/ui/badge.tsx", render: () => <Badge>Label</Badge> },
    { id: "input", name: "Input", sourcePath: "components/ui/input.tsx", render: () => <Input placeholder="Type here..." /> },
```

`block_entries` example expansion:

```
    { slug: "hero", name: "Hero", sourcePath: "components/blocks/hero.tsx", iframeSrc: "/" },
    { slug: "cta-band", name: "CTA Band", sourcePath: "components/blocks/cta-band.tsx", iframeSrc: "/" },
    { slug: "feature-row", name: "Feature Row", sourcePath: "components/blocks/feature-row.tsx", iframeSrc: "/" },
```

`page_entries` example expansion:

```
    { path: "/" },
    { path: "/about" },
    { path: "/pricing" },
```

### Template 2 — Board file (design-system-board kit)

```tsx
"use client"

import { useRef } from "react"
import { ForkshopCanvas } from "@/components/forkshop/canvas/forkshop-canvas"
import { DesignSystemBoard } from "@/components/forkshop/kits/design-system-board"
import { forkshopConfig } from "./forkshop.config"

// Stage dimensions for the design system board.
// 3000x2400 fits the default token set + primitives at zoom-to-fit.
const STAGE_W = 3000
const STAGE_H = 2400

export default function {{board_name}}BoardView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="both"
    >
      <DesignSystemBoard
        tailwindConfig={forkshopConfig.tailwindConfig}
        primitives={[...forkshopConfig.primitives]}
      />
    </ForkshopCanvas>
  )
}
```

### Template 3 — Board file (iframe-gallery kit)

```tsx
"use client"

import { useRef } from "react"
import { ForkshopCanvas } from "@/components/forkshop/canvas/forkshop-canvas"
import { IframeGallery } from "@/components/forkshop/kits/iframe-gallery"
import { forkshopConfig } from "./forkshop.config"

// Stack layout: viewport width 1200, blocks stacked ~600px each.
const STAGE_W = 1200
const STAGE_H = 2200

export default function {{board_name}}BoardView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="width"
    >
      <IframeGallery entries={[...forkshopConfig.blocks]} layout="stack" />
    </ForkshopCanvas>
  )
}
```

### Template 4 — Board file (page-tree kit)

```tsx
"use client"

import { useRef, useState } from "react"
import { ForkshopCanvas } from "@/components/forkshop/canvas/forkshop-canvas"
import { PageTree } from "@/components/forkshop/kits/page-tree"
import { responsiveFrameStageDimensions } from "@/components/forkshop/canvas/responsive-frame-view"
import { forkshopConfig } from "./forkshop.config"

// Grid view dimensions auto-scale with entries; pick generous defaults.
const GRID_STAGE_W = 1800
const GRID_STAGE_H = 1400

// Isolation view: responsive-frame stage width for default viewports [1440, 768, 375].
const { width: ISOLATION_STAGE_W, height: ISOLATION_STAGE_H } = responsiveFrameStageDimensions(
  undefined,
  [1440, 768, 375],
)

export default function {{board_name}}BoardView({
  isolatedPath: controlledIsolatedPath,
  onBack: onBackProp,
}: {
  isolatedPath?: string
  onBack?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Track internal isolation state from PageTree (double-click) so we can
  // switch stageWidth and trigger ForkshopCanvas's auto-fit-on-width-change.
  const [internalIsolated, setInternalIsolated] = useState<string | null>(null)

  // Effective isolation: external prop wins when defined (sidebar nav).
  // Uncontrolled: driven by internal state (double-click).
  const isIsolated =
    controlledIsolatedPath !== undefined ? true : internalIsolated !== null

  const stageWidth = isIsolated ? ISOLATION_STAGE_W : GRID_STAGE_W
  const stageHeight = isIsolated ? ISOLATION_STAGE_H : GRID_STAGE_H
  const fitMode = isIsolated ? "width" : "both"

  const handleBack = () => {
    setInternalIsolated(null)
    onBackProp?.()
  }

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      fitMode={fitMode}
    >
      <PageTree
        entries={[...forkshopConfig.pages]}
        isolatedPath={controlledIsolatedPath}
        onBack={handleBack}
        onIsolatedPathChange={setInternalIsolated}
      />
    </ForkshopCanvas>
  )
}
```

### Template 5 — `<aliases.mount>/page.tsx` (mount page)

```tsx
"use client"

import "./forkshop.css"
import { useState } from "react"
import { ForkshopSidebar, type ForkshopSelection } from "@/components/forkshop/sidebar/forkshop-sidebar"
import { LocatorInit } from "@/components/forkshop/locator-init"
import { AgentActivityProvider } from "@/components/forkshop/agent-activity-context"
import { DesignSystemBoard } from "@/components/forkshop/kits/design-system-board"
import { IframeGallery } from "@/components/forkshop/kits/iframe-gallery"
import { PageTree } from "@/components/forkshop/kits/page-tree"
{{board_imports}}
import { forkshopConfig } from "./forkshop.config"

const PAGE_ROUTES = [{{page_routes}}] as const

const FILE_MAP = {
  primitives: forkshopConfig.primitives
    .filter((p) => p.sourcePath !== undefined)
    .map((p) => ({ id: p.id, sourcePath: p.sourcePath! })),
  blocks: forkshopConfig.blocks
    .filter((b) => b.sourcePath !== undefined)
    .map((b) => ({ slug: b.slug, sourcePath: b.sourcePath! })),
} as const

export default function ForkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>({
    kind: "section",
    sectionId: "{{first_section_id}}",
  })

  // Determine which main view to show.
  const view: {{view_union}} =
    selection.kind === "page"
      ? "pages"
      : selection.kind === "section"
        ? (selection.sectionId as {{view_union}})
        : "{{first_section_id}}"

  // When the user clicked a page leaf in the sidebar, isolate that page.
  const isolatedPath = selection.kind === "page" ? selection.path : undefined

  return (
    <AgentActivityProvider fileMap={FILE_MAP}>
      <LocatorInit mountPath="/forkshop" />
      <div className="font-forkshop-sans flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
{{sidebar_sections}}
          ]}
          routes={PAGE_ROUTES}
        />
        <div className="relative flex flex-1 overflow-hidden">
{{board_renders}}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
```

`board_imports` example expansion (default imports, in sidebar order):

```
import DesignSystemBoardView from "./design-system-board"
import ComponentsBoardView from "./components-board"
import PagesBoardView from "./pages-board"
```

`sidebar_sections` example expansion:

```
            { id: "design-system", title: DesignSystemBoard.defaultTitle, icon: DesignSystemBoard.icon },
            { id: "components", title: IframeGallery.defaultTitle, icon: IframeGallery.icon },
            { id: "pages", title: PageTree.defaultTitle, icon: PageTree.icon },
```

`board_renders` example expansion (the pages board gets `isolatedPath` + `onBack`):

```tsx
          {view === "design-system" && <DesignSystemBoardView />}
          {view === "components" && <ComponentsBoardView />}
          {view === "pages" && (
            <PagesBoardView
              isolatedPath={isolatedPath}
              onBack={() => setSelection({ kind: "section", sectionId: "pages" })}
            />
          )}
```

### Template 6 — `.claude/hooks/post-tool-use.sh`

```bash
#!/usr/bin/env bash
# Forkshop live-AI hook. Notifies a running Forkshop dev server of file edits.
# Best-effort; never blocks the tool call.
# Override FORKSHOP_DEV_URL if your dev server isn't on http://localhost:3000.
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
case "$tool" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
case "$file_path" in
  *.ts|*.tsx|*.mdx) ;;
  *) exit 0 ;;
esac

url="${FORKSHOP_DEV_URL:-http://localhost:3000}/api/forkshop/agent-activity"

send_one() {
  local payload="$1"
  curl -sS -X POST "$url" \
    -H 'content-type: application/json' \
    -d "$payload" \
    --max-time 1 \
    >/dev/null 2>&1 &
}

case "$tool" in
  Edit)
    old_string="$(printf '%s' "$input" | jq -r '.tool_input.old_string // ""')"
    new_string="$(printf '%s' "$input" | jq -r '.tool_input.new_string // ""')"
    payload="$(jq -n \
      --arg fp "$file_path" \
      --arg os "$old_string" \
      --arg ns "$new_string" \
      '{filePath: $fp, oldString: $os, newString: $ns}')"
    send_one "$payload"
    ;;
  Write)
    payload="$(jq -n --arg fp "$file_path" '{filePath: $fp}')"
    send_one "$payload"
    ;;
  MultiEdit)
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      send_one "$line"
    done < <(printf '%s' "$input" | jq -c \
      --arg fp "$file_path" \
      '.tool_input.edits[] | {filePath: $fp, oldString: .old_string, newString: .new_string}')
    ;;
esac

disown -a 2>/dev/null || true
exit 0
```

Override `FORKSHOP_DEV_URL` if your dev server isn't on `http://localhost:3000`. Requires `jq` — the script exits 0 silently if `jq` isn't installed, so the live-AI loop just doesn't fire (no error).

### Template 7a — `next.config.ts` turbopack rule (Locator.js)

```ts
experimental: {
  turbopack: {
    rules: {
      "*.{js,jsx,ts,tsx}": { loaders: ["@locator/webpack-loader"] },
    },
  },
},
```

If `experimental` already exists in the user's config, merge into its `turbopack.rules` object — do not replace the existing `experimental` block.

For `.js`/`.mjs` configs, embed the same fields in the existing module-export shape.

### Template 7b — `<aliases.mount>/layout.tsx` (Locator.js mount)

Create the file if absent:

```tsx
import { LocatorInit } from "@/components/forkshop/locator-init"

export default function ForkshopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LocatorInit />
      {children}
    </>
  )
}
```

If the file already exists, insert the import at the top of the file and the `<LocatorInit />` element as the first child of the returned JSX.

### Template 8 — Root `CLAUDE.md` cadence note

Append verbatim:

```markdown
<!-- forkshop:cadence-note start - managed; do not edit body, only delete the block -->
## Forkshop — editing cadence

When editing files in `components/forkshop/`, `lib/forkshop/`, `app/forkshop/`, or any
block referenced in `forkshop.config.ts`, prefer many small Edits over one Write.
Forkshop's live preview emits a notification per file write, so:

- Use `MultiEdit` when one change spans multiple regions (single disk write,
  multiple visual events).
- Start with a valid skeleton, then replace section-by-section.
- Avoid leaving the file in a broken intermediate state — Forkshop's iframe
  will show Next.js's error overlay until the next save fixes it.
<!-- forkshop:cadence-note end -->
```

### Template 9 — `<aliases.mount>/forkshop.css`

If the CLI did not write this file during `init`, write it from this template:

```css
@font-face {
  font-family: "Raveo";
  src: url("/fonts/raveo/raveo-regular.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Raveo";
  src: url("/fonts/raveo/raveo-medium.woff2") format("woff2");
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: "Raveo";
  src: url("/fonts/raveo/raveo-bold.woff2") format("woff2");
  font-weight: 700;
  font-display: swap;
}

:root {
  --forkshop-surface: #fafafa;
  --forkshop-fg: #111;
  --forkshop-border: #e5e5e5;
  --forkshop-accent: #2563eb;
  --forkshop-muted: #737373;
}
```

Template 5 (the mount page) imports this file via `import "./forkshop.css"` so the `--forkshop-*` color variables resolve at runtime. Without that import every `bg-forkshop-*` / `border-forkshop-*` class renders against an undefined variable — backgrounds fall to white, borders fall to `currentColor` (black).
