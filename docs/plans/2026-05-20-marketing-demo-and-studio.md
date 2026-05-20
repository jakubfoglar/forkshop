# Marketing `/demo` + `/studio` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished public showcase at `forkshop.dev/demo` and a hidden internal marketing canvas at `forkshop.dev/studio`, sharing one body of fake-app content (WAVECLASH 2026 — extracted from `docs/design/demo-fake-app/wave clash.pen`).

**Architecture:** Three layers — fake-app pages (Layer 1) at `apps/docs/app/demo/site/*` with isolated Tailwind scope; `/demo` showcase (Layer 2) mounting `ForkshopSidebar` + `ForkshopCanvas` around Layer 1 via a `forkshop.config.tsx`; `/studio` (Layer 3) as its own Forkshop installation with iframes-to-`/demo` per declarative shot config in `app/studio/boards/*.ts`. Each layer is independently maintainable; the iframe→inline-React swap for future Remotion work is a Layer-3-only change.

**Tech Stack:** Next.js App Router (`apps/docs`), Tailwind CSS (separate scope for demo via route groups + CSS-var-driven theming), React + TypeScript, Vitest (engine tests), Pencil MCP (token/structure extraction from `wave clash.pen`), existing Forkshop engine package (`@forkshop/engine`).

**Spec reference:** [`docs/specs/2026-05-20-marketing-demo-and-studio-design.md`](../specs/2026-05-20-marketing-demo-and-studio-design.md)

**Design source:** [`docs/design/demo-fake-app/wave clash.pen`](../design/demo-fake-app/) — opens via Pencil MCP (`mcp__pencil__open_document`). Two top-level frames: `QK8SH` (Desktop / WAVECLASH 2026) and `K1HcT3` (Mobile / WAVECLASH 2026). No variables or reusable components defined — tokens and primitives are derived during Phase 1.

---

## Phase boundaries (= user review gates)

Each phase ends with an explicit user review. Do not start the next phase until the user signs off on the current one.

| Phase | Output | Gate type |
|---|---|---|
| 0 | Route-group refactor, CSS isolation working | Engineering (typecheck + visual smoke) |
| 1a | Design tokens in `tailwind.config.ts` + CSS vars | User visual review against pencil |
| 1b | Primitive components in `_components/ui/*` | User visual review against pencil |
| 1c | Block components in `_components/blocks/*` | User visual review against pencil |
| 1d | Page routes at `/demo/site/*` | User visual review against pencil |
| 1e | Mobile breakpoints | User visual review against pencil mobile frame |
| 2a | `initialActivity` on `AgentActivityProvider` | Engineering (vitest green) |
| 2b | `initialZoom` / `initialPan` on `ForkshopCanvas` | Engineering (vitest green) |
| 2c | `/demo` route mounts forkshop chrome over Layer 1 | User check `/demo` renders |
| 3 | `/studio` route with first board working end-to-end | User check `/studio` renders, screenshots taken |

---

# Phase 0 — Repo prep: route groups + CSS isolation

**Why:** `apps/docs/app/layout.tsx` currently imports `globals.css` and renders `SiteHeader` + `SiteFooter` for every route. Once `/demo` and `/studio` exist they need different CSS scopes and no marketing chrome. Solution: move existing pages into a `(marketing)` route group with their own layout, leaving the root layout minimal so child routes (`/demo`, `/studio`) can supply their own.

### Task 0.1: Create `(marketing)` route group, move existing pages and layout

**Files:**
- Create: `apps/docs/app/(marketing)/layout.tsx` (move content from `apps/docs/app/layout.tsx`)
- Create: `apps/docs/app/(marketing)/page.tsx` (move from `apps/docs/app/page.tsx`)
- Create: `apps/docs/app/(marketing)/globals.css` (move from `apps/docs/app/globals.css`)
- Move: `apps/docs/app/docs/` → `apps/docs/app/(marketing)/docs/`
- Move: `apps/docs/app/r/` → `apps/docs/app/(marketing)/r/`

- [ ] **Step 1: Verify current dev server works** to establish a baseline.

```bash
pnpm --filter docs dev
```

Open `http://localhost:3001/`, `/docs`, `/docs/getting-started`. Confirm pages render. Stop the dev server.

- [ ] **Step 2: Move files into `(marketing)` group.**

```bash
cd apps/docs/app
mkdir "(marketing)"
git mv layout.tsx "(marketing)/layout.tsx"
git mv page.tsx "(marketing)/page.tsx"
git mv globals.css "(marketing)/globals.css"
git mv docs "(marketing)/docs"
git mv r "(marketing)/r"
```

- [ ] **Step 3: Fix the globals.css import path in `(marketing)/layout.tsx`.**

`apps/docs/app/(marketing)/layout.tsx` already says `import "./globals.css"` — the path stays correct because both moved together. Verify no other imports need adjusting:

```bash
grep -rn "from \"./globals.css\"\|from \"../globals.css\"\|from \"@/app/globals.css\"" apps/docs/app
```

Expected: only matches inside `(marketing)/` (or none at all if Next.js MDX picks up CSS another way).

- [ ] **Step 4: Verify routes still resolve identically.**

```bash
pnpm --filter docs dev
```

Open `http://localhost:3001/`, `/docs`, `/docs/getting-started`. Confirm pages still render unchanged (route groups don't affect URL). Stop the dev server.

- [ ] **Step 5: Commit.**

```bash
git add apps/docs/app
git commit -m "refactor(docs): move marketing pages into (marketing) route group"
```

### Task 0.2: Add minimal root layout

**Files:**
- Create: `apps/docs/app/layout.tsx`

- [ ] **Step 1: Write the minimal root layout.**

```tsx
// apps/docs/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

No CSS imports, no fonts, no chrome — those live in `(marketing)/layout.tsx` and (later) in `demo/layout.tsx` / `studio/layout.tsx`.

- [ ] **Step 2: Run typecheck.**

```bash
pnpm --filter docs typecheck
```

Expected: passes.

- [ ] **Step 3: Verify the marketing site is unchanged.**

```bash
pnpm --filter docs dev
```

Open `/` and `/docs`. Header, footer, font, styling all identical to before Task 0.1.

- [ ] **Step 4: Commit.**

```bash
git add apps/docs/app/layout.tsx
git commit -m "refactor(docs): add minimal root layout, marketing layout owns chrome"
```

### Task 0.3: Scaffold empty `/demo` and `/studio` skeletons

**Why:** Lets later phases test CSS isolation incrementally without first having to build everything.

**Files:**
- Create: `apps/docs/app/demo/layout.tsx`
- Create: `apps/docs/app/demo/page.tsx`
- Create: `apps/docs/app/demo/globals.css`
- Create: `apps/docs/app/studio/layout.tsx`
- Create: `apps/docs/app/studio/page.tsx`

- [ ] **Step 1: Demo skeleton.**

```tsx
// apps/docs/app/demo/layout.tsx
import "./globals.css"

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="demo-scope">{children}</div>
}
```

```css
/* apps/docs/app/demo/globals.css */
/* Tailwind directives + demo CSS vars get added in Phase 1a */
.demo-scope { font-family: system-ui, sans-serif; }
```

```tsx
// apps/docs/app/demo/page.tsx
export default function DemoPage() {
  return (
    <main>
      <h1>WAVECLASH 2026 — demo</h1>
      <p>Forkshop chrome wraps this in Phase 2c.</p>
    </main>
  )
}
```

- [ ] **Step 2: Studio skeleton.**

```tsx
// apps/docs/app/studio/layout.tsx
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="studio-scope" style={{ minHeight: "100vh" }}>{children}</div>
}
```

```tsx
// apps/docs/app/studio/page.tsx
export const metadata = { robots: { index: false, follow: false } }

