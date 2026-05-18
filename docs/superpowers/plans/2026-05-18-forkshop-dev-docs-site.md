# forkshop.dev/docs site v1 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public docs surface at `forkshop.dev/docs` per the design spec
`docs/specs/2026-05-18-forkshop-dev-docs-site-design.md` — Fumadocs framework, 9 MDX
pages, shared header/footer with the existing landing.

**Architecture:** Add Fumadocs to the existing `apps/docs` Next.js app. A `(docs)`
route group hosts the Fumadocs DocsLayout + catch-all renderer; MDX content lives
under `apps/docs/content/docs/`. A shared `<SiteHeader>` and `<SiteFooter>` render on
both the landing and the docs surface. Fumadocs's CSS variables are overridden in
`globals.css` to map onto Forkshop's existing `canvas` / `ink` / `muted` / `accent`
tokens. No changes to the registry route, no rename of `apps/docs`, no new Vercel
project.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind 3.4, MDX via `fumadocs-mdx`,
`fumadocs-core`, `fumadocs-ui`. Existing local Raveo font (already loaded).

**Verification model:** This work is config + content. Pure-TDD doesn't fit. Each task
ends with a manual verification step (run the dev server, open the URL, confirm the
page renders) plus a build/typecheck gate. After the final content task, run the full
`pnpm check` + `pnpm --filter docs build` to confirm nothing regressed.

---

## File map

**Create:**

- `apps/docs/source.config.ts` — Fumadocs MDX source collection definition.
- `apps/docs/lib/source.ts` — Fumadocs `loader()` source object consumed by the catch-all page.
- `apps/docs/app/(docs)/layout.tsx` — Fumadocs `DocsLayout` wrapper.
- `apps/docs/app/(docs)/[[...slug]]/page.tsx` — Fumadocs catch-all renderer for all docs pages.
- `apps/docs/components/site-header.tsx` — shared top nav.
- `apps/docs/components/site-footer.tsx` — shared footer.
- `apps/docs/content/docs/meta.json` — Fumadocs nav order.
- `apps/docs/content/docs/index.mdx`
- `apps/docs/content/docs/getting-started.mdx`
- `apps/docs/content/docs/concepts.mdx`
- `apps/docs/content/docs/boards.mdx`
- `apps/docs/content/docs/canvas-editing.mdx`
- `apps/docs/content/docs/open-in-editor.mdx`
- `apps/docs/content/docs/live-ai-agents.mdx`
- `apps/docs/content/docs/cli.mdx`
- `apps/docs/content/docs/extending.mdx`

**Modify:**

- `apps/docs/package.json` — add `fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx` deps; update `lint` script to include `components/`.
- `apps/docs/next.config.mjs` — wrap exported config in Fumadocs `withMDX`.
- `apps/docs/tailwind.config.ts` — extend `content` glob to scan Fumadocs UI classes; (no preset change needed at v1, but the Fumadocs UI Tailwind preset stays available for future use).
- `apps/docs/app/globals.css` — override Fumadocs CSS variables to map onto existing color tokens.
- `apps/docs/app/layout.tsx` — mount `<SiteHeader>` + `<SiteFooter>` around `{children}`.
- `apps/docs/app/page.tsx` — remove the in-page footer block (now provided by `<SiteFooter>`); keep the rest.
- `apps/docs/tsconfig.json` — extend `include` to cover `components/**/*`, `lib/**/*`, `content/**/*`, `source.config.ts`.
- `apps/docs/.gitignore` (create if missing) — ignore Fumadocs's generated `.source/` directory.

**Untouched:**

- `apps/docs/app/r/**` — registry route.
- `apps/docs/scripts/validate-registry.ts`.
- `apps/docs/vercel.json` — install + build commands stay as-is.
- `apps/docs/postcss.config.mjs`.
- All other workspace packages.

---

## Task 1: Install Fumadocs dependencies

**Files:**
- Modify: `apps/docs/package.json`
- Modify: `pnpm-lock.yaml` (auto)

- [ ] **Step 1: Install the three Fumadocs packages**

Run from repo root:

```bash
pnpm --filter docs add fumadocs-core fumadocs-ui fumadocs-mdx
```

This adds them as runtime deps of `apps/docs`. Lockfile updates automatically.

- [ ] **Step 2: Verify typecheck passes**

Run:

```bash
pnpm --filter docs typecheck
```

Expected: no errors. (At this point Fumadocs is installed but not yet imported anywhere — typecheck should be clean.)

- [ ] **Step 3: Commit**

```bash
git add apps/docs/package.json pnpm-lock.yaml
git commit -m "docs(site): install fumadocs deps"
```

---

## Task 2: Wire Fumadocs MDX pipeline into Next config

**Files:**
- Create: `apps/docs/source.config.ts`
- Modify: `apps/docs/next.config.mjs`
- Modify: `apps/docs/tsconfig.json`
- Create: `apps/docs/.gitignore`

- [ ] **Step 1: Create `apps/docs/source.config.ts`**

This declares the Fumadocs MDX collection. The `content/docs` directory is the source of truth for the docs slug tree.

```ts
import { defineConfig, defineDocs } from "fumadocs-mdx/config"

export const docs = defineDocs({
  dir: "content/docs",
})

export default defineConfig()
```

- [ ] **Step 2: Wrap `next.config.mjs` with Fumadocs `withMDX`**

Replace the contents of `apps/docs/next.config.mjs` with:

```js
import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["forkshop"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    }
    return config
  },
  async headers() {
    return [
      {
        source: "/r/fonts/:all*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/r/registry.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      },
    ]
  },
}

export default withMDX(config)
```

The only changes vs the existing file: added the `import { createMDX } from "fumadocs-mdx/next"` line, the `const withMDX = createMDX()` line, and changed `export default config` to `export default withMDX(config)`. All registry headers and the webpack extensionAlias stay intact.

- [ ] **Step 3: Extend `tsconfig.json` include paths**

Replace the `include` array in `apps/docs/tsconfig.json` so it picks up the new directories. The new include section:

```json
"include": [
  "next-env.d.ts",
  "app/**/*",
  "components/**/*",
  "lib/**/*",
  "content/**/*",
  "scripts/**/*",
  "source.config.ts",
  ".next/types/**/*.ts"
],
```

(Everything else in `tsconfig.json` is unchanged.)

- [ ] **Step 4: Create `apps/docs/.gitignore`**

Fumadocs MDX generates a `.source/` directory at dev/build time. Ignore it.

```gitignore
.source/
```

