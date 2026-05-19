# Homepage Demo Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a framed screenshot block to `apps/docs/app/page.tsx` so visitors to `forkshop.dev` see what Forkshop looks like.

**Architecture:** One JSX edit to one file (`apps/docs/app/page.tsx`) plus one image asset committed at `apps/docs/public/homepage-screenshot.png`. Browser chrome is plain Tailwind markup inline; the image is served via `next/image`. No new component file, no new dependency.

**Tech Stack:** Next.js 16, React 19, Tailwind (existing in `apps/docs`), `next/image`.

**Spec:** `docs/specs/2026-05-19-homepage-demo-screenshot-design.md`

**Note on TDD:** `apps/docs` has no test infrastructure for the marketing page, and adding one just to assert "page contains an `<Image>`" is ceremony with no real signal. Verification is: typecheck passes, lint passes, dev server renders the page correctly, build succeeds. This is the right shape of verification for a static visual change. If a future change moves the marketing page into a tested boundary, that's a separate concern.

---

## File Structure

Two file touches, both in `apps/docs/`:

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/docs/public/homepage-screenshot.png` | Create | Image asset. Ships as a 1×1 placeholder PNG so the page compiles; the maintainer replaces it with a real capture from `apps/demo` in a follow-up commit before merge. |
| `apps/docs/app/page.tsx` | Modify | Add `import Image from "next/image"` and insert a ~14-line framed-screenshot block between the existing `<header>` and `<section className="grid">`. |

---

## Task 1: Create placeholder screenshot file

**Files:**
- Create: `apps/docs/public/homepage-screenshot.png`

This is a 1×1 grey PNG to unblock the build. `next/image` doesn't validate intrinsic pixel dimensions against the declared `width`/`height`, so a 1×1 source scaled to the declared 1536×1024 renders as a solid grey rectangle. The maintainer replaces this before merging.

- [ ] **Step 1: Decode a base64 PNG into the public directory**

Run from the repo root:

```bash
base64 -d > apps/docs/public/homepage-screenshot.png <<'EOF'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==
EOF
```

Expected: file created. Verify with:

```bash
ls -la apps/docs/public/homepage-screenshot.png
file apps/docs/public/homepage-screenshot.png
```

Expected output from `file`: `PNG image data, 1 x 1, 8-bit/color RGBA, non-interlaced`.

- [ ] **Step 2: Commit the placeholder**

```bash
git add apps/docs/public/homepage-screenshot.png
git commit -m "$(cat <<'EOF'
docs(site): add placeholder homepage screenshot

1x1 grey PNG so the build works. Maintainer replaces with a real
2x capture of apps/demo before merging.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add framed screenshot block to homepage

**Files:**
- Modify: `apps/docs/app/page.tsx`

The full current content of the file is the no-op default export shown in the spec. The edit:
1. Add `import Image from "next/image"` at the very top of the file.
2. Insert a new `<div>` block between the closing `</header>` and the opening `<section className="grid gap-8 sm:grid-cols-3">`.

- [ ] **Step 1: Add the `next/image` import**

Edit `apps/docs/app/page.tsx` — add a single line at the top:

```tsx
import Image from "next/image"

export default function HomePage() {
  // ...rest unchanged
}
```

- [ ] **Step 2: Insert the framed screenshot block between the header and the feature section**

In `apps/docs/app/page.tsx`, find the line `</header>` and the immediately following `<section className="grid gap-8 sm:grid-cols-3">`. Insert this block on the lines between them:

```tsx
<div className="mt-14 mb-20 overflow-hidden rounded-md shadow-xl">
  <div className="flex items-center gap-1.5 bg-[#2a2a2a] px-3 py-2">
    <span className="size-2.5 rounded-full bg-[#ff5f57]" />
    <span className="size-2.5 rounded-full bg-[#febc2e]" />
    <span className="size-2.5 rounded-full bg-[#28c840]" />
    <span className="ml-3 text-[11px] text-white/40">localhost:3000/forkshop</span>
  </div>
  <Image
    src="/homepage-screenshot.png"
    alt="Forkshop running in a Next.js project — sidebar with boards on the left, canvas with stacked iframe viewports on the right."
    width={1536}
    height={1024}
    priority
    className="block w-full"
  />
</div>
```

After the edit, the file should read (relevant region):

```tsx
import Image from "next/image"

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <header className="mb-20">
          {/* ...existing hero unchanged... */}
        </header>

        <div className="mt-14 mb-20 overflow-hidden rounded-md shadow-xl">
          <div className="flex items-center gap-1.5 bg-[#2a2a2a] px-3 py-2">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] text-white/40">localhost:3000/forkshop</span>
          </div>
          <Image
            src="/homepage-screenshot.png"
            alt="Forkshop running in a Next.js project — sidebar with boards on the left, canvas with stacked iframe viewports on the right."
            width={1536}
            height={1024}
            priority
            className="block w-full"
          />
        </div>

        <section className="grid gap-8 sm:grid-cols-3">
          {/* ...existing feature cards unchanged... */}
        </section>
      </div>
    </main>
  )
}
```