export default function StudioPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>studio</h1>
      <p>Marketing canvas wires up in Phase 3.</p>
    </main>
  )
}
```

- [ ] **Step 3: Verify `/`, `/docs`, `/demo`, `/studio` all resolve and look independent.**

```bash
pnpm --filter docs dev
```

`/` and `/docs` still have marketing chrome. `/demo` and `/studio` render plain text with no marketing header/footer. CSS isolation is now real.

- [ ] **Step 4: Run typecheck + lint.**

```bash
pnpm --filter docs typecheck && pnpm --filter docs lint
```

- [ ] **Step 5: Commit.**

```bash
git add apps/docs/app/demo apps/docs/app/studio
git commit -m "feat(docs): scaffold /demo and /studio skeletons with isolated layouts"
```

**🟡 PHASE 0 GATE:** Show the user `/`, `/docs`, `/demo`, `/studio` rendering side-by-side. Confirm marketing chrome only appears on the first two. Get sign-off before Phase 1a.

---

# Phase 1a — Design tokens

**Why:** Tokens are the foundation. Every primitive, block, and page references them. Getting them wrong (or guessing them) propagates. Sample directly from the pencil source.

**Approach:** Pencil file `wave clash.pen` has no defined variables (`get_variables → {}`). Tokens are derived by:
1. Sampling colors visible in the rendered Desktop frame (`QK8SH`) via `get_screenshot`.
2. Inspecting raw fills/strokes/text-styles via `snapshot_layout` + `batch_get` on representative nodes.
3. Grouping into semantic scales.

### Task 1a.1: Extract palette and typography from pencil

**Files:**
- Create: `docs/design/demo-fake-app/extracted-tokens.md` (working notes, will inform the next task)

- [ ] **Step 1: Capture full-frame screenshots of both top-level frames.**

```
mcp__pencil__get_screenshot { filePath: "docs/design/demo-fake-app/wave clash.pen", nodeId: "QK8SH" }
mcp__pencil__get_screenshot { filePath: "docs/design/demo-fake-app/wave clash.pen", nodeId: "K1HcT3" }
```

Review both visually. Identify dominant colors, accent colors, neutrals (text, surfaces, borders), and any state colors (errors, warnings if present).

- [ ] **Step 2: Inspect raw color values on representative nodes.**

Use `snapshot_layout` to find specific section IDs (header `LEYsk`, hero section `sUP7n`, schedule table `fi42O`, etc.), then `batch_get` with `readDepth: 2` on those IDs to read raw `fill` / `stroke` color hex values. Sample at least:
  - Header background
  - Hero background
  - Body text fill
  - Heading text fill
  - Accent/CTA fill
  - Any badge / tag fill

```
mcp__pencil__batch_get {
  filePath: "docs/design/demo-fake-app/wave clash.pen",
  nodeIds: ["LEYsk", "sUP7n", "fi42O", "ThXku", "WRu0j"],
  readDepth: 2
}
```

- [ ] **Step 3: Inspect typography on heading and body text nodes.**

From `batch_get` results, identify `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` for:
  - Display headings (e.g. "THE OCEAN DOESN'T NEGOTIATE")
  - Section headings ("MEET THE SURFERS")
  - Body text
  - Small text (labels, captions, ticker text)

- [ ] **Step 4: Draft `extracted-tokens.md` with proposed token names.**

Group sampled values into semantic scales. Suggested format:

```md
## Colors
### Brand
- waveclash-yellow: #...   (header bg, ticker)
- waveclash-black: #...    (body text, primary surfaces)
- waveclash-red: #...      (accent / CTA / live indicator)

### Neutrals
- neutral-50 … neutral-900 (sampled gradient)

### Semantic aliases
- surface = waveclash-yellow (or neutral-50)
- foreground = waveclash-black
- accent = waveclash-red
- muted-foreground = neutral-500

## Typography
### Families
- display: <font from pencil>
- body: <font from pencil>

### Sizes
- xs / sm / base / lg / xl / 2xl / 3xl / 4xl / 5xl / display (px or rem)

### Weights
- 400 / 600 / 700 / 900 (only what's actually used)

### Line heights
- tight: 1.1, normal: 1.4, loose: 1.7
```

Be conservative — only include values actually present in the design.

- [ ] **Step 5: Commit the working notes.**

```bash
git add "docs/design/demo-fake-app/extracted-tokens.md"
git commit -m "docs: extract tokens from wave clash.pen for review"
```

### Task 1a.2: Wire tokens into Tailwind + CSS vars

**Files:**
- Create: `apps/docs/app/demo/tailwind.config.ts`
- Modify: `apps/docs/app/demo/globals.css`
- Create: `apps/docs/app/demo/postcss.config.mjs` (if Tailwind needs a scoped postcss config — verify with the next step before creating)

- [ ] **Step 1: Check whether `apps/docs` uses one Tailwind config or per-folder configs.**

```bash
find apps/docs -name "tailwind.config.*" -o -name "postcss.config.*"
```

If there's one top-level `tailwind.config.ts`, extend its `content` array to include `app/demo/**/*.{ts,tsx}` and `app/studio/**/*.{ts,tsx}`, and use **CSS-var-driven theming** to keep demo tokens scoped (next steps).

- [ ] **Step 2: Add demo CSS vars under the `.demo-scope` selector in `demo/globals.css`.**

```css
/* apps/docs/app/demo/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

.demo-scope {
  /* Brand */
  --waveclash-yellow: #...;  /* fill from extracted-tokens.md */
  --waveclash-black:  #...;
  --waveclash-red:    #...;

  /* Neutrals */
  --neutral-50:  #...;
  --neutral-100: #...;
  /* ... */
  --neutral-900: #...;

  /* Semantic */
  --surface:           var(--waveclash-yellow);
  --foreground:        var(--waveclash-black);
  --accent:            var(--waveclash-red);
  --muted-foreground:  var(--neutral-500);

  /* Typography */
  --font-display: "<family>", system-ui, sans-serif;
  --font-body:    "<family>", system-ui, sans-serif;

  font-family: var(--font-body);
  color: var(--foreground);
  background: var(--surface);
}
```

Use the actual hex values from `extracted-tokens.md` — do not invent values.

- [ ] **Step 3: Extend `apps/docs/tailwind.config.ts` `content` glob, add demo-scoped colors and fonts.**

```ts
// apps/docs/tailwind.config.ts (modify existing)
export default {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marketing colors stay as-is.
        // Demo brand referenced through CSS vars (scoped by .demo-scope wrapper):
        "waveclash-yellow": "var(--waveclash-yellow)",
        "waveclash-black":  "var(--waveclash-black)",
        "waveclash-red":    "var(--waveclash-red)",
        neutral: {
          50:  "var(--neutral-50)",
          // ...
          900: "var(--neutral-900)",
        },
        surface:          "var(--surface)",
        foreground:       "var(--foreground)",
        accent:           "var(--accent)",
        "muted-foreground": "var(--muted-foreground)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body:    "var(--font-body)",
      },
    },
  },
}
```

Marketing tokens stay where they are. Demo utility classes (`bg-waveclash-yellow`, `text-foreground`, `font-display`) only resolve correctly inside `.demo-scope` because that's where the CSS vars are defined.

- [ ] **Step 4: Wire demo fonts.** If the pencil uses fonts not already loaded, add them via `next/font` (probably `next/font/google` for common ones) in `demo/layout.tsx`:

```tsx
// apps/docs/app/demo/layout.tsx
import "./globals.css"
import { <FontName> } from "next/font/google"