- [ ] **Step 5: Verify typecheck passes**

```bash
pnpm --filter docs typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/source.config.ts apps/docs/next.config.mjs apps/docs/tsconfig.json apps/docs/.gitignore
git commit -m "docs(site): wire fumadocs MDX pipeline"
```

---

## Task 3: Create Fumadocs source loader

**Files:**
- Create: `apps/docs/lib/source.ts`

This is the small module the catch-all docs page imports to look up MDX content by slug.

- [ ] **Step 1: Create `apps/docs/lib/source.ts`**

```ts
import { docs } from "@/.source"
import { loader } from "fumadocs-core/source"

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
})
```

Note: `@/.source` resolves via the existing `tsconfig.json` `"@/*": ["./*"]` path alias to `apps/docs/.source/` — the generated index that `fumadocs-mdx` emits.

- [ ] **Step 2: Verify typecheck (will fail until content/docs/index.mdx exists in Task 5)**

```bash
pnpm --filter docs typecheck
```

Expected: may show `Cannot find module '@/.source'` until Fumadocs has generated the source. This is fine — Task 5 creates `content/docs/index.mdx` which triggers generation. Move on.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/lib/source.ts
git commit -m "docs(site): add fumadocs source loader"
```

---

## Task 4: Extend Tailwind content paths

**Files:**
- Modify: `apps/docs/tailwind.config.ts`

Fumadocs UI ships pre-styled React components. Tailwind needs to see those class names so they don't get purged.

- [ ] **Step 1: Update `tailwind.config.ts`**

Replace the `content` array. New `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
    "./node_modules/fumadocs-ui/dist/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        raveo: ["var(--font-raveo)", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#fafaf7",
        ink: "#1a1a18",
        muted: "#6e6e6a",
        accent: "#3057f0",
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm --filter docs typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/tailwind.config.ts
git commit -m "docs(site): extend tailwind content paths for fumadocs"
```

---

## Task 5: Stand up the `(docs)` route group with placeholder content

**Files:**
- Create: `apps/docs/app/(docs)/layout.tsx`
- Create: `apps/docs/app/(docs)/[[...slug]]/page.tsx`
- Create: `apps/docs/content/docs/index.mdx`
- Create: `apps/docs/content/docs/meta.json`

End state: `/docs` renders a "Hello docs" page inside the Fumadocs sidebar layout.

- [ ] **Step 1: Create `apps/docs/app/(docs)/layout.tsx`**

```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { ReactNode } from "react"
import { source } from "@/lib/source"

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ title: "Forkshop docs", url: "/docs" }}
    >
      {children}
    </DocsLayout>
  )
}
```

(The shared `<SiteHeader>` is wired into the root layout in Task 7 — at that point the Fumadocs DocsLayout sits under it. We keep DocsLayout's own `nav` prop minimal because the visual top bar comes from `<SiteHeader>`.)

- [ ] **Step 2: Create `apps/docs/app/(docs)/[[...slug]]/page.tsx`**

```tsx
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { source } from "@/lib/source"

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) return {}
  return {
    title: page.data.title,
    description: page.data.description,
  }
}
```

- [ ] **Step 3: Create `apps/docs/content/docs/index.mdx`**

```mdx
---
title: Introduction
description: A Figma-style canvas for your Next.js project.
---

Hello docs. This page will be replaced in Task 8.
```

- [ ] **Step 4: Create `apps/docs/content/docs/meta.json`**

```json
{
  "title": "Docs",
  "pages": ["index"]
}
```

- [ ] **Step 5: Run dev server and verify `/docs` renders**

In one terminal:

```bash
pnpm --filter docs dev
```

Open http://localhost:3001/docs in a browser.

Expected:
- Page loads without runtime errors.
- Title reads "Introduction".
- Body shows "Hello docs. This page will be replaced in Task 8."
- A sidebar appears (Fumadocs DocsLayout) with one entry: "Introduction" or similar.

Stop the dev server (Ctrl-C) before continuing.

- [ ] **Step 6: Verify build + typecheck pass**

```bash
pnpm --filter docs typecheck
pnpm --filter docs build
```

Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add apps/docs/app/\(docs\) apps/docs/content/docs/index.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): stand up /docs route with fumadocs"
```

---

## Task 6: Theme alignment — override Fumadocs CSS variables

**Files:**
- Modify: `apps/docs/app/globals.css`

Fumadocs UI uses semantic CSS variables (`--background`, `--foreground`, `--muted-foreground`, etc.). Map these onto Forkshop's existing palette so the docs surface visually matches the landing.

- [ ] **Step 1: Replace `apps/docs/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 60 14% 98%;        /* #fafaf7 — canvas */
    --foreground: 60 6% 10%;         /* #1a1a18 — ink */
    --muted: 60 8% 95%;
    --muted-foreground: 60 2% 43%;   /* #6e6e6a — muted */
    --popover: 60 14% 98%;
    --popover-foreground: 60 6% 10%;
    --card: 0 0% 100%;
    --card-foreground: 60 6% 10%;
    --border: 60 6% 90%;
    --primary: 224 86% 56%;          /* #3057f0 — accent */
    --primary-foreground: 0 0% 100%;
    --accent: 60 8% 95%;
    --accent-foreground: 60 6% 10%;
    --ring: 224 86% 56%;
  }
}

html, body {
  background: theme("colors.canvas");
  color: theme("colors.ink");
}
```

These HSL triplets approximate the existing palette. Fine-tune by eye on `/docs` after Task 8 if the contrast feels off.

- [ ] **Step 2: Run dev server and visually verify**

```bash
pnpm --filter docs dev
```

Visit http://localhost:3001/docs. Expected:
- Background reads as warm off-white (the existing canvas color), not Fumadocs's stock cool gray.
- Body text reads as near-black ink color.
- Muted text (sidebar, breadcrumb) reads gray.

Visit http://localhost:3001/ — the landing should look unchanged.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/app/globals.css
git commit -m "docs(site): align fumadocs theme with landing tokens"
```

---

## Task 7: Build and mount `<SiteHeader>`

**Files:**
- Create: `apps/docs/components/site-header.tsx`
- Modify: `apps/docs/app/layout.tsx`
- Modify: `apps/docs/package.json` (lint script)

End state: the wordmark, a "Docs" link, and a GitHub icon appear at the top of both the landing and the docs surface.

- [ ] **Step 1: Create `apps/docs/components/site-header.tsx`**

```tsx
import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink/10 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-base font-medium tracking-tight text-ink hover:text-ink/80"
        >
          Forkshop
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/docs" className="text-ink hover:text-ink/70">
            Docs
          </Link>
          <a
            href="https://github.com/jakubfoglar/forkshop"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="text-ink hover:text-ink/70"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.11.79-.25.79-.56v-2.17c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.6.23 2.78.11 3.07.73.8 1.18 1.83 1.18 3.09 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56C20.21 21.4 23.5 17.09 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Wire `<SiteHeader>` into the root layout**

