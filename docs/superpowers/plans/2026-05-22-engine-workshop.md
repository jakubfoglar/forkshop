# Engine Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/engine-workshop` — a new Next.js app hosting a single Forkshop instance whose only purpose is iterating on Forkshop engine chrome (sidebar, canvas frame, agent indicators, edit popover) and engine design tokens. Five boards, multi-agent color showcase, HMR-driven, not deployed.

**Architecture:** New workspace package at `apps/engine-workshop` mirroring `apps/demo`'s shape (Next.js 14, Tailwind 3.4, the same `@locator/webpack-loader` dev wiring, the same engine-fonts copy script). The app's root layout mounts an `AgentActivityProvider` with `subscribeToStream={false}` plus seeded mock `ActivityEntry` data (all `pinned: true` so it never expires). The page mounts `ForkshopSidebar` + a dispatch chain to five boards. Internal engine chrome (`NodeFrame`, `EditPopover`, `FloatingControls`) is never imported directly — it surfaces through real `ForkshopCanvas` mounts. No new `@forkshop/engine` exports.

**Tech Stack:** Next.js 14, React 18, TypeScript 5.5, Tailwind 3.4, pnpm workspace.

**Testing note:** This is UI scaffolding, not logic. There are no unit tests in this plan. TypeScript catches shape errors at build time; the rest is browser acceptance against the spec at the end. Don't add tests "for completeness" — the acceptance run in Task 12 is the verification.

---

## File structure

```
apps/engine-workshop/
  package.json
  next.config.mjs
  tsconfig.json
  tailwind.config.ts
  postcss.config.mjs
  .gitignore
  scripts/
    copy-engine-fonts.mjs        # postinstall; mirrors apps/demo
  app/
    layout.tsx                   # root html/body + AgentActivityProvider mount
    page.tsx                     # ForkshopSidebar + board dispatch
    globals.css                  # imports @forkshop/engine/forkshop.css
  src/
    mock-data.ts                 # MOCK_AGENTS, MOCK_FILE_MAP, MOCK_ACTIVITY, MOCK_PAGE_TREE, etc.
    boards/
      design-system.tsx
      sidebar.tsx
      agent-indicators.tsx
      canvas-frame.tsx
      edit-popover.tsx
```

Touched outside the new app:
- `package.json` (root): add `workshop` script alias

No other workspace files change.

---

## Task 1: Scaffold package skeleton

**Files:**
- Create: `apps/engine-workshop/package.json`
- Create: `apps/engine-workshop/.gitignore`
- Create: `apps/engine-workshop/tsconfig.json`
- Create: `apps/engine-workshop/next.config.mjs`
- Create: `apps/engine-workshop/tailwind.config.ts`
- Create: `apps/engine-workshop/postcss.config.mjs`
- Create: `apps/engine-workshop/eslint.config.mjs`

- [ ] **Step 1: Create `apps/engine-workshop/package.json`**

```json
{
  "name": "@forkshop/engine-workshop",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "postinstall": "node scripts/copy-engine-fonts.mjs",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint app src --ext .ts,.tsx"
  },
  "dependencies": {
    "@forkshop/engine": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@locator/webpack-loader": "^0.5.1",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

- [ ] **Step 2: Create `apps/engine-workshop/.gitignore`**

```
# Copied at install time by scripts/copy-engine-fonts.mjs
public/fonts/

# Next.js
.next/
out/

# pnpm / node
node_modules/

# Local env
.env.local
.env*.local

# Mac
.DS_Store

# TypeScript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 3: Create `apps/engine-workshop/tsconfig.json`**

Mirror apps/demo's, but drop the `@forkshop/*` path alias — the workshop must consume only the public `@forkshop/engine` surface, not engine internals.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@workshop/*": ["./src/*"]
    },
    "incremental": true,
    "allowJs": true,
    "noEmit": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `apps/engine-workshop/next.config.mjs`**

Same shape as apps/demo so `Option+click` from `EditorLink` jumps to source.

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.module.rules.push({
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: ["@locator/webpack-loader"],
      })
    }
    return config
  },
}

export default nextConfig
```

- [ ] **Step 5: Create `apps/engine-workshop/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
}