Note the existing `<header>` has `className="mb-20"` and the new block has `mt-14 mb-20`. The `mb-20` on the header will collapse with the `mt-14` on the new block; this is intentional Tailwind behavior. The visual gap above the screenshot is ~80px (mb-20), and the gap below is ~80px (mb-20). If that feels too generous after the real screenshot lands, the maintainer can dial down `mt-14` to e.g. `mt-8`.

---

## Task 3: Typecheck

**Files:** none modified

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter docs typecheck
```

Expected: exits 0, no errors. (`next/image` has built-in types; the new JSX is plain Tailwind classnames; no new symbols to resolve.)

If it fails: most likely cause is a typo in the JSX or a missing import. Fix and re-run.

---

## Task 4: Lint

**Files:** none modified

- [ ] **Step 1: Run lint**

```bash
pnpm --filter docs lint
```

Expected: exits 0. The ESLint config for `apps/docs` covers `app` and `components` directories.

If `react/no-unescaped-entities` fires on the alt text's em-dash (—), it shouldn't — em-dashes are fine inside JSX attribute strings — but if anything trips, fix and re-run.

---

## Task 5: Visual check via dev server

**Files:** none modified

- [ ] **Step 1: Start the dev server in the background**

```bash
pnpm --filter docs dev
```

Note: this binds port **3001**, not 3000. (See `apps/docs/package.json` — the `dev` script is `next dev --port 3001`.)

- [ ] **Step 2: Open the page and verify visually**

Visit `http://localhost:3001/` in a browser and confirm:

- A dark bar with three coloured dots and the text `localhost:3000/forkshop` appears below the GitHub button and above the three feature cards.
- A grey rectangle (the 1×1 placeholder, scaled up) appears below the dark bar.
- The whole framed block has rounded corners, a soft drop shadow, and is contained within the same column as the surrounding text.
- The feature cards still render below it, unchanged.
- No console errors related to the image or `next/image`.

If the placeholder looks broken (e.g., not stretching to fill the frame, or showing a 404), the most likely cause is the file at `apps/docs/public/homepage-screenshot.png` not existing or being malformed. Re-run Task 1 Step 1 and verify with `file apps/docs/public/homepage-screenshot.png`.

- [ ] **Step 3: Stop the dev server**

Close the dev server (Ctrl-C in its terminal, or kill the background process).

---

## Task 6: Build

**Files:** none modified

- [ ] **Step 1: Run a production build**

```bash
pnpm --filter docs build
```

Expected: build succeeds. Note this runs `pnpm validate-registry` first (per the `build` script in `apps/docs/package.json`); that should pass cleanly because the change does not touch the registry source.

If the build fails with an `Image` size or optimization error, re-check that the placeholder file exists and is a valid PNG.

---

## Task 7: Commit the homepage edit

**Files:** already modified — `apps/docs/app/page.tsx`

- [ ] **Step 1: Stage and commit**

```bash
git add apps/docs/app/page.tsx
git commit -m "$(cat <<'EOF'
docs(site): add framed screenshot to homepage

Adds a mac-chrome-framed screenshot block between the hero and
the feature cards on forkshop.dev. Image is served via next/image
with priority; the placeholder PNG from the previous commit will
be replaced with a real capture before merge.

Spec: docs/specs/2026-05-19-homepage-demo-screenshot-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Confirm git is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Out of plan (maintainer follow-up before merge)

The maintainer captures a real screenshot of `apps/demo` and commits it over the placeholder:

1. From the repo root, run `pnpm dev` (this starts `apps/demo`, port depends on the demo's dev script).
2. Navigate to whichever board best conveys Forkshop's product story.
3. Capture at 2x display density (`devicePixelRatio === 2`). Target dimensions: ~1536×1024 (or any 3:2-ish ratio at 2x).
4. Save as PNG over `apps/docs/public/homepage-screenshot.png`.
5. Verify locally with `pnpm --filter docs dev` → http://localhost:3001/.
6. Commit:

```bash
git add apps/docs/public/homepage-screenshot.png
git commit -m "docs(site): replace placeholder with real demo screenshot"
```

This step is intentionally outside the automated plan — it requires a human eye for board choice, viewport state, and visual quality.

---

## Self-Review

**Spec coverage:** Each spec section maps to a task:
- Goal (framed screenshot between hero and features) → Task 2.
- Visual spec (width, frame, chrome bar, dot colours, URL text, image dimensions, alt text, no caption) → Task 2 Step 2.
- Implementation sketch → Task 2 Step 2 reproduces it exactly.
- Image asset (PNG, `apps/docs/public/`, 2x source, maintainer-captured) → Task 1 (placeholder) + "Out of plan" section (real capture).
- Open questions: spec lists none. No gaps.
- Scope-out items (no `/demo` route, no `apps/demo` changes, no new deps) → never appear in any task. Confirmed.

**Placeholder scan:** No "TBD", "TODO", "fill in later", "similar to Task N", or vague-prescription steps. All code blocks contain the literal code an engineer pastes.

**Type consistency:** Only one new symbol introduced (`Image` from `next/image`); used identically in Task 2's two code blocks. No mismatch.

Plan is internally consistent and covers the spec.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-19-homepage-demo-screenshot.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