Replace `apps/docs/app/layout.tsx`:

```tsx
import localFont from "next/font/local"
import "./globals.css"
import { SiteHeader } from "@/components/site-header"

const raveo = localFont({
  src: "../../../packages/engine/fonts/raveo/RaveoVF.woff2",
  variable: "--font-raveo",
  display: "swap",
})

export const metadata = {
  title: "Forkshop — A Figma-style canvas for your Next.js project",
  description:
    "Mount a sidebar and canvas in your Next.js app. See pages at multiple viewports, edit text in iframes, and watch AI agents work — all in your dev environment.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raveo.variable}>
      <body className="font-raveo antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Update lint script in `apps/docs/package.json`**

Change `"lint": "eslint app"` to `"lint": "eslint app components lib"` so the new directories get linted. Full updated `scripts` block:

```json
"scripts": {
  "dev": "next dev --port 3001",
  "build": "pnpm validate-registry && next build",
  "start": "next start --port 3001",
  "typecheck": "tsc --noEmit",
  "lint": "eslint app components lib",
  "validate-registry": "tsx scripts/validate-registry.ts"
},
```

- [ ] **Step 4: Verify visually on both surfaces**

```bash
pnpm --filter docs dev
```

- Visit http://localhost:3001/ — header now appears above the landing's title block.
- Visit http://localhost:3001/docs — header sits above the Fumadocs sidebar layout.

The landing's hero may need a slight padding adjustment now that there's a header above it (its `py-16 sm:py-24` should still work — the sticky header takes 56px). If the visual feels cramped, the next maintainer can tune it; don't over-fit in this task.

Stop dev server.

- [ ] **Step 5: Run typecheck + lint**

```bash
pnpm --filter docs typecheck
pnpm --filter docs lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/components/site-header.tsx apps/docs/app/layout.tsx apps/docs/package.json
git commit -m "docs(site): add shared SiteHeader"
```

---

## Task 8: Build and mount `<SiteFooter>`

**Files:**
- Create: `apps/docs/components/site-footer.tsx`
- Modify: `apps/docs/app/layout.tsx`
- Modify: `apps/docs/app/page.tsx`

End state: shared footer with the existing landing's left-side metadata plus an empty right-side socials slot (placeholder for socials list, to be filled separately).

- [ ] **Step 1: Create `apps/docs/components/site-footer.tsx`**

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href="https://github.com/jakubfoglar/forkshop"
            className="hover:text-ink"
          >
            github.com/jakubfoglar/forkshop
          </a>
          <span aria-hidden="true">·</span>
          <span>FSL-1.1-Apache-2.0</span>
          <span aria-hidden="true">·</span>
          <span>
            Built by{" "}
            <a
              href="https://github.com/jakubfoglar"
              className="hover:text-ink"
            >
              @jakubfoglar
            </a>
          </span>
        </div>
        {/* Socials placeholder — fill at user's direction (GitHub, X, email, etc.). */}
        <div className="flex items-center gap-3" aria-label="Socials" />
      </div>
    </footer>
  )
}
```

The empty `<div>` with `aria-label="Socials"` is intentional — a clear placeholder slot. The user will populate it with their final social list separately; the component shape is in place so no further refactor is needed when those links arrive.

- [ ] **Step 2: Wire `<SiteFooter>` into the root layout**

Replace `apps/docs/app/layout.tsx`:

```tsx
import localFont from "next/font/local"
import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const raveo = localFont({
  src: "../../../packages/engine/fonts/raveo/RaveoVF.woff2",
  variable: "--font-raveo",
  display: "swap",
})

export const metadata = {
  title: "Forkshop — A Figma-style canvas for your Next.js project",
  description:
    "Mount a sidebar and canvas in your Next.js app. See pages at multiple viewports, edit text in iframes, and watch AI agents work — all in your dev environment.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raveo.variable}>
      <body className="font-raveo antialiased flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
```

The `flex min-h-screen flex-col` + `flex-1` wrapper ensures the footer sits at the bottom on short pages.

- [ ] **Step 3: Remove the old footer from `apps/docs/app/page.tsx`**

Open `apps/docs/app/page.tsx`. The current file has a `<footer>` block at lines 55–74. Delete that block in full, and the `mt-24 border-t...` styling on the surrounding wrapper if it depends on the footer.

The trimmed `apps/docs/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <header className="mb-20">
          <h1 className="text-5xl tracking-tight sm:text-7xl">Forkshop</h1>
          <p className="mt-6 text-xl text-ink sm:text-2xl">
            A Figma-style canvas for your Next.js project.
          </p>
          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            Forkshop mounts a sidebar and a canvas inside your app&apos;s dev
            environment. Open multiple viewports of your pages side-by-side,
            edit text in any iframe and save back to source, and watch your AI
            assistant make changes in real time — all without leaving your code.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="rounded-md border border-ink/10 bg-white px-4 py-3 text-sm">
              npx forkshop init
            </code>
            <a
              href="https://github.com/jakubfoglar/forkshop"
              className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-3 text-sm text-canvas hover:bg-ink/90"
            >
              View on GitHub →
            </a>
          </div>
        </header>

        <section className="grid gap-8 sm:grid-cols-3">
          <article>
            <h2 className="text-base font-medium">Side-by-side viewports</h2>
            <p className="mt-2 text-sm text-muted">
              Open desktop, tablet, and mobile views of any page at once. Type
              in one viewport, the others update as you go.
            </p>
          </article>
          <article>
            <h2 className="text-base font-medium">Edit text in place</h2>
            <p className="mt-2 text-sm text-muted">
              Click any text in the canvas to make it editable. ⌘↵ saves to the
              underlying TSX file; Esc discards. No round-trip to your editor.
            </p>
          </article>
          <article>
            <h2 className="text-base font-medium">See your agent at work</h2>
            <p className="mt-2 text-sm text-muted">
              When Claude (or another agent) edits a file your canvas is
              showing, Forkshop highlights the change live, with a per-agent
              color so you can track multiple sessions at once.
            </p>
          </article>
        </section>
      </div>
    </main>
  )
}
```