export default config
```

- [ ] **Step 6: Create `apps/engine-workshop/postcss.config.mjs`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 7: Create `apps/engine-workshop/eslint.config.mjs`**

Mirror apps/demo's — the root flat config doesn't auto-apply to subpackages without an explicit config file in the package.

```js
import tseslint from "typescript-eslint"

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**"] },
)
```

- [ ] **Step 8: Commit**

```bash
git add apps/engine-workshop/package.json apps/engine-workshop/.gitignore apps/engine-workshop/tsconfig.json apps/engine-workshop/next.config.mjs apps/engine-workshop/tailwind.config.ts apps/engine-workshop/postcss.config.mjs apps/engine-workshop/eslint.config.mjs
git commit -m "feat(engine-workshop): scaffold workspace package skeleton"
```

---

## Task 2: Engine-fonts copy script and install

**Files:**
- Create: `apps/engine-workshop/scripts/copy-engine-fonts.mjs`

- [ ] **Step 1: Create the copy script**

Identical contents to apps/demo's. Verbatim copy — don't try to dedupe via a workspace helper for v1.

```js
// apps/engine-workshop/scripts/copy-engine-fonts.mjs
import { mkdir, copyFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"
import { existsSync } from "node:fs"

const require = createRequire(import.meta.url)

// Resolve the engine package root. Try the main entry (post-build state),
// then fall back to the workspace path (fresh-clone state, no dist/ yet).
let pkgRoot
try {
  const engineMain = require.resolve("@forkshop/engine")
  pkgRoot = dirname(dirname(engineMain))
} catch {
  pkgRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../../packages/engine")
}

let src
const distFont = resolve(pkgRoot, "dist/fonts/RaveoVF.woff2")
const srcFont = resolve(pkgRoot, "fonts/raveo/RaveoVF.woff2")

if (existsSync(distFont)) {
  src = distFont
} else {
  src = srcFont
}

if (!existsSync(src)) {
  console.error(`copy-engine-fonts: source font not found at ${src}`)
  process.exit(1)
}

const dest = resolve("public/fonts/forkshop/RaveoVF.woff2")
await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
console.log(`✓ copied RaveoVF.woff2 → ${dest}`)
```

- [ ] **Step 2: Run install at workspace root**

```bash
pnpm install
```

Expected: pnpm picks up the new `apps/engine-workshop` package (workspace root pattern `apps/*`), installs deps, runs the postinstall script. Output ends with `✓ copied RaveoVF.woff2 → .../public/fonts/forkshop/RaveoVF.woff2`.

- [ ] **Step 3: Sanity-check the font landed**

```bash
ls apps/engine-workshop/public/fonts/forkshop/
```

Expected: `RaveoVF.woff2`

- [ ] **Step 4: Commit**

```bash
git add apps/engine-workshop/scripts/copy-engine-fonts.mjs pnpm-lock.yaml
git commit -m "feat(engine-workshop): copy engine fonts at install time"
```

---

## Task 3: Minimal app shell — layout + globals + sentinel page

This task gets `pnpm dev` running with a placeholder page. No Forkshop chrome yet — that comes in Task 5.

**Files:**
- Create: `apps/engine-workshop/app/globals.css`
- Create: `apps/engine-workshop/app/layout.tsx`
- Create: `apps/engine-workshop/app/page.tsx`

- [ ] **Step 1: Create `app/globals.css`**

```css
@import "@forkshop/engine/forkshop.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Create `app/layout.tsx`**

```tsx
import "./globals.css"

export const metadata = { title: "Forkshop Engine Workshop" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-forkshop-surface text-forkshop-fg antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create sentinel `app/page.tsx`**

```tsx
export default function Page() {
  return (
    <main className="p-forkshop-4">
      <h1 className="text-display-lg">Forkshop Engine Workshop</h1>
      <p className="text-forkshop-fg-muted">Workshop boots. Replace this with the chrome mount in Task 5.</p>
    </main>
  )
}
```

- [ ] **Step 4: Boot dev and verify**

```bash
pnpm --filter @forkshop/engine-workshop dev
```

Expected:
- Next.js compiles without errors
- Console shows the URL it picked (e.g. `Local: http://localhost:3000` or whatever's free)
- Visiting the URL shows "Forkshop Engine Workshop" rendered using the Raveo font (i.e. the `text-display-lg` class is actually styled, not falling back to system font)

Stop the dev server (Ctrl-C) once verified.

- [ ] **Step 5: Commit**

```bash
git add apps/engine-workshop/app
git commit -m "feat(engine-workshop): minimal app shell with engine CSS imported"
```

---

## Task 4: Mock data

This is the single source of truth for the multi-agent showcase across boards 2, 3, 4.

**Files:**
- Create: `apps/engine-workshop/src/mock-data.ts`

- [ ] **Step 1: Create `src/mock-data.ts`**

```ts
// Static mock data shared across workshop boards. Everything here is
// deliberately frozen — no network, no fs reads, no subscriptions. The
// outer AgentActivityProvider seeds `MOCK_ACTIVITY` with `pinned: true` so
// entries never expire.

import type {
  ActivityEntry,
  FileMap,
  SidebarSection,
} from "@forkshop/engine"

// ---------------------------------------------------------------------------
// Agents — stable identities used across boards 2, 3, 4
// ---------------------------------------------------------------------------

export type MockAgent = {
  id: string
  label: string
  color: string
  sessionId: string
}

export const MOCK_AGENTS: readonly MockAgent[] = [
  { id: "claude",   label: "Claude",   color: "#9F62F5", sessionId: "mock-claude-1" },
  { id: "gpt",      label: "GPT-5",    color: "#10A37F", sessionId: "mock-gpt-1" },
  { id: "gemini",   label: "Gemini",   color: "#4285F4", sessionId: "mock-gemini-1" },
  { id: "deepseek", label: "DeepSeek", color: "#E94B33", sessionId: "mock-deepseek-1" },
  { id: "cursor",   label: "Cursor",   color: "#F59E0B", sessionId: "mock-cursor-1" },
]

// ---------------------------------------------------------------------------
// File map — mock primitives, blocks, page routes
// ---------------------------------------------------------------------------

export const MOCK_PRIMITIVES = [
  { id: "button", sourcePath: "components/ui/button.tsx" },
  { id: "badge",  sourcePath: "components/ui/badge.tsx" },
  { id: "input",  sourcePath: "components/ui/input.tsx" },
] as const

export const MOCK_BLOCKS = [
  { slug: "hero",         sourcePath: "components/blocks/hero.tsx" },
  { slug: "pricing",      sourcePath: "components/blocks/pricing.tsx" },
  { slug: "cta",          sourcePath: "components/blocks/cta.tsx" },
  { slug: "feature-grid", sourcePath: "components/blocks/feature-grid.tsx" },
] as const

export const MOCK_PAGE_ROUTES: readonly string[] = [
  "/",
  "/about",
  "/pricing",
  "/products",
  "/products/widget",
  "/products/gadget",
  "/blog",
  "/blog/launch",
  "/contact",
]

export const MOCK_FILE_MAP: FileMap = {
  primitives: [...MOCK_PRIMITIVES],
  blocks: [...MOCK_BLOCKS],
}

// ---------------------------------------------------------------------------
// Activity entries — the union seeded into the outer provider.
// All `pinned: true` so the engine's idle-prune doesn't drop them.
// ---------------------------------------------------------------------------

function makeEntry(args: {
  agent: MockAgent
  filePath: string
  action?: ActivityEntry["action"]
}): ActivityEntry {
  return {
    filePath: args.filePath,
    agent: args.agent.id,
    agentLabel: args.agent.label,
    sessionId: args.agent.sessionId,
    color: args.agent.color,
    action: args.action ?? "read",
    lastSeenAt: Date.now(),
    pinned: true,
  }
}

// Helper: pick an agent by index with a clear name at the call site.
const claude   = MOCK_AGENTS[0]!
const gpt      = MOCK_AGENTS[1]!
const gemini   = MOCK_AGENTS[2]!
const deepseek = MOCK_AGENTS[3]!
const cursor   = MOCK_AGENTS[4]!

export const MOCK_ACTIVITY: readonly ActivityEntry[] = [
  // Multi-agent fan-out across blocks
  makeEntry({ agent: claude,   filePath: "components/blocks/hero.tsx",         action: "edit" }),
  makeEntry({ agent: gpt,      filePath: "components/blocks/pricing.tsx",      action: "read" }),
  makeEntry({ agent: gemini,   filePath: "components/blocks/cta.tsx",          action: "edit" }),
  makeEntry({ agent: deepseek, filePath: "components/blocks/feature-grid.tsx", action: "read" }),

  // Same-target collision — two agents on the same file
  makeEntry({ agent: cursor,   filePath: "components/blocks/hero.tsx",         action: "read" }),

  // Page-level activity
  makeEntry({ agent: claude,   filePath: "app/about/page.tsx",                 action: "edit" }),
  makeEntry({ agent: gpt,      filePath: "app/products/widget/page.tsx",       action: "read" }),

  // Primitive activity
  makeEntry({ agent: gemini,   filePath: "components/ui/button.tsx",           action: "edit" }),
]

// ---------------------------------------------------------------------------
// Sidebar trees — for board 2 (mock sidebar variants)
// ---------------------------------------------------------------------------

/** Realistic small-app tree. */
export const MOCK_SIDEBAR_ROUTES_FLAT: readonly string[] = [
  "/",
  "/about",
  "/pricing",
  "/contact",
]

/** Stress test — deep nesting and many siblings. */
export const MOCK_SIDEBAR_ROUTES_DEEP: readonly string[] = [
  "/",
  "/about",
  "/products",
  "/products/widget",
  "/products/widget/specs",
  "/products/widget/reviews",
  "/products/gadget",
  "/products/gadget/specs",
  "/blog",
  "/blog/launch",
  "/blog/2026-roadmap",
  "/blog/changelog",
  "/contact",
]

/** Section list used by every variant's nested sidebar. */
export const MOCK_SIDEBAR_SECTIONS: readonly SidebarSection[] = [
  {
    id: "design-system",
    title: "Design System",
  },
  {
    id: "blocks",
    title: "Blocks",
    entryKind: "block",
    entries: MOCK_BLOCKS.map((b) => ({ slug: b.slug, name: b.slug })),
  },
]
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @forkshop/engine-workshop typecheck
```

Expected: PASS. If types don't resolve from `@forkshop/engine`, the engine workspace dep wasn't linked correctly — go back to Task 2.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-workshop/src/mock-data.ts
git commit -m "feat(engine-workshop): mock data — agents, file map, activity, sidebar trees"
```

---

## Task 5: Wire the Forkshop chrome mount with empty board placeholders

This is the big structural commit — `app/page.tsx` becomes the real mount. Board components are stubs that render their name; real content comes in Tasks 6-10.

**Files:**
- Modify: `apps/engine-workshop/app/layout.tsx` (add `EditorLink` and `AgentActivityProvider`)
- Modify: `apps/engine-workshop/app/page.tsx` (replace sentinel with chrome mount)
- Create: `apps/engine-workshop/src/boards/design-system.tsx` (stub)
- Create: `apps/engine-workshop/src/boards/sidebar.tsx` (stub)
- Create: `apps/engine-workshop/src/boards/agent-indicators.tsx` (stub)
- Create: `apps/engine-workshop/src/boards/canvas-frame.tsx` (stub)
- Create: `apps/engine-workshop/src/boards/edit-popover.tsx` (stub)

- [ ] **Step 1: Rewrite `app/layout.tsx` with provider mount**

```tsx
import "./globals.css"
import { AgentActivityProvider, EditorLink } from "@forkshop/engine"
import { MOCK_ACTIVITY, MOCK_FILE_MAP } from "@workshop/mock-data"

export const metadata = { title: "Forkshop Engine Workshop" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-forkshop-surface text-forkshop-fg antialiased">
        <EditorLink mountPath="/" />
        <AgentActivityProvider
          fileMap={MOCK_FILE_MAP}
          initialActivity={MOCK_ACTIVITY}
          subscribeToStream={false}
        >
          {children}
        </AgentActivityProvider>
      </body>
    </html>
  )
}
```

`subscribeToStream={false}` is critical — without it, the provider tries to open `/api/forkshop/agent-activity/stream` which doesn't exist in the workshop.

- [ ] **Step 2: Create 5 stub board files**

Each file is the same shape — just changes the heading. Showing one as the template; create all five with the appropriate string substitution.

`apps/engine-workshop/src/boards/design-system.tsx`:

```tsx
"use client"

export function DesignSystemBoard() {
  return (
    <div className="h-full w-full overflow-auto p-forkshop-4">
      <h2 className="text-display-md">Engine design system</h2>
      <p className="text-forkshop-fg-muted">Wired in Task 6.</p>
    </div>
  )
}
```

Create the other four with these exports and headings:
- `sidebar.tsx` → `SidebarBoard` / heading "Sidebar"
- `agent-indicators.tsx` → `AgentIndicatorsBoard` / heading "Agent indicators"
- `canvas-frame.tsx` → `CanvasFrameBoard` / heading "Canvas frame"
- `edit-popover.tsx` → `EditPopoverBoard` / heading "Edit popover"

Each follows the exact same JSX template — just the export name and h2 text change.

- [ ] **Step 3: Rewrite `app/page.tsx` with sidebar + dispatch**

```tsx
"use client"

import { useEffect, useState } from "react"
import {
  ForkshopSidebar,
  AgentSelectionChip,
  forkshopIcons,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
} from "@forkshop/engine"
import { DesignSystemBoard } from "@workshop/boards/design-system"
import { SidebarBoard } from "@workshop/boards/sidebar"
import { AgentIndicatorsBoard } from "@workshop/boards/agent-indicators"
import { CanvasFrameBoard } from "@workshop/boards/canvas-frame"
import { EditPopoverBoard } from "@workshop/boards/edit-popover"

const SECTIONS = [
  { id: "engine-design-system",    title: "Engine design system", icon: forkshopIcons.designSystem },
  { id: "engine-sidebar",          title: "Sidebar",              icon: forkshopIcons.navigation },
  { id: "engine-agent-indicators", title: "Agent indicators",     icon: forkshopIcons.sitemap },
  { id: "engine-canvas-frame",     title: "Canvas frame",         icon: forkshopIcons.components },
  { id: "engine-edit-popover",     title: "Edit popover",         icon: forkshopIcons.flows },
] as const

const DEFAULT_SELECTION: ForkshopSelection = {
  kind: "section",
  sectionId: "engine-design-system",
}

export default function WorkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const fromHash = parseSelection(window.location.hash)
    if (fromHash) setSelection(fromHash)
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    const next = serializeSelection(selection)
    if (window.location.hash !== next) {
      window.history.replaceState({}, "", next)
    }
  }, [selection, hasHydrated])

  return (
    <div
      className="fixed inset-0 z-[9999] flex overflow-hidden bg-forkshop-surface text-forkshop-fg"
      data-forkshop-mount
    >
      <ForkshopSidebar
        selection={selection}
        onSelect={setSelection}
        sections={SECTIONS.map((s) => ({ id: s.id, title: s.title, icon: s.icon }))}
        routes={[]}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <AgentSelectionChip />
        {selection.kind === "section" && selection.sectionId === "engine-design-system" && (
          <DesignSystemBoard />
        )}
        {selection.kind === "section" && selection.sectionId === "engine-sidebar" && (
          <SidebarBoard />
        )}
        {selection.kind === "section" && selection.sectionId === "engine-agent-indicators" && (
          <AgentIndicatorsBoard />
        )}
        {selection.kind === "section" && selection.sectionId === "engine-canvas-frame" && (
          <CanvasFrameBoard />
        )}
        {selection.kind === "section" && selection.sectionId === "engine-edit-popover" && (
          <EditPopoverBoard />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Boot dev and verify all 5 sections route**

```bash
pnpm --filter @forkshop/engine-workshop dev
```

In the browser:
- Sidebar shows 5 sections with icons
- Clicking each section swaps the right-hand area to the matching stub board heading ("Engine design system" / "Sidebar" / "Agent indicators" / "Canvas frame" / "Edit popover")
- URL hash updates as you click between sections (e.g. `#engine-sidebar`)
- No console errors

Stop dev (Ctrl-C).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm --filter @forkshop/engine-workshop typecheck
git add apps/engine-workshop/app apps/engine-workshop/src/boards
git commit -m "feat(engine-workshop): mount sidebar + dispatch with stub boards"
```

---

## Task 6: Board 1 — Engine Design System

Renders engine CSS vars via `ColorGraph`, engine type rules via a typography sample, and the engine's icon set as a grid.

**Files:**
- Modify: `apps/engine-workshop/src/boards/design-system.tsx`

- [ ] **Step 1: Implement `DesignSystemBoard`**

```tsx
"use client"

import { useEffect, useState } from "react"
import {
  ColorGraph,
  ForkshopIcon,
  forkshopIcons,
  type TokenRegistry,
  type TokenEntry,
} from "@forkshop/engine"

// The 11 --forkshop-* CSS vars defined in packages/engine/tailwind/forkshop.css.
// Each is read at runtime from document.documentElement via getComputedStyle —
// must run client-side because SSR has no computed styles.
const ENGINE_COLOR_VARS = [
  "--forkshop-surface",
  "--forkshop-surface-2",
  "--forkshop-fg",
  "--forkshop-fg-muted",
  "--forkshop-border",
  "--forkshop-border-strong",
  "--forkshop-accent",
  "--forkshop-accent-fg",
  "--forkshop-warning",
  "--forkshop-error",
  "--forkshop-success",
] as const

const EMPTY_REGISTRY: TokenRegistry = {
  colors: [],
  spacing: [],
  fontSizes: [],
  fontWeights: [],
  radii: [],
  shadows: [],
  containers: [],
  classLookup: {},
}

function readEngineTokenRegistry(): TokenRegistry {
  if (typeof window === "undefined") return EMPTY_REGISTRY
  const computed = getComputedStyle(document.documentElement)
  const colors: TokenEntry[] = ENGINE_COLOR_VARS.map((name) => ({
    kind: "color",
    name,
    hex: computed.getPropertyValue(name).trim() || "#000000",
    isSemantic: true,
    family: "forkshop",
  }))
  return { ...EMPTY_REGISTRY, colors }
}

// `TokenEntry` for `kind: "color"` requires `{ name, hex, isSemantic, family }`.
// `TokenRegistry` is bucket-shaped with one array per token category plus a
// `classLookup` Record. Verify these field names by reading
// `packages/engine/src/lib/token-registry.ts` if ColorGraph rejects the shape.

const DISPLAY_SAMPLES = [
  { className: "text-display-2xl", label: "display-2xl" },
  { className: "text-display-xl",  label: "display-xl" },
  { className: "text-display-lg",  label: "display-lg" },
  { className: "text-display-md",  label: "display-md" },
  { className: "text-display-sm",  label: "display-sm" },
] as const

const BODY_SAMPLES = [
  { className: "text-lg",   label: "lg" },
  { className: "text-base", label: "base" },
  { className: "text-sm",   label: "sm" },
  { className: "text-xs",   label: "xs" },
] as const

const SAMPLE_TEXT = "The Forkshop chrome — sidebar, canvas, agent indicators."

function TypographySamples() {
  return (
    <div className="flex flex-col gap-forkshop-4 bg-white p-forkshop-4 shadow-md">
      <section className="flex flex-col gap-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          Display
        </span>
        {DISPLAY_SAMPLES.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-forkshop-0.5">
            <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">
              {sample.label}
            </span>
            <span className={`${sample.className} text-forkshop-fg`}>Forkshop</span>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          Body
        </span>
        {BODY_SAMPLES.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-forkshop-0.5">
            <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">
              {sample.label}
            </span>
            <span className={`${sample.className} text-forkshop-fg`}>{SAMPLE_TEXT}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

function IconGrid() {
  return (
    <div className="grid grid-cols-6 gap-forkshop-3 bg-white p-forkshop-4 shadow-md">
      {Object.entries(forkshopIcons).map(([name, Icon]) => (
        <div key={name} className="flex flex-col items-center gap-forkshop-1">
          <ForkshopIcon icon={Icon} className="h-6 w-6 text-forkshop-fg" />
          <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">{name}</span>
        </div>
      ))}
    </div>
  )
}

export function DesignSystemBoard() {
  // Read tokens client-side after mount — getComputedStyle requires DOM.
  const [tokens, setTokens] = useState<TokenRegistry>(EMPTY_REGISTRY)
  useEffect(() => {
    setTokens(readEngineTokenRegistry())
  }, [])

  return (
    <div className="h-full w-full overflow-auto p-forkshop-4">
      <div className="flex flex-col gap-forkshop-6">
        <section>
          <h2 className="mb-forkshop-3 text-display-sm text-forkshop-fg">Colors</h2>
          <ColorGraph tokens={tokens} />
        </section>
        <section className="max-w-xl">
          <h2 className="mb-forkshop-3 text-display-sm text-forkshop-fg">Typography</h2>
          <TypographySamples />
        </section>
        <section>
          <h2 className="mb-forkshop-3 text-display-sm text-forkshop-fg">Icons</h2>
          <IconGrid />
        </section>
      </div>
    </div>
  )
}
```

If `ForkshopIcon`'s prop name isn't `icon` (i.e. signature differs from the assumption above), fix the call site to match the actual prop — check `packages/engine/src/components/icon.tsx` for the real signature. The component is the same one apps/demo uses, so adjust accordingly. Don't add icons that aren't in `forkshopIcons` — iterate over the export's keys/values directly.

- [ ] **Step 2: Boot dev and verify**

```bash
pnpm --filter @forkshop/engine-workshop dev
```

Click "Engine design system" in the workshop sidebar. Expected:
- ColorGraph swatches render with one swatch per `--forkshop-*` var (11 swatches)
- Typography samples render in Raveo (display sizes) and the body sample text
- Icon grid renders every entry in `forkshopIcons` with its name underneath

Stop dev.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-workshop/src/boards/design-system.tsx
git commit -m "feat(engine-workshop): engine design-system board"
```

---

## Task 7: Board 2 — Sidebar variants

Renders 5 inline-react nodes inside a `ForkshopCanvas`, each containing a fully mounted nested `ForkshopSidebar` with curated mock data.

**Files:**
- Modify: `apps/engine-workshop/src/boards/sidebar.tsx`

- [ ] **Step 1: Implement `SidebarBoard`**

```tsx
"use client"

import { useRef, useState } from "react"
import {
  ForkshopCanvas,
  ForkshopSidebar,
  Gallery,
  BUILTIN_NODE_TYPES,
  type ForkshopSelection,
  type GalleryEntry,
  type SidebarSection,
} from "@forkshop/engine"
import {
  MOCK_SIDEBAR_ROUTES_FLAT,
  MOCK_SIDEBAR_ROUTES_DEEP,
  MOCK_SIDEBAR_SECTIONS,
} from "@workshop/mock-data"

const VARIANT_WIDTH = 280
const VARIANT_HEIGHT = 520

// Each variant is rendered inside a fixed-size frame so the canvas can place
// them on a grid. The nested sidebar reads from the *same* outer
// AgentActivityProvider that the workshop's root layout mounted, so multi-
// agent activity is visible on the variants whose routes/blocks coincide
// with MOCK_ACTIVITY entries.

function VariantFrame({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col bg-white shadow-md"
      style={{ width: VARIANT_WIDTH, height: VARIANT_HEIGHT }}
    >
      <div className="border-b border-forkshop-border bg-forkshop-surface-2 px-forkshop-3 py-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          {label}
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

// A frozen onSelect — variant sidebars are display-only.
const noop = () => {}

function VariantSidebar({
  selection,
  sections,
  routes,
}: {
  selection: ForkshopSelection
  sections?: readonly SidebarSection[]
  routes: readonly string[]
}) {
  return (
    <div className="h-full w-full">
      <ForkshopSidebar
        selection={selection}
        onSelect={noop}
        sections={sections ? [...sections] : []}
        routes={routes}
      />
    </div>
  )
}

const ENTRIES: GalleryEntry[] = [
  {
    label: "Idle",
    node: {
      kind: "inline-react",
      id: "sidebar-idle",
      x: 0,
      y: 0,
      width: VARIANT_WIDTH,
      height: VARIANT_HEIGHT,
      render: () => (
        <VariantFrame label="Idle">
          <VariantSidebar
            selection={{ kind: "section", sectionId: "design-system" }}
            sections={MOCK_SIDEBAR_SECTIONS}
            routes={MOCK_SIDEBAR_ROUTES_FLAT}
          />
        </VariantFrame>
      ),
    },
  },
  {
    label: "Active page",
    node: {
      kind: "inline-react",
      id: "sidebar-active-page",
      x: 0,
      y: 0,
      width: VARIANT_WIDTH,
      height: VARIANT_HEIGHT,
      render: () => (
        <VariantFrame label="Active page">
          <VariantSidebar
            selection={{ kind: "page", path: "/pricing" }}
            sections={MOCK_SIDEBAR_SECTIONS}
            routes={MOCK_SIDEBAR_ROUTES_FLAT}
          />
        </VariantFrame>
      ),
    },
  },
  {
    label: "Single agent reading",
    node: {
      kind: "inline-react",
      id: "sidebar-single-agent",
      x: 0,
      y: 0,
      width: VARIANT_WIDTH,
      height: VARIANT_HEIGHT,
      render: () => (
        <VariantFrame label="Single agent reading">
          <VariantSidebar
            selection={{ kind: "section", sectionId: "blocks" }}
            sections={MOCK_SIDEBAR_SECTIONS}
            // Routes intentionally minimal — multi-agent activity on blocks
            // surfaces via the mock-data file map.
            routes={MOCK_SIDEBAR_ROUTES_FLAT}
          />
        </VariantFrame>
      ),
    },
  },
  {
    label: "Multi-agent activity",
    node: {
      kind: "inline-react",
      id: "sidebar-multi-agent",
      x: 0,
      y: 0,
      width: VARIANT_WIDTH,
      height: VARIANT_HEIGHT,
      render: () => (
        <VariantFrame label="Multi-agent activity">
          <VariantSidebar
            selection={{ kind: "section", sectionId: "blocks" }}
            sections={MOCK_SIDEBAR_SECTIONS}
            routes={MOCK_SIDEBAR_ROUTES_FLAT}
          />
        </VariantFrame>
      ),
    },
  },
  {
    label: "Deeply nested tree",
    node: {
      kind: "inline-react",
      id: "sidebar-deep-tree",
      x: 0,
      y: 0,
      width: VARIANT_WIDTH,
      height: VARIANT_HEIGHT,
      render: () => (
        <VariantFrame label="Deeply nested tree">
          <VariantSidebar
            selection={{ kind: "page", path: "/products/widget/specs" }}
            sections={MOCK_SIDEBAR_SECTIONS}
            routes={MOCK_SIDEBAR_ROUTES_DEEP}
          />
        </VariantFrame>
      ),
    },
  },
]

const STAGE_WIDTH = 1800
const STAGE_HEIGHT = 1400

export function SidebarBoard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_WIDTH}
      stageHeight={STAGE_HEIGHT}
      fitMode="both"
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      <Gallery
        entries={ENTRIES}
        layout="grid"
        columns={3}
        viewportWidth={STAGE_WIDTH}
        nodePositions={positions}
        onPositionChange={(id, x, y) =>
          setPositions((prev) => ({ ...prev, [id]: { x, y } }))
        }
      />
    </ForkshopCanvas>
  )
}
```

Notes:
- The "Hover" variant from the spec is intentionally dropped from v1. `ForkshopSidebar` has no forced-hover prop, and adding a CSS hack to force `:hover` is fragile (different browsers behave differently and CSS-only `:hover` doesn't compose with hover styles that use JS state). Skip; rely on manually hovering the real sidebar.
- The "Single agent" and "Multi-agent" variants share the same `routes` because the *visible* multi-agent activity comes from the outer provider's `MOCK_ACTIVITY` — both variant cards render identical nested sidebars and the difference is provider-driven. If the labels feel misleading after looking at it, split MOCK_ACTIVITY into a single-agent slice and a multi-agent slice and wrap each variant in its own `AgentActivityProvider` with `subscribeToStream={false}` and a different `initialActivity`. Don't pre-emptively add the wrapping — only do it if the visual is unclear after Task 7.
- `useState` for positions instead of `useForkshopPositions`. The workshop has no positions API route; drag positions don't persist between reloads. That's fine for v1.

- [ ] **Step 2: Boot dev and verify**

```bash
pnpm --filter @forkshop/engine-workshop dev
```

Click "Sidebar" section. Expected:
- 5 variant cards in a grid, each containing a labeled nested sidebar
- Multi-agent variant shows colored indicators on block entries (Claude on Hero, GPT on Pricing, etc.)
- Real outer sidebar on the left is unchanged
- No console errors

Stop dev.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-workshop/src/boards/sidebar.tsx
git commit -m "feat(engine-workshop): sidebar variants board with multi-agent showcase"
```

---

## Task 8: Board 3 — Agent indicators

Gallery of `AgentReadIndicator` and `AgentSelectionChip` variants across sizes and agents.

**Files:**
- Modify: `apps/engine-workshop/src/boards/agent-indicators.tsx`

- [ ] **Step 1: Inspect actual prop signatures**

The exact props for `AgentReadIndicator` and `AgentSelectionChip` aren't in the spec — read them before writing code:

```bash
grep -n "export function AgentReadIndicator\|export function AgentSelectionChip\|type AgentReadIndicatorProps\|type AgentSelectionChipProps" packages/engine/src/components/canvas/agent-read-indicator.tsx packages/engine/src/components/agent-selection-chip.tsx
```

Read the signature from the file at the printed line numbers. Adjust the code in Step 2 if the props differ from the assumptions below — the structure (sized variants, multi-agent fan-out, same-target collision) stays the same.

- [ ] **Step 2: Implement `AgentIndicatorsBoard`**

```tsx
"use client"

import { useRef, useState } from "react"
import {
  ForkshopCanvas,
  Gallery,
  AgentReadIndicator,
  AgentSelectionChip,
  BUILTIN_NODE_TYPES,
  type GalleryEntry,
} from "@forkshop/engine"
import { MOCK_AGENTS, MOCK_BLOCKS } from "@workshop/mock-data"

const FRAME_WIDTH = 320
const FRAME_HEIGHT = 200

function VariantFrame({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col bg-white shadow-md"
      style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
    >
      <div className="border-b border-forkshop-border bg-forkshop-surface-2 px-forkshop-3 py-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          {label}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center gap-forkshop-3 p-forkshop-3">
        {children}
      </div>
    </div>
  )
}

// AgentReadIndicator and AgentSelectionChip both consume the outer
// AgentActivityProvider. Each variant differs in WHICH activity entries are
// in scope — but for v1, we wrap each variant in a sub-provider with only
// the activity it should show. That keeps the visual deterministic and
// independent of the outer provider's full set.

// Variant frames each render the chrome with no extra wrapping. The relevant
// activity has to come from the outer provider for the hooks to pick it up.
// If the outer provider's MOCK_ACTIVITY doesn't surface enough variety, add
// per-variant <AgentActivityProvider> wrappers with `subscribeToStream={false}`
// and a filtered initialActivity array.

const ENTRIES: GalleryEntry[] = [
  {
    label: "Single agent reading",
    node: {
      kind: "inline-react",
      id: "indicators-single",
      x: 0,
      y: 0,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      render: () => (
        <VariantFrame label="Single agent reading">
          <AgentReadIndicator filePath={MOCK_BLOCKS[0].sourcePath} />
        </VariantFrame>
      ),
    },
  },
  {
    label: "Multi-agent fan-out",
    node: {
      kind: "inline-react",
      id: "indicators-multi",
      x: 0,
      y: 0,
      width: FRAME_WIDTH * 2,
      height: FRAME_HEIGHT,
      render: () => (
        <VariantFrame label="Multi-agent fan-out (4 blocks)">
          {MOCK_BLOCKS.map((b) => (
            <div key={b.slug} className="flex flex-col items-center gap-forkshop-1">
              <AgentReadIndicator filePath={b.sourcePath} />
              <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">
                {b.slug}
              </span>
            </div>
          ))}
        </VariantFrame>
      ),
    },
  },
  {
    label: "Same-target collision (Claude + Cursor on Hero)",
    node: {
      kind: "inline-react",
      id: "indicators-collision",
      x: 0,
      y: 0,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      render: () => (
        <VariantFrame label="Same-target collision">
          <AgentReadIndicator filePath="components/blocks/hero.tsx" />
        </VariantFrame>
      ),
    },
  },
  {
    label: "Selection chips — one per agent",
    node: {
      kind: "inline-react",
      id: "indicators-chips",
      x: 0,
      y: 0,
      width: FRAME_WIDTH * 2,
      height: FRAME_HEIGHT,
      render: () => (
        <VariantFrame label="Selection chips">
          {MOCK_AGENTS.slice(0, 4).map((a, i) => (
            <AgentSelectionChip
              key={a.id}
              blockSelectionSlug={MOCK_BLOCKS[i % MOCK_BLOCKS.length].slug}
            />
          ))}
        </VariantFrame>
      ),
    },
  },
]

const STAGE_WIDTH = 1800
const STAGE_HEIGHT = 1000

export function AgentIndicatorsBoard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_WIDTH}
      stageHeight={STAGE_HEIGHT}
      fitMode="both"
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      <Gallery
        entries={ENTRIES}
        layout="grid"
        columns={2}
        viewportWidth={STAGE_WIDTH}
        nodePositions={positions}
        onPositionChange={(id, x, y) =>
          setPositions((prev) => ({ ...prev, [id]: { x, y } }))
        }
      />
    </ForkshopCanvas>
  )
}
```

**If the prop names differ:** `AgentReadIndicator` probably takes `filePath` (it's filed under `canvas/`). `AgentSelectionChip` takes selection identifiers (apps/demo passes `pageSelectionPath`, `blockSelectionSlug`, `primitiveSelectionId` — see apps/demo/app/forkshop/page.tsx). If the actual signature differs, adjust the call sites in the entries above to match what the components expect. Keep the variant structure intact.

- [ ] **Step 3: Boot dev and verify multi-agent colors**

```bash
pnpm --filter @forkshop/engine-workshop dev
```

Click "Agent indicators". Expected:
- "Multi-agent fan-out" frame shows 4 colored indicators (Claude purple, GPT green, Gemini blue, DeepSeek red) — one per mock agent on a different block
- "Same-target collision" frame shows Hero with both Claude and Cursor activity (engine's stacking/composition behavior is visible)
- "Selection chips" frame shows 4 distinct chips
- No console errors

Stop dev.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-workshop/src/boards/agent-indicators.tsx
git commit -m "feat(engine-workshop): agent-indicators board with multi-agent showcase"
```

---

## Task 9: Board 4 — Canvas frame

Curated nodes inside a `ForkshopCanvas`. Each node exercises a different frame feature so the user can iterate by clicking/hovering and watching HMR.

**Files:**
- Modify: `apps/engine-workshop/src/boards/canvas-frame.tsx`

- [ ] **Step 1: Implement `CanvasFrameBoard`**

```tsx
"use client"

import { useRef, useState } from "react"
import {
  ForkshopCanvas,
  Gallery,
  BUILTIN_NODE_TYPES,
  type GalleryEntry,
} from "@forkshop/engine"
import { MOCK_BLOCKS } from "@workshop/mock-data"

const SMALL = { w: 240, h: 160 }
const LARGE = { w: 560, h: 360 }

function SwatchContent({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center text-display-sm"
      style={{ backgroundColor: color }}
    >
      {label}
    </div>
  )
}

// Build entries that exercise each frame feature:
// - with/without label
// - inline vs (would-be) iframe
// - big vs small
// - one node tagged with a mock block sourcePath that's in MOCK_ACTIVITY,
//   so the agent-attention frame styling is visible.

const ENTRIES: GalleryEntry[] = [
  {
    label: "Small + label",
    node: {
      kind: "inline-react",
      id: "frame-small-labeled",
      x: 0,
      y: 0,
      width: SMALL.w,
      height: SMALL.h,
      render: () => <SwatchContent label="small" color="#E0F2FE" />,
      filePath: MOCK_BLOCKS[0].sourcePath, // Hero — claude is editing
    },
  },
  {
    node: {
      kind: "inline-react",
      id: "frame-small-unlabeled",
      x: 0,
      y: 0,
      width: SMALL.w,
      height: SMALL.h,
      render: () => <SwatchContent label="no label" color="#FEF3C7" />,
    },
  },
  {
    label: "Large + label",
    node: {
      kind: "inline-react",
      id: "frame-large-labeled",
      x: 0,
      y: 0,
      width: LARGE.w,
      height: LARGE.h,
      render: () => <SwatchContent label="large" color="#DCFCE7" />,
      filePath: MOCK_BLOCKS[1].sourcePath, // Pricing — GPT reading
    },
  },
  {
    label: "Agent edit (Gemini)",
    node: {
      kind: "inline-react",
      id: "frame-agent-edit",
      x: 0,
      y: 0,
      width: SMALL.w,
      height: SMALL.h,
      render: () => <SwatchContent label="being edited" color="#FCE7F3" />,
      filePath: MOCK_BLOCKS[2].sourcePath, // CTA — Gemini editing
    },
  },
  {
    label: "Agent read (DeepSeek)",
    node: {
      kind: "inline-react",
      id: "frame-agent-read",
      x: 0,
      y: 0,
      width: SMALL.w,
      height: SMALL.h,
      render: () => <SwatchContent label="being read" color="#E0E7FF" />,
      filePath: MOCK_BLOCKS[3].sourcePath, // feature-grid — DeepSeek reading
    },
  },
]

const STAGE_WIDTH = 2000
const STAGE_HEIGHT = 1400

export function CanvasFrameBoard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_WIDTH}
      stageHeight={STAGE_HEIGHT}
      fitMode="both"
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      <Gallery
        entries={ENTRIES}
        layout="grid"
        columns={3}
        viewportWidth={STAGE_WIDTH}
        nodePositions={positions}
        onPositionChange={(id, x, y) =>
          setPositions((prev) => ({ ...prev, [id]: { x, y } }))
        }
      />
    </ForkshopCanvas>
  )
}
```

The `filePath` field on `InlineReactNode` is the connection point between the node and `MOCK_ACTIVITY` — the engine's frame chrome colors itself based on which agents are active on that file. This field name is confirmed against `packages/engine/src/types/node.ts`. If the engine doesn't visibly colorize the agent-tagged nodes, the issue is likely the engine's matching logic (see `inline-react.test.ts` `agentMatch` tests for the canonical mocks), not the field name.

- [ ] **Step 2: Verify the agent-attention chrome is actually firing**

The "Agent edit (Gemini)" and "Agent read (DeepSeek)" nodes must have visibly different frame chrome from the unlabeled / no-agent nodes — otherwise the engine isn't picking up the source-file-to-activity mapping, and the spec's open question (#2: "Confirm the engine's color-by-X hooks can drive frame styling") has its answer: it can't, and the workshop loses that variant for now.

If the chrome doesn't differentiate:
- Confirm the field name on `InlineReactNode` that the engine reads for matching against activity (look at `iframe-route.test.ts` / `inline-react.test.ts` for the canonical mock node shape)
- Adjust the node entries to use the correct field
- If after one round of adjustment it still doesn't differentiate, drop the agent-edit/read variants from this board (keep the small/large/labeled/unlabeled ones) and note this in the commit message so the spec's open question is documented as "still open."

- [ ] **Step 3: Boot dev and verify**

```bash
pnpm --filter @forkshop/engine-workshop dev
```

Click "Canvas frame". Expected:
- 5 nodes laid out in a grid (or however many survive Step 2)
- Hovering one shows hover chrome; clicking selects (frame chrome changes)
- Different node sizes produce different label / frame sizing
- Agent-tagged nodes (if Step 2 succeeded) have differently-colored frames

Stop dev.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-workshop/src/boards/canvas-frame.tsx
git commit -m "feat(engine-workshop): canvas-frame playground board"
```

---

## Task 10: Board 5 — Edit popover

A small set of nodes intended to be selected and edited. The popover only appears when the user interacts — this board is a station, not a gallery.

**Files:**
- Modify: `apps/engine-workshop/src/boards/edit-popover.tsx`

- [ ] **Step 1: Implement `EditPopoverBoard`**

```tsx
"use client"

import { useRef, useState } from "react"
import {
  ForkshopCanvas,
  Gallery,
  BUILTIN_NODE_TYPES,
  type GalleryEntry,
} from "@forkshop/engine"

const SMALL = { w: 280, h: 200 }

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full w-full flex-col gap-forkshop-2 bg-white p-forkshop-4 shadow-md">
      <h3 className="text-display-xs text-forkshop-fg">{title}</h3>
      <p className="text-forkshop-base text-forkshop-fg-muted">{body}</p>
    </div>
  )
}

const ENTRIES: GalleryEntry[] = [
  {
    label: "Plain card — select me, then enter edit mode",
    node: {
      kind: "inline-react",
      id: "popover-card-1",
      x: 0,
      y: 0,
      width: SMALL.w,
      height: SMALL.h,
      render: () => (
        <Card
          title="Edit me"
          body="Click to select. Then use the edit shortcut to surface the popover."
        />
      ),
    },
  },
  {
    label: "Card with long body",
    node: {
      kind: "inline-react",
      id: "popover-card-2",
      x: 0,
      y: 0,
      width: SMALL.w,
      height: SMALL.h,
      render: () => (
        <Card
          title="Longer content"
          body="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Used to see how the floating controls position around taller nodes."
        />
      ),
    },
  },
  {
    label: "Card with custom background",
    node: {
      kind: "inline-react",
      id: "popover-card-3",
      x: 0,
      y: 0,
      width: SMALL.w,
      height: SMALL.h,
      render: () => (
        <div
          className="flex h-full w-full flex-col gap-forkshop-2 p-forkshop-4 shadow-md"
          style={{ backgroundColor: "#1F2937" }}
        >
          <h3 className="text-display-xs text-white">Dark variant</h3>
          <p className="text-forkshop-base text-white/70">
            See how the popover contrasts against dark content.
          </p>
        </div>
      ),
    },
  },
]

const STAGE_WIDTH = 1400
const STAGE_HEIGHT = 800

export function EditPopoverBoard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_WIDTH}
      stageHeight={STAGE_HEIGHT}
      fitMode="both"
      nodeTypes={BUILTIN_NODE_TYPES}
    >
      <Gallery
        entries={ENTRIES}
        layout="grid"
        columns={3}
        viewportWidth={STAGE_WIDTH}
        nodePositions={positions}
        onPositionChange={(id, x, y) =>
          setPositions((prev) => ({ ...prev, [id]: { x, y } }))
        }
      />
    </ForkshopCanvas>
  )
}
```

- [ ] **Step 2: Boot dev and verify**

```bash
pnpm --filter @forkshop/engine-workshop dev
```

Click "Edit popover". Expected:
- 3 cards visible
- Clicking one selects it (frame chrome from board 4 logic applies)
- Triggering edit mode on a selected card surfaces the EditPopover / FloatingControls — this is the chrome the user iterates on
- No console errors

Stop dev.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-workshop/src/boards/edit-popover.tsx
git commit -m "feat(engine-workshop): edit-popover playground board"
```

