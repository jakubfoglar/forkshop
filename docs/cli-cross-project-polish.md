# Forkshop CLI — Cross-Project Install Polish Round

Date: 2026-05-14
Status: Open — needs implementation

## What this is

Bugs surfaced by testing `forkshop init` + `set up Forkshop` against real-world projects (beyond the original cold-fixture `create-next-app` baseline). Each one only manifests outside the simplest possible project shape — the playground monorepo and the bare fixture both pass; real projects expose these.

Two real projects tested so far:

1. **influencers-scrapers** — a pnpm monorepo. Next.js app at `packages/frontend/`.
2. **ravineo-playground/site** — a single-app Next.js project using the `src/` convention (`pnpm create next-app --src-dir` shape).

Both passed the file-drop step. Both broke at later steps for different reasons. This document captures those reasons.

---

## Bug A — Dep-install step is fragile across host pnpm setups

**Where:** `packages/cli/src/` — the post-file-write step that runs `pnpm add 'clsx@^2.1.1' 'motion@^11.0.0' 'lucide-react@^1.14.0' '@locator/runtime@^0.5.1'`.

**Severity:** High. Hit 2 of 2 real-world projects tested. Breaks the "it just works" promise of `npx forkshop init`.

### Symptom 1 (influencers-scrapers)

User's machine has Node 20.16.0 with corepack-managed pnpm. Corepack tries to download a pnpm version to verify signature, hits stale signing keys:

```
Error: Cannot find matching keyid: {"signatures":[{"sig":"...","keyid":"SHA256:..."}], ...}
    at verifySignature (corepack.cjs:21535:47)
    at installVersion (corepack.cjs:21882:7)
```

Files are written successfully ("Installed 57 files into your project."). The dep install command crashes. CLI prints "Package install failed. Files are written. Retry manually:" — but the retry command hits the same error.

### Symptom 2 (ravineo-playground/site)

User's machine has Node 20.16.0 with a globally-installed pnpm@latest (>= 10.32.1). The latest pnpm uses `node:sqlite` which is built into Node 22+ but not Node 20:

```
warn: This version of pnpm requires at least Node.js v22.13
warn: The current version of Node.js is v20.16.0
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
    at Module._load (node:internal/modules/cjs/loader:979:13)
```

Same outcome: 57 files written, dep install crashes.

### Root cause

The CLI blindly invokes `pnpm add ...` with whatever pnpm is globally installed on the user's machine. This couples Forkshop to:

- Whatever pnpm version the user has
- Whether corepack manages it (and whether corepack's signing keys are current)
- Whether the pnpm version is compatible with the user's Node version
- Whether the user even uses pnpm (vs npm, yarn, bun)

Each of these is fragility surface that's not Forkshop's problem to solve but is currently Forkshop's problem to absorb.

### Fix options (preferred → least preferred)

**Option 1 (recommended): Don't invoke `pnpm add` at all.**

Have the CLI write the deps directly into the project's `package.json` (modify `dependencies` and `devDependencies` JSON keys), then print:

```
Forkshop files installed. Run your usual install command to fetch deps:
  pnpm install  (or npm install / yarn / bun install)
```

Simple. Robust. Universally compatible. Loses a small amount of magic (the user has to type one more command); gains a lot of reliability. No coupling to any pm.

**Option 2: Detect package manager from lockfile, try matching install command.**

- `pnpm-lock.yaml` exists → try `pnpm add`
- `package-lock.json` exists → `npm install <deps>`
- `yarn.lock` exists → `yarn add`
- `bun.lockb` exists → `bun add`
- None → fall back to Option 1

More effort, more code paths, more failure modes. Marginal benefit over Option 1.

**Option 3: Try `pnpm add` once, fall back to Option 1 on any failure.**

If `pnpm add` fails for any reason (corepack issue, Node version mismatch, anything), catch the error and fall back to writing deps to `package.json` + printing the manual install command. Doesn't fully escape the coupling but degrades gracefully.

### Recommendation

**Implement Option 1.** The dep install is automation convenience; it's not load-bearing. Writing to `package.json` is universally compatible. The cost is one extra `pnpm install` command for the user; the benefit is zero pm-related install failures.

### Also fix while we're in there

The "Package install failed. Files are written. Retry manually:" prompt is misleading when the retry command hits the same error. Either:

- Drop the retry prompt entirely if we're going with Option 1 (no retry needed)
- Or: detect the root cause (corepack / Node version / missing pm) and suggest a real fix, not just the same broken command

---

## Bug B — CLI assumes flat project layout, breaks on `src/` convention

**Where:** `packages/cli/src/` — the destination resolver (the code that decides where `app/forkshop/`, `components/forkshop/`, `lib/forkshop/`, and `app/api/forkshop/` should land).

**Severity:** High. Will hit any project scaffolded with `pnpm create next-app --src-dir` (a very common Next.js convention). Manifests as broken imports the moment the user tries `pnpm dev`.

### Symptom

In a project where `tsconfig.json`'s `compilerOptions.paths` maps `@/*` to `./src/*`, the CLI installs files at the project root:

```
site/
├── app/forkshop/                   ← installed here (WRONG)
├── components/forkshop/            ← installed here (WRONG)
├── lib/forkshop/                   ← installed here (WRONG)
├── app/api/forkshop/               ← installed here (WRONG)
└── src/
    ├── app/                        ← project's actual app code
    ├── components/                 ← project's actual components
    └── lib/                        ← project's actual lib
```

The project's tsconfig maps `@/*` → `./src/*`, so Forkshop's internal imports like `import { CanvasNode } from "@/components/forkshop/canvas/canvas-node"` resolve to `./src/components/forkshop/canvas/canvas-node` — which doesn't exist because the files actually landed one directory up.

Setup-skill's Phase 0 preconditions check (or wherever the skill scans the project) detects this mismatch and pauses, asking the user whether to move files under `src/` or add a separate alias. The "move files under src/" workaround works but should not be necessary — the CLI should have put them in the right place from the start.

### Root cause

The CLI's destination resolver doesn't read the project's `tsconfig.json` to learn where the `@/*` alias points. It assumes `@/*` is always at the project root.

### Fix

In the CLI's destination resolver (the function that maps registry file paths like `app/forkshop/page.tsx` to user-project paths):

1. Read the user-project's `tsconfig.json`. Parse `compilerOptions.paths`.
2. Find the `@/*` alias. Note its value:
   - If `["./*"]` (or absent) → use the current behavior (install at project root)
   - If `["./src/*"]` → prepend `src/` to all destination paths
   - Anything else → warn and let the user choose
3. Apply the prefix consistently across all 4 destination roots (`app/`, `components/`, `lib/`, `app/api/`).

The CLI may also need to write/update the user's `forkshop.json` to reflect where files actually landed, so subsequent `forkshop add` / `forkshop diff` calls operate on the right paths.

### Bonus check while we're in there

Forkshop's template imports (`@/components/forkshop/canvas/canvas-node`, etc.) should already just-work regardless of `src/` vs flat — the `@/*` alias resolves to whatever the user's project uses. The fix above is purely about putting files where the alias expects to find them. **Verify this assumption during the fix** by running the setup skill in both `--src-dir` and `--no-src-dir` projects after the patch.

### Repro

```bash
TEMPDIR=$(mktemp -d) && cd "$TEMPDIR"
pnpm create next-app@latest test-src --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm
cd test-src

# Run the local CLI (assuming local forkshop docs server at :3001)
node ~/Desktop/ravineo_dev/forkshop/packages/cli/dist/index.js init \
  --registry http://localhost:3001/r/

# Inspect — files should be at src/app/forkshop/, NOT app/forkshop/
ls app/forkshop 2>&1     # should NOT exist
ls src/app/forkshop      # should exist
```

---

## Bug C — Setup skill's narrative output has spurious leading whitespace

**Where:** `packages/registry/src/skill/setup.md`, line 173 onward (the Phase 3 proposal template).

**Severity:** Low-cosmetic, but consistent. Every install renders the project recognition narrative ("This is the Ravineo Creator Clusters Explorer...") with a leading 2-space indent on the first line, looking like a misaligned paragraph in the user's Claude Code session.

### Symptom

User runs `set up Forkshop`. Phase 3 begins with:

```
I've read your project. Here's what I see:

  This is the Ravineo Creator Clusters Explorer — an internal data-exploration
tool (not a marketing site or auth-gated SaaS) for influencer segments, powered
by BigQuery...
```

Note the 2 leading spaces before "This is." Looks like a formatting accident. Same issue applies to the `/forkshop sidebar` tree directly below — also indented two spaces in the template.

### Root cause

The skill's Phase 3 proposal template includes literal indentation as a visual cue:

```markdown
I've read your project. Here's what I see:

  <narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

  /forkshop sidebar
```

The author of the skill likely intended the indentation to mean "this is a quoted example" or "this is the content slot." Claude faithfully reproduces the leading whitespace when it generates its output, so every install sees the misaligned first line.

### Fix

In `packages/registry/src/skill/setup.md`, find the Phase 3 proposal template (around line 173) and remove the 2-space indentation from the narrative placeholder, the sidebar tree, and any other indented content slots. Plain left-aligned text:

```markdown
I've read your project. Here's what I see:

<narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

/forkshop sidebar
```

If the visual separation matters for the skill author's readability, use a different mechanism that Claude won't echo: a markdown blockquote (`> <narrative...>`) or an actual code-block fence won't survive into the output either, but they're at least intentional formatting choices rather than accidental indentation.

While you're in the file, **grep the rest of the skill for similar patterns** — anywhere a template literal has leading whitespace it didn't need. The same problem could be lurking in other phases' output templates.

### Verification

After the fix:

1. Run `set up Forkshop` in any project.
2. Check that the Phase 3 narrative output starts flush-left ("This is..." not "  This is...").
3. Check that the proposed sidebar tree below it is also flush-left.

Easiest visual diff: take a screenshot of Phase 3 before and after the fix in the same project.

---

## Bug D — Setup skill uses Next 14 `experimental.turbopack` syntax, breaks on Next 15+

**Where:** `packages/registry/src/skill/setup.md` — the template that configures the Locator.js webpack-loader rule in the user's `next.config.{js,ts,mjs}`.

**Severity:** High. Any project on Next 15+ (the stable release with the turbopack key promoted out of experimental) will get a config that either no-ops or errors. Next 16 will eventually be the default.

### Symptom

User's project is on Next 16. Skill's template instructs Claude to add:

```ts
const nextConfig = {
  experimental: {
    turbopack: {
      rules: {
        "**/*.{tsx,jsx}": {
          loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
        },
      },
    },
  },
}
```

But in Next 15+, `turbopack` is a top-level key, not under `experimental`. The Claude session in the ravineo-playground/site install correctly recognized this from Next 16's `node_modules/next/dist/docs/01-app/.../turbopack.md` reference and used the new syntax — but **the template still has the old shape**, so any Claude session that follows the template literally will produce a broken config.

### Fix

In the skill's setup template, replace the `experimental.turbopack` block with the version-aware logic. Two options:

**Option 1 (recommended): Auto-detect Next version, write the right shape.**

The skill already reads the project's `package.json` in Phase 0. Add a step in the Locator opt-in phase that reads `dependencies.next` (or `devDependencies.next`), parses the major version, and instructs Claude to use:

- Next 14.x → `experimental: { turbopack: { rules: {...} } }`
- Next 15.x and above → `turbopack: { rules: {...} }` (top-level)

**Option 2: Just use the new syntax everywhere.**

Drop Next 14 support entirely; mention it as a hard constraint in the docs. The strategy spec says "Next.js 14+" but the OSS audience is likely on 15+ already. This is the simpler fix and reduces template branching.

### Verification

Test the install in:
- A `pnpm create next-app@14` fixture (after fix, check that the config uses `experimental.turbopack`)
- A `pnpm create next-app@latest` fixture (Next 15/16; check that the config uses top-level `turbopack`)

Both should produce a working Locator.js wiring with no manual patches needed from the Claude session running the skill.

---

## Bug E — Sibling skill activation triggers don't account for `src/` prefix

**Where:** `packages/registry/src/skill/live-editing.md` and `packages/registry/src/skill/doc-sync.md` — the activation triggers / matching patterns.

**Severity:** Medium. The skill installs successfully but its trigger phrases reference paths that don't match the user's actual install when the project uses `src/` convention. Reported by the Claude session: *"Sibling skill descriptions still reference `app/forkshop/`, `components/forkshop/`, etc. without the `src/` prefix — they'll partially match your paths. If they don't auto-fire, just invoke them by phrase."*

### Symptom

Skills auto-activate based on file-path-matching patterns in their frontmatter or description. The patterns currently look like `app/forkshop/**` or `components/forkshop/**`. In an `src/` project, files actually live at `src/app/forkshop/**` etc. The patterns partially match (or don't match at all), so skills that should auto-fire don't.

### Fix

Two related fixes — Bug B's CLI fix should already help; this is the matching half:

1. **Path-flexible trigger patterns.** Use `**/forkshop/**` or `(src/)?app/forkshop/**` instead of `app/forkshop/**`. Match Forkshop's directory anywhere in the path, not pinned to project-root.
2. **Setup skill writes the actual paths during install.** After Bug B is fixed and the CLI knows whether files landed at `src/app/forkshop/` vs `app/forkshop/`, the setup skill could rewrite the sibling skills' activation triggers to reference the actual paths. More surgical, slightly more code.

Recommend Option 1 — broader patterns are simpler and cover edge cases (monorepos with custom directory names, apps under `packages/web/`, etc.).

### Verification

Install Forkshop in an `--src-dir` project. Edit a file under `src/app/page.tsx`. Confirm `forkshop-live-editing.md` auto-fires (cadence guidance shows up in Claude's context). Run `sync Forkshop docs` to confirm `forkshop-doc-sync.md` activates.

---

## Bug F (minor) — Skill template prescribes `src/app/forkshop/layout.tsx` that's redundant with Template 5's page.tsx

**Where:** `packages/registry/src/skill/setup.md` — Locator.js wiring phase (Template 5 + the layout step that follows it).

**Severity:** Low/cosmetic. The Claude session in the playground/site install skipped this step deliberately because it noticed `<LocatorInit mountPath="/forkshop" />` was already in `page.tsx` (Template 5). A separate layout.tsx is only useful if the user wants Locator to apply to sub-routes under `/forkshop/*` (which Forkshop itself doesn't have today).

### Fix

Either:
- Drop the redundant layout step entirely from the standard skill flow (Template 5's page.tsx is enough for v1)
- Or keep it but make it explicitly optional ("if you plan to add sub-routes under /forkshop/*, also create...")

Lean toward dropping it — fewer install steps, less for the user to wonder about. If sub-routes become a thing later, the layout step can come back as a `forkshop add sub-route-locator` opt-in.

---

## Bug G — iframe content drifts/grows infinitely on pages using `min-h-screen`

**Where:** `packages/registry/src/components/canvas/responsive-frame-view.tsx` + the iframe-preview hooks that inject CSS into iframe documents (`use-iframe-preview.ts` or wherever `PREVIEW_EDIT_CSS` ships).

**Severity:** High — visible on first impression. Any user project with `min-h-screen` (or `min-h-dvh`, `min-h-svh`) on body / a layout wrapper / a page wrapper triggers this. That's most Tailwind-using Next.js projects.

### Symptom

When `/forkshop` loads in the browser, the Tablet (768) and Mobile (375) iframes show content positioned far below the top, with large empty space above. The position drifts further down over time — content "walks" down the page indefinitely until the iframe is enormous. Desktop (1440) often looks normal because the viewport is already large enough that the feedback loop saturates differently.

### Root cause

ResponsiveFrameView measures the iframe body's `scrollHeight` via ResizeObserver and resizes the iframe to fit. When the iframe contains a page with `min-h-screen` (or similar viewport-bound CSS) on body or a wrapper:

1. Iframe height = N
2. body's `min-h-screen` = 100vh of iframe = N
3. scrollHeight = N, ResponsiveFrameView sees this and... sets iframe height to N
4. But the resize triggers a layout pass, which recomputes 100vh against the (very slightly different) new viewport
5. New scrollHeight is slightly larger, ResponsiveFrameView measures again, sets larger iframe
6. Loop runs every frame, iframe grows monotonically

### Fix

Inject CSS into each iframe document that breaks the viewport dependency. This is documented in Ravineo's in-house Fogma `app/(tools)/fogma/CLAUDE.md` as:

> "The marketing layout's `min-h-screen` wrapper is also overridden inside each iframe so the body really does collapse to content."

The actual override CSS:

```css
html, body { min-height: 0 !important; }
.min-h-screen { min-height: 0 !important; }
.min-h-dvh { min-height: 0 !important; }
.min-h-svh { min-height: 0 !important; }
.min-h-lvh { min-height: 0 !important; }
```

Inject this in the same place where `PREVIEW_EDIT_CSS` is injected (via the iframe's `useIframeEditWiring` or `useIframePreview` setup). The injection should happen as soon as the iframe loads, before the first ResizeObserver measurement.

### Verification

After fix, re-run `npm run dev` in playground/site. Visit `/forkshop`. All three viewports (Desktop / Tablet / Mobile) should show the page content starting at the top of the iframe with the iframe height matching the actual content height. No drift over time.

Also test on the cold fixture and `--src-dir` fixture — neither should regress.

### Investigation note

When porting this CSS during extraction, it may have been dropped as "Ravineo-specific" (it isn't — `min-h-screen` is a generic Tailwind utility), or the injection point in the iframe-preview hook may not be applying it correctly. Worth checking the git log for the responsive-frame-view + iframe hook ports during the extraction sub-spec to see what got included or dropped.

---

## Bug H — `<LocatorInit />` mounted on Forkshop page instead of user's root layout; opt-click never activates

**Where:** `packages/registry/src/skill/setup.md` — the Locator.js opt-in phase / Template 5 mount-page generation.

**Severity:** High. The option-click-to-open-editor feature is one of Forkshop's headline capabilities. If LocatorInit is in the wrong place, it silently does nothing — no error, no visible failure, the user just notices clicks don't open their editor.

### Symptom

User option-clicks any element inside an iframe in `/forkshop`. Nothing happens. No editor opens. No console error.

### Root cause

`LocatorInit`'s `useEffect` has explicit guards:

```ts
if (globalThis.window === globalThis.window.parent) return  // skip if NOT in iframe
if (!parentPath.startsWith(mountPath)) return               // skip if parent isn't /forkshop
```

It deliberately **only executes inside iframes**. The setup skill currently mounts it in Forkshop's own page.tsx (the canvas mount, Template 5). That page is the **parent of the iframes** — it's not iframed itself. So LocatorInit there returns early on the first guard and never sets up the option-click handler.

### Where LocatorInit actually needs to be

In the user's **root layout** (`src/app/layout.tsx` for src-dir projects, `app/layout.tsx` otherwise). That layout wraps every page in their app, including the pages that get iframed by Forkshop. Then every iframe document has LocatorInit running.

The Phase 7 summary from the playground/site install captured the wrong reasoning:

> "Skipped a separate src/app/forkshop/layout.tsx since `<LocatorInit mountPath='/forkshop' />` is already mounted in page.tsx (Template 5). Add a layout later if you ever want Locator to apply to sub-routes under /forkshop/*."

This conflates "where LocatorInit is mounted" with "what content gets Locator behavior." The mount IS the runtime; if LocatorInit returns early at its mount location, nothing else matters.

### Fix

Update the setup skill's Locator opt-in phase to:

1. Add `<LocatorInit />` to the user's root layout (`src/app/layout.tsx` or `app/layout.tsx`), not to Forkshop's page.tsx
2. Either:
   - Edit the existing root layout in place via Edit, adding the import + JSX (preferred — surgical, predictable)
   - Or generate a layout if none exists at that path (less likely, App Router projects always have a root layout)
3. Remove the LocatorInit mounting from Template 5's Forkshop page.tsx (or leave it but no-op — at minimum, drop the misleading "in case of sub-routes" framing)

While editing the root layout, also wrap with the same approach the skill uses for the project's root CLAUDE.md updates: ask explicitly before mutating, since this is touching a file the user authored.

### Repro

In any fresh Forkshop install:

```bash
# After setup completes, in the user's project:
grep -r "LocatorInit" src/app/ 2>/dev/null
# Currently shows: only src/app/forkshop/page.tsx (wrong location)
# After fix should show: src/app/layout.tsx (right location)
```

Then visually: option-click any rendered element in a `/forkshop` iframe. Without the fix: nothing happens. With the fix: VSCode/Cursor opens at the right file and line.

### Verification

After fix, in a fresh fixture install:
1. `npm run dev` (or pnpm dev if pnpm isn't broken)
2. Visit `/forkshop` in browser
3. Option-click any rendered text inside an iframe
4. Confirm editor opens with the source file at the right line

---

## Bug J — Forkshop inherits the user's root-layout chrome (navbar, footer, etc.)

**Where:** `packages/registry/src/skill/setup.md` — Template 5 / the Forkshop mount-route generation.

**Severity:** High. Visible on first install. Users expect `/forkshop` to be a full-page tool (like opening Storybook or Figma) — instead they see their own site's navbar at the top with Forkshop crammed underneath. Confusing first impression.

### Symptom

User installs Forkshop in a Next.js project that has a non-trivial root layout (most real projects — navbar, footer, providers, analytics scripts). Visits `/forkshop`. Sees their site's navbar at the top, then Forkshop's sidebar + canvas occupying the area below. Forkshop is not full-viewport.

Concrete example from the playground/site install:

> User's `src/app/layout.tsx` renders `<html><body><Nav />{children}</body></html>` (Nav contains the "Ravineo Segments" branding + nav items). When `/forkshop` renders, the Nav appears above Forkshop's UI.

### Root cause

Next.js App Router applies root-layout inheritance to every route segment. Forkshop's `src/app/forkshop/page.tsx` is a child of `src/app/layout.tsx` and inherits all chrome that layout renders.

### Fix

Forkshop's setup skill should drop a **route-segment layout** at `src/app/forkshop/layout.tsx` that takes over the viewport visually. The simplest pattern: a fixed-position wrapper covering the parent's chrome:

```tsx
// src/app/forkshop/layout.tsx
export default function ForkshopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-forkshop-surface text-forkshop-fg"
      data-forkshop-mount
    >
      {children}
    </div>
  )
}
```

This:
- Covers the viewport completely (`fixed inset-0`)
- Sits above any parent chrome (`z-[9999]`)
- Uses Forkshop's own bg/text colors (no inheritance from parent CSS)
- Contains overflow so Forkshop's internal layout (canvas pan/zoom etc.) controls scrolling
- Doesn't remove the parent's chrome from the DOM — it just covers it visually. Parent providers (analytics, auth context, etc.) keep running, which is generally desirable.

### Alternative considered + rejected

**Route groups with a separate root layout** (`src/app/(forkshop)/forkshop/page.tsx` + `(forkshop)/layout.tsx` rendering its own `<html><body>`). Cleaner architecturally — Forkshop genuinely has its own root layout — but requires restructuring the user's existing app (moving their routes into a `(main)` group with the existing root layout). Too invasive for an install step. Reject.

### Verification

After fix, install in a project with a non-trivial root layout (the playground/site project is a perfect test case — has the Ravineo Segments navbar). Visit `/forkshop`. Confirm:
- No site navbar visible
- Forkshop's UI occupies the full viewport
- Site providers still mount (e.g., if the site has Posthog initialization, it should still fire — verify via Network tab or browser console)
- Returning to a non-Forkshop page (e.g., `/`) shows the normal site again

### Bonus check while in the file

Test in a project where the user has heavily customized their root layout — e.g., a `<ThemeProvider>` wrapping `{children}`, or a sticky footer. The fixed-overlay approach should sit above all of it.

---

## Bug K — Live-AI hook hardcodes :3000; breaks when Next runs on any other port

**Where:** `packages/registry/src/skill/setup.md` — port-detection logic during install + `.claude/hooks/post-tool-use.sh` template — the URL the hook POSTs to.

**Severity:** High. Hits any user whose dev server is on a port other than 3000 — very common because (a) users with multiple Next projects open at once get auto-bumped to 3001, 3002, etc., and (b) some users configure non-standard ports in `package.json` scripts. When this happens, the entire live-AI feature is silently broken — no error, no warning, just no sidebar pulses or frame glow.

### Symptom

User runs `npm run dev`. Next.js says `Local: http://localhost:3002` (port 3000 occupied by another project). User opens Forkshop in browser. Has Claude edit a file. **Nothing pulses.** Sidebar dot doesn't fire, frame glow doesn't appear. Looks like the live-AI feature is broken, but actually the hook script is POSTing to `localhost:3000/api/forkshop/agent-activity` which doesn't respond.

The setup-skill summary in playground/site flagged this explicitly:

> "Note: your dev server in the message is on :3002, but the live-AI hook script defaults to :3000. If you're running on :3002, set FORKSHOP_DEV_URL=http://localhost:3002 in your environment before starting Claude Code, or the sidebar pulses/glow won't fire."

That's helpful documentation, but the user shouldn't have to set an env var manually. The hook should figure it out.

### Two-part fix

**Part 1 — Setup-time detection (install-time correctness for the common case)**

During the hook-install phase (Phase 6 of the setup skill), parse the user's `package.json` `scripts.dev` value. Look for `-p <port>` or `--port <port>` flags:

```ts
// in the setup-skill template logic
const devScript = pkg.scripts?.dev ?? ""
const portMatch = devScript.match(/(?:-p|--port)\s+(\d+)/)
const detectedPort = portMatch ? portMatch[1] : "3000"
```

Write `detectedPort` into the hook script's default URL. If the user has `"dev": "next dev -p 3002"`, the hook script gets `http://localhost:3002/api/forkshop/agent-activity` baked in from day one.

If no port flag found, default to 3000 (Next's own default).

**Part 2 — Runtime fallback (resilience when port drifts after install)**

Even with Part 1, the user can hit port drift at runtime (port 3000 occupied → Next auto-bumps to 3001 → user thinks Forkshop's broken). The hook script should try a short list of common ports before giving up:

In `packages/registry/src/templates/.claude/hooks/post-tool-use.sh`, replace the hardcoded URL with try-list logic:

```sh
#!/usr/bin/env bash

# ... existing payload-building logic ...

DEFAULT_URL="${FORKSHOP_DEV_URL:-http://localhost:3000/api/forkshop/agent-activity}"
PORTS_TO_TRY="3000 3001 3002 3003"

# Cache the last successful port between hook invocations.
CACHE_FILE="${TMPDIR:-/tmp}/forkshop-dev-port-$(echo "$PWD" | shasum | cut -c1-8)"
if [ -f "$CACHE_FILE" ]; then
  CACHED_PORT=$(cat "$CACHE_FILE")
  PORTS_TO_TRY="$CACHED_PORT $PORTS_TO_TRY"
fi

# Try the configured URL first; fall back to common ports.
if [ -n "$FORKSHOP_DEV_URL" ]; then
  if curl --fail --silent --max-time 0.5 -X POST "$FORKSHOP_DEV_URL" -d "$PAYLOAD" -H "Content-Type: application/json" > /dev/null 2>&1; then
    exit 0
  fi
fi

for PORT in $PORTS_TO_TRY; do
  URL="http://localhost:$PORT/api/forkshop/agent-activity"
  if curl --fail --silent --max-time 0.5 -X POST "$URL" -d "$PAYLOAD" -H "Content-Type: application/json" > /dev/null 2>&1; then
    echo "$PORT" > "$CACHE_FILE"
    exit 0
  fi
done

# All failed — silent exit, don't pollute Claude Code with noise.
exit 0
```

Key properties:
- Cache the last-successful port per-project (via PWD hash) so after the first hit, subsequent edits go straight to the right port
- Fast timeout per attempt (0.5s) so failures don't block the editor
- Try the cached port first (which is also one of the common ports usually)
- Silent fail on all attempts — the user notices nothing breaks; if live-AI doesn't fire, they figure it out separately
- Honor `FORKSHOP_DEV_URL` env override if set (backwards-compat with current behavior)

### Verification

After fix, three scenarios should all work without env-var setup:

1. **Default port** (Next.js on 3000): Edit a file via Claude. Sidebar pulses immediately.
2. **Auto-bumped port** (3000 occupied, Next ends up on 3001): Edit a file via Claude. First edit may take ~50ms longer (trying 3000 then 3001), but pulses fire. Subsequent edits are instant (cached).
3. **Configured non-standard port** (`"dev": "next dev -p 3010"`): Setup-time detection writes 3010 into the hook. Pulses fire immediately on first edit.

If the user is on a *weird* port outside the default fallback range (e.g., 8080), they still need `FORKSHOP_DEV_URL` — but Part 1's setup-time parsing should catch even that case if it's in `package.json`.

---

## Bug L — HMR doesn't propagate into Forkshop iframes; manual reload required after agent edits

**Where:** Unclear without investigation. Candidates: `packages/registry/src/components/canvas/use-iframe-preview.ts`, `lazy-iframe.tsx`, ResponsiveFrameView's iframe-wrapping logic. Possibly also a Next.js config setting in the user's project, or a CSS-injection side effect.

**Severity:** High. This is the single most-visible interaction in Forkshop — Claude edits a file, the iframe should update in place. Currently the user has to manually refresh Forkshop for visual updates to appear. Worst part: the live-AI pulse (sidebar dot, frame glow) probably still fires, so Forkshop signals "Claude just changed this" but the iframe contradicts the signal with stale content.

### Symptom

Reported in the ravineo-playground/site install:

1. User had previously added a dynamic-route page to Forkshop's config (e.g., `/taxonomy-v6/01-segment/<specific-slug>`)
2. User asked Claude to edit the underlying `[slug]/page.tsx` (in this case, hide the `<BrandFilter />` row)
3. Claude completed the edit successfully (verified on disk)
4. Forkshop's iframe showing that page did **not** update visually
5. Manual reload of Forkshop was required to see the change

In a working state, Next.js Fast Refresh would propagate the edit to the iframe document automatically within ~1 second of the file write.

### Root-cause investigation needed

Before fixing, the next Claude should investigate which of these is happening:

1. **HMR WebSocket isn't connecting from inside iframes.** Open `/forkshop` in browser, open DevTools, switch the top-left context dropdown to one of the iframes, run `document.querySelectorAll('script[src*="hot-update"]').length` — should be > 0 if HMR is wired. Check Network tab in iframe context for `webpack-hmr` or similar WS connection.

2. **HMR fires in the top frame only.** The parent Forkshop document might be the one getting HMR pings, not the iframes. If so, the parent should relay HMR signals to iframes (or just trigger a hard reload of the affected iframe).

3. **Next 16 HMR regression for dynamic routes.** Try reproducing in a static-route iframe — does HMR work there? If yes, the issue is dynamic-route-specific.

4. **Forkshop's CSS injection or wrapping breaks Next's dev-tools mount.** The iframes have PREVIEW_EDIT_CSS injected (or similar). Check if removing the CSS injection restores HMR — would point to a specific style or DOM mutation breaking Next's dev runtime.

5. **Iframe `src` reuse without remount.** If Forkshop reuses a single iframe element and updates `src` without remounting, the new page's HMR client may not connect. Force a key bump on src changes if so.

### Fix options (pick after investigation)

**If HMR is broken in iframes generally:**

- The simplest reliable fix: when the AgentActivityProvider receives a file-edit event for a file mapped to a currently-visible iframe, force that iframe to reload (via `iframe.contentWindow.location.reload()` or by bumping a React `key`). Loses Fast Refresh state preservation, but guarantees visual update.

- Better but harder: bridge HMR signals from the parent window (which DOES get HMR pings) into iframes via postMessage. Iframe receives the signal and triggers its own update without losing state.

**If HMR works for static routes but not dynamic ones:**

- Likely a Next 16 issue; report upstream. Until fixed: force-reload iframes for dynamic-route pages specifically.

**If Forkshop's wrapping breaks HMR:**

- Identify the specific wrapping behavior, gate it on production builds only (HMR only matters in dev).

### Verification

After fix:

1. Open `/forkshop`. Have Claude edit a file mapped to a visible iframe (any kind — static route, dynamic route, kit-rendered block).
2. Within ~1-2 seconds of the file write, the iframe content should update without manual reload.
3. Sidebar dot + frame glow + text pulse should fire in parallel (they already work — verified earlier).
4. State preservation is a nice-to-have but not required for v1 — visual freshness matters more.

Test on multiple route shapes (static, dynamic, block-isolation, kit-rendered, etc.) to confirm the fix applies broadly.

---

## Bug M — Next.js 15+ dev indicator visible inside Forkshop iframes

**Where:** the iframe-CSS injection in `packages/registry/src/components/canvas/use-iframe-preview.ts` (or wherever PREVIEW_EDIT_CSS is built). The CSS selectors that hide Next's dev chrome are out of date for Next 15+.

**Severity:** Medium-cosmetic. Doesn't break functionality, but pollutes every iframe with Next's floating "Rendering... Compiling..." pill, which:

- Visually competes with Forkshop's own UI (AgentSelectionChip lives in similar canvas space)
- Confuses users who think it might be a Forkshop indicator (the playground/site user expected Forkshop's "Claude editing..." chip and saw Next's pill instead, didn't realize they were different things)
- Defeats the "the iframe is your real app" illusion — Next's dev UI shouldn't bleed through

### Symptom

In a project running Next 15 or 16, after install + `npm run dev`, every Forkshop iframe has a small floating pill at the bottom-left corner showing "Rendering...", "Compiling...", or similar Next dev-tools state. This persists across all three viewport tiles.

### Root cause

Forkshop's iframe-CSS injection includes selectors to hide Next.js's dev chrome — most likely targeting Next 14's DOM (`[data-nextjs-dev-overlay-toast]`, older portal class names, etc.). Next 15 introduced a redesigned dev indicator that mounts a new `nextjs-portal` custom element with `[data-nextjs-dev-overlay]` (and related) attributes; the old selectors don't match, so the pill renders normally inside iframes.

### Fix

Expand the iframe-CSS injection to cover Next 15+'s new selectors. Concrete addition:

```css
/* Hide Next.js 15+ dev tools UI inside Forkshop iframes */
nextjs-portal,
[data-nextjs-dev-overlay],
[data-nextjs-dev-tools-button],
[data-nextjs-toast],
[data-nextjs-route-announcer] {
  display: none !important;
}

/* Keep the older Next 14 selectors that already worked, for compat */
[data-nextjs-dev-overlay-toast],
[data-nextjs-toast-wrapper],
.nextjs-toast-errors-parent {
  display: none !important;
}
```

Inject this into the iframe document the same way `PREVIEW_EDIT_CSS` is currently injected (probably via a `<style>` element in `useIframePreview`'s `onLoad` handler).

### Worth checking while in the file

Other dev-chrome that might bleed through:

- **React DevTools highlight overlay** (when the user has the extension and "Highlight updates" enabled) — probably can't be hidden via CSS; document as a known limitation if so
- **Vercel Analytics dev banner** (if the user uses `@vercel/analytics` in dev) — has its own DOM, check Vercel's docs for selectors
- **Sentry's dev-mode "session replay" indicator** — niche, but worth a quick grep

None of these are urgent for v1; just batch the obvious ones into the same iframe-CSS pass.

### Verification

After fix, install Forkshop in a Next 16 project (the playground/site is a perfect test). Open `/forkshop`. The iframes should render their content with **zero Next.js dev indicators visible**. Compiling activity still happens (Next.js is still doing HMR), it's just invisible inside the iframes — which is the right behavior.

The user's own dev-tab (NOT inside Forkshop) should still show the Next dev indicator normally — Forkshop's CSS only applies inside iframes.

---

## Bug N — User-project CLAUDE.md doesn't make "custom boards = canvas primitives" obvious

**Where:** `packages/registry/src/templates/user-claude-md.md` (the template that installs as `app/forkshop/CLAUDE.md` in user projects).

**Severity:** High for adoption. One of Forkshop's headline value props is "you can build your own canvas boards." If Claude doesn't default to the canvas primitives when users ask for custom boards, every user-built board is a regression to plain HTML — Forkshop's purpose silently erodes.

### Symptom

Reported in the ravineo-playground/site install. User asked their Claude (in that project) to build a custom board for managing segment illustrations. Claude:

1. ✅ Built the API routes (data fetching, regeneration endpoints)
2. ✅ Wired the board into the sidebar with an icon and route
3. ✅ Added the CLAUDE.md doc entry
4. ❌ **Built the board as a plain pipeline strip + grid of cards** — no `<ForkshopCanvas>`, no `<CanvasNode>`, no zoom/pan/drag

The user pushed back: *"but you did not do it as canvas right? i want that... zoom around, reorder cards ... the usual. all of it should be canvas nodes."* Claude acknowledged the mistake and rewrote the board with `ForkshopCanvas` + `CanvasNode`. Outcome was correct, but Claude defaulted wrong.

### Root cause

The user-project CLAUDE.md template likely mentions canvas primitives somewhere, but not strongly or prominently enough. Claude reads the CLAUDE.md, sees "build a board," interprets that as "build a section in the app" using whatever default React layout makes sense for a list of cards. The "boards in Forkshop are canvas-by-default" pattern isn't loud enough in the docs.

### Fix

Add an explicit section near the top of `packages/registry/src/templates/user-claude-md.md` titled something like **"Adding a new board"** or **"Custom boards"** that makes the canvas-primitive default unmistakable. Sketch:

```markdown
## Adding a new board

When you (or your Claude) want a new section in the Forkshop sidebar 
with its own content area, the **default shape is a canvas**, not a 
flat page layout.

### The pattern

Every board file should:

1. Wrap content in `<ForkshopCanvas>` so users get pan + zoom + viewport 
   controls automatically
2. Place each interactive item in a `<CanvasNode id="...">` so users can 
   drag to rearrange and positions persist
3. Persist positions via `/api/forkshop/positions` (already wired — just 
   give each CanvasNode a stable `id`)

### When to deviate (rare)

Flat HTML layouts are appropriate ONLY for genuinely non-spatial content:

- A tabular settings page where rows have no spatial relationship
- A documentation-style reading page
- A single-form input

For ANY board that displays multiple visual items (cards, previews, 
diagrams, pipelines, lists with images), use canvas primitives. If 
you're tempted to write a `<div className="grid">`, stop and use 
`<ForkshopCanvas>` + `<CanvasNode>`s instead.

### Minimal example

```tsx
"use client"
import { ForkshopCanvas, CanvasNode } from "@/components/forkshop/canvas"

export default function MyCustomBoard() {
  return (
    <ForkshopCanvas fitMode="both">
      <CanvasNode id="item-1" defaultX={0} defaultY={0}>
        <MyCard />
      </CanvasNode>
      <CanvasNode id="item-2" defaultX={420} defaultY={0}>
        <MyOtherCard />
      </CanvasNode>
    </ForkshopCanvas>
  )
}
```

### When you build a custom board

Wire it in:
- `src/app/forkshop/<board-name>-board.tsx` — the board itself
- `src/app/forkshop/forkshop.config.tsx` — register it in the sidebar nav
- `src/app/forkshop/page.tsx` — route to it from the canvas selection
```

This needs to be **near the top of the CLAUDE.md**, not buried in a later section. Claude reads CLAUDE.md top-down and the first occurrence of a pattern usually wins.

### Bonus: shipping a forkshop-add-board skill

For an even firmer guard, ship a fourth Claude Code skill: `forkshop-add-board.md`. Triggers on phrases like *"add a board to Forkshop"*, *"build a custom Forkshop board"*, *"new section in Forkshop"*. The skill explicitly walks through the canvas-primitive scaffold. This is belt-and-suspenders — the CLAUDE.md update alone probably solves 90% of cases.

Optional for v1; lean toward "just fix the CLAUDE.md template first" and revisit if users keep ending up with flat-HTML boards.

### Verification

After fix, in a fresh Forkshop install, ask Claude in that project: *"build me a custom Forkshop board showing all the products in my catalog."* It should:

1. Read app/forkshop/CLAUDE.md
2. Default to `ForkshopCanvas` + `CanvasNode` per item
3. Wire positions to the persistence endpoint
4. Not produce a flat `<div className="grid">` layout

Test in both an empty install and one with existing boards.

---

## Bug I (limitation, not a bug — capturing for future) — Pages board doesn't auto-handle dynamic routes

**Where:** `packages/registry/src/kits/page-tree.tsx` — and how the setup skill populates the pages list.

**Severity:** Functional limitation, not a blocker. Found in ravineo-playground/site (which has `/cluster/[slug]`, `/segment/[slug]`, `/creator/[username]`, `/taxonomy-v6/[slug]`, etc.).

### Symptom

Dynamic routes get TODO'd in `forkshop.config.tsx`. The Pages board can render static routes by hitting them in an iframe, but dynamic routes need a real slug to render anything meaningful. The setup skill correctly leaves them as TODOs and tells the user to add explicit slugs.

### Future improvement (not for this polish round)

Could be a v0.2 feature: the setup skill scans the dynamic-route file for `generateStaticParams()` exports, picks one or two real slugs, and pre-populates them in the config. Or: the page-tree kit could have a `dynamicSlug?: string` field per entry that the setup skill prompts for. Out of scope for the polish round; capture for a future kit-polish spec.

---

## Already-fixed bugs (historical context, do not re-fix)

These were surfaced earlier and have been resolved. Listed here so the next Claude doesn't accidentally regress them.

| Bug | Where | Commit |
|---|---|---|
| Manifest builder didn't handle `live-editing.md` skill | `packages/cli/src/manifest-builder.ts` | `11750d2` |
| Templates importing `@forkshop/registry` (workspace-only, doesn't exist in user projects) | `packages/registry/src/skill/setup.md` Templates 2-5 + user-claude-md template | Fixed via per-symbol imports (Option B) |
| Template 1 `import tailwindConfig from "@/../tailwind.config"` (escaped project root) | `packages/registry/src/skill/setup.md` Template 1 | Fixed by changing to `@/tailwind.config` |
| Raveo font fell back to body font in fresh projects (CSS var unset) | `packages/registry/tailwind/forkshop-preset.ts` + `.css` | `f0025a5` — added `Raveo` as inline fallback in `var(--font-raveo, Raveo)` |
| Setup skill stripped synthetic-route surfacing when removing the NEW pill | `packages/registry/src/components/agent-activity-context.tsx` + `index.ts` + `sidebar/forkshop-sidebar.tsx` | `070959d` — restored data plumbing, kept pill removed |
| Doc-sync skill was missing (third skill the strategy spec called for) | `packages/registry/src/skill/doc-sync.md` | `13315f2` |

---

## Recommended fix order

1. **Bug J first** (Forkshop inherits root-layout chrome). Highest visible impact — users see their own site's navbar wrapped around Forkshop. Drop a `src/app/forkshop/layout.tsx` with a fixed-overlay wrapper. Simple, isolated.
2. **Bug G second** (iframe drift / infinite-grow). Equally visible — iframes don't render right. Inject viewport-decoupling CSS in the iframe-preview hook.
3. **Bug L third** (HMR doesn't propagate into iframes). Investigation-heavy but high-impact. Either fix HMR plumbing OR force iframe reload on agent-edit events. Worth doing in the same session as G+M+H since you'll already be in the iframe wiring code.
4. **Bug M fourth** (Next 15+ dev indicator visible in iframes). Same file family as G+L — the iframe-CSS injection. Cheap to add the missing selectors while you're already there.
5. **Bug H fifth** (LocatorInit mount location). Tied to G/L/M — same "iframe behavior is broken" cluster. Move LocatorInit into the user's root layout.
6. **Bug K sixth** (hook-script port detection + fallback). Without this, live-AI silently doesn't fire on any non-3000 port — and the AgentSelectionChip "Claude editing..." pill never appears, which users notice and conflate with Bug M's symptom.
7. **Bug B seventh** (CLI src/ convention detection). Now you can reliably install in any project without manual file moves.
8. **Bug A eighth** (decouple dep-install from pnpm). Mechanical and isolated.
9. **Bug D ninth** (Next 15+ turbopack syntax). One-file template edit; do while in the skill markdown.
10. **Bug E tenth** (path-flexible skill triggers). Same file family as D; cheap to fix at the same time.
11. **Bug N eleventh** (user-project CLAUDE.md doesn't enforce canvas-primitive default for custom boards). Documentation fix; medium-effort because the section needs to be well-written and prominently placed near the top.
12. **Bug C twelfth** (Phase 3 narrative leading whitespace). Cosmetic.
13. **Bug F thirteenth** (drop redundant layout step). Smallest scope. **Note:** revisit in light of Bug J's fix — if a Forkshop layout.tsx is now part of the install, this "redundant layout" framing may shift. Decide during fix.
14. **Bug I — skip.** Future kit-polish work, out of scope here.

**Re-test in all known projects after the polish round**:
- The original `create-next-app --no-src-dir` cold fixture (regression check)
- A fresh `create-next-app --src-dir` fixture (Bugs B + E)
- A fresh Next 15 or Next 16 project (Bug D — try `pnpm create next-app@latest`)
- influencers-scrapers (pnpm monorepo — Bug A blocker)
- ravineo-playground/site (src/ + Next 16 + pnpm-broken — exercises A, B, D, E together)

**Polish round commit messages (one per bug, clean history):**
- `fix(cli): detect src/ convention from tsconfig paths`
- `fix(cli): decouple dep-install from pnpm; write to package.json`
- `fix(skill): use Next 15+ turbopack syntax when project version supports it`
- `fix(skill): path-flexible activation triggers for sibling skills`
- `fix(skill): remove leading whitespace from Phase 3 narrative template`
- `fix(skill): drop redundant layout.tsx step (Template 5 page.tsx is sufficient)`

---

## Verification approach

After both fixes land:

```bash
# Fresh test fixture 1: --no-src-dir (the original baseline)
TEMPDIR=$(mktemp -d) && cd "$TEMPDIR"
pnpm create next-app@latest f1 --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --use-pnpm
cd f1
node ~/Desktop/ravineo_dev/forkshop/packages/cli/dist/index.js init \
  --registry http://localhost:3001/r/

# Expected: files at app/forkshop/, components/forkshop/, lib/forkshop/.
# Expected: no pnpm add invocation; instead, deps written to package.json
# and printed "Run pnpm install to fetch deps."
# Run `pnpm install`, then `set up Forkshop`, then `pnpm dev`. /forkshop renders.

# Fresh test fixture 2: --src-dir (new case)
TEMPDIR=$(mktemp -d) && cd "$TEMPDIR"
pnpm create next-app@latest f2 --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm
cd f2
node ~/Desktop/ravineo_dev/forkshop/packages/cli/dist/index.js init \
  --registry http://localhost:3001/r/

# Expected: files at src/app/forkshop/, src/components/forkshop/, src/lib/forkshop/.
# Same package.json + manual-install flow as fixture 1.
# `set up Forkshop` runs. `pnpm dev`. /forkshop renders.
```

Both fixtures must pass cleanly with no manual file-moves and no pnpm-failure detours.

---

## Notes for whoever picks this up

- **This file is a living document.** If you find additional cross-project bugs while testing, add them here.
- **The `docs/known-issues.md` file** in this repo has older issues that may overlap; check there before duplicating.
- **The `docs/live-ai-closeout-issues.md`** file has the specific Issues 1-3 from the live-AI cold-fixture E2E; those are the "Already-fixed bugs" referenced in this doc's table.
- **Don't expand scope** beyond the two open bugs. Both are mechanical fixes with clear repros. If you spot other things while you're in the code, capture them in this file as "Bug C / D / ..." but don't fix them in the same session — keep the polish round focused.