(Footer block deleted; everything above the original footer is identical to the current file.)

- [ ] **Step 4: Verify visually**

```bash
pnpm --filter docs dev
```

- http://localhost:3001/ — header above, hero + feature cards in the middle, the shared footer at the bottom.
- http://localhost:3001/docs — header above, Fumadocs sidebar layout in the middle, footer at the bottom of the page.

Stop dev server.

- [ ] **Step 5: Run typecheck + lint**

```bash
pnpm --filter docs typecheck
pnpm --filter docs lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/components/site-footer.tsx apps/docs/app/layout.tsx apps/docs/app/page.tsx
git commit -m "docs(site): add shared SiteFooter and de-dupe landing footer"
```

---

## Task 9: Write the Introduction page

**Files:**
- Modify: `apps/docs/content/docs/index.mdx`

End state: `/docs` shows the real introduction prose. The page answers "what is Forkshop?" with more nuance than the landing tagline and points to three follow-up pages.

- [ ] **Step 1: Replace `apps/docs/content/docs/index.mdx`**

```mdx
---
title: Introduction
description: A Figma-style canvas for your Next.js project, mounted inside your dev environment.
---

Forkshop is a Figma-style canvas for your Next.js project. It mounts a
sidebar and an infinite-scrolling canvas inside your app's dev
environment — not in a separate design tool, not in a separate
Storybook server. Your pages, components, and design tokens render as
iframes on the canvas. You edit text directly in the canvas. You watch
your AI agent make changes in real time.

## Who it's for

- Developers building UI in Next.js who want the side-by-side viewport
  comparison and "design board" experience without leaving their code.
- Teams using Claude Code (or another coding agent) who want a visual
  surface to watch the agent's work as it lands.
- People who already maintain a design system in code (Tailwind,
  shadcn/ui, custom) and don't want to mirror it into Figma.

## Why this exists when Figma and Storybook do

Figma is a great drawing tool, but the design lives in a separate file
that has to be kept in sync with your code by hand. Storybook is a
great component catalog, but the pages render in a sandbox detached
from your real routes and real data. Forkshop renders your actual
pages, in your actual project, at multiple viewports at once — and the
text on the canvas is the text in your source files. Edit it on the
canvas, ⌘↵, and the TSX file changes on disk.

## Where to go next

- **[Getting Started](/docs/getting-started)** — install Forkshop and open
  your first board.
- **[Concepts](/docs/concepts)** — the mental model: Nodes, NodeTypes,
  Layouts, Boards.
- **[Extending Forkshop](/docs/extending)** — write your own NodeTypes
  and Layouts, or ask your agent to.
```

- [ ] **Step 2: Verify the page renders**

```bash
pnpm --filter docs dev
```

Visit http://localhost:3001/docs — expect the new prose. The three internal links won't resolve yet (those pages don't exist); that's expected and fixed in subsequent tasks. Stop dev.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/content/docs/index.mdx
git commit -m "docs(site): introduction page"
```

---

## Task 10: Write the Getting Started page

**Files:**
- Create: `apps/docs/content/docs/getting-started.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/getting-started.mdx`**

```mdx
---
title: Getting Started
description: Install Forkshop in your Next.js project and open your first board.
---

Forkshop adds a thin scaffold to your existing Next.js App Router
project. There's no separate dev server, no monorepo restructure, no
deploy step. Run one command, restart your dev server, and you have a
canvas at `/forkshop`.

## Prerequisites

- A Next.js App Router project (Next.js 14 or 15).
- A package manager — `pnpm`, `npm`, or `yarn`. Forkshop detects which
  you use.
- A `globals.css` (or equivalent) that Forkshop can append its CSS
  import to. Most Next.js scaffolds have this by default.

## Install

From the root of your Next.js project:

```bash
npx forkshop init
```

This does five things:

1. Installs `@forkshop/engine` as a dependency (via your detected
   package manager).
2. Drops a small scaffold layer into your project under `app/forkshop/`
   — your canvas page, a few NodeTypes, a placeholder design-system
   board.
3. Drops route stubs under `app/api/forkshop/` — the dev-only edit
   API and the agent-activity SSE feed.
4. Appends a CSS import to your `globals.css` so Forkshop's chrome
   styles load.
5. Writes a `forkshop.json` lock recording the engine version and
   scaffold checksums (so `forkshop update` can compare later).

## Open your first board

Start your dev server:

```bash
pnpm dev   # or npm run dev / yarn dev
```

Visit `/forkshop` in your browser. You'll see:

- A canvas surface filling the viewport.
- A left sidebar listing the boards the init scaffolded.
- One default board showing a few of your existing pages or
  components, depending on what `forkshop init` detected.

## What got scaffolded

The init creates `app/forkshop/` in your project. Open
`app/forkshop/CLAUDE.md` — it's a short reference that any Claude Code
session in your project will pick up automatically. That file is the
canonical "how to use Forkshop in this project" guide; the docs site
covers the parts that don't change between projects.

## Next steps

- **[Concepts](/docs/concepts)** — Nodes, NodeTypes, Layouts, Boards.
- **[Boards](/docs/boards)** — the four Layouts that ship with the
  engine.
- **[Extending Forkshop](/docs/extending)** — add your own NodeTypes
  and Layouts.
```

- [ ] **Step 2: Add `getting-started` to `meta.json`**

Replace `apps/docs/content/docs/meta.json`:

```json
{
  "title": "Docs",
  "pages": ["index", "getting-started"]
}
```

- [ ] **Step 3: Verify the page renders and appears in the sidebar**

```bash
pnpm --filter docs dev
```

- http://localhost:3001/docs/getting-started — page renders.
- Sidebar lists both Introduction and Getting Started.
- The "Getting Started" link from the introduction page resolves.

Stop dev.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/content/docs/getting-started.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): getting-started page"
```

---

## Task 11: Write the Concepts page

**Files:**
- Create: `apps/docs/content/docs/concepts.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/concepts.mdx`**