const display = <FontName>({ subsets: ["latin"], variable: "--font-display-loaded" })
const body    = <FontName>({ subsets: ["latin"], variable: "--font-body-loaded" })

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`demo-scope ${display.variable} ${body.variable}`}>
      {children}
    </div>
  )
}
```

Then in `globals.css`, reference the loaded vars: `--font-display: var(--font-display-loaded), system-ui;` (or whatever the chain is).

- [ ] **Step 5: Smoke-test the tokens render correctly in `demo/page.tsx`.**

```tsx
// apps/docs/app/demo/page.tsx (replace skeleton)
export default function DemoPage() {
  return (
    <main className="p-12 space-y-8">
      <h1 className="text-5xl font-display font-bold">WAVECLASH 2026</h1>
      <p className="text-foreground">Body text rendered in body font.</p>
      <p className="text-muted-foreground">Muted text.</p>
      <div className="flex gap-3">
        <div className="bg-waveclash-yellow text-waveclash-black px-4 py-2 font-bold">
          Yellow
        </div>
        <div className="bg-waveclash-red text-white px-4 py-2 font-bold">
          Red
        </div>
        <div className="bg-waveclash-black text-waveclash-yellow px-4 py-2 font-bold">
          Black
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Verify visually.**

```bash
pnpm --filter docs dev
```

Open `http://localhost:3001/demo`. Token swatches and typography should look like the pencil's palette. `/` (marketing) should be unaffected — open it in a second tab to confirm.

- [ ] **Step 7: Commit.**

```bash
git add apps/docs/app/demo apps/docs/tailwind.config.ts
git commit -m "feat(demo): wire WAVECLASH brand tokens into Tailwind + CSS vars (scoped)"
```

**🟡 PHASE 1a GATE:** Show the user `/demo` with token swatches alongside the pencil screenshot. Confirm palette + typography read right. Fix any drift before primitives.

---

# Phase 1b — Primitive components

**Why:** Anything appearing 2+ times in the design becomes a primitive. Defining these first means blocks and pages compose from a small vocabulary instead of repeating Tailwind classes.

### Task 1b.1: Identify primitives from the pencil design

**Files:**
- Modify: `docs/design/demo-fake-app/extracted-tokens.md` (add a "Primitives" section)

- [ ] **Step 1: Scan the design for repeating UI elements.**

Re-screenshot sections (`get_screenshot` on `LEYsk`, `sUP7n`, `fi42O`, `ThXku`, `WRu0j` individually). List elements that appear in multiple places. Likely candidates for a surf-event site:
  - Button (primary, secondary, ghost variants — sizes sm/md/lg)
  - Badge (live, status, tag)
  - Headings (display, h1, h2, h3)
  - Link / nav-link
  - Card (surfer card, lineup card)
  - Ticker / counter
  - Icon button (any social icons or play buttons)
  - Input (CTA email signup if present)

Only commit to primitives that appear ≥ 2x.

- [ ] **Step 2: Document the primitive list under `## Primitives` in `extracted-tokens.md`.**

Each entry: name, variants/sizes seen, example node IDs from the pencil for reference.

- [ ] **Step 3: Commit notes.**

```bash
git add "docs/design/demo-fake-app/extracted-tokens.md"
git commit -m "docs: identify WAVECLASH primitive components"
```

### Task 1b.2: Implement each primitive

**Files (one file per primitive — list will vary based on Task 1b.1 output):**
- Create: `apps/docs/app/demo/_components/ui/button.tsx`
- Create: `apps/docs/app/demo/_components/ui/badge.tsx`
- Create: `apps/docs/app/demo/_components/ui/heading.tsx`
- Create: `apps/docs/app/demo/_components/ui/<...>`.tsx (whatever Task 1b.1 found)
- Create: `apps/docs/app/demo/_components/ui/index.ts` (barrel export)

- [ ] **Step 1: Build primitives one at a time, smallest first (badge → button → heading → card → ...).**

For each primitive, write the component using only token-based Tailwind classes (`bg-accent`, `text-foreground`, `font-display`, etc.). Example button shape (adapt per pencil):

```tsx
// apps/docs/app/demo/_components/ui/button.tsx
import { type ComponentProps } from "react"
import { cn } from "@/lib/cn"

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-display font-bold uppercase tracking-wide",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-5 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary"   && "bg-accent text-white hover:opacity-90",
        variant === "secondary" && "bg-waveclash-black text-waveclash-yellow hover:opacity-90",
        variant === "ghost"     && "bg-transparent text-foreground hover:bg-neutral-100",
        className,
      )}
      {...props}
    />
  )
}
```

Adapt every detail (radius, weight, padding, hover) to what the pencil actually shows.

- [ ] **Step 2: Add a `cn` helper if `apps/docs` doesn't have one.**

```bash
grep -rn "export function cn\|export const cn" apps/docs
```

If missing, create `apps/docs/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

If `clsx` and `tailwind-merge` aren't in deps, install:

```bash
pnpm --filter docs add clsx tailwind-merge
```

- [ ] **Step 3: Build `_components/ui/index.ts` barrel.**

```ts
// apps/docs/app/demo/_components/ui/index.ts
export * from "./button"
export * from "./badge"
export * from "./heading"
// ...
```

- [ ] **Step 4: Update `demo/page.tsx` to render each primitive with all variants/sizes.**

```tsx
// apps/docs/app/demo/page.tsx
import { Button } from "./_components/ui/button"
import { Badge } from "./_components/ui/badge"
// ...

export default function DemoPage() {
  return (
    <main className="p-12 space-y-12">
      <section>
        <h2 className="text-2xl font-display mb-4">Buttons</h2>
        <div className="flex gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <div className="flex gap-3 mt-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-display mb-4">Badges</h2>
        {/* ... */}
      </section>
      {/* etc */}
    </main>
  )
}
```

- [ ] **Step 5: Verify each primitive visually against pencil.**

```bash
pnpm --filter docs dev
```

Open `/demo` and compare swatches/primitives to pencil screenshots side-by-side.

- [ ] **Step 6: Typecheck + lint.**

```bash
pnpm --filter docs typecheck && pnpm --filter docs lint
```

- [ ] **Step 7: Commit.**

```bash
git add apps/docs/app/demo/_components/ui apps/docs/app/demo/page.tsx apps/docs/lib
git commit -m "feat(demo): add WAVECLASH primitive components (button, badge, heading, ...)"
```

**🟡 PHASE 1b GATE:** Show the user the primitives gallery at `/demo`. Confirm shape/spacing/color match pencil before composing blocks.

---

# Phase 1c — Block components

**Why:** Blocks are section-level repeats (hero, schedule, surfer-grid, lineup-grid, CTA, footer). With primitives done, blocks compose them rather than re-styling from scratch.

### Task 1c.1: Identify blocks from the pencil

**Files:**
- Modify: `docs/design/demo-fake-app/extracted-tokens.md` (add `## Blocks` section)

- [ ] **Step 1: Walk the desktop frame `QK8SH` section-by-section** using the IDs from earlier snapshots (`LEYsk`, `sUP7n`, `fi42O`, `ThXku`, `WRu0j`, plus the deeper sections below). List candidate blocks. Based on the visible design these are likely:
  - `SiteHeader` — top nav with WAVE/CLASH wordmark, ticker, nav links
  - `Hero` — "THE OCEAN DOESN'T NEGOTIATE" with subhead and CTA
  - `EventSchedule` — table of event days/heats
  - `SurferGrid` — "MEET THE SURFERS" cards
  - `LineupGrid` — "FROM THE LINEUP" video tiles
  - `Cta` — "BE ON THE SAND"
  - `SiteFooter` — bottom info, sponsors

Adjust based on what the second sub-frame inside `QK8SH` contains.

- [ ] **Step 2: Document in `extracted-tokens.md` under `## Blocks` — name, what it contains (primitives + content slots), responsive notes.**

- [ ] **Step 3: Commit notes.**

```bash
git add "docs/design/demo-fake-app/extracted-tokens.md"
git commit -m "docs: identify WAVECLASH block components"
```

### Task 1c.2: Implement blocks one at a time

**Files (one per block):**
- Create: `apps/docs/app/demo/_components/blocks/site-header.tsx`
- Create: `apps/docs/app/demo/_components/blocks/hero.tsx`
- Create: `apps/docs/app/demo/_components/blocks/event-schedule.tsx`
- Create: `apps/docs/app/demo/_components/blocks/surfer-grid.tsx`
- Create: `apps/docs/app/demo/_components/blocks/lineup-grid.tsx`
- Create: `apps/docs/app/demo/_components/blocks/cta.tsx`
- Create: `apps/docs/app/demo/_components/blocks/site-footer.tsx`
- Create: `apps/docs/app/demo/_components/blocks/index.ts` (barrel export)

- [ ] **Step 1: Each block follows this pattern (example: `Hero`).**

```tsx
// apps/docs/app/demo/_components/blocks/hero.tsx
import { Button } from "../ui/button"

export interface HeroProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  ctaLabel?: string
}

export function Hero({
  eyebrow = "WAVECLASH 2026",
  title = "THE OCEAN DOESN'T NEGOTIATE",
  subtitle = "...",
  ctaLabel = "Get tickets",
}: HeroProps) {
  return (
    <section className="bg-waveclash-yellow py-24 px-12">
      <p className="text-xs font-bold uppercase tracking-widest mb-3">{eyebrow}</p>
      <h1 className="font-display text-7xl font-black uppercase leading-none mb-6">
        {title}
      </h1>
      <p className="text-lg max-w-xl mb-8">{subtitle}</p>
      <Button variant="primary" size="lg">{ctaLabel}</Button>
    </section>
  )
}
```

Match spacing, colors, type sizes, layout exactly to pencil. Use `get_screenshot` on the specific section IDs to verify.

- [ ] **Step 2: After each block, add it to `demo/page.tsx` to render in isolation for visual check.**

```tsx
// (during dev only — replaced in Phase 1d)
import { Hero } from "./_components/blocks/hero"
import { EventSchedule } from "./_components/blocks/event-schedule"
// ...

export default function DemoPage() {
  return (
    <>
      <Hero />
      <EventSchedule />
      {/* ... */}
    </>
  )
}
```

- [ ] **Step 3: Repeat per block** — implement, render in `demo/page.tsx`, compare to pencil, iterate.

- [ ] **Step 4: Build `_components/blocks/index.ts` barrel.**

```ts
// apps/docs/app/demo/_components/blocks/index.ts
export * from "./site-header"
export * from "./hero"
export * from "./event-schedule"
export * from "./surfer-grid"
export * from "./lineup-grid"
export * from "./cta"
export * from "./site-footer"
```

- [ ] **Step 5: Typecheck + lint after each block.**

```bash
pnpm --filter docs typecheck && pnpm --filter docs lint
```

- [ ] **Step 6: Commit per-block** (frequent commits make review easier).

```bash
git add apps/docs/app/demo/_components/blocks/hero.tsx apps/docs/app/demo/page.tsx
git commit -m "feat(demo): add Hero block"
```

Repeat for each block.

**🟡 PHASE 1c GATE:** Show all blocks stitched into one long `/demo` view. Compare to pencil's full desktop frame side-by-side. Confirm before pages.

---

# Phase 1d — Pages (`/demo/site/*` route tree)

**Why:** Pages compose blocks. The pencil shows two sub-frames inside `QK8SH` — likely the landing and one inner page. Each becomes a Next.js route.

### Task 1d.1: Determine the page count from pencil

**Files:**
- Modify: `docs/design/demo-fake-app/extracted-tokens.md` (add `## Pages` section)

- [ ] **Step 1: Inspect the second sub-frame inside `QK8SH`** (currently labeled `N9wSB2`, marked "partially clipped"):

```
mcp__pencil__snapshot_layout {
  filePath: "docs/design/demo-fake-app/wave clash.pen",
  parentId: "N9wSB2",
  maxDepth: 1
}
mcp__pencil__get_screenshot {
  filePath: "docs/design/demo-fake-app/wave clash.pen",
  nodeId: "N9wSB2"
}
```

Identify what page this is (event detail? surfer profile? schedule full view?).

- [ ] **Step 2: Identify any additional pages** by checking if the desktop frame extends beyond the two sub-frames captured, or by inspecting the Mobile frame for variants. List final page set in `extracted-tokens.md`.

- [ ] **Step 3: Commit notes.**

```bash
git add "docs/design/demo-fake-app/extracted-tokens.md"
git commit -m "docs: identify WAVECLASH page set"
```

### Task 1d.2: Build the page routes

**Files (will vary based on Task 1d.1 — example assuming landing + one inner page):**
- Create: `apps/docs/app/demo/site/page.tsx` (the landing — `/demo/site`)
- Create: `apps/docs/app/demo/site/<inner-page-slug>/page.tsx` (e.g. `/demo/site/lineup`)

- [ ] **Step 1: Build the landing page.**

```tsx
// apps/docs/app/demo/site/page.tsx
import { SiteHeader } from "../_components/blocks/site-header"
import { Hero } from "../_components/blocks/hero"
import { EventSchedule } from "../_components/blocks/event-schedule"
import { SurferGrid } from "../_components/blocks/surfer-grid"
import { LineupGrid } from "../_components/blocks/lineup-grid"
import { Cta } from "../_components/blocks/cta"
import { SiteFooter } from "../_components/blocks/site-footer"

export default function SiteHomePage() {
  return (
    <>
      <SiteHeader />
      <Hero />
      <EventSchedule />
      <SurferGrid />
      <LineupGrid />
      <Cta />
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 2: Build any inner pages** (composition will vary — typically `SiteHeader → <page content> → SiteFooter`).

- [ ] **Step 3: Leave `demo/page.tsx` as the primitives + blocks index for now** — Phase 2c rewrites it with the forkshop chrome showcase. The standalone fake-app entry point lives at `/demo/site` (built by this task), which is what marketing iframes will point at.

- [ ] **Step 4: Verify each page renders standalone.**

```bash
pnpm --filter docs dev
```

Open `/demo/site`, then each inner page slug. Each page should look like a real product page — header + content + footer, no forkshop chrome.

- [ ] **Step 5: Typecheck + lint.**

```bash
pnpm --filter docs typecheck && pnpm --filter docs lint
```

- [ ] **Step 6: Commit.**

```bash
git add apps/docs/app/demo/site
git commit -m "feat(demo): add WAVECLASH page routes at /demo/site/*"
```

**🟡 PHASE 1d GATE:** Show the user `/demo/site` and each inner page. Compare to pencil. Confirm the standalone view works as "this looks like a real product" before mobile.

---

# Phase 1e — Mobile breakpoints

**Why:** Pencil includes a mobile frame (`K1HcT3`). Apply its layout choices to each block + page via Tailwind responsive utilities (`sm:`, `md:`, `lg:`).

### Task 1e.1: Document the mobile design

**Files:**
- Modify: `docs/design/demo-fake-app/extracted-tokens.md` (add `## Mobile breakpoints`)

- [ ] **Step 1: Screenshot and layout-snapshot the mobile frame.**

```
mcp__pencil__get_screenshot { filePath: "...", nodeId: "K1HcT3" }
mcp__pencil__snapshot_layout { filePath: "...", parentId: "K1HcT3", maxDepth: 3 }
```

For each block identified in Phase 1c, note how it changes at mobile width: stacked instead of side-by-side, smaller type, hidden elements, etc.

- [ ] **Step 2: Choose breakpoints.** Default to Tailwind's `sm` (640px), `md` (768px), `lg` (1024px). The pencil's mobile frame is likely around 375–414px wide — that's pre-`sm`, i.e. the "base" styles should match mobile and `sm:`/`md:`/`lg:` upsize to desktop.

- [ ] **Step 3: Document per-block mobile rules in `extracted-tokens.md`.**

- [ ] **Step 4: Commit notes.**

```bash
git add "docs/design/demo-fake-app/extracted-tokens.md"
git commit -m "docs: document WAVECLASH mobile breakpoints"
```

### Task 1e.2: Add responsive classes per block

**Files:**
- Modify: each `apps/docs/app/demo/_components/blocks/*.tsx`

- [ ] **Step 1: Per-block edit pattern — start base = mobile, upsize at `sm:`/`md:`/`lg:`.**

Example for Hero:

```tsx
// before
<section className="bg-waveclash-yellow py-24 px-12">
  <h1 className="font-display text-7xl ...">

// after
<section className="bg-waveclash-yellow py-12 px-4 sm:py-16 sm:px-8 lg:py-24 lg:px-12">
  <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl ...">
```

- [ ] **Step 2: Verify in browser at multiple widths.**

```bash
pnpm --filter docs dev
```

Use DevTools responsive mode (iPhone, iPad, desktop). Compare to pencil mobile frame.

- [ ] **Step 3: Commit per-block** as you go.

```bash
git add apps/docs/app/demo/_components/blocks/hero.tsx
git commit -m "feat(demo): mobile breakpoints for Hero block"
```

Repeat for each block.

**🟡 PHASE 1e GATE:** Show the user mobile/tablet/desktop renders of `/demo/site` and inner pages. Compare to pencil's mobile frame. Confirm. Layer 1 is now complete.

---

# Phase 2a — Engine touch: `AgentActivityProvider` `initialActivity`

**Why:** `/studio` shots need to put `/demo` into a "Claude is touching X" state at first render. The provider currently starts empty and only fills from an EventSource in dev mode (`packages/engine/src/components/agent-activity-context.tsx:66-67`). Add a prop to seed it.

### Task 2a.1: Failing test for `initialActivity`

**Files:**
- Create: `packages/engine/src/components/agent-activity-context.initial.test.tsx`

- [ ] **Step 1: Write the failing test.**

```tsx
// packages/engine/src/components/agent-activity-context.initial.test.tsx
import { describe, it, expect } from "vitest"
import { render, renderHook } from "@testing-library/react"
import {
  AgentActivityProvider,
  useAgentActivePages,
  type ActivityEntry,
} from "@forkshop/components/agent-activity-context"

describe("AgentActivityProvider initialActivity", () => {
  it("renders with no active pages when initialActivity is omitted", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
        {children}
      </AgentActivityProvider>
    )
    const { result } = renderHook(() => useAgentActivePages(), { wrapper })
    expect(result.current.size).toBe(0)
  })

  it("renders with seeded active pages when initialActivity is provided", () => {
    const initial: ActivityEntry[] = [
      { path: "app/about/page.tsx", at: Date.now(), action: { kind: "read" } },
    ]
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentActivityProvider
        fileMap={{ primitives: [], blocks: [] }}
        initialActivity={initial}
      >
        {children}
      </AgentActivityProvider>
    )
    const { result } = renderHook(() => useAgentActivePages(), { wrapper })
    expect(result.current.has("/about")).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, confirm it fails.**

```bash
pnpm --filter @forkshop/engine vitest run agent-activity-context.initial.test.tsx
```

Expected: FAIL — `Property 'initialActivity' does not exist on type ...`.

### Task 2a.2: Implement `initialActivity`

**Files:**
- Modify: `packages/engine/src/components/agent-activity-context.tsx:56-65`

- [ ] **Step 1: Add the prop and use it for initial state.**

```tsx
// Change signature:
export function AgentActivityProvider({
  fileMap,
  initialActivity,
  children,
}: {
  fileMap: FileMap
  initialActivity?: readonly ActivityEntry[]
  children: ReactNode
}) {
  const [entries, setEntries] = useState<readonly ActivityEntry[]>(
    () => initialActivity ?? [],
  )
  // ... rest unchanged
```

- [ ] **Step 2: Run the test.**

```bash
pnpm --filter @forkshop/engine vitest run agent-activity-context.initial.test.tsx
```

Expected: both cases PASS.

- [ ] **Step 3: Run the full engine test suite to ensure no regression.**

```bash
pnpm --filter @forkshop/engine test
```

- [ ] **Step 4: Regenerate API snapshot (provider props are public surface).**

```bash
pnpm --filter @forkshop/engine regen-api-snap
```

Diff the snapshot — expect only the addition of `initialActivity`.

- [ ] **Step 5: Commit.**

```bash
git add packages/engine
git commit -m "feat(engine): add initialActivity prop to AgentActivityProvider"
```

---

# Phase 2b — Engine touch: `ForkshopCanvas` `initialZoom` / `initialPan`

**Why:** `/studio` shots need reproducible zoom/pan on `/demo`'s inner canvas so screenshots are pixel-stable.

### Task 2b.1: Failing test for `initialZoom` / `initialPan`

**Files:**
- Create: `packages/engine/src/components/canvas/forkshop-canvas.initial.test.tsx`

- [ ] **Step 1: Read existing canvas tests for setup pattern.**

```bash
cat packages/engine/src/components/canvas/node-view.test.ts | head -40
```

- [ ] **Step 2: Write failing test for the new props.**

Test approach: render `<ForkshopCanvas initialZoom={0.8} initialPan={{ x: -100, y: -50 }}>`, then assert the stage transform reflects the seeded values. Inspect via `data-testid` or the stage ref. Concrete shape depends on how `ForkshopCanvas` exposes its state — read `forkshop-canvas.tsx` to confirm whether zoom/pan live in component state or via a hook. Test should fail with "no such prop" before implementation.

```tsx
// packages/engine/src/components/canvas/forkshop-canvas.initial.test.tsx
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { createRef } from "react"
import { ForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { BUILTIN_NODE_TYPES } from "@forkshop/node-types"

describe("ForkshopCanvas initialZoom / initialPan", () => {
  it("starts with the given zoom and pan when props are provided", () => {
    const containerRef = createRef<HTMLDivElement>()
    const stageRef = createRef<HTMLDivElement>()
    render(
      <ForkshopCanvas
        containerRef={containerRef}
        stageRef={stageRef}
        stageWidth={1440}
        stageHeight={900}
        fitMode="width"
        nodeTypes={BUILTIN_NODE_TYPES}
        initialZoom={0.8}
        initialPan={{ x: -100, y: -50 }}
      >
        <div />
      </ForkshopCanvas>,
    )
    const transform = stageRef.current?.style.transform ?? ""
    expect(transform).toContain("scale(0.8)")
    expect(transform).toContain("translate(-100px, -50px)")
  })
})
```

- [ ] **Step 3: Run, confirm fail.**

```bash
pnpm --filter @forkshop/engine vitest run forkshop-canvas.initial.test.tsx
```

### Task 2b.2: Implement `initialZoom` / `initialPan`

**Files:**
- Modify: `packages/engine/src/components/canvas/forkshop-canvas.tsx`

- [ ] **Step 1: Read existing zoom/pan state.**

```bash
grep -n "zoom\|pan\|scale\|transform" packages/engine/src/components/canvas/forkshop-canvas.tsx | head -30
```

Find where zoom + pan are initialized (likely a `useState` or computed from container size). Add optional props that override the default initial values:

```tsx
type ForkshopCanvasProps = {
  // ... existing props
  initialZoom?: number
  initialPan?: { x: number; y: number }
}

// In the component:
const [zoom, setZoom] = useState(() => initialZoom ?? computeDefaultZoom(...))
const [pan, setPan]   = useState(() => initialPan  ?? computeDefaultPan(...))
```

Touch the minimum number of lines — the existing default-computation logic stays, only the initial values are overridable.

- [ ] **Step 2: Run the test.**

```bash
pnpm --filter @forkshop/engine vitest run forkshop-canvas.initial.test.tsx
```

If the transform string format differs from what the test expects, adjust the test assertion to match what `forkshop-canvas.tsx` actually writes — both forms are equivalent, the test should match reality.

- [ ] **Step 3: Run full engine test suite.**

```bash
pnpm --filter @forkshop/engine test
```

- [ ] **Step 4: Regen API snapshot.**

```bash
pnpm --filter @forkshop/engine regen-api-snap
```

- [ ] **Step 5: Commit.**

```bash
git add packages/engine
git commit -m "feat(engine): add initialZoom and initialPan props to ForkshopCanvas"
```

---

# Phase 2c — `/demo` showcase route

**Why:** Mount `ForkshopSidebar` + the four board views around the Layer 1 fake-app pages, with URL-driven state surface (selection / viewport / canvas zoom+pan / agent activity).

### Task 2c.1: Build `forkshop.config.tsx` and discovery setup

**Files:**
- Create: `apps/docs/app/demo/forkshop.config.tsx`
- Create: `apps/docs/app/demo/use-forkshop-positions.ts` (copy from `apps/demo/app/forkshop/use-forkshop-positions.ts`, adjust paths)

- [ ] **Step 1: Read `apps/demo/app/forkshop/forkshop.config.tsx` as the reference pattern.**

```bash
cat apps/demo/app/forkshop/forkshop.config.tsx
```

- [ ] **Step 2: Build the demo's config.**

```tsx
// apps/docs/app/demo/forkshop.config.tsx
import * as UIPrimitives from "./_components/ui"
import * as Blocks       from "./_components/blocks"
import tailwindConfig    from "../../tailwind.config"

export const forkshopConfig = {
  ui: UIPrimitives,
  blocks: Blocks,
  paths: {
    primitives: "apps/docs/app/demo/_components/ui",
    blocks: ["apps/docs/app/demo/_components/blocks"],
  },
  sitemap: {
    excludeGroups: [] as string[],
    autoDiscover: true,
  },
  reference: { contentPaths: [] as string[] },
  viewportProfile: "responsive" as "responsive" | "mobile",
  tailwindConfig,
} as const

export type ForkshopConfig = typeof forkshopConfig
```

- [ ] **Step 3: Copy `use-forkshop-positions.ts` from `apps/demo`.**

```bash
cp apps/demo/app/forkshop/use-forkshop-positions.ts apps/docs/app/demo/use-forkshop-positions.ts
```

- [ ] **Step 4: Ensure positions API routes exist in `apps/docs`.**

```bash
ls apps/docs/app/api/forkshop 2>/dev/null
```

If missing, copy the stubs from `apps/demo/app/api/forkshop/`:

```bash
cp -R apps/demo/app/api/forkshop apps/docs/app/api/
```

These are the same files Forkshop's CLI installs into user projects. `/api/forkshop/positions` (POST) and `/api/forkshop/edit` (POST, dev-only) must both exist.

- [ ] **Step 5: Create `positions.json` so the positions API has a place to write.**

```bash
touch apps/docs/app/demo/positions.json && echo '{}' > apps/docs/app/demo/positions.json
```

Verify positions API points at the right file (read the route stub — it usually reads `MOUNT/positions.json`).

- [ ] **Step 6: Commit.**

```bash
git add apps/docs/app/demo/forkshop.config.tsx apps/docs/app/demo/use-forkshop-positions.ts apps/docs/app/demo/positions.json apps/docs/app/api/forkshop
git commit -m "feat(demo): scaffold forkshop config, positions hook, API routes"
```

### Task 2c.2: Build the `/demo` page with URL-driven state

**Files:**
- Modify: `apps/docs/app/demo/page.tsx`
- Create: `apps/docs/app/demo/decode-url-state.ts`
- Create: `apps/docs/app/demo/decode-url-state.test.ts`

- [ ] **Step 1: Failing test for URL decoder.**

```ts
// apps/docs/app/demo/decode-url-state.test.ts
import { describe, it, expect } from "vitest"
import { decodeUrlState } from "./decode-url-state"

describe("decodeUrlState", () => {
  it("returns defaults for empty search string", () => {
    expect(decodeUrlState("")).toEqual({
      viewport: undefined,
      zoom: undefined,
      pan: undefined,
      agents: [],
    })
  })

  it("decodes viewport=responsive", () => {
    expect(decodeUrlState("?viewport=responsive").viewport).toBe("responsive")
  })

  it("decodes zoom and pan from numeric params", () => {
    const state = decodeUrlState("?zoom=0.8&panX=-100&panY=-50")
    expect(state.zoom).toBe(0.8)
    expect(state.pan).toEqual({ x: -100, y: -50 })
  })

  it("decodes comma-separated agents", () => {
    const state = decodeUrlState("?agents=file:components/blocks/hero.tsx,page:/about")
    expect(state.agents).toEqual([
      { kind: "file", path: "components/blocks/hero.tsx" },
      { kind: "page", path: "/about" },
    ])
  })
})
```

- [ ] **Step 2: Run, confirm fail.**

```bash
pnpm --filter docs exec vitest run decode-url-state.test.ts
```

(If docs doesn't have a vitest setup yet, install it:

```bash
pnpm --filter docs add -D vitest @vitest/ui
```

and add to `apps/docs/package.json` scripts: `"test": "vitest"`.)

- [ ] **Step 3: Implement `decode-url-state.ts`.**

```ts
// apps/docs/app/demo/decode-url-state.ts
export type AgentSeed =
  | { kind: "file"; path: string }
  | { kind: "page"; path: string }
  | { kind: "block"; slug: string }
  | { kind: "primitive"; id: string }

export interface DemoUrlState {
  viewport?: "responsive" | "mobile" | "single"
  zoom?: number
  pan?: { x: number; y: number }
  agents: AgentSeed[]
}

export function decodeUrlState(search: string): DemoUrlState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)

  const viewport = params.get("viewport") as DemoUrlState["viewport"] | null
  const zoomRaw  = params.get("zoom")
  const panX     = params.get("panX")
  const panY     = params.get("panY")
  const agentsRaw = params.get("agents")

  return {
    viewport: viewport ?? undefined,
    zoom: zoomRaw !== null ? Number(zoomRaw) : undefined,
    pan: panX !== null && panY !== null ? { x: Number(panX), y: Number(panY) } : undefined,
    agents: agentsRaw
      ? agentsRaw.split(",").map((entry) => {
          const [kind, rest] = entry.split(":")
          if (kind === "file" || kind === "page") return { kind, path: rest! }
          if (kind === "block") return { kind, slug: rest! }
          if (kind === "primitive") return { kind, id: rest! }
          throw new Error(`unknown agent kind: ${kind}`)
        })
      : [],
  }
}
```

- [ ] **Step 4: Run, confirm pass.**

```bash
pnpm --filter docs exec vitest run decode-url-state.test.ts
```

- [ ] **Step 5: Build `demo/page.tsx` modeled on `apps/demo/app/forkshop/page.tsx`.**

Copy `apps/demo/app/forkshop/page.tsx` as the base, adapt:

- Use `forkshopConfig` from `./forkshop.config`
- Wire URL state via `decodeUrlState(window.location.search)` at mount, passed to:
  - `AgentActivityProvider initialActivity={...mapped from agents...}`
  - `ForkshopCanvas initialZoom={zoom} initialPan={pan}` inside `PlaygroundBoard`
- Read viewport override at mount

The PlaygroundBoard from `apps/demo` is generic enough to copy verbatim.

- [ ] **Step 6: Build the `PlaygroundBoard` wrapper for `apps/docs/app/demo/`.**

```bash
cp apps/demo/app/forkshop/playground-board.tsx apps/docs/app/demo/playground-board.tsx
```

Adjust imports to local paths and pass through `initialZoom`/`initialPan`.

- [ ] **Step 7: Adapt boards too.** Copy `design-system.tsx`, `blocks.tsx`, `sitemap-board.tsx`, `ui-components.tsx`, `ui-components/*` from `apps/demo/app/forkshop/`, adjust imports.

- [ ] **Step 8: Verify `/demo` renders the showcase with chrome.**

```bash
pnpm --filter docs dev
```

Open `/demo`. Should see ForkshopSidebar on the left, Design System / UI Components / Blocks / Sitemap boards selectable. The Sitemap board's pages should render the fake-app routes built in Phase 1d.

- [ ] **Step 9: Verify URL state works.** Open:
  - `/demo?viewport=mobile` (forces mobile viewport profile)
  - `/demo?zoom=0.5&panX=0&panY=0` (canvas starts zoomed out)
  - `/demo?agents=block:hero` (hero block shows agent activity outline)

- [ ] **Step 10: Verify standalone fake-app pages still work.**

Open `/demo/site` — should show bare WAVECLASH landing, no chrome.

- [ ] **Step 11: Typecheck + lint + test.**

```bash
pnpm --filter docs typecheck && pnpm --filter docs lint && pnpm --filter docs test run
```

- [ ] **Step 12: Commit.**

```bash
git add apps/docs/app/demo
git commit -m "feat(demo): /demo showcase mounts forkshop chrome with URL-driven state surface"
```

**🟡 PHASE 2c GATE:** Show user `/demo` and each URL-param state working. Confirm before /studio.

---

# Phase 3 — `/studio` marketing canvas

**Why:** `/studio` is the marketing screenshot/video setup workshop. Itself a Forkshop installation; its sidebar lists marketing **boards**; each board is a canvas whose frames are iframes to `/demo` with specific URL-driven states.

### Task 3.1: `buildDemoUrl` helper + test

**Files:**
- Create: `apps/docs/app/studio/build-demo-url.ts`
- Create: `apps/docs/app/studio/build-demo-url.test.ts`
- Create: `apps/docs/app/studio/types.ts`

- [ ] **Step 1: Define types** (reusing `AgentSeed` from the demo's URL decoder so frame configs and URL state share one shape).

```ts
// apps/docs/app/studio/types.ts
import type { ForkshopSelection } from "@forkshop/engine"
import type { AgentSeed } from "../demo/decode-url-state"

export type { AgentSeed }

export interface DemoState {
  selection?: ForkshopSelection
  viewport?: "responsive" | "mobile" | "single"
  canvas?: { zoom?: number; pan?: { x: number; y: number } }
  agents?: AgentSeed[]
}

export interface StudioFrame {
  id: string
  x: number
  y: number
  width: number
  height: number
  demoState: DemoState
}

export interface StudioBoard {
  id: string
  title: string
  frames: StudioFrame[]
}
```

- [ ] **Step 2: Failing test for `buildDemoUrl`.**

```ts
// apps/docs/app/studio/build-demo-url.test.ts
import { describe, it, expect } from "vitest"
import { buildDemoUrl } from "./build-demo-url"

describe("buildDemoUrl", () => {
  it("returns /demo with no params for empty state", () => {
    expect(buildDemoUrl({})).toBe("/demo")
  })

  it("encodes viewport, zoom, pan", () => {
    expect(
      buildDemoUrl({
        viewport: "responsive",
        canvas: { zoom: 0.8, pan: { x: -100, y: -50 } },
      }),
    ).toBe("/demo?viewport=responsive&zoom=0.8&panX=-100&panY=-50")
  })

  it("encodes selection into the hash", () => {
    expect(
      buildDemoUrl({ selection: { kind: "block", slug: "hero" } }),
    ).toContain("#")
  })

  it("encodes agents as comma-separated entries", () => {
    expect(
      buildDemoUrl({
        agents: [
          { kind: "file", path: "components/blocks/hero.tsx" },
          { kind: "page", path: "/about" },
        ],
      }),
    ).toBe("/demo?agents=file:components/blocks/hero.tsx,page:/about")
  })
})
```

- [ ] **Step 3: Run, confirm fail.**

```bash
pnpm --filter docs exec vitest run build-demo-url.test.ts
```

- [ ] **Step 4: Implement `buildDemoUrl`.**

```ts
// apps/docs/app/studio/build-demo-url.ts
import { serializeSelection } from "@forkshop/engine"
import type { DemoState } from "./types"

export function buildDemoUrl(state: DemoState): string {
  const params = new URLSearchParams()
  if (state.viewport) params.set("viewport", state.viewport)
  if (state.canvas?.zoom != null) params.set("zoom", String(state.canvas.zoom))
  if (state.canvas?.pan) {
    params.set("panX", String(state.canvas.pan.x))
    params.set("panY", String(state.canvas.pan.y))
  }
  if (state.agents && state.agents.length > 0) {
    params.set(
      "agents",
      state.agents
        .map((a) =>
          a.kind === "block"     ? `block:${a.slug}`     :
          a.kind === "primitive" ? `primitive:${a.id}`   :
          `${a.kind}:${a.path}`,
        )
        .join(","),
    )
  }

  const search = params.toString()
  const hash   = state.selection ? serializeSelection(state.selection) : ""
  return `/demo${search ? `?${search}` : ""}${hash}`
}
```

- [ ] **Step 5: Run, confirm pass.**

```bash
pnpm --filter docs exec vitest run build-demo-url.test.ts
```

- [ ] **Step 6: Commit.**

```bash
git add apps/docs/app/studio
git commit -m "feat(studio): add buildDemoUrl helper + types"
```

### Task 3.2: First studio board — `hero-with-ai`

**Files:**
- Create: `apps/docs/app/studio/boards/hero-with-ai.ts`
- Create: `apps/docs/app/studio/boards/index.ts`

- [ ] **Step 1: Declare the first board as data.**

```ts
// apps/docs/app/studio/boards/hero-with-ai.ts
import type { StudioBoard } from "../types"

export const HERO_WITH_AI: StudioBoard = {
  id: "hero-with-ai",
  title: "Hero block, AI actively editing",
  frames: [
    {
      id: "main",
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      demoState: {
        selection: { kind: "block", slug: "hero" },
        viewport: "responsive",
        canvas: { zoom: 0.8, pan: { x: -100, y: -50 } },
        agents: [{ kind: "file", path: "apps/docs/app/demo/_components/blocks/hero.tsx" }],
      },
    },
  ],
}
```

- [ ] **Step 2: Build the board index.**

```ts
// apps/docs/app/studio/boards/index.ts
import { HERO_WITH_AI } from "./hero-with-ai"
import type { StudioBoard } from "../types"

export const STUDIO_BOARDS: StudioBoard[] = [HERO_WITH_AI]
```

- [ ] **Step 3: Commit.**

```bash
git add apps/docs/app/studio/boards
git commit -m "feat(studio): add hero-with-ai board"
```

### Task 3.3: `/studio` page — sidebar + canvas + iframe frames

**Files:**
- Modify: `apps/docs/app/studio/page.tsx`
- Create: `apps/docs/app/studio/studio-frame.tsx`

- [ ] **Step 1: Build the frame renderer.**

```tsx
// apps/docs/app/studio/studio-frame.tsx
"use client"

import type { StudioFrame } from "./types"
import { buildDemoUrl } from "./build-demo-url"

export function StudioFrame({ frame }: { frame: StudioFrame }) {
  return (
    <iframe
      src={buildDemoUrl(frame.demoState)}
      style={{ width: frame.width, height: frame.height, border: "1px solid #ddd" }}
      title={frame.id}
    />
  )
}
```

- [ ] **Step 2: Rewrite `studio/page.tsx` as a server wrapper (metadata-only) and build the client in a sibling file.** This split is required because `export const metadata` cannot coexist with `"use client"` in the same module.

```tsx
// apps/docs/app/studio/page.tsx (server component)
import { StudioClient } from "./studio-client"

export const metadata = { robots: { index: false, follow: false } }

export default function StudioPage() {
  return <StudioClient />
}
```

```tsx
// apps/docs/app/studio/studio-client.tsx (client component)
"use client"

import { useEffect, useState } from "react"
import {
  ForkshopSidebar,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
} from "@forkshop/engine"
import { STUDIO_BOARDS } from "./boards"
import { StudioFrame } from "./studio-frame"

const DEFAULT_SELECTION: ForkshopSelection = {
  kind: "block",
  slug: STUDIO_BOARDS[0]?.id ?? "hero-with-ai",
}

export function StudioClient() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)

  useEffect(() => {
    const fromHash = parseSelection(window.location.hash)
    if (fromHash) setSelection(fromHash)
  }, [])

  useEffect(() => {
    const next = serializeSelection(selection)
    if (window.location.hash !== next) window.history.replaceState({}, "", next)
  }, [selection])

  const activeBoard =
    (selection.kind === "block" && STUDIO_BOARDS.find((b) => b.id === selection.slug)) ||
    STUDIO_BOARDS[0]

  return (
    <div className="flex h-screen overflow-hidden">
      <ForkshopSidebar
        selection={selection}
        onSelect={setSelection}
        sections={[
          {
            id: "boards",
            title: "Boards",
            entryKind: "block",
            entries: STUDIO_BOARDS.map((b) => ({ slug: b.id, name: b.title })),
          },
        ]}
        routes={[]}
      />
      <div className="relative flex flex-1 overflow-hidden bg-neutral-50">
        {activeBoard && (
          <div className="relative w-full h-full">
            {activeBoard.frames.map((frame) => (
              <div
                key={frame.id}
                style={{
                  position: "absolute",
                  left: frame.x,
                  top: frame.y,
                }}
              >
                <StudioFrame frame={frame} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

Note: this version positions frames absolutely (simplest possible). Wrapping in `<ForkshopCanvas>` with pan/zoom + position persistence is a follow-up — get the basic flow working first.

- [ ] **Step 3: Skip — incorporated into Step 2.**

- [ ] **Step 4: Verify end-to-end.**

```bash
pnpm --filter docs dev
```

Open `/studio`. Should show ForkshopSidebar with one entry ("Hero block, AI actively editing"), and an iframe of `/demo` configured per the board.

Verify:
  - iframe shows `/demo` with selection = hero block
  - viewport profile is responsive
  - canvas inside `/demo` is zoomed/panned per the board
  - agent activity outline appears on the Hero block

- [ ] **Step 5: Typecheck + lint + test.**

```bash
pnpm --filter docs typecheck && pnpm --filter docs lint && pnpm --filter docs test run
```

- [ ] **Step 6: Commit.**

```bash
git add apps/docs/app/studio
git commit -m "feat(studio): /studio mounts forkshop sidebar + canvas + iframe boards"
```

### Task 3.4: Add 2-3 starter boards

**Files:**
- Create: `apps/docs/app/studio/boards/pricing-responsive.ts` (or whatever fits the WAVECLASH pages — likely `schedule-responsive.ts` or `lineup-responsive.ts`)
- Create: `apps/docs/app/studio/boards/design-system-overview.ts`
- Create: `apps/docs/app/studio/boards/blocks-gallery.ts`
- Modify: `apps/docs/app/studio/boards/index.ts`

- [ ] **Step 1: Add a "Schedule, 3 viewports" board.**

```ts
// apps/docs/app/studio/boards/schedule-responsive.ts
import type { StudioBoard } from "../types"

export const SCHEDULE_RESPONSIVE: StudioBoard = {
  id: "schedule-responsive",
  title: "Schedule page, 3 viewports",
  frames: [
    {
      id: "main",
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      demoState: {
        selection: { kind: "page", path: "/site/schedule" },
        viewport: "responsive",
      },
    },
  ],
}
```

Adjust the `selection.path` to match an actual page route built in Phase 1d.

- [ ] **Step 2: Add a "Design system" board.**

```ts
// apps/docs/app/studio/boards/design-system-overview.ts
import type { StudioBoard } from "../types"

export const DESIGN_SYSTEM_OVERVIEW: StudioBoard = {
  id: "design-system-overview",
  title: "Design system tokens overview",
  frames: [
    {
      id: "main",
      x: 0, y: 0,
      width: 1440, height: 900,
      demoState: {
        selection: { kind: "section", sectionId: "design-system" },
        agents: [{ kind: "file", path: "apps/docs/app/demo/tailwind.config.ts" }],
      },
    },
  ],
}
```

- [ ] **Step 3: Add a "Blocks gallery" board.**

```ts
// apps/docs/app/studio/boards/blocks-gallery.ts
import type { StudioBoard } from "../types"

export const BLOCKS_GALLERY: StudioBoard = {
  id: "blocks-gallery",
  title: "Blocks gallery",
  frames: [
    {
      id: "main",
      x: 0, y: 0,
      width: 1440, height: 900,
      demoState: {
        selection: { kind: "section", sectionId: "blocks" },
      },
    },
  ],
}
```

- [ ] **Step 4: Update the boards barrel.**

```ts
// apps/docs/app/studio/boards/index.ts
import { HERO_WITH_AI }            from "./hero-with-ai"
import { SCHEDULE_RESPONSIVE }     from "./schedule-responsive"
import { DESIGN_SYSTEM_OVERVIEW }  from "./design-system-overview"
import { BLOCKS_GALLERY }          from "./blocks-gallery"
import type { StudioBoard } from "../types"

export const STUDIO_BOARDS: StudioBoard[] = [
  HERO_WITH_AI,
  SCHEDULE_RESPONSIVE,
  DESIGN_SYSTEM_OVERVIEW,
  BLOCKS_GALLERY,
]
```

- [ ] **Step 5: Verify all 4 boards selectable and render correctly.**

```bash
pnpm --filter docs dev
```

Open `/studio`, click through each sidebar entry, confirm the iframe loads `/demo` in the expected state for each.

- [ ] **Step 6: Commit.**

```bash
git add apps/docs/app/studio/boards
git commit -m "feat(studio): add starter marketing boards"
```

**🟡 PHASE 3 GATE:** Walk the user through `/studio` and take a real screenshot of one board's iframe. Marketing pipeline now works end-to-end.

---

# Final checks

### Task F.1: Workspace-wide validation

- [ ] **Step 1: Run the workspace check.**

```bash
pnpm check
```

Expected: typecheck + lint pass across all workspaces.

- [ ] **Step 2: Run all tests.**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 3: Build the docs app to make sure prod builds work.**

```bash
pnpm --filter docs build
```

Expected: build succeeds, no errors. `/demo` and `/studio` appear in the built output.

- [ ] **Step 4: Manual prod smoke.**

```bash
pnpm --filter docs start
```

Open in another terminal: `/`, `/docs`, `/demo`, `/demo/site`, `/studio`. All should render correctly in prod mode. Agent activity state seeded from URL on `/demo?agents=...` should be visible (the EventSource short-circuit in prod doesn't apply to `initialActivity`).

### Task F.2: Update CLAUDE.md if anything load-bearing changed

- [ ] **Step 1: Skim `CLAUDE.md`** for facts that this work invalidates (e.g. apps/docs structure, route layout).

- [ ] **Step 2: Update relevant sections.** Likely additions:
  - Note `/demo` and `/studio` in the "Public docs site" section
  - Mention demo's isolated Tailwind scope pattern if it'd help future maintainers

- [ ] **Step 3: Commit.**

```bash
git add CLAUDE.md
git commit -m "docs: note /demo and /studio in maintainer guide"
```

### Task F.3: Optional — brand-path move

If you decide to move fake-app pages from `/demo/site/*` to `/[brand-name]/*` (e.g. `/waveclash/*`) for a more authentic feel, do this as a separate small task:

- [ ] **Step 1:** `git mv apps/docs/app/demo/site apps/docs/app/waveclash`
- [ ] **Step 2:** Update `forkshop.config.tsx` `sitemap` to point at the new path
- [ ] **Step 3:** Update any studio boards that referenced `/site/*` to use `/waveclash/*`
- [ ] **Step 4:** Verify `/waveclash`, `/waveclash/<inner>`, `/demo`, `/studio` all still work
- [ ] **Step 5:** Commit

---

# Notes for the implementing agent

- **Don't skip the review gates.** Phase 1 (a→e) is design work; the user must confirm visual fidelity at each pass. Implementing all five passes without review will produce work that needs to be redone.
- **Pencil MCP is the primary research tool for Phase 1.** Always sample before committing to colors/sizes/spacing. Never invent values "to look about right."
- **Engine touches in Phase 2 are tiny.** `initialActivity` and `initialZoom`/`initialPan` are each ~5 lines. The tests are the larger artifact. Resist the urge to refactor surrounding code.
- **The `apps/demo/app/forkshop/` tree is your reference for Layer 2.** Copy verbatim where possible, adapt only paths.
- **Frequent commits.** Each task ends with a commit. Don't squash phases — the per-task commits make it easy to bisect or roll back a misstep.
- **`pnpm check` and `pnpm test` after every phase.** Catches drift early.
