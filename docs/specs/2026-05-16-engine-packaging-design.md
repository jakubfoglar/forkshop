# Engine packaging + compiled CSS pipeline — implementation spec

Date: 2026-05-16
Status: Approved (brainstorming) — ready for plan
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` (spec #2)
Prerequisite: `docs/specs/2026-05-15-nodetype-layout-extraction-design.md` (already shipped)
Estimated effort: ~1 week (per strategy roadmap)

## Goal

Make `packages/registry/` a publishable, self-contained npm package called `@forkshop/engine`. After this spec:

- Builds via `tsup` to ESM with type declarations, sourcemaps, and `"use client"` directives preserved on every client module.
- Ships a single pre-compiled `dist/forkshop.css` (Tailwind run at engine-build time over engine source) so the host project no longer scans engine source for utility classes.
- Carries a hand-rolled icon set sourced from `@central-icons-react/square-outlined-radius-0-stroke-2`, build-time bundled, so consumers need no per-user license key and `lucide-react` / `motion` are removed as runtime dependencies.
- Carries the Raveo woff2 binaries inside `dist/fonts/` so the install path is self-contained.
- Exposes one curated barrel entry plus narrow asset/route-handler subpaths in `package.json#exports`.
- Is consumed by `apps/playground` exactly the way a real user will — via the built `dist/`, no source aliasing.

## Scope edges

**In scope:**
- Directory + package rename: `packages/registry/` → `packages/engine/`, `@forkshop/registry` → `@forkshop/engine`.
- New `scripts/build.ts` orchestrating tsup (JS+DTS) → directive verification → Tailwind CLI (CSS) → asset copy (fonts) → tarball verification.
- Final `package.json` (deps, peerDeps, exports map, files allowlist, license field, sideEffects, engines).
- Icon swap: `lucide-react` removed from engine source; bundled-by-tsup `@central-icons-react/...` imports replace it. Workspace pnpm install gates the iconists license check via `onlyBuiltDependencies` allowlist.
- Removal of `motion` and `lucide-react` from dependencies. Removal of `@locator/webpack-loader` from engine devDependencies (only the host consumes it).
- Playground migration: drop `transpilePackages` + per-subdir `@forkshop/*` webpack/turbopack aliases, switch `globals.css` to `@import "@forkshop/engine/forkshop.css"`, run engine watch + playground dev in parallel, drop `next/font/local` Raveo wiring + remove the `--font-raveo` CSS variable override path entirely.
- Rename ripples: `packages/cli/src/manifest-builder.ts`, `apps/docs/scripts/validate-registry.ts`, the canonical-imports lint script, every workspace `package.json`, the user-CLAUDE.md template, the three skill files, root maintainer `CLAUDE.md`. Path-string updates only; content redesign is owned by downstream specs.
- A `pnpm pack` verification gate that confirms the published tarball contains only the intended files and resolves cleanly.