```mdx
---
title: Concepts
description: The mental model for working with Forkshop — Nodes, NodeTypes, Layouts, and Boards.
---

Four words you'll see repeatedly. Reading this page once anchors the
rest of the docs.

## Node

A **Node** is a single iframe-backed tile on the canvas. Every visible
thing on a Forkshop canvas is a Node. A Node points at a real URL or
source file in your project; the iframe loads that URL and renders it
inside the canvas tile.

## NodeType

A **NodeType** is a named configuration for a Node — the iframe's
viewport size, the label that appears above the tile, the aspect
ratio, and any per-type styling. NodeTypes are how you say "this kind
of Node is a mobile preview" versus "this kind of Node is a 1440-wide
desktop view."

The engine ships a handful of default NodeTypes. You can add your own
in `app/forkshop/node-types/` — see
**[Extending Forkshop](/docs/extending)**.

## Layout

A **Layout** is a React component that arranges Nodes into a named
board shape. The engine ships four Layouts:

- `ResponsiveFrameView` — one page rendered at three viewports
  side-by-side, with live cross-viewport sync.
- `Gallery` — a free-form grid of Nodes.
- `Tree` — a sitemap-style hierarchical tree.
- `DesignSystemView` — your design tokens and UI primitives laid out
  as a foundations + components board.

Layouts compose NodeTypes. A single Layout typically renders multiple
Nodes of one or two NodeTypes.

## Board

A **Board** is what you mount on your canvas — one Layout
configuration with its data. A Forkshop install usually has a few
Boards: a Design System board, a UI Components board, a Sitemap board,
and so on. You compose them in `app/forkshop/`. You see them in the
sidebar.

## How it fits together

```
Board   = one entry in the sidebar
  └── Layout    = how its Nodes are arranged
        └── Node      = one iframe tile
              └── NodeType  = the tile's configuration
```

You'll spend most of your time writing Boards. NodeTypes and Layouts
are reusable building blocks; once you have a set that works for your
project, Boards are quick to scaffold — by hand or by your agent.

## Where each lives

| Concept   | Lives in                                |
|-----------|-----------------------------------------|
| Node      | Implicit — emitted by Layouts at render |
| NodeType  | `app/forkshop/node-types/` (custom) or shipped by the engine |
| Layout    | Shipped by the engine, imported in your Boards |
| Board     | `app/forkshop/` in your project          |

## Next

- **[Boards](/docs/boards)** — the four engine-shipped Layouts in
  detail.
- **[Extending Forkshop](/docs/extending)** — custom NodeTypes and
  Layouts.
```

- [ ] **Step 2: Update `meta.json`**

```json
{
  "title": "Docs",
  "pages": ["index", "getting-started", "concepts"]
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter docs dev
# Visit /docs/concepts, confirm renders.
# Stop dev.
git add apps/docs/content/docs/concepts.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): concepts page"
```

---

## Task 12: Write the Boards page

**Files:**
- Create: `apps/docs/content/docs/boards.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/boards.mdx`**

```mdx
---
title: Boards
description: The four Layouts that ship with the engine, with props and examples.
---

These are the four Layouts the engine ships. Each is a React component
exported from `@forkshop/engine`. You compose them in `app/forkshop/`
to build the Boards visible in your sidebar.

## `ResponsiveFrameView`

Renders one page at three viewport sizes side-by-side. The defining
board for visual development — see your hero on desktop, tablet, and
mobile at once. Edits in any viewport propagate to the others in real
time.

**Props:**

| Prop          | Type             | Description                              |
|---------------|------------------|------------------------------------------|
| `url`         | `string`         | The path to render (e.g., `/`, `/pricing`). |
| `viewports`   | `Viewport[]`     | Optional — defaults to `[mobile, tablet, desktop]`. |
| `sourceFile`  | `string`         | Optional — TSX file backing the URL, enables canvas editing. |

**Example:**

```tsx
import { ResponsiveFrameView } from "@forkshop/engine"

export default function HeroBoard() {
  return (
    <ResponsiveFrameView
      url="/"
      sourceFile="app/page.tsx"
    />
  )
}
```

## `Gallery`

A free-form grid of Nodes. Use for a UI components board, a blocks
board, an icon set — anywhere you want a flat collection laid out
edge-to-edge.

**Props:**

| Prop      | Type           | Description                              |
|-----------|----------------|------------------------------------------|
| `nodes`   | `NodeSpec[]`   | The Nodes to render. Each has a URL and optional NodeType. |
| `columns` | `number`       | Optional — defaults to auto-fit.         |

**Example:**

```tsx
import { Gallery } from "@forkshop/engine"

export default function ComponentsBoard() {
  return (
    <Gallery
      nodes={[
        { url: "/forkshop/iframes/button", nodeType: "component" },
        { url: "/forkshop/iframes/card", nodeType: "component" },
      ]}
    />
  )
}
```

## `Tree`

A sitemap-style hierarchical tree. Each entry can have children. Use
for a routes overview or a content hierarchy.

**Props:**

| Prop      | Type           | Description                              |
|-----------|----------------|------------------------------------------|
| `entries` | `TreeEntry[]`  | The tree structure. Each entry has a URL, label, and optional `children`. |

**Example:**

```tsx
import { Tree } from "@forkshop/engine"

export default function SitemapBoard() {
  return (
    <Tree
      entries={[
        {
          url: "/",
          label: "Home",
          children: [
            { url: "/pricing", label: "Pricing" },
            { url: "/about", label: "About" },
          ],
        },
      ]}
    />
  )
}
```

## `DesignSystemView`

Your design tokens (colors, typography, spacing) plus your UI
primitives, arranged on a single foundations + components board.
Tokens are pulled from a `tokens` prop (typically built by reading
your `:root` CSS variables at runtime).

**Props:**

| Prop         | Type             | Description                              |
|--------------|------------------|------------------------------------------|
| `tokens`     | `TokenRegistry`  | Color, spacing, typography token groups. |
| `primitives` | `PrimitiveSpec[]`| Your UI components, with URLs to render them. |

**Example:**

See the `app/forkshop/design-system.tsx` scaffolded by `forkshop init`
— it shows the canonical setup, including the `parseTokenRegistryFromCssVars`
helper that reads your existing `:root` CSS variables.

## Picking a Layout

| If you want…                                       | Use                  |
|----------------------------------------------------|----------------------|
| One page, multiple viewport sizes                  | `ResponsiveFrameView`|
| A flat collection of components or pages           | `Gallery`            |
| A hierarchical view (sitemap, content tree)        | `Tree`               |
| Tokens + primitives together as a design system    | `DesignSystemView`   |

For shapes that none of these match, write your own — see
**[Extending Forkshop](/docs/extending)**.
```

- [ ] **Step 2: Update `meta.json`**

```json
{
  "title": "Docs",
  "pages": ["index", "getting-started", "concepts", "boards"]
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter docs dev
# Visit /docs/boards, confirm renders.
# Stop dev.
git add apps/docs/content/docs/boards.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): boards page"
```

---

## Task 13: Write the Canvas editing page

**Files:**
- Create: `apps/docs/content/docs/canvas-editing.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/canvas-editing.mdx`**