---

## Task 11: Top-level `pnpm workshop` script alias

Spec's small convenience: a top-level shortcut so the user doesn't have to type the `--filter` every time.

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add the `workshop` script**

Open the root `package.json` and locate the `scripts` object. Add a `workshop` entry alongside `dev`:

```json
"workshop": "pnpm --filter @forkshop/engine-workshop dev",
```

Verify the rest of the scripts block is intact (build, dev, typecheck, lint, test, check, regen-api-snap, reset-test, test-release). Don't reorder existing scripts.

- [ ] **Step 2: Verify the alias works**

```bash
pnpm workshop
```

Expected: starts the workshop's dev server (same as `pnpm --filter @forkshop/engine-workshop dev`). Stop with Ctrl-C once the page renders.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add pnpm workshop alias for engine-workshop dev"
```

---

## Task 12: Acceptance run

This is the verification step. No code changes — just confirm every spec acceptance criterion is met.

- [ ] **Step 1: Clean install from scratch**

```bash
pnpm install
```

Expected: succeeds. Engine fonts are copied to `apps/engine-workshop/public/fonts/forkshop/RaveoVF.woff2`.

- [ ] **Step 2: Workspace check passes**

```bash
pnpm check
```

Expected: PASS. Both typecheck and lint clean across the workspace, including the new `apps/engine-workshop` package.

- [ ] **Step 3: Build passes**

```bash
pnpm --filter @forkshop/engine-workshop build
```

Expected: Next.js builds the workshop without errors. The workshop is dev-only, but a working production build means nothing is structurally broken.

- [ ] **Step 4: Dev boots and HMR works**

```bash
pnpm workshop
```

Open the URL Next.js prints. Walk through every section:

- **Engine design system:** colors / typography / icons render correctly using Raveo
- **Sidebar:** 5 variant cards visible, multi-agent variant shows distinct colors
- **Agent indicators:** multi-agent fan-out shows 4 distinct colors; same-target collision visible
- **Canvas frame:** size + label variations visible; hover/select chrome reacts
- **Edit popover:** clicking + entering edit mode surfaces the popover chrome

HMR sanity check: in a separate terminal, open `packages/engine/tailwind/forkshop.css` and change `--forkshop-surface` to a noticeable color (e.g. `#ffe0e0`). Save. The workshop background updates without a reload. Revert the change.

Stop the dev server.

- [ ] **Step 5: Commit (only if anything trailing needed adjustment)**

Most likely nothing to commit here — the acceptance is read-only. If you adjusted a board to match a real prop signature mid-acceptance, commit that fix:

```bash
git add <files>
git commit -m "fix(engine-workshop): align <board> with actual <component> signature"
```

Otherwise skip.

---

## Open questions left for follow-up

These were flagged in the spec and remain unanswered until someone iterates against the running workshop:

1. **Sidebar hover-state variant** — skipped from v1. Decide later whether to add a CSS-forced `:hover` wrapper or rely on real hover only.
2. **Agent-attention frame state** — Task 9 Step 2 either confirms or refutes this; commit message documents which.
3. **Layout choice** — defaulted to `Gallery` with explicit columns. Per-board overrides remain a follow-up if Gallery feels constrained.
4. **`defineConfig`** — skipped per spec ("Probably skip"); confirmed working without it.