**Out of scope (other downstream specs own these):**
- New `init` / `update` flows / manifest schema v2 → **CLI rework (#3)**.
- Kit definitions (`marketing`, `saas`, `default`) and project-type heuristics → **Kits rewrite (#4)**.
- Vendor-neutral live-AI producer protocol changes; `@forkshop/agent-claude-code` package → **Live AI (#5)**.
- Docs site content, install guide, NodeType API docs → **Docs refresh (#6)**.
- npm publish workflow, version bump to 1.0, GitHub Actions release pipeline → **release spec** at launch.
- Pro Kits licensing infrastructure → **Pro launch** prep.
- User-facing theme customization, Tailwind v4 first-class support beyond a possible future opt-in, custom Layouts → deferred per strategy v2.

The CLI's runtime install flow is **intentionally broken** after this spec lands (its file-copy approach pulls engine source that references `@central-icons-react/...`, which downstream users can't resolve). The engine is publishable independently; `forkshop init` is not. No release between this spec and CLI rework.

## Directory + package rename

```
packages/registry/  →  packages/engine/
```

Single `git mv`. All children (src, tailwind, fonts, scripts, templates, tsconfig.json, package.json, vitest.config.ts) move together.

**Package identity change in `packages/engine/package.json`:**

```jsonc
{
  "name": "@forkshop/engine",   // was "@forkshop/registry"
  "version": "0.0.0",            // unchanged until release spec
  "private": false,              // was true — now publishable
  "license": "FSL-1.1-Apache-2.0",
  "publishConfig": { "access": "public" }
}
```

The `@forkshop/*` import alias inside engine source is independent of the package name. It still resolves to `./src/*` via `tsconfig.json` `paths`. Internal imports stay as `import { ... } from "@forkshop/components/canvas/forkshop-canvas"`. The canonical-imports lint (now at `packages/engine/scripts/check-canonical-imports.ts`) keeps enforcing it.

**Reference-rename surface (path strings only — no content redesign):**

| File | Change |
|---|---|
| `packages/engine/package.json` | `name` field |
| `packages/cli/src/manifest-builder.ts` | walks `packages/engine/{src,tailwind,templates}` |
| `packages/cli/src/__fixtures__/*` | any path strings referencing `registry/` |
| `apps/docs/scripts/validate-registry.ts` | `@forkshop/...` resolver maps now point under `packages/engine/src/` |
| `apps/playground/package.json` | `"@forkshop/engine": "workspace:*"` |
| `apps/playground/next.config.mjs` | aliases + `transpilePackages` removed (see Playground migration) |
| `apps/playground/tailwind.config.ts` | preset import + content glob removed (see CSS compile pipeline) |
| `apps/playground/app/layout.tsx` | `import { LocatorInit } from "@forkshop/engine"` |
| `apps/playground/app/globals.css` | `@import "@forkshop/engine/forkshop.css"` |
| Root `CLAUDE.md` | path strings + new "First-time setup for engine builds" section |
| `packages/engine/templates/user-claude-md.md` | `@forkshop/registry` → `@forkshop/engine` (find-replace only) |
| `packages/engine/src/skill/{setup,live-editing,doc-sync}.md` | same (find-replace only) |

**Verification:** `git grep -n '@forkshop/registry\|packages/registry'` returns zero matches.

## Build pipeline

### Tooling

- `tsup` for JS bundling + `.d.ts` generation.
- `esbuild-plugin-preserve-directives` for `"use client"` survival.
- A small `scripts/build.ts` orchestrator (matches the pattern in `packages/cli/scripts/build.ts`).

### `tsup.config.ts`

```ts
// packages/engine/tsup.config.ts
import { defineConfig } from "tsup"
import { preserveDirectivesPlugin } from "esbuild-plugin-preserve-directives"

export default defineConfig({
  entry: {
    "index":                              "src/index.ts",

    // Next.js route handlers — one entry each so they keep stable subpaths
    "api/edit/route":                     "src/api/edit/route.ts",
    "api/positions/route":                "src/api/positions/route.ts",
    "api/agent-activity/route":           "src/api/agent-activity/route.ts",
    "api/agent-activity/stream/route":    "src/api/agent-activity/stream/route.ts",
  },
  format: ["esm"],
  target: "es2022",
  platform: "neutral",      // engine code runs in browser + Next server
  dts: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  clean: true,
  env: {},                  // CRITICAL: don't inline process.env.NODE_ENV at engine-build time;
                            // consumer's bundler does the substitution.
  external: [
    "react", "react-dom",
    "next", "next/headers", "next/server", "next/navigation",
    "@locator/runtime",
    // NB: @central-icons-react/... is NOT listed — tsup bundles each imported
    // icon's SVG into dist, so the published artifact has no runtime icon dep.
  ],
  esbuildPlugins: [preserveDirectivesPlugin()],
})
```

### Production-mode degradation

Strategy v2 requires the engine to detect `process.env.NODE_ENV === "production"` at runtime in the consumer's bundle. Tsup default behavior may substitute `process.env.NODE_ENV` at engine-build time. The `env: {}` override prevents that substitution; the consumer's bundler (Next.js for users) does the substitution at their build time.

Verification: `scripts/verify-tarball.ts` greps `dist/index.js` for the literal string `process.env.NODE_ENV` — it must still be present as a runtime reference.

### `@locator/runtime` — dynamic-imported, opt-in

Per strategy v2, `@locator/runtime` is dynamic-imported. The `LocatorInit` component must use `await import("@locator/runtime")` inside its component body, not a top-level static import. This spec edits `packages/engine/src/components/locator-init.tsx` if a top-level static import exists today.

Verification: `scripts/verify-tarball.ts` greps `dist/index.js` for any top-level `import` of `@locator/runtime` — must be zero.

### Type declarations

`dts: true` runs `rollup-plugin-dts` in the same process. Output is one `.d.ts` per entry. The `tsconfig.json` `paths` alias for `@forkshop/*` is honored so internal alias imports resolve correctly in DTS bundling.

### Sourcemaps

External `.js.map` files alongside each `.js`. Paths relative so sources resolve to the published `dist/` view.

### `"use client"` preservation

The plugin propagates `"use client"` into any chunk derived from a `"use client"`-tagged source file. Without this, the 32 source files carrying the directive (canvas components, sidebar components, hooks, etc.) silently become Server Components in user projects, breaking hooks/refs/event handlers.

### Verification

`scripts/verify-directives.ts` runs after tsup:

1. For every source file under `src/` whose first non-comment line is `"use client"`, the corresponding emitted JS chunk in `dist/` begins with `"use client";` (or `'use client';`).
2. No file under `dist/api/` carries `"use client"` (route handlers are server-side; would crash if tagged).
3. No emitted file imports a server-only Next API (`next/headers`, `next/cookies`) while also carrying `"use client"`.

Failure aborts the build.

### Output

```
dist/
  index.js               index.d.ts               index.js.map
  forkshop.css                                   ← from CSS compile pipeline
  fonts/RaveoVF.woff2                            ← from copy-assets
  chunk-<hash>.js        chunk-<hash>.js.map      ← tsup splitting output
  api/
    edit/route.js                   .d.ts        .js.map
    positions/route.js              .d.ts        .js.map
    agent-activity/route.js         .d.ts        .js.map
    agent-activity/stream/route.js  .d.ts        .js.map
```

## CSS compile pipeline

### Principle

Today: host's Tailwind scans engine source for `forkshop-*` utilities. After this spec: engine ships **one pre-compiled `forkshop.css`** with every utility class engine source uses, plus the `:root` vars and `@font-face`. The host `@import`s it; their Tailwind config (or whether they even have Tailwind) is irrelevant.

### Pipeline

`compileCss()` runs after tsup. Tailwind is a build-time devDep of the engine; it never appears in the published runtime.

```ts
// packages/engine/scripts/compile-css.ts (sketch)
import { execa } from "execa"

export async function compileCss() {
  // Compile the TS preset → temporary CJS so Tailwind CLI v3 can consume it.
  await execa("tsx", ["scripts/compile-preset.ts"])  // emits .tmp/forkshop-preset.cjs

  await execa("npx", [
    "tailwindcss",
    "-c", "tailwind/build.config.cjs",
    "-i", "src/styles/forkshop.entry.css",
    "-o", "dist/forkshop.css",
    "--minify",
  ], { stdio: "inherit" })
}
```

### Build-time Tailwind config (engine-internal, not published)

```js
// packages/engine/tailwind/build.config.cjs
const forkshopPreset = require("../.tmp/forkshop-preset.cjs")

module.exports = {
  presets: [forkshopPreset.default],
  content: ["./src/**/*.{ts,tsx}"],
}
```

The preset (`tailwind/forkshop-preset.ts`) keeps its existing role: configuration data driving the engine-build Tailwind run. It does **not** get exported to consumers (no `@forkshop/engine/tailwind` export, no `@forkshop/engine/theme.css` export — see "What's deliberately *not* exposed" below).

### CSS entry file

```css
/* packages/engine/src/styles/forkshop.entry.css */
@import "../../tailwind/forkshop.css";   /* :root vars + @font-face (existing) */
@tailwind utilities;                      /* only utilities */
```

We intentionally do *not* emit `@tailwind base` or `@tailwind components`. The host's Tailwind (if any) emits those. Forkshop's chrome uses only utility classes, so utilities-only is the right slice in all cases.

### `@font-face` URL resolution

`tailwind/forkshop.css` keeps `url("/fonts/forkshop/RaveoVF.woff2")`. The compiled `dist/forkshop.css` keeps the same line (Tailwind doesn't rewrite URLs in `@font-face`). The host's Next.js serves the file from `public/fonts/forkshop/` — exactly the path the CLI (eventually) and the playground's postinstall script drop the woff2 into.

### Minification

`--minify` on the Tailwind CLI run. CSS sourcemaps disabled (generated, not authored).

### What's deliberately *not* exposed

Strategy v2 says: *"No user-facing theme system at 1.0. Forkshop ships its visual identity as-is. The `forkshop-*` CSS variables stay internal — not a public extension point."*

Therefore the previously-considered `@forkshop/engine/tailwind` (v3 preset) and `@forkshop/engine/theme.css` (v4 `@theme` block) exports **do not ship at 1.0**. The preset and theme tokens are engine-internal. If a user wants to write `bg-forkshop-surface` in their own TSX, they can't — and that's the explicit strategy stance. Non-breaking addition for 1.x if real demand emerges.

### Host's install

```css
/* host's app/globals.css — works for Tailwind v3, v4, or no Tailwind */
@import "@forkshop/engine/forkshop.css";
```

One line. No content-globs, no `transpilePackages`, no preset configuration.

## Icon set

### Source package

`@central-icons-react/square-outlined-radius-0-stroke-2@^1.1.237` from iconists.co. Public on npm with `preinstall: node ./license-check.js` validating the maintainer's license key. Subpath imports per icon (`./*` → `./*/index.{mjs,js}`), `sideEffects: false`.

### The crucial bundling rule

The icon package is a **build-time devDep only, never a runtime dep**:

- `packages/engine/package.json` lists `@central-icons-react/square-outlined-radius-0-stroke-2` in `devDependencies`.
- `tsup.config.ts` deliberately does *not* mark it `external`.
- Tsup bundles each imported icon's SVG markup into `dist/index.js` (and shared chunks via `splitting`).
- The published `@forkshop/engine` tarball has **zero runtime icon dependency**. Downstream users `pnpm i @forkshop/engine` and never see `@central-icons-react/*` in their lockfile.

This is what makes "embed in shipped product, no per-user key needed" architecturally true.

### License key at engine-build time

The package's `preinstall: node ./license-check.js` validates the maintainer's license key (env var name TBC at impl time, likely `ICONISTS_LICENSE_KEY` or `CENTRAL_ICONS_LICENSE`).

Workspace `pnpm.onlyBuiltDependencies` allowlist must include the iconists package for its preinstall script to actually run (pnpm's hardening default skips install scripts otherwise):

```json
// root package.json
"pnpm": {
  "onlyBuiltDependencies": [
    "esbuild",
    "@central-icons-react/square-outlined-radius-0-stroke-2"
  ]
}
```

The license key lives in:
- **Maintainer's shell**: `direnv` `.envrc` (gitignored). `.envrc.example` committed with variable name, no value.
- **CI**: GitHub Actions secret surfaced into the build job env.
- **Maintainer `CLAUDE.md`**: a "First-time setup for engine builds" section documenting the env var and where to put it.

The key is never required at runtime, never written into any file the package ships, never logged.

### Import shape

```ts
// packages/engine/src/lib/icons.ts (replaces lucide-react imports)
import ChevronDown  from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronDown"
import ChevronRight from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronRight"
import ChevronLeft  from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronLeft"
import ChevronUp    from "@central-icons-react/square-outlined-radius-0-stroke-2/ChevronUp"
import ArrowLeft    from "@central-icons-react/square-outlined-radius-0-stroke-2/ArrowLeft"
import Check        from "@central-icons-react/square-outlined-radius-0-stroke-2/Check"
import Close        from "@central-icons-react/square-outlined-radius-0-stroke-2/Close"
import Plus         from "@central-icons-react/square-outlined-radius-0-stroke-2/Plus"
import Search       from "@central-icons-react/square-outlined-radius-0-stroke-2/Search"
import Info         from "@central-icons-react/square-outlined-radius-0-stroke-2/Info"
import File         from "@central-icons-react/square-outlined-radius-0-stroke-2/File"
import Box          from "@central-icons-react/square-outlined-radius-0-stroke-2/Box"
import Network      from "@central-icons-react/square-outlined-radius-0-stroke-2/Network"
import SwatchBook   from "@central-icons-react/square-outlined-radius-0-stroke-2/SwatchBook"

import type { ForkshopIconComponent } from "@forkshop/components/icon"

export const forkshopIcons = {
  designSystem:  SwatchBook,
  components:    Box,
  pages:         File,
  sitemap:       Network,
  navigation:    Network,
  flows:         Network,

  page:          File,
  block:         Box,

  info:          Info,
  back:          ArrowLeft,
  close:         Close,
  check:         Check,
  plus:          Plus,
  search:        Search,
  chevronDown:   ChevronDown,
  chevronUp:     ChevronUp,
  chevronLeft:   ChevronLeft,
  chevronRight:  ChevronRight,
} satisfies Record<string, ForkshopIconComponent>

export type ForkshopIconName = keyof typeof forkshopIcons
```

Exact Central component names verified at impl time by reading the installed package (~10K files; some name choices like `SwatchBook` may be `Palette` or similar in Central's vocabulary).

### Replacement of `lucide-react` in source

Three call sites today, all switched to the local `forkshopIcons` map or named imports:

| File | Before | After |
|---|---|---|
| `src/components/sidebar/help-modal.tsx` | `import { X } from "lucide-react"` | `forkshopIcons.close` |
| `src/components/canvas/edit-popover.tsx` | `import { Check, X } from "lucide-react"` | `forkshopIcons.check` / `.close` |
| `src/components/sidebar/forkshop-sidebar.tsx` | `import { ChevronDown, ChevronRight, Info, File } from "lucide-react"` | corresponding `forkshopIcons.*` |

After: `lucide-react` removed from both `packages/engine/package.json` and `apps/playground/package.json`. Verification: `git grep "lucide-react"` returns zero in workspace source.

### Contributor friction & escape hatch

Contributors without a license key hit the preinstall check the first time they `pnpm install`. Two-layer mitigation:

1. **Most contributors don't need to rebuild the engine.** CLI tweaks, docs fixes, playground tweaks, kit rewrites — none require an engine rebuild. They can `pnpm install --filter '!@forkshop/engine'` or just commit through the engine workspace once the maintainer has pushed a fresh build.
2. **Stub fallback for engine-touching PRs without a key.** `scripts/build.ts` detects a missing license artifact (or `ICONISTS_LICENSE_KEY=skip`) and substitutes placeholder `<svg><rect/></svg>` stubs for every icon. JS/CSS build, tests pass; the playground renders boxes. The contributor validates non-icon work; the maintainer cuts the actual release.

### License attribution

`packages/engine/LICENSE-icons.md` at the engine package root:

```
# Icon attribution

Forkshop's built-in icons are derived from the Central Icon Set
by Iconists (https://iconists.co/central) — specifically the
@central-icons-react/square-outlined-radius-0-stroke-2 package — used
under license.

The compiled SVG markup embedded in dist/ is included in this package
under the terms of that license, which permits redistribution as part
of a shipped product. Forkshop does not redistribute the
@central-icons-react package itself, nor any source library of icons.

Copyright in the Central Icon Set design remains with Iconists.

To use Central Icons in your own project, visit iconists.co/central
and obtain a license directly from Iconists.
```

Shipped in the tarball via the `files` allowlist.

### Lint guard

`scripts/check-no-icon-libs.ts` runs as part of `pnpm --filter @forkshop/engine lint`. Fails if any file under `src/` imports from `lucide-react`, `iconoir-react`, `@heroicons/*`, `react-icons/*`, or `phosphor-react`.

## Font binaries

### Principle

Forkshop chrome always uses Raveo. The user can't change it. There is one loading path: engine ships an `@font-face` declaration in `forkshop.css` pointing at `/fonts/forkshop/RaveoVF.woff2`, and the install path (CLI for real users; postinstall for the playground) copies the woff2 into the host's `public/fonts/forkshop/`.

### What the engine ships

```ts
// packages/engine/scripts/copy-assets.ts
import { mkdir, copyFile } from "node:fs/promises"

export async function copyAssets() {
  await mkdir("dist/fonts", { recursive: true })
  await copyFile("fonts/raveo/RaveoVF.woff2", "dist/fonts/RaveoVF.woff2")
}
```

The woff2 ends up at `dist/fonts/RaveoVF.woff2` in the published tarball. No subpath export — it's a file, not a module. CLI / playground postinstall resolve it via `require.resolve("@forkshop/engine/package.json")` + path join.

### Preset font stack simplifies

Today: `"forkshop-sans": ["var(--font-raveo, Raveo)", "Inter", "system-ui", "sans-serif"]`. The `var(--font-raveo, ...)` wrapper exists solely so a host can override the chrome font.

After this spec, the override path is removed (strategy v2 says no font override at 1.0):

```ts
"forkshop-sans": ["Raveo", "Inter", "system-ui", "sans-serif"]
```

The long explanatory comment in `tailwind/forkshop-preset.ts` about the `, Raveo` in-var() fallback also goes — that concern is now moot.

### Playground stops being special

Today's `apps/playground/app/layout.tsx` uses `next/font/local` to set `--font-raveo`. After this spec, the playground uses the same path as every real user: the engine CSS `@font-face` resolves Raveo from the playground's `public/fonts/forkshop/RaveoVF.woff2`.

Updated `apps/playground/app/layout.tsx`:

```tsx
import { LocatorInit } from "@forkshop/engine"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-forkshop-sans bg-forkshop-surface text-forkshop-fg">
        <LocatorInit mountPath="/forkshop" />
        {children}
      </body>
    </html>
  )
}
```

### Playground postinstall script

`apps/playground/scripts/copy-engine-fonts.mjs` copies the woff2 from the engine workspace into the playground's `public/` so the static `@font-face` URL resolves at runtime:

```js
// apps/playground/scripts/copy-engine-fonts.mjs
import { mkdir, copyFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

// Try the published dist path first (real-user path); fall back to source for fresh clones.
let src
try {
  src = require.resolve("@forkshop/engine/dist/fonts/RaveoVF.woff2")
} catch {
  const pkgRoot = dirname(require.resolve("@forkshop/engine/package.json"))
  src = resolve(pkgRoot, "fonts/raveo/RaveoVF.woff2")
}

const dest = resolve("public/fonts/forkshop/RaveoVF.woff2")
await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
```

Wired via `"postinstall": "node scripts/copy-engine-fonts.mjs"` in playground `package.json`. The dist-first fallback keeps fresh-clone speed (no engine `prepare` script needed; if dist isn't built yet, the source path works for fonts).

## Final `package.json` + tarball contents

### Full final `packages/engine/package.json`

```jsonc
{
  "name": "@forkshop/engine",
  "version": "0.0.0",
  "private": false,
  "license": "FSL-1.1-Apache-2.0",
  "description": "Forkshop's canvas + sidebar engine for Next.js + Tailwind projects.",
  "homepage": "https://forkshop.dev",
  "repository": {
    "type": "git",
    "url": "https://github.com/jakubfoglar/forkshop.git",
    "directory": "packages/engine"
  },
  "bugs": "https://github.com/jakubfoglar/forkshop/issues",
  "publishConfig": { "access": "public" },
  "type": "module",
  "sideEffects": ["**/*.css"],
  "engines": { "node": ">=18.18.0" },
  "files": [
    "dist",
    "LICENSE",
    "LICENSE-icons.md",
    "README.md"
  ],
  "exports": {
    ".":                                 "./dist/index.js",
    "./forkshop.css":                    "./dist/forkshop.css",
    "./api/edit/route":                  "./dist/api/edit/route.js",
    "./api/positions/route":             "./dist/api/positions/route.js",
    "./api/agent-activity/route":        "./dist/api/agent-activity/route.js",
    "./api/agent-activity/stream/route": "./dist/api/agent-activity/stream/route.js"
  },
  "scripts": {
    "build":     "tsx scripts/build.ts",
    "dev":       "tsx scripts/build.ts --watch",
    "typecheck": "tsc --noEmit",
    "lint":      "eslint src && tsx scripts/check-canonical-imports.ts && tsx scripts/check-no-icon-libs.ts",
    "test":      "vitest run"
  },
  "peerDependencies": {
    "next":      ">=14",
    "react":     ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "@locator/runtime": "^0.5.1",
    "clsx":             "^2.1.1"
  },
  "devDependencies": {
    "@central-icons-react/square-outlined-radius-0-stroke-2": "^1.1.237",
    "@types/react":                                            "^18.3.0",
    "@types/react-dom":                                        "^18.3.0",
    "esbuild-plugin-preserve-directives":                      "^0.0.11",
    "eslint-plugin-react-hooks":                               "^7.1.1",
    "execa":                                                   "^9.0.0",
    "next":                                                    "^14.2.0",
    "react":                                                   "^18.3.0",
    "react-dom":                                               "^18.3.0",
    "tailwindcss":                                             "^3.4.0",
    "tsup":                                                    "^8.0.0",
    "tsx":                                                     "^4.21.0",
    "vitest":                                                  "^2.0.0"
  }
}
```

### Changes vs today

| Field | Today | After |
|---|---|---|
| `name` | `@forkshop/registry` | `@forkshop/engine` |
| `private` | `true` | `false` |
| `license` | (missing) | `FSL-1.1-Apache-2.0` |
| `main` | `./src/index.ts` | removed (only `exports` used) |
| `exports` | 8 source-file entries | 1 barrel + 1 CSS + 4 route handlers, all into `dist/` |
| `sideEffects` | (missing) | `["**/*.css"]` |
| `engines` | (inherited) | `{ "node": ">=18.18.0" }` |
| `files` | (missing) | explicit allowlist |
| `publishConfig` | (missing) | `{ "access": "public" }` |
| `dependencies.lucide-react` | `^1.14.0` | removed |
| `dependencies.motion` | `^11.0.0` | removed |
| `peerDependencies.tailwindcss` | `>=3` | removed |
| `devDependencies.@central-icons-react/...` | — | added |
| `devDependencies.tsup` | — | added |
| `devDependencies.esbuild-plugin-preserve-directives` | — | added |
| `devDependencies.execa` | — | added |
| `devDependencies.@locator/webpack-loader` | present | removed (host-side loader, not engine-side) |
| `scripts.build` / `dev` | — | added |

### `sideEffects: ["**/*.css"]`

`sideEffects: false` would let bundlers drop the consumer's `import "@forkshop/engine/forkshop.css"` thinking it's dead code. `sideEffects: true` would prevent JS tree-shaking. The array form preserves CSS imports while tree-shaking everything else.

### `engines.node: >=18.18.0`

The route handlers under `dist/api/` use Web Fetch APIs (`Request`, `Response`, `ReadableStream`) stable on Node 18.18+ — also Next 14's published minimum.

### What ships inside `dist/`

```
dist/
  index.js               index.d.ts               index.js.map
  forkshop.css
  fonts/RaveoVF.woff2
  chunk-<hash>.js        chunk-<hash>.js.map
  api/edit/route.js                   .d.ts        .js.map
  api/positions/route.js              .d.ts        .js.map
  api/agent-activity/route.js         .d.ts        .js.map
  api/agent-activity/stream/route.js  .d.ts        .js.map
```

### What does NOT ship, and why

| Excluded path | Why |
|---|---|
| `src/` | TypeScript source not needed; `dist/*.d.ts` covers typing. |
| `tailwind/` | Build-time Tailwind config + preset. Not a public API at 1.0. |
| `templates/` | User-surface scaffolds (MIT). The CLI ships them to `app/forkshop/CLAUDE.md`. Physically lives here so the CLI's `manifest-builder.ts` can walk it; excluded from tarball via `files`. |
| `src/skill/` | Same story — `setup.md`, `live-editing.md`, `doc-sync.md` shipped to `.claude/skills/forkshop-*.md` by the CLI. |
| `scripts/` | Build orchestration + lint checks. Not consumed downstream. |
| `fonts/raveo/` | Source binary location. Published copy lives at `dist/fonts/`. |
| `tsup.config.ts`, `tsconfig.json`, `vitest.config.ts`, `*.test.{ts,tsx}` | Dev-only. |

### Files created by this spec

- `packages/engine/LICENSE` — full FSL-1.1-Apache-2.0 text from `https://fsl.software/FSL-1.1-Apache-2.0.template.md`, copyright holder = "Jakub Foglar", licensor = "Forkshop".
- `packages/engine/LICENSE-icons.md` — Central Icons attribution (see Icon set).
- `packages/engine/README.md` — short version pointing at forkshop.dev.
- `packages/engine/tsup.config.ts`
- `packages/engine/scripts/build.ts`
- `packages/engine/scripts/compile-css.ts`
- `packages/engine/scripts/compile-preset.ts`
- `packages/engine/scripts/copy-assets.ts`
- `packages/engine/scripts/verify-directives.ts`
- `packages/engine/scripts/verify-tarball.ts`
- `packages/engine/scripts/check-no-icon-libs.ts`
- `packages/engine/tailwind/build.config.cjs`
- `packages/engine/src/styles/forkshop.entry.css`
- `packages/engine/.gitignore` — adds `dist/` and `.tmp/`

### Engine README

```md
# @forkshop/engine

The Forkshop canvas + sidebar engine for Next.js + Tailwind projects.

Don't install this package directly — use the Forkshop CLI:

    npx forkshop init

See [forkshop.dev](https://forkshop.dev) for documentation and examples.

## License

FSL-1.1-Apache-2.0 — see `LICENSE`. Icon attributions in `LICENSE-icons.md`.
```

### Workspace root LICENSE change

Today's MIT `LICENSE` at the repo root becomes a notice file:

```
This repository contains components under different licenses.

- packages/engine/                  FSL-1.1-Apache-2.0 (see packages/engine/LICENSE)
- packages/cli/                     MIT
- packages/engine/src/skill/,       MIT (user-surface scaffolds shipped by the CLI)
  packages/engine/templates/
- apps/playground/, apps/docs/      MIT (demo + docs site)

If you've forked this repo, the FSL terms apply to anything derived from
packages/engine/ source. The MIT-licensed pieces remain freely usable.

Forkshop is © 2026 Jakub Foglar.
```

## Playground migration

The playground stops shortcut-pathing into engine source and consumes built `dist/` like a real user.

### `apps/playground/package.json` — final

```jsonc
{
  "name": "playground",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "postinstall": "node scripts/copy-engine-fonts.mjs",
    "dev":         "next dev",
    "build":       "next build",
    "start":       "next start",
    "typecheck":   "tsc --noEmit",
    "lint":        "eslint app components lib --ext .ts,.tsx"
  },
  "dependencies": {
    "@forkshop/engine": "workspace:*",
    "clsx":             "^2.1.1",
    "next":             "^14.2.0",
    "react":            "^18.3.0",
    "react-dom":        "^18.3.0"
  },
  "devDependencies": {
    "@locator/webpack-loader": "^0.5.1",
    "@types/node":             "^20.0.0",
    "@types/react":            "^18.3.0",
    "@types/react-dom":        "^18.3.0",
    "autoprefixer":            "^10.4.0",
    "postcss":                 "^8.4.0",
    "tailwindcss":             "^3.4.0"
  }
}
```

`@locator/webpack-loader` stays in playground devDeps — it's the host-side loader applied to playground's own JSX so option-click works inside iframes. Engine never imports it.

### `apps/playground/next.config.mjs` — final

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@locator/runtime"],
  },
  turbopack: {
    rules: {
      "components/**/*.{js,jsx,ts,tsx}": {
        loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
      },
      "lib/**/*.{js,jsx,ts,tsx}": {
        loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
      },
    },
  },
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

What's gone vs today:
- `transpilePackages: ["@forkshop/registry"]` — no longer needed; engine is pre-built ESM.
- `forkshopAliases` (per-subdir `@forkshop/components`, `@forkshop/lib`, etc.) — engine is imported by its npm name.
- `config.resolve.alias` + `config.resolve.extensionAlias` — same reason.
- The two `turbopack.rules` entries for `src/components/**` and `src/lib/**` — those globs were aliasing engine source.

### `apps/playground/tailwind.config.ts` — final

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
}

export default config
```

What's gone:
- Preset import and `presets: [...]`
- `"../../packages/registry/src/**/*.{ts,tsx}"` content glob

The playground's Tailwind only generates utilities for the playground's own code. Engine's `forkshop-*` utilities come from `@forkshop/engine/forkshop.css` (pre-compiled).

### `apps/playground/app/globals.css` — final

```css
@import "@forkshop/engine/forkshop.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Other playground file changes

Every `@forkshop/registry` → `@forkshop/engine` in:
- `apps/playground/app/page.tsx`
- `apps/playground/app/about/page.tsx`
- Any `apps/playground/app/api/forkshop/*/route.ts` re-export

Named exports don't change shape — mechanical find-replace.

### Root `pnpm dev` script

```jsonc
// root package.json
{
  "scripts": {
    "build":     "pnpm -r build",
    "dev":       "pnpm -r --parallel --filter @forkshop/engine --filter playground run dev",
    "typecheck": "pnpm -r typecheck",
    "lint":      "pnpm -r lint",
    "test":      "pnpm -r test",
    "check":     "pnpm typecheck && pnpm lint"
  }
}
```

At `pnpm dev`:
1. Engine starts `tsx scripts/build.ts --watch` — writes `dist/` and watches for source changes.
2. Playground starts `next dev` — resolves `@forkshop/engine` to the workspace symlink → reads `dist/`.
3. Engine source edit → tsup rebuild → Next HMR → playground re-renders.

## Rename ripples into CLI, docs, and templates

This section covers files where the rename or build introduces a *mechanical* ripple. Content redesign of the setup skill, manifest schema, user-CLAUDE.md template, and init flow all belong to their owning specs.

1. **`packages/cli/src/manifest-builder.ts`** — path string `packages/registry/` → `packages/engine/`. Manifest contents and schema stay as today; CLI rework owns redesigns.
2. **`apps/docs/scripts/validate-registry.ts`** — path-string updates only. Validation logic unchanged.
3. **`packages/cli/src/__fixtures__/*` and CLI test files** — anywhere the literal string `@forkshop/registry` or `packages/registry` appears, the literal updates. No test logic changes.
4. **`packages/engine/templates/user-claude-md.md`** — find/replace `@forkshop/registry` → `@forkshop/engine` only. Structural rewrites belong to CLI rework.
5. **`packages/engine/src/skill/{setup,live-editing,doc-sync}.md`** — find/replace package name only. Phase-content rewrites belong to CLI rework.
6. **Maintainer `CLAUDE.md` at repo root** — path strings updated + one new short section ("First-time setup for engine builds") documenting the iconists env var, since that's a new prerequisite this spec introduces.
7. **Workspace `pnpm.onlyBuiltDependencies`** — adds the iconists package so its preinstall license check fires.
8. **`apps/docs/` direct engine imports** — verify with `git grep "@forkshop/" apps/docs/`; expected zero.

## Testing strategy + verification scripts

Gates from cheapest to most expensive. All but smoke install run in CI on every engine PR.

1. **Unit tests** — `pnpm --filter @forkshop/engine test`. Existing Vitest suite, expected green post-rename.
2. **Typecheck** — `tsc --noEmit`. Existing.
3. **Lint (extended)** — `eslint src` + `check-canonical-imports.ts` + new `check-no-icon-libs.ts`.
4. **Build** — `tsx scripts/build.ts` runs tsup → directive verification → CSS compile → asset copy → tarball verification. Any step fails → abort.
5. **Directive verification (`scripts/verify-directives.ts`)** — asserts every `"use client"`-tagged source file produces a `"use client"`-tagged dist chunk; no route handler is client-tagged; no client file imports server-only Next APIs.
6. **CSS verification** (part of `compile-css.ts`) — asserts `dist/forkshop.css` exists, contains `@font-face` + `:root`, contains the original `/fonts/forkshop/RaveoVF.woff2` URL, is < 30KB minified.
7. **Asset verification** (part of `copy-assets.ts`) — asserts `dist/fonts/RaveoVF.woff2` exists with non-zero size matching the source.
8. **Tarball verification (`scripts/verify-tarball.ts`)** — runs `pnpm pack` and asserts:
   - **Must contain:** `dist/index.js`, `dist/index.d.ts`, `dist/forkshop.css`, `dist/fonts/RaveoVF.woff2`, all four `dist/api/*/route.js`, `LICENSE`, `LICENSE-icons.md`, `README.md`, `package.json`.
   - **Must NOT contain:** `src/`, `templates/`, `src/skill/`, `tailwind/`, `scripts/`, `fonts/raveo/`, `.tmp/`, `node_modules/`, test files, tsup/tsconfig/vitest configs.
   - **JS quality:** `dist/index.js` contains literal `process.env.NODE_ENV` (not substituted), does NOT contain `@central-icons-react` (icon dep bundled, not externalized), does NOT contain a top-level static import of `@locator/runtime`.
   - **Sample `"use client"` survival:** at least one canvas chunk begins with `"use client"`.
   - **Tarball size sanity:** < 500KB total.
9. **Smoke install (manual, off CI critical path)** — `pnpm pack`; `pnpm create next-app .tmp/smoke ...`; install the packed tarball; minimal `app/page.tsx` importing `ForkshopCanvas` + `Gallery`; `pnpm build` succeeds. Run once during the implementing PR; document in PR description.
10. **Playground smoke (CI, every PR)** — `pnpm --filter playground build`. Exercises the full real-user path: built engine, npm-name import, CSS via dist asset, font via postinstall.

### `pnpm check`

```bash
pnpm typecheck && pnpm lint && \
pnpm --filter @forkshop/engine build && pnpm --filter playground build && \
pnpm test
```

Roughly 30–60s on a warm cache.

### What's deliberately *not* a gate

- **End-to-end CLI install** — CLI's runtime path is intentionally broken until CLI rework; e2e stays `.skip`'d.
- **Cross-React-version matrix** — strategy v2 locks React 18+.
- **Cross-Next-version matrix** — Next 14 only at 1.0.
- **Visual regression** — docs refresh spec's concern.

## Risks + open questions

### Risks

**R1. Iconists license check blocks fresh `pnpm install` for contributors without a key.** Mitigation: (1) most contributors don't need an engine rebuild; (2) stub fallback in `scripts/build.ts` substitutes placeholder icons when key missing.

**R2. CLI runtime install flow is broken until CLI rework lands.** Acknowledged — engine releasable independently as the npm artifact; `forkshop init` is not. No public release between this spec and CLI rework.

**R3. tsup + `"use client"` preservation has historical fragility.** Mitigation: `scripts/verify-directives.ts` asserts every client-tagged source produces a client-tagged chunk. The plugin is widely used (shadcn, tremor, mantine), but esbuild major upgrades have broken it before.

**R4. CSS load order between engine and host.** Host imports `@forkshop/engine/forkshop.css` first, then `@tailwind base/components/utilities`. Host's Tailwind utilities load after engine's; host classes win on specificity-tie.

**R5. `dist/` gets out of date between engine source edits and playground HMR.** Mitigation: parallel `build:watch` in root `pnpm dev`. Tsup incremental rebuild typically <100ms; Next HMR picks up dist file change shortly after.

**R6. Tailwind v4 hosts can't use `bg-forkshop-surface` in their own TSX.** Strategy v2 explicitly accepts this. Non-breaking 1.x addition if real demand emerges.

**R7. `@locator/runtime` not dynamically imported breaks tree-shaking for non-locator users.** Mitigation: `scripts/verify-tarball.ts` greps for top-level static import; LocatorInit edited to use `await import("@locator/runtime")` inside component body.

**R8. The bundled Central icons use prop shapes incompatible with `ForkshopIconComponent`.** Decision deferred to impl time. Either relax `ForkshopIconComponent` to standard `SVGProps` or wrap each Central icon in a thin local component normalizing props. Either path is a small file-edit, not a design change.

### Open questions deferred to implementation

**O1. Exact iconists license-key env var name.** Confirmed by reading the package's `license-check.js` at impl time.

**O2. Exact Central icon component names** (e.g., `SwatchBook` vs `Palette`, `Network` vs `Diagram`). Resolved by reading the installed package. Pure naming; no architectural impact.

**O3. `apps/docs/` engine dependency status.** Verify with `git grep "@forkshop/" apps/docs/`. If non-zero, decide whether docs CI needs an iconists key. Expected zero.

**O4. Versioning.** First publishable version (`0.1.0` for pre-release? `0.0.1`?) is a release-day call. Out of scope.

**O5. `prepare` vs no-prepare for the engine.** Current decision: no-`prepare`, with playground postinstall falling back to engine source when `dist/` doesn't exist. Favors fresh-clone speed. Revisit if brittle in practice.

## Exit criteria

- `git grep -n '@forkshop/registry\|packages/registry'` returns zero matches.
- `pnpm install` at the repo root completes successfully (with iconists env var set).
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @forkshop/engine build`, `pnpm --filter playground build` all green.
- `scripts/verify-tarball.ts` passes.
- Manual smoke install (Section: Testing strategy item 9) documented in the implementing PR.
- The playground renders identically to before (no visual regression) and exercises the dist-driven path end-to-end.