```mdx
---
title: Canvas editing
description: Edit any text in the canvas with one click — saves write back to your source files.
---

Canvas editing is Forkshop's defining feature. Hover any text in the
canvas; if it's editable, you'll see a blue outline. Click it. The
text becomes editable in place. Type. ⌘↵ saves to disk; Esc discards.

This only runs in dev. Production builds tree-shake the entire
overlay.

## What's editable

You can edit:

- **String literals** in your source — text inside `"..."`, `'...'`, or
  simple template literals.
- **JSX text children** — the text between JSX tags (`<p>Hello</p>`).

You can't edit:

- Strings that come from external data (CMS, JSON imports, fetched at
  runtime).
- Computed strings (template literals with interpolation).
- Text rendered inside sub-components that the current page didn't
  author. Hover those and you'll see a gray dashed outline — the
  "locked" indicator.

The locked state is a safety feature: editing a shared `<Button>`
shouldn't be possible from a page board, because the change would
land in the wrong file.

## The save flow

1. You click editable text. The element becomes `contentEditable`.
2. A small Save / Discard popover floats next to the element.
3. You type.
4. ⌘↵ (or click Save) POSTs to `/api/forkshop/edit` with the new text
   and the source-file span.
5. The route writes the change to disk.
6. Next.js HMR picks up the change and the iframe reloads.

## Multi-viewport sync

On a `ResponsiveFrameView` board with three viewports of the same
page: when you save in one viewport, all three viewports refetch the
source file and re-render. Edits show up in all three within ~100ms of
the save.

## Production behavior

The whole canvas-editing wiring is gated behind `process.env.NODE_ENV
!== "production"`. Production builds skip the overlay entirely; the
iframes render as static page previews. The `/api/forkshop/edit` route
also returns 403 in production.

There is no "edit mode in production." The story is: dev is for
editing, production is for showing.

## Related

- **[Open in editor](/docs/open-in-editor)** — Option-click to jump
  from any text on the canvas to its line in VS Code.
- **[Live AI agents](/docs/live-ai-agents)** — see Claude's edits land
  on the canvas in real time.
```

- [ ] **Step 2: Update `meta.json`**

```json
{
  "title": "Docs",
  "pages": ["index", "getting-started", "concepts", "boards", "canvas-editing"]
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter docs dev
# Visit /docs/canvas-editing, confirm renders.
# Stop dev.
git add apps/docs/content/docs/canvas-editing.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): canvas-editing page"
```

---

## Task 14: Write the Open in editor page

**Files:**
- Create: `apps/docs/content/docs/open-in-editor.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/open-in-editor.mdx`**

```mdx
---
title: Open in editor
description: Option-click any text on the canvas to jump to that exact line in your editor.
---

Hold Option (⌥) and click any element in a Forkshop canvas. Your
editor opens at the file and line where that element is defined.

It's the inverse of canvas editing: instead of bringing the edit into
the canvas, you bring the canvas back to your editor.

## What it does

Every JSX element rendered through the iframe carries `__source` data
attached at compile time. Option-click reads that data, constructs a
`vscode://file/...:line:col` URL, and navigates the top window — your
OS hands off the URL to VS Code (or whichever editor registered as the
`vscode://` handler).

## Opting in

Open-in-editor is **opt-in** during `forkshop init`. The setup skill
asks "Add Option-click → editor?" and, if you accept, makes two
changes to your project:

1. Adds `@locator/webpack-loader` (or the equivalent Turbopack rule on
   Next.js 15+) to your devDependencies.
2. Merges a loader/rule into your `next.config.js` so the loader runs
   over every JSX file at compile time.

If you skipped the opt-in at install time, re-run `forkshop init`
(idempotent) and answer Yes the second time.

## Editor support

The default URL handler is `vscode://`, which works with:

- **VS Code**
- **Cursor** (registers the same handler)
- **VS Code Insiders** (via `vscode-insiders://`)
- **JetBrains IDEs** via their `jetbrains://` handler (manual config)

If your editor doesn't register a `vscode://` handler, the click
silently fails. Forkshop won't try to fall back — installing a URL
handler for your editor is a one-time OS-level setup outside
Forkshop's scope.

## Disabling

Remove the `@locator/webpack-loader` dep and the loader entry from
your `next.config.js`. The Option-click hover indicator disappears.
```

- [ ] **Step 2: Update `meta.json`**

```json
{
  "title": "Docs",
  "pages": ["index", "getting-started", "concepts", "boards", "canvas-editing", "open-in-editor"]
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter docs dev
# Visit /docs/open-in-editor, confirm renders.
# Stop dev.
git add apps/docs/content/docs/open-in-editor.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): open-in-editor page"
```

---

## Task 15: Write the Live AI agents page

**Files:**
- Create: `apps/docs/content/docs/live-ai-agents.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/live-ai-agents.mdx`**

```mdx
---
title: Live AI agents
description: See your coding agent work — highlights on the canvas, per-agent colors, heartbeat in the sidebar.
---

When an agent edits a file your canvas is showing, Forkshop highlights
the change on the canvas in real time. A pulsing dot in the sidebar
shows which agent is active and what file it's editing. Multiple
agents working at once stack with distinct colors so you can tell
sessions apart.

## What you'll see

- **Live highlights** — elements affected by an in-progress edit pulse
  with the agent's color until the edit lands.
- **Sidebar heartbeat** — a small row in the canvas sidebar shows
  "Claude · editing `Hero.tsx`" with a breathing pulse. Idle agents
  fade out after a few seconds.
- **Read activity** — when an agent is _reading_ (not editing), the
  pulse breathes more slowly. Useful for sensing what an agent is
  paying attention to.

## Setting it up

For Claude Code (the reference producer), `forkshop init` opts you in
when you accept the "Wire live AI awareness?" prompt. It makes two
changes to your project:

1. Drops a small bash hook script into `.claude/hooks/` that emits
   activity events to a local socket as Claude runs tools.
2. Merges the hook registration into `.claude/settings.json`.

That's it. Start a Claude Code session, ask Claude to edit a file on a
visible board, and you'll see the heartbeat appear in the sidebar.

## Other agents

Live AI agents is a small wire protocol. The engine consumes a stream
of activity events; any agent runtime can be a producer if it emits
events on the protocol. The producer pack for Claude Code is one
implementation.

The protocol is documented in
[`docs/specs/2026-05-18-live-ai-protocol-design.md`](https://github.com/jakubfoglar/forkshop/blob/main/docs/specs/2026-05-18-live-ai-protocol-design.md)
in the repo — short, JSON over a local socket, no auth (it's dev-only).
A producer for Cursor, Aider, or any other agent runtime is a small
script that observes the agent's tool calls and emits matching events.

## Multi-agent stacking

When two agents work at the same time, their pulses stack in the
sidebar with distinct colors. Each agent's edits highlight on the
canvas in that agent's color, so a glance at the canvas tells you
which agent is touching what.

The color set is deterministic per agent name — start the same agent
twice and you'll see the same color.

## Disabling

Remove the hook registration from `.claude/settings.json` (or delete
the hook script). The sidebar heartbeat disappears. Forkshop falls
back to the no-op shell.
```

- [ ] **Step 2: Update `meta.json`**

```json
{
  "title": "Docs",
  "pages": ["index", "getting-started", "concepts", "boards", "canvas-editing", "open-in-editor", "live-ai-agents"]
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter docs dev
# Visit /docs/live-ai-agents, confirm renders.
# Stop dev.
git add apps/docs/content/docs/live-ai-agents.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): live-ai-agents page"
```

---

## Task 16: Write the CLI page

**Files:**
- Create: `apps/docs/content/docs/cli.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/cli.mdx`**

```mdx
---
title: CLI
description: The forkshop CLI — init, update, diff, and the forkshop.json lock.
---

The `forkshop` CLI scaffolds and maintains Forkshop in your project.
Three commands you'll use; one stub for the future.

## `forkshop init`

Sets Forkshop up in your project. Run once.

```bash
npx forkshop init
```

What it does:

1. Detects your package manager (pnpm / npm / yarn).
2. Runs `<pm> add @forkshop/engine` to add the engine as a dep.
3. Drops the scaffold layer — `app/forkshop/`, `app/api/forkshop/`,
   skill files, the user-side `CLAUDE.md`, the Raveo font file.
4. Appends `@import "@forkshop/engine/styles.css"` (or equivalent) to
   your `globals.css`.
5. Writes `forkshop.json` at your project root — records the engine
   version pin and the checksum of each scaffolded file.

The init is idempotent. Re-running it offers to refresh any
scaffolded file that's drifted (you'll see a confirm prompt per file).

**Flags:**

| Flag                | Description                                       |
|---------------------|---------------------------------------------------|
| `--yes`             | Skip all consent prompts (use defaults).          |
| `--package-manager` | Override package manager detection.               |

## `forkshop update`

Bulk-refreshes the scaffold to the version of the engine you've pinned
in `forkshop.json`.

```bash
npx forkshop update
```

What it does:

- Compares every scaffolded file's checksum against the upstream
  manifest.
- Lists files that have changed (in upstream, in your copy, or both).
- One confirm-all prompt; accept and it overwrites with upstream.
- Soft-offers an `@forkshop/engine` version bump if a newer engine is
  available.

**Flags:**

| Flag       | Description                                          |
|------------|------------------------------------------------------|
| `--check`  | Dry-run. Show the diff without writing.              |
| `--force`  | Skip the consent prompt.                             |

## `forkshop diff <path>`

Shows a unified diff of one scaffolded file against the upstream
version, using the schema recorded in `forkshop.json`.

```bash
npx forkshop diff app/forkshop/page.tsx
```

Useful for inspecting a single file before running `update`.

## `forkshop add <bundle>`

Reserved for future community-contributed scaffolding bundles. Not
available at v1; returns a "not yet available" message and a link to
the roadmap.

## The `forkshop.json` lock

`forkshop init` writes this file at your project root. It records:

- The pinned `@forkshop/engine` version.
- The checksum of every file the init dropped.
- The schema version of the lock format itself.

Commit it. `forkshop update` reads it to know which scaffolded files
came from where, and to detect drift between upstream and your copy.
```

- [ ] **Step 2: Update `meta.json`**

```json
{
  "title": "Docs",
  "pages": ["index", "getting-started", "concepts", "boards", "canvas-editing", "open-in-editor", "live-ai-agents", "cli"]
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter docs dev
# Visit /docs/cli, confirm renders.
# Stop dev.
git add apps/docs/content/docs/cli.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): cli page"
```

---

## Task 17: Write the Extending Forkshop page

**Files:**
- Create: `apps/docs/content/docs/extending.mdx`
- Modify: `apps/docs/content/docs/meta.json`

- [ ] **Step 1: Create `apps/docs/content/docs/extending.mdx`**

```mdx
---
title: Extending Forkshop
description: Forkshop is a kit, not a closed app. Build your own NodeTypes, Layouts, and themes.
---

The canvas, the sidebar, the edit overlay — they're React primitives
you compose. The engine ships four Layouts and a handful of NodeTypes
to get you started. Everything else is yours to add. Build it by hand,
or ask your agent to.

## Custom NodeTypes

A NodeType is a small object describing how a Node should render —
viewport, label, aspect ratio. NodeTypes live in
`app/forkshop/node-types/` in your project.

A custom NodeType for, say, an email preview:

```ts
// app/forkshop/node-types/email-preview.ts
import { defineNodeType } from "@forkshop/engine"

export const emailPreview = defineNodeType({
  id: "email-preview",
  label: "Email",
  viewport: { width: 600, height: 800 },
  aspectRatio: 600 / 800,
})
```

Reference it from a Board:

```tsx
import { Gallery } from "@forkshop/engine"
import { emailPreview } from "./node-types/email-preview"

export default function EmailsBoard() {
  return (
    <Gallery
      nodes={[
        { url: "/emails/welcome", nodeType: emailPreview },
        { url: "/emails/receipt", nodeType: emailPreview },
      ]}
    />
  )
}
```

NodeTypes are just data. Anything iframable works — docs pages, MDX,
a Storybook frame, a design-token playground, an email preview, a
chart, a 3D scene.

## Custom Layouts

A Layout is a React component that arranges Nodes. Write one when none
of the four shipped Layouts fits.

```tsx
// app/forkshop/layouts/two-column-diff.tsx
import { Node } from "@forkshop/engine"

interface Props {
  before: string
  after: string
}

export function TwoColumnDiff({ before, after }: Props) {
  return (
    <div style={{ display: "flex", gap: 24 }}>
      <Node url={before} label="Before" />
      <Node url={after} label="After" />
    </div>
  )
}
```

Use it from a Board:

```tsx
import { TwoColumnDiff } from "./layouts/two-column-diff"

export default function CompareBoard() {
  return <TwoColumnDiff before="/old/page" after="/new/page" />
}
```

The engine's `Node` primitive handles iframe loading, viewport
sizing, and the edit overlay. Your Layout just decides where Nodes
sit.

## Ask your agent to build one

Forkshop is small enough that Claude (or another coding agent) can
scaffold a new NodeType or Layout from a paragraph of description.
Open a Claude Code session in your project and ask:

> "Add a Forkshop Layout called `FlowGraph` that arranges Nodes as a
> connected graph with edges between them. Take an array of
> `{ url, position, edges }` and render each Node at its position with
> SVG arrows for edges. Wire it up to a new `app/forkshop/flow.tsx`
> Board."

The user-side `app/forkshop/CLAUDE.md` (scaffolded by `forkshop init`)
already teaches the agent how Forkshop's API works, so the request
above lands in one step.

## Theming

Every Forkshop style is namespaced (`forkshop-*`) and bound to CSS
variables.

```css
:root {
  --forkshop-canvas-bg: #1a1a1a;       /* dark canvas */
  --forkshop-fg: #e5e5e5;
  --forkshop-accent: #f97316;          /* orange accent */
  --forkshop-sidebar-bg: #111;
}
```

Set these anywhere in your global CSS. Forkshop's chrome picks them up
on the next render — no rebuild needed.

The full token list is in `@forkshop/engine/styles.css`. Override the
ones you care about; the rest fall back to defaults.

## Embedding

`<ForkshopCanvas>` is a normal React component. Mount it inside your
own marketing pages, internal dashboards, or design-system reviews.

```tsx
import { ForkshopCanvas } from "@forkshop/engine"
import HeroBoard from "@/forkshop/hero-board"

export default function MarketingFeature() {
  return (
    <section style={{ height: 600 }}>
      <ForkshopCanvas size="small">
        <HeroBoard />
      </ForkshopCanvas>
    </section>
  )
}
```

Each iframe is a real Chrome context, so keep mini-Forkshops to a
handful per page. For a fully static preview at video-grade
performance, a future `mode="static"` variant of `<ForkshopCanvas>`
will swap iframes for screenshots.

## Where to go from here

- Open `app/forkshop/CLAUDE.md` in your project — it's the
  hands-on reference your agent reads.
- Browse the engine source on GitHub for the full set of exports:
  [github.com/jakubfoglar/forkshop](https://github.com/jakubfoglar/forkshop).
- Open an issue or PR with NodeTypes and Layouts you'd like to see
  shipped in the engine.
```

- [ ] **Step 2: Update `meta.json` (final)**

```json
{
  "title": "Docs",
  "pages": [
    "index",
    "getting-started",
    "concepts",
    "boards",
    "canvas-editing",
    "open-in-editor",
    "live-ai-agents",
    "cli",
    "extending"
  ]
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm --filter docs dev
# Visit /docs/extending, confirm renders.
# Stop dev.
git add apps/docs/content/docs/extending.mdx apps/docs/content/docs/meta.json
git commit -m "docs(site): extending page"
```

---

## Task 18: Full-site verification

**Files:** none modified (verification only).

End state: confidence that every page renders, the build passes, the
typecheck passes, lint passes, and the registry still works.

- [ ] **Step 1: Start dev server and walk every page**

```bash
pnpm --filter docs dev
```

Visit each URL in turn, confirm the page renders without runtime
errors and the sidebar shows all 9 entries:

- http://localhost:3001/
- http://localhost:3001/docs
- http://localhost:3001/docs/getting-started
- http://localhost:3001/docs/concepts
- http://localhost:3001/docs/boards
- http://localhost:3001/docs/canvas-editing
- http://localhost:3001/docs/open-in-editor
- http://localhost:3001/docs/live-ai-agents
- http://localhost:3001/docs/cli
- http://localhost:3001/docs/extending
- http://localhost:3001/r/registry.json (existing registry should still load)

Confirm:

- Internal cross-links (Introduction → Getting Started, Boards →
  Extending, etc.) resolve.
- The shared header appears on both the landing and every docs page.
- The shared footer appears on both surfaces.
- The sidebar lists all 9 docs entries in the order defined in
  `meta.json`.

Stop dev server.

- [ ] **Step 2: Build, typecheck, lint**

From the repo root:

```bash
pnpm --filter docs build
pnpm check
```

Expected:

- `pnpm --filter docs build` runs `validate-registry` then `next build`. Both pass.
- `pnpm check` runs typecheck + lint across the workspace. Both pass.

If any of these fail, fix in place — don't move on with a red build.

- [ ] **Step 3: No-op commit if the run produced any incidental cleanup**

If steps 1–2 surfaced anything that needed a small fix (stray import,
type tightening), commit it:

```bash
git add -p
git commit -m "docs(site): post-verification cleanup"
```

If everything was already clean, skip this step.

---

## Self-Review

Reviewed against `docs/specs/2026-05-18-forkshop-dev-docs-site-design.md`:

**Spec coverage:**

- Framework choice (Fumadocs) — Tasks 1–3.
- Routing structure (`(docs)` route group) — Task 5.
- File layout (`content/docs/`, `lib/source.ts`, etc.) — Tasks 2, 3, 5.
- 9-page content set — Tasks 9–17, one task per page, in spec order.
- `meta.json` nav order — built up incrementally across content tasks; final state in Task 17 matches the spec exactly.
- Shared `<SiteHeader>` — Task 7.
- Shared `<SiteFooter>` with socials placeholder — Task 8.
- Theme alignment with landing tokens — Task 6.
- Untouched: registry route, `vercel.json`, `apps/docs` name — confirmed in file map.
- Deferred items (search, versioning, API reference, `/demo` cross-links) — explicitly not in any task. ✓

**Placeholder scan:** the only `placeholder` in the plan is the deliberate empty
socials `<div>` in Task 8, which the spec calls out as TBD by Jakub. The
`socials list` open question from the spec is preserved as a visible empty slot
in the rendered component, not as a `TODO` in code. No "TBD", "fill in",
"similar to Task N", or vague "add appropriate error handling" anywhere.

**Type consistency:** the shared component names (`SiteHeader`, `SiteFooter`)
are stable across Tasks 7, 8, and the layout edits. The `source.config.ts`
collection name (`docs`) matches the import in `lib/source.ts`. The MDX page
slugs in each task's `meta.json` exactly match the filenames being created.

No revisions needed.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-18-forkshop-dev-docs-site.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Works well here because the 18 tasks are well-isolated and the content tasks (9–17) can each be a focused short subagent run.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Good if you want to read each commit as it lands.

Which approach?
