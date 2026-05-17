# CLI Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Forkshop CLI around `@forkshop/engine` as an npm dependency (instead of copying engine source). New slim manifest (v2), new `init` flow that installs the engine + drops a thin scaffold layer, new `update` command for bulk-pulling scaffold updates, full rewrite of `setup.md` and the user `CLAUDE.md` template for strategy v2's 5-concept model, playground rebuild without Ravineo legacy, and a smoke fixture exercising the real install path.

**Architecture:** `init` becomes the non-interactive bootstrap (PM detection → engine pin merged into `package.json` → kit-independent scaffold files copied → slim `forkshop.json` written). The setup skill (run via Claude Code as a second step) is the interactive wiring layer that creates `app/forkshop/page.tsx`, `forkshop.config.tsx`, Board files, and patches `next.config.*`. `update` reads the lock, classifies drift (4 states), prompts once with a confirm-all summary that also covers the engine pin bump (soft offer). The manifest schema bumps to v2 (~30KB) since engine source no longer ships through it.

**Tech Stack:** TypeScript ESM, Node 18+, Vitest for unit tests, bash + `pnpm pack` + `pnpm create next-app` for the smoke harness. Workspace: pnpm. CLI bundled with esbuild to `dist/index.js`. Templates live in `packages/engine/{src/skill,templates,fonts}/`; manifest is served by `apps/docs/app/r/registry.json/route.ts`.

**Spec:** `docs/specs/2026-05-17-cli-rework-design.md`

---

## File Structure

### CLI package (`packages/cli/`)

**Modify:**
- `src/manifest-schema.ts` — v2 types (slim shapes, `engineVersion`, new bundle kinds)
- `src/manifest-builder.ts` — drop primitives/layouts walking, walk only skill + templates + fonts
- `src/rewrite.ts` — collapse to a tiny placeholder-substituter (`{{srcPrefix}}` in markdown)
- `src/forkshop-json.ts` — adapted only by virtue of schema type change (`readForkshopJson`/`writeForkshopJson` unchanged)
- `src/resolve-bundles.ts` — small change: bundle kinds renamed (`scaffold`/`asset`/`composite`); drop `deps` everywhere except in init-flow constants
- `src/resolve-destination.ts` — slim alias map (only `mount`, plus `srcPrefix`)
- `src/copy-files.ts` — call the new placeholder substituter; alias map shrinks
- `src/write-deps.ts` — unchanged signature, but init only passes `["@forkshop/engine@<version>"]`
- `src/commands/init.ts` — full rewrite of the flow
- `src/commands/add.ts` — reduced to a 1.0 placeholder
- `src/commands/diff.ts` — light adaptation for new lock shape
- `src/index.ts` — register the new `update` command

**Create:**
- `src/commands/update.ts` — new command
- `src/commands/update.test.ts`
- `src/globals-css-append.ts` — idempotent appender for `@import "@forkshop/engine/forkshop.css";`
- `src/globals-css-append.test.ts`
- `src/font-fetch.ts` — fetch font via manifest binary, fallback to unpkg
- `src/font-fetch.test.ts`
- `src/engine-version.ts` — read user's `@forkshop/engine` pin from their `package.json`, compare to manifest's `engineVersion`
- `src/engine-version.test.ts`

**Rewrite (existing test files):**
- `src/manifest-builder.test.ts`
- `src/resolve-bundles.test.ts`
- `src/forkshop-json.test.ts`
- `src/rewrite.test.ts`
- `src/copy-files.test.ts`
- `src/resolve-destination.test.ts`
- `src/commands/init.test.ts`
- `src/commands/add.test.ts`
- `src/commands/diff.test.ts`

### Engine package (`packages/engine/`)

**Modify:**
- `src/skill/setup.md` — full rewrite (~600-700 lines from ~1205)
- `templates/user-claude-md.md` — full rewrite (~320 lines from ~372)
- `src/skill/live-editing.md` — mechanical sweep (vocabulary swap, drop stale dep refs)
- `src/skill/doc-sync.md` — mechanical sweep (vocabulary swap, paths to v2)

**Create:**
- `templates/api-stubs/edit-route.ts.template`
- `templates/api-stubs/positions-route.ts.template`
- `templates/api-stubs/agent-activity-route.ts.template`
- `templates/api-stubs/agent-activity-stream-route.ts.template`

### Docs site (`apps/docs/`)

**Modify:**
- `scripts/validate-registry.ts` — add `validateInitDestinations` check; update for v2 schema

### Playground (`apps/playground/`)

**Delete (Ravineo legacy content):** All of `apps/playground/app/page.tsx`, `app/about/page.tsx`, anything with `Acme`/Ravineo CTA copy, host code using `forkshop-*` tokens.

**Create/Rewrite:**
- `components/ui/{button,badge,input}.tsx`
- `components/blocks/{hero,feature-grid,cta,pricing}.tsx`
- `components/layout/{header,footer}.tsx`
- `app/{layout,page}.tsx` + `app/about/page.tsx` + `app/pricing/page.tsx`
- `app/globals.css`
- `app/forkshop/{page.tsx,forkshop.config.tsx,foundations-board.tsx,components-board.tsx,blocks-board.tsx,pages-board.tsx}`
- `forkshop.json` (locked, sha-pinned to scaffold content)

### Smoke fixture (`tests/smoke/`)

**Create:**
- `tests/smoke/README.md`
- `tests/smoke/run-smoke.sh`
- `tests/smoke/expected-files.txt`
- `tests/smoke/expected-package-json.json`

---

## Task Sequencing

Phase A — Schema + utility primitives (Tasks 1-7)
Phase B — Path rewrites + lock helpers (Tasks 8-10)
Phase C — Init flow rewrite (Tasks 11-13)
Phase D — New `update` command (Tasks 14-16)
Phase E — `add` placeholder, `diff` adaptation (Tasks 17-18)
Phase F — Engine-side template + manifest builder + validate-registry (Tasks 19-22)
Phase G — Skill + template content rewrites (Tasks 23-26)
Phase H — Playground rebuild (Tasks 27-31)
Phase I — Smoke fixture (Tasks 32-33)
Phase J — Final verification + docs (Tasks 34-35)

---

## Phase A — Schema + utility primitives

### Task 1: Manifest schema v2 (types only)

**Files:**
- Modify: `packages/cli/src/manifest-schema.ts`

The slim shapes that drive everything downstream. No behavior here — type definitions, default constants, schema-version bump.

- [ ] **Step 1: Replace the file contents with v2 types**

```ts
// packages/cli/src/manifest-schema.ts
/**
 * v2 schema — engine on npm, manifest carries only thin scaffolds + the
 * Raveo font binary. v1 schema (primitives + layouts copied as source)
 * is fully retired.
 */

export const MANIFEST_SCHEMA_VERSION = "2.0.0"

export interface Manifest {
  version: string                  // "2.0.0"
  generatedAt: string
  registryBaseUrl: string
  engineVersion: string            // engine version this manifest was built against
  bundles: Record<string, Bundle>
  files: Record<string, ManifestFile>
}

export type Bundle =
  | { kind: "scaffold"; items: string[] }    // text files copied via the file walker
  | { kind: "asset"; items: string[] }       // binary files
  | { kind: "composite"; includes: string[] }

export type ManifestFile =
  | {
      kind: "text"
      ext: "tsx" | "ts" | "md" | "css"
      content: string
      destOverride?: string
    }
  | {
      kind: "binary"
      url: string                     // resolved against registryBaseUrl
      destOverride: string
    }

/**
 * Slim alias map used at install time. Only `mount` is user-configurable
 * (where `app/forkshop/` lives); `srcPrefix` is detected from tsconfig.
 */
export interface ResolvedAliases {
  mount: string                       // e.g. "@/app/forkshop"
  srcPrefix: "" | "src/"
}

export const DEFAULT_ALIASES: ResolvedAliases = {
  mount: "@/app/forkshop",
  srcPrefix: "",
}

/**
 * The shape persisted at <project>/forkshop.json after `init` runs.
 */
export interface ForkshopJson {
  $schema?: string
  schemaVersion: "2.0.0"
  installedAt: string
  registryUrl: string
  engineVersion: string               // pinned `@forkshop/engine` version at install time
  mount: string                       // mirror of ResolvedAliases.mount
  srcPrefix: "" | "src/"              // mirror of ResolvedAliases.srcPrefix
  installedBundles: string[]
  files: Record<string, ForkshopJsonFile>
}

export interface ForkshopJsonFile {
  dest: string                        // workspace-relative path on disk
  sha: string                         // sha256 of content as written (post-rewrite)
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter forkshop typecheck`
Expected: many errors in downstream files (init.ts, add.ts, manifest-builder.ts, etc.) — fine, those tasks fix them.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/manifest-schema.ts
git commit -m "feat(cli): manifest schema v2 — slim types, engine-on-npm shape"
```

---

### Task 2: Rewrite `forkshop-json.test.ts` for v2 schema

**Files:**
- Test: `packages/cli/src/forkshop-json.test.ts`

The runtime code (`forkshop-json.ts`) didn't change shape — it reads/writes whatever `ForkshopJson` is. Only the test fixtures need updating to use v2 shape.

- [ ] **Step 1: Replace the test file with v2-shape fixtures**

```ts
// packages/cli/src/forkshop-json.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { readForkshopJson, writeForkshopJson, type ForkshopJson } from "./forkshop-json.js"

describe("forkshop.json", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("returns undefined when no forkshop.json exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    expect(await readForkshopJson(root)).toBeUndefined()
  })

  it("round-trips a v2-shape forkshop.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    const written: ForkshopJson = {
      schemaVersion: "2.0.0",
      installedAt: "2026-05-17T10:00:00Z",
      registryUrl: "https://forkshop.dev/r/",
      engineVersion: "0.3.0",
      mount: "@/app/forkshop",
      srcPrefix: "",
      installedBundles: ["init"],
      files: {
        "@forkshop/skill/setup": {
          dest: ".claude/skills/forkshop-setup.md",
          sha: "abcd1234",
        },
      },
    }
    await writeForkshopJson(root, written)
    const read = await readForkshopJson(root)
    expect(read).toEqual(written)
  })

  it("round-trips with srcPrefix set", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    const written: ForkshopJson = {
      schemaVersion: "2.0.0",
      installedAt: "2026-05-17T10:00:00Z",
      registryUrl: "https://forkshop.dev/r/",
      engineVersion: "0.3.0",
      mount: "@/app/forkshop",
      srcPrefix: "src/",
      installedBundles: ["init"],
      files: {},
    }
    await writeForkshopJson(root, written)
    expect(await readForkshopJson(root)).toEqual(written)
  })

  it("throws a useful error on malformed JSON", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-json-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "forkshop.json"), "{ not json")
    await expect(readForkshopJson(root)).rejects.toThrow(/forkshop\.json/)
  })
})
```

- [ ] **Step 2: Run the test, expect PASS (forkshop-json.ts already handles any ForkshopJson shape)**

Run: `pnpm --filter forkshop test -- forkshop-json`
Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/forkshop-json.test.ts
git commit -m "test(cli): forkshop.json round-trips v2 schema"
```

---

### Task 3: Globals.css appender (new utility)

**Files:**
- Create: `packages/cli/src/globals-css-append.ts`
- Create: `packages/cli/src/globals-css-append.test.ts`

The init flow appends `@import "@forkshop/engine/forkshop.css";` to the user's `app/globals.css`. Idempotent: skip if present. Errors if the file doesn't exist (user-facing message guides them).

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/globals-css-append.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { appendForkshopCssImport } from "./globals-css-append.js"

describe("appendForkshopCssImport", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  async function makeProject(initialCss: string | undefined): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-css-"))
    tempDirs.push(root)
    if (initialCss !== undefined) {
      await fs.mkdir(path.join(root, "app"), { recursive: true })
      await fs.writeFile(path.join(root, "app/globals.css"), initialCss, "utf8")
    }
    return root
  }

  it("prepends the import at the top when absent", async () => {
    const root = await makeProject("@tailwind base;\n@tailwind utilities;\n")
    const result = await appendForkshopCssImport(root)
    expect(result).toEqual({ action: "added", target: "app/globals.css" })
    const after = await fs.readFile(path.join(root, "app/globals.css"), "utf8")
    expect(after).toBe(
      '@import "@forkshop/engine/forkshop.css";\n@tailwind base;\n@tailwind utilities;\n'
    )
  })

  it("is idempotent — skips if the import is already present", async () => {
    const root = await makeProject(
      '@import "@forkshop/engine/forkshop.css";\n@tailwind utilities;\n'
    )
    const result = await appendForkshopCssImport(root)
    expect(result).toEqual({ action: "skipped", target: "app/globals.css" })
  })

  it("detects the import even with single quotes", async () => {
    const root = await makeProject(
      "@import '@forkshop/engine/forkshop.css';\n@tailwind utilities;\n"
    )
    const result = await appendForkshopCssImport(root)
    expect(result.action).toBe("skipped")
  })

  it("errors when app/globals.css doesn't exist", async () => {
    const root = await makeProject(undefined)
    await expect(appendForkshopCssImport(root)).rejects.toThrow(/app\/globals\.css/)
  })
})
```

- [ ] **Step 2: Run, expect FAIL (module not found)**

Run: `pnpm --filter forkshop test -- globals-css-append`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the utility**

```ts
// packages/cli/src/globals-css-append.ts
import { promises as fs } from "node:fs"
import path from "node:path"

const TARGET_REL = "app/globals.css"
const IMPORT_REGEX = /@import\s+["']@forkshop\/engine\/forkshop\.css["'];?/

export type AppendResult =
  | { action: "added"; target: string }
  | { action: "skipped"; target: string }

export async function appendForkshopCssImport(projectRoot: string): Promise<AppendResult> {
  const target = path.join(projectRoot, TARGET_REL)
  let existing: string
  try {
    existing = await fs.readFile(target, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Forkshop expected to find ${TARGET_REL} so it could add the engine ` +
          `stylesheet import. If your root CSS lives elsewhere, add this line ` +
          `manually:\n\n  @import "@forkshop/engine/forkshop.css";\n`
      )
    }
    throw error
  }

  if (IMPORT_REGEX.test(existing)) {
    return { action: "skipped", target: TARGET_REL }
  }

  const next = `@import "@forkshop/engine/forkshop.css";\n${existing}`
  await fs.writeFile(target, next, "utf8")
  return { action: "added", target: TARGET_REL }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- globals-css-append`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/globals-css-append.ts packages/cli/src/globals-css-append.test.ts
git commit -m "feat(cli): idempotent globals.css forkshop import appender"
```

---

### Task 4: Font fetch utility (new)

**Files:**
- Create: `packages/cli/src/font-fetch.ts`
- Create: `packages/cli/src/font-fetch.test.ts`

Init copies the Raveo woff2 to `public/fonts/forkshop/`. Primary source: the manifest's `binary` entry (HTTP fetch from the registry). Fallback: unpkg, if the registry is unreachable. Implementation uses Node's built-in `fetch`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/font-fetch.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchFontTo } from "./font-fetch.js"

describe("fetchFontTo", () => {
  const tempDirs: string[] = []
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    global.fetch = originalFetch
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("writes the font from the primary URL", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-font-"))
    tempDirs.push(root)
    const dest = path.join(root, "public/fonts/forkshop/RaveoVF.woff2")

    const payload = new Uint8Array([0x77, 0x4f, 0x46, 0x32]) // "wOF2"
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => payload.buffer,
    } as unknown as Response)

    const result = await fetchFontTo({
      primaryUrl: "https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2",
      fallbackUrl: "https://unpkg.com/@forkshop/engine@0.3.0/dist/fonts/RaveoVF.woff2",
      destAbsolute: dest,
    })

    expect(result).toEqual({ source: "primary", bytes: 4 })
    const written = await fs.readFile(dest)
    expect(Array.from(written)).toEqual([0x77, 0x4f, 0x46, 0x32])
  })

  it("falls back to unpkg when primary returns 404", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-font-"))
    tempDirs.push(root)
    const dest = path.join(root, "public/fonts/forkshop/RaveoVF.woff2")

    const payload = new Uint8Array([0x77, 0x4f, 0x46, 0x32])
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => payload.buffer,
      } as unknown as Response)

    const result = await fetchFontTo({
      primaryUrl: "https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2",
      fallbackUrl: "https://unpkg.com/@forkshop/engine@0.3.0/dist/fonts/RaveoVF.woff2",
      destAbsolute: dest,
    })

    expect(result.source).toBe("fallback")
  })

  it("throws when both URLs fail", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-font-"))
    tempDirs.push(root)
    const dest = path.join(root, "public/fonts/forkshop/RaveoVF.woff2")

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response)

    await expect(
      fetchFontTo({
        primaryUrl: "https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2",
        fallbackUrl: "https://unpkg.com/@forkshop/engine@0.3.0/dist/fonts/RaveoVF.woff2",
        destAbsolute: dest,
      })
    ).rejects.toThrow(/Could not fetch font/)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- font-fetch`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the utility**

```ts
// packages/cli/src/font-fetch.ts
import { promises as fs } from "node:fs"
import path from "node:path"

export interface FetchFontOptions {
  primaryUrl: string                  // resolved manifest binary URL
  fallbackUrl: string                 // unpkg URL keyed to engineVersion
  destAbsolute: string                // absolute path to write
}

export interface FetchFontResult {
  source: "primary" | "fallback"
  bytes: number
}

async function tryFetch(url: string): Promise<Buffer | undefined> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    return undefined
  }
  if (!response.ok) return undefined
  return Buffer.from(await response.arrayBuffer())
}

export async function fetchFontTo(options: FetchFontOptions): Promise<FetchFontResult> {
  const { primaryUrl, fallbackUrl, destAbsolute } = options
  let buffer = await tryFetch(primaryUrl)
  let source: "primary" | "fallback" = "primary"
  if (!buffer) {
    buffer = await tryFetch(fallbackUrl)
    source = "fallback"
  }
  if (!buffer) {
    throw new Error(
      `Could not fetch font from registry (${primaryUrl}) or fallback (${fallbackUrl}). ` +
        `Check network connectivity, or pass --registry <url> with an alternate registry.`
    )
  }
  await fs.mkdir(path.dirname(destAbsolute), { recursive: true })
  await fs.writeFile(destAbsolute, buffer)
  return { source, bytes: buffer.length }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- font-fetch`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/font-fetch.ts packages/cli/src/font-fetch.test.ts
git commit -m "feat(cli): font fetcher with manifest primary + unpkg fallback"
```

---

### Task 5: Engine-version reader (new)

**Files:**
- Create: `packages/cli/src/engine-version.ts`
- Create: `packages/cli/src/engine-version.test.ts`

Reads `@forkshop/engine` version from the user's `package.json` (either `dependencies` or `devDependencies`). Compares against a target version using a minimal semver-like check (handles `^x.y.z` / `~x.y.z` / `x.y.z` ranges — we only need a "less than" check for the soft offer). No `semver` npm dep — write the comparison inline.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/engine-version.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { readEnginePin, isEnginePinBehind } from "./engine-version.js"

describe("readEnginePin", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  async function setup(pkg: object): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-engver-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify(pkg))
    return root
  }

  it("reads from dependencies", async () => {
    const root = await setup({ dependencies: { "@forkshop/engine": "^0.2.5" } })
    expect(await readEnginePin(root)).toEqual({ raw: "^0.2.5", normalized: "0.2.5" })
  })

  it("reads from devDependencies", async () => {
    const root = await setup({ devDependencies: { "@forkshop/engine": "~0.3.0" } })
    expect(await readEnginePin(root)).toEqual({ raw: "~0.3.0", normalized: "0.3.0" })
  })

  it("prefers dependencies over devDependencies", async () => {
    const root = await setup({
      dependencies: { "@forkshop/engine": "0.4.0" },
      devDependencies: { "@forkshop/engine": "0.1.0" },
    })
    expect(await readEnginePin(root)).toEqual({ raw: "0.4.0", normalized: "0.4.0" })
  })

  it("returns undefined when not pinned", async () => {
    const root = await setup({ dependencies: {} })
    expect(await readEnginePin(root)).toBeUndefined()
  })
})

describe("isEnginePinBehind", () => {
  it("0.2.5 is behind 0.3.0", () => {
    expect(isEnginePinBehind("0.2.5", "0.3.0")).toBe(true)
  })

  it("0.3.0 is not behind 0.3.0", () => {
    expect(isEnginePinBehind("0.3.0", "0.3.0")).toBe(false)
  })

  it("0.4.0 is not behind 0.3.0", () => {
    expect(isEnginePinBehind("0.4.0", "0.3.0")).toBe(false)
  })

  it("1.0.0 is not behind 0.9.99", () => {
    expect(isEnginePinBehind("1.0.0", "0.9.99")).toBe(false)
  })

  it("0.10.0 is not behind 0.9.0 (numeric not lexical)", () => {
    expect(isEnginePinBehind("0.10.0", "0.9.0")).toBe(false)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- engine-version`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the utility**

```ts
// packages/cli/src/engine-version.ts
import { promises as fs } from "node:fs"
import path from "node:path"

export interface EnginePin {
  raw: string                         // as written in package.json (e.g. "^0.2.5")
  normalized: string                  // stripped of range prefix ("0.2.5")
}

const RANGE_PREFIX = /^[~^>=<]+\s*/

export async function readEnginePin(projectRoot: string): Promise<EnginePin | undefined> {
  let text: string
  try {
    text = await fs.readFile(path.join(projectRoot, "package.json"), "utf8")
  } catch {
    return undefined
  }
  const pkg = JSON.parse(text) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const raw =
    pkg.dependencies?.["@forkshop/engine"] ?? pkg.devDependencies?.["@forkshop/engine"]
  if (!raw) return undefined
  const normalized = raw.replace(RANGE_PREFIX, "").trim()
  return { raw, normalized }
}

/**
 * True when `current` is older than `target` using numeric semver comparison.
 * Pre-release tags are not handled (Forkshop doesn't ship them at 1.0).
 */
export function isEnginePinBehind(current: string, target: string): boolean {
  const a = current.split(".").map((n) => Number.parseInt(n, 10))
  const b = target.split(".").map((n) => Number.parseInt(n, 10))
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai < bi) return true
    if (ai > bi) return false
  }
  return false
}

/**
 * Rewrites `@forkshop/engine` in the user's package.json to a new version,
 * preserving any leading range prefix (^, ~). Used by `forkshop update` when
 * the user accepts the engine-pin soft offer.
 */
export async function bumpEnginePin(
  projectRoot: string,
  newNormalizedVersion: string
): Promise<void> {
  const target = path.join(projectRoot, "package.json")
  const text = await fs.readFile(target, "utf8")
  const pkg = JSON.parse(text) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const updateBlock = (block: Record<string, string> | undefined): boolean => {
    if (!block || !block["@forkshop/engine"]) return false
    const existing = block["@forkshop/engine"]!
    const prefixMatch = existing.match(RANGE_PREFIX)
    const prefix = prefixMatch ? prefixMatch[0] : ""
    block["@forkshop/engine"] = `${prefix}${newNormalizedVersion}`
    return true
  }
  const inDeps = updateBlock(pkg.dependencies)
  if (!inDeps) updateBlock(pkg.devDependencies)
  await fs.writeFile(target, JSON.stringify(pkg, null, 2) + "\n", "utf8")
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- engine-version`
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/engine-version.ts packages/cli/src/engine-version.test.ts
git commit -m "feat(cli): engine-pin reader + bumper for soft-offer flow"
```

---

### Task 6: Slim `rewrite.ts` to a placeholder substituter

**Files:**
- Modify: `packages/cli/src/rewrite.ts`
- Test: `packages/cli/src/rewrite.test.ts`

The longest-prefix-match algorithm goes. The new responsibility: substitute `{{srcPrefix}}` and `{{mount}}` placeholders in markdown content so doc paths reflect the user's project layout.

- [ ] **Step 1: Replace the test with v2 behavior**

```ts
// packages/cli/src/rewrite.test.ts
import { describe, expect, it } from "vitest"
import { applyTemplatePlaceholders } from "./rewrite.js"

describe("applyTemplatePlaceholders", () => {
  it("substitutes {{srcPrefix}} with empty string by default", () => {
    const src = "Open `{{srcPrefix}}app/forkshop/CLAUDE.md`."
    expect(applyTemplatePlaceholders(src, { srcPrefix: "", mount: "@/app/forkshop" })).toBe(
      "Open `app/forkshop/CLAUDE.md`."
    )
  })

  it("substitutes {{srcPrefix}} with src/ when configured", () => {
    const src = "Open `{{srcPrefix}}app/forkshop/CLAUDE.md`."
    expect(applyTemplatePlaceholders(src, { srcPrefix: "src/", mount: "@/app/forkshop" })).toBe(
      "Open `src/app/forkshop/CLAUDE.md`."
    )
  })

  it("substitutes {{mount}} with the user's mount alias", () => {
    const src = 'import config from "{{mount}}/forkshop.config"'
    expect(
      applyTemplatePlaceholders(src, { srcPrefix: "", mount: "@/app/forkshop" })
    ).toBe('import config from "@/app/forkshop/forkshop.config"')
  })

  it("leaves non-placeholder content untouched", () => {
    const src = "Plain text with @forkshop/engine — should not change."
    expect(applyTemplatePlaceholders(src, { srcPrefix: "", mount: "@/app/forkshop" })).toBe(src)
  })

  it("substitutes multiple occurrences", () => {
    const src = "`{{srcPrefix}}foo` and `{{srcPrefix}}bar`"
    expect(
      applyTemplatePlaceholders(src, { srcPrefix: "src/", mount: "@/app/forkshop" })
    ).toBe("`src/foo` and `src/bar`")
  })
})
```

- [ ] **Step 2: Run, expect FAIL (old `rewriteImports` export)**

Run: `pnpm --filter forkshop test -- rewrite`
Expected: FAIL.

- [ ] **Step 3: Replace `rewrite.ts` with the v2 substituter**

```ts
// packages/cli/src/rewrite.ts
import type { ResolvedAliases } from "./manifest-schema.js"

/**
 * v2: tiny placeholder substituter for template content. Replaces:
 *   - {{srcPrefix}} → "" or "src/" (from detected tsconfig convention)
 *   - {{mount}}     → user's mount alias (default "@/app/forkshop")
 *
 * Engine imports in templates stay as `@forkshop/engine/*` — no rewriting
 * needed, the engine is a real npm package now.
 */
export function applyTemplatePlaceholders(content: string, aliases: ResolvedAliases): string {
  return content
    .replace(/\{\{srcPrefix\}\}/g, aliases.srcPrefix)
    .replace(/\{\{mount\}\}/g, aliases.mount)
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- rewrite`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/rewrite.ts packages/cli/src/rewrite.test.ts
git commit -m "refactor(cli): collapse rewrite.ts to template placeholder substituter"
```

---

### Task 7: Update `resolve-destination.ts` for slim aliases

**Files:**
- Modify: `packages/cli/src/resolve-destination.ts`
- Test: `packages/cli/src/resolve-destination.test.ts`

The old longest-prefix-match for `@forkshop/{components,kits,hooks,lib,api,tailwind}` is gone. New shape: every text file in the v2 manifest carries a `destOverride` (set by the manifest builder). The resolver applies `{aliases.mount}` placeholder and `srcPrefix`.

- [ ] **Step 1: Rewrite the test**

```ts
// packages/cli/src/resolve-destination.test.ts
import { describe, expect, it } from "vitest"
import { resolveDestination } from "./resolve-destination.js"
import type { ManifestFile, ResolvedAliases } from "./manifest-schema.js"

const defaultAliases: ResolvedAliases = {
  mount: "@/app/forkshop",
  srcPrefix: "",
}

describe("resolveDestination", () => {
  it("resolves a skill file to .claude/skills/forkshop-<name>.md", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
      destOverride: ".claude/skills/forkshop-setup.md",
    }
    expect(resolveDestination("@forkshop/skill/setup", file, defaultAliases)).toBe(
      ".claude/skills/forkshop-setup.md"
    )
  })

  it("resolves CLAUDE.md to {aliases.mount}/CLAUDE.md", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
      destOverride: "{aliases.mount}/CLAUDE.md",
    }
    expect(resolveDestination("@forkshop/templates/claude-md", file, defaultAliases)).toBe(
      "app/forkshop/CLAUDE.md"
    )
  })

  it("respects srcPrefix for mount-based destinations", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
      destOverride: "{aliases.mount}/CLAUDE.md",
    }
    expect(
      resolveDestination("@forkshop/templates/claude-md", file, {
        mount: "@/app/forkshop",
        srcPrefix: "src/",
      })
    ).toBe("src/app/forkshop/CLAUDE.md")
  })

  it("resolves binary fonts to public/fonts/forkshop/<basename>", () => {
    const file: ManifestFile = {
      kind: "binary",
      url: "fonts/raveo/RaveoVF.woff2",
      destOverride: "public/fonts/forkshop/RaveoVF.woff2",
    }
    expect(resolveDestination("@forkshop/fonts/raveo/RaveoVF", file, defaultAliases)).toBe(
      "public/fonts/forkshop/RaveoVF.woff2"
    )
  })

  it("resolves route stubs to app/api/forkshop/<name>/route.ts", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "ts",
      content: 'export { POST, GET } from "@forkshop/engine/api/edit/route"\n',
      destOverride: "app/api/forkshop/edit/route.ts",
    }
    expect(resolveDestination("@forkshop/route-stubs/edit", file, defaultAliases)).toBe(
      "app/api/forkshop/edit/route.ts"
    )
  })

  it("throws when a text file has no destOverride", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
    }
    expect(() => resolveDestination("@forkshop/whatever", file, defaultAliases)).toThrow(
      /destOverride/
    )
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- resolve-destination`
Expected: FAIL.

- [ ] **Step 3: Rewrite `resolve-destination.ts`**

```ts
// packages/cli/src/resolve-destination.ts
import type { ManifestFile, ResolvedAliases } from "./manifest-schema.js"

/**
 * In v2 every file in the manifest carries an explicit destOverride.
 * The resolver applies the {aliases.mount} placeholder and the srcPrefix
 * convention. No more longest-prefix-match across 6 aliases.
 */
export function resolveDestination(
  _address: string,
  file: ManifestFile,
  aliases: ResolvedAliases
): string {
  const template = file.destOverride
  if (!template) {
    throw new Error(`v2 manifest file is missing destOverride (kind=${file.kind})`)
  }
  return applyDestPlaceholders(template, aliases)
}

function applyDestPlaceholders(template: string, aliases: ResolvedAliases): string {
  let next = template.replace(/\{aliases\.mount\}/g, aliases.mount)
  next = workspaceRelative(next, aliases)
  return next
}

function workspaceRelative(value: string, aliases: ResolvedAliases): string {
  // Strip leading "@/" (the user-facing alias) and prepend srcPrefix so the
  // result is a workspace-relative on-disk path.
  const stripped = value.replace(/^@\//, "")
  return aliases.srcPrefix + stripped
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- resolve-destination`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/resolve-destination.ts packages/cli/src/resolve-destination.test.ts
git commit -m "refactor(cli): destination resolver assumes destOverride on every file"
```

---

## Phase B — Path rewrites + lock helpers

### Task 8: Update `resolve-bundles.ts` for v2 bundle shapes

**Files:**
- Modify: `packages/cli/src/resolve-bundles.ts`
- Test: `packages/cli/src/resolve-bundles.test.ts`

The bundle kinds renamed (`primitive`/`kit`/`asset` → `scaffold`/`asset`/`composite`). The `deps` array on bundle entries is gone (init merges `@forkshop/engine` directly).

- [ ] **Step 1: Rewrite the test**

```ts
// packages/cli/src/resolve-bundles.test.ts
import { describe, expect, it } from "vitest"
import { resolveBundles } from "./resolve-bundles.js"
import type { Manifest } from "./manifest-schema.js"

function mkManifest(): Manifest {
  return {
    version: "2.0.0",
    generatedAt: "2026-05-17T00:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    engineVersion: "0.3.0",
    bundles: {
      "route-stubs": { kind: "scaffold", items: ["@forkshop/route-stubs/edit"] },
      skill: { kind: "scaffold", items: ["@forkshop/skill/setup"] },
      "claude-md": { kind: "scaffold", items: ["@forkshop/templates/claude-md"] },
      font: { kind: "asset", items: ["@forkshop/fonts/raveo/RaveoVF"] },
      init: {
        kind: "composite",
        includes: ["route-stubs", "skill", "claude-md", "font"],
      },
    },
    files: {
      "@forkshop/route-stubs/edit": {
        kind: "text",
        ext: "ts",
        content: "// ...",
        destOverride: "app/api/forkshop/edit/route.ts",
      },
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content: "# setup",
        destOverride: ".claude/skills/forkshop-setup.md",
      },
      "@forkshop/templates/claude-md": {
        kind: "text",
        ext: "md",
        content: "# claude md",
        destOverride: "{aliases.mount}/CLAUDE.md",
      },
      "@forkshop/fonts/raveo/RaveoVF": {
        kind: "binary",
        url: "fonts/raveo/RaveoVF.woff2",
        destOverride: "public/fonts/forkshop/RaveoVF.woff2",
      },
    },
  }
}

describe("resolveBundles", () => {
  it("expands the init composite to all file addresses", () => {
    const resolved = resolveBundles(mkManifest(), ["init"])
    expect(resolved.fileAddresses).toEqual([
      "@forkshop/route-stubs/edit",
      "@forkshop/skill/setup",
      "@forkshop/templates/claude-md",
      "@forkshop/fonts/raveo/RaveoVF",
    ])
    expect(resolved.bundleNames).toEqual(["route-stubs", "skill", "claude-md", "font"])
  })

  it("resolves a single leaf bundle", () => {
    const resolved = resolveBundles(mkManifest(), ["skill"])
    expect(resolved.fileAddresses).toEqual(["@forkshop/skill/setup"])
    expect(resolved.bundleNames).toEqual(["skill"])
  })

  it("throws on unknown bundle name", () => {
    expect(() => resolveBundles(mkManifest(), ["nope"])).toThrow(/Unknown bundle/)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- resolve-bundles`
Expected: FAIL.

- [ ] **Step 3: Rewrite `resolve-bundles.ts`**

```ts
// packages/cli/src/resolve-bundles.ts
import type { Manifest } from "./manifest-schema.js"

export interface ResolvedBundles {
  fileAddresses: string[]
  bundleNames: string[]
}

export function resolveBundles(manifest: Manifest, names: string[]): ResolvedBundles {
  const visited = new Set<string>()
  const fileSet = new Set<string>()

  function visit(name: string) {
    if (visited.has(name)) return
    visited.add(name)
    const bundle = manifest.bundles[name]
    if (!bundle) {
      throw new Error(
        `Unknown bundle: "${name}". Available: ${Object.keys(manifest.bundles).join(", ")}.`
      )
    }
    if (bundle.kind === "composite") {
      for (const inc of bundle.includes) visit(inc)
    } else {
      for (const item of bundle.items) fileSet.add(item)
    }
  }

  for (const name of names) visit(name)

  return {
    fileAddresses: [...fileSet],
    bundleNames: [...visited].filter((n) => {
      const bundle = manifest.bundles[n]
      return bundle && bundle.kind !== "composite"
    }),
  }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- resolve-bundles`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/resolve-bundles.ts packages/cli/src/resolve-bundles.test.ts
git commit -m "refactor(cli): resolve-bundles drops deps, supports v2 bundle kinds"
```

---

### Task 9: Update `copy-files.ts` to use slim aliases + new rewriter

**Files:**
- Modify: `packages/cli/src/copy-files.ts`
- Test: `packages/cli/src/copy-files.test.ts`

`copy-files.ts` calls `applyTemplatePlaceholders` instead of `rewriteImports`. The `aliases` parameter becomes `ResolvedAliases` (slim shape).

- [ ] **Step 1: Rewrite the test**

```ts
// packages/cli/src/copy-files.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { copyManifestFiles, findCollisions } from "./copy-files.js"
import type { Manifest } from "./manifest-schema.js"

const baseManifest: Manifest = {
  version: "2.0.0",
  generatedAt: "2026-05-17T00:00:00Z",
  registryBaseUrl: "https://example.test/r/",
  engineVersion: "0.3.0",
  bundles: {},
  files: {
    "@forkshop/skill/setup": {
      kind: "text",
      ext: "md",
      content: "Run `npx forkshop init` then open `{{srcPrefix}}app/forkshop/`.\n",
      destOverride: ".claude/skills/forkshop-setup.md",
    },
    "@forkshop/route-stubs/edit": {
      kind: "text",
      ext: "ts",
      content: 'export { POST, GET } from "@forkshop/engine/api/edit/route"\n',
      destOverride: "app/api/forkshop/edit/route.ts",
    },
  },
}

describe("copyManifestFiles", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("writes text files with placeholders applied and records shas", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-copy-"))
    tempDirs.push(root)
    const plan = await copyManifestFiles({
      projectRoot: root,
      manifest: baseManifest,
      aliases: { mount: "@/app/forkshop", srcPrefix: "src/" },
      fileAddresses: ["@forkshop/skill/setup"],
    })
    expect(plan).toHaveLength(1)
    expect(plan[0]!.dest).toBe(".claude/skills/forkshop-setup.md")
    expect(typeof plan[0]!.sha).toBe("string")

    const written = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(written).toContain("`src/app/forkshop/`")
  })

  it("does not touch engine package imports in route stubs", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-copy-"))
    tempDirs.push(root)
    await copyManifestFiles({
      projectRoot: root,
      manifest: baseManifest,
      aliases: { mount: "@/app/forkshop", srcPrefix: "" },
      fileAddresses: ["@forkshop/route-stubs/edit"],
    })
    const written = await fs.readFile(
      path.join(root, "app/api/forkshop/edit/route.ts"),
      "utf8"
    )
    expect(written).toBe('export { POST, GET } from "@forkshop/engine/api/edit/route"\n')
  })
})

describe("findCollisions", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("returns paths that already exist", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-coll-"))
    tempDirs.push(root)
    await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
    await fs.writeFile(path.join(root, ".claude/skills/forkshop-setup.md"), "old")
    const collisions = await findCollisions(root, [
      ".claude/skills/forkshop-setup.md",
      ".claude/skills/forkshop-doc-sync.md",
    ])
    expect(collisions).toEqual([".claude/skills/forkshop-setup.md"])
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- copy-files`
Expected: FAIL.

- [ ] **Step 3: Rewrite `copy-files.ts`**

```ts
// packages/cli/src/copy-files.ts
import { promises as fs } from "node:fs"
import path from "node:path"
import type { Manifest, ResolvedAliases } from "./manifest-schema.js"
import { resolveDestination } from "./resolve-destination.js"
import { applyTemplatePlaceholders } from "./rewrite.js"
import { sha256Hex } from "./sha.js"

export interface CopyOptions {
  projectRoot: string
  manifest: Manifest
  aliases: ResolvedAliases
  fileAddresses: string[]
}

export interface CopyPlanEntry {
  address: string
  dest: string
  sha: string
}

export type CopyPlan = CopyPlanEntry[]

/**
 * Copies the requested manifest files into the user's project, applying
 * template-placeholder substitution to text files. Binary files (the font)
 * are handled by the init flow via the dedicated font-fetch utility — NOT
 * routed through this function — because their delivery has a fallback
 * (unpkg) and a `binary` ManifestFile is just a pointer (no content inline).
 */
export async function copyManifestFiles(options: CopyOptions): Promise<CopyPlan> {
  const { projectRoot, manifest, aliases, fileAddresses } = options
  const plan: CopyPlan = []

  for (const address of fileAddresses) {
    const file = manifest.files[address]
    if (!file) throw new Error(`Address ${address} missing from manifest files`)
    if (file.kind === "binary") {
      // Skipped here — see comment above. Caller handles binaries directly.
      continue
    }

    const dest = resolveDestination(address, file, aliases)
    const absDest = path.join(projectRoot, dest)
    await fs.mkdir(path.dirname(absDest), { recursive: true })

    const rewritten = applyTemplatePlaceholders(file.content, aliases)
    await fs.writeFile(absDest, rewritten, "utf8")
    plan.push({ address, dest, sha: sha256Hex(rewritten) })
  }

  return plan
}

export async function findCollisions(
  projectRoot: string,
  destinations: string[]
): Promise<string[]> {
  const collisions: string[] = []
  for (const dest of destinations) {
    try {
      await fs.access(path.join(projectRoot, dest))
      collisions.push(dest)
    } catch {
      // not present — OK
    }
  }
  return collisions
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- copy-files`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/copy-files.ts packages/cli/src/copy-files.test.ts
git commit -m "refactor(cli): copy-files uses placeholder substituter, skips binaries"
```

---

### Task 10: Update `write-deps.ts` (only `@forkshop/engine` to merge)

**Files:**
- Modify: `packages/cli/src/write-deps.ts` — minimal; signature unchanged
- Test: `packages/cli/src/write-deps.test.ts` — slim to v2-shape inputs

The function already takes `readonly string[]` of dep specs and merges them. Behavior unchanged; only the test fixtures shrink (single dep instead of the old multi-dep set).

- [ ] **Step 1: Rewrite the test**

```ts
// packages/cli/src/write-deps.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { mergeDepsIntoPackageJson, parseDepSpec } from "./write-deps.js"

describe("parseDepSpec", () => {
  it("parses @forkshop/engine@0.3.0", () => {
    expect(parseDepSpec("@forkshop/engine@0.3.0")).toEqual({
      name: "@forkshop/engine",
      version: "0.3.0",
    })
  })

  it("parses a scoped dep with caret range", () => {
    expect(parseDepSpec("@forkshop/engine@^0.3.0")).toEqual({
      name: "@forkshop/engine",
      version: "^0.3.0",
    })
  })

  it("parses an unscoped dep", () => {
    expect(parseDepSpec("clsx@2.1.1")).toEqual({ name: "clsx", version: "2.1.1" })
  })

  it("returns version '*' for bare scoped names", () => {
    expect(parseDepSpec("@forkshop/engine")).toEqual({ name: "@forkshop/engine", version: "*" })
  })
})

describe("mergeDepsIntoPackageJson", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  async function setup(initialPkg: object): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-wd-"))
    tempDirs.push(root)
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify(initialPkg, null, 2))
    return root
  }

  it("adds @forkshop/engine when absent", async () => {
    const root = await setup({ dependencies: { next: "^14.0.0" } })
    const added = await mergeDepsIntoPackageJson(root, ["@forkshop/engine@^0.3.0"])
    expect(added).toEqual(["@forkshop/engine"])
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBe("^0.3.0")
    expect(pkg.dependencies.next).toBe("^14.0.0")
  })

  it("does not overwrite an existing pin", async () => {
    const root = await setup({ dependencies: { "@forkshop/engine": "0.2.0" } })
    const added = await mergeDepsIntoPackageJson(root, ["@forkshop/engine@^0.3.0"])
    expect(added).toEqual([])
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBe("0.2.0")
  })

  it("handles missing dependencies block", async () => {
    const root = await setup({})
    const added = await mergeDepsIntoPackageJson(root, ["@forkshop/engine@^0.3.0"])
    expect(added).toEqual(["@forkshop/engine"])
  })
})
```

- [ ] **Step 2: Run, expect PASS (write-deps.ts behavior is unchanged)**

Run: `pnpm --filter forkshop test -- write-deps`
Expected: 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/write-deps.test.ts
git commit -m "test(cli): write-deps focuses on @forkshop/engine merge"
```

---

## Phase C — Init flow rewrite

### Task 11: Init flow — happy path

**Files:**
- Modify: `packages/cli/src/commands/init.ts`
- Test: `packages/cli/src/commands/init.test.ts`

Full rewrite of the flow: PM detect → manifest fetch → src/ detect → resolve init bundle → collision check → copy text files → fetch font → append CSS import → merge engine into package.json → write `forkshop.json` → print summary.

- [ ] **Step 1: Rewrite the test, happy path**

```ts
// packages/cli/src/commands/init.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runInit } from "./init.js"
import type { Manifest } from "../manifest-schema.js"

function fakeManifest(): Manifest {
  return {
    version: "2.0.0",
    generatedAt: "2026-05-17T00:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    engineVersion: "0.3.0",
    bundles: {
      "route-stubs": { kind: "scaffold", items: ["@forkshop/route-stubs/edit"] },
      skill: { kind: "scaffold", items: ["@forkshop/skill/setup"] },
      "claude-md": { kind: "scaffold", items: ["@forkshop/templates/claude-md"] },
      font: { kind: "asset", items: ["@forkshop/fonts/raveo/RaveoVF"] },
      init: {
        kind: "composite",
        includes: ["route-stubs", "skill", "claude-md", "font"],
      },
    },
    files: {
      "@forkshop/route-stubs/edit": {
        kind: "text",
        ext: "ts",
        content: 'export { POST, GET } from "@forkshop/engine/api/edit/route"\n',
        destOverride: "app/api/forkshop/edit/route.ts",
      },
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content: "# setup\n",
        destOverride: ".claude/skills/forkshop-setup.md",
      },
      "@forkshop/templates/claude-md": {
        kind: "text",
        ext: "md",
        content: "# claude md\nOpen `{{srcPrefix}}app/forkshop/`.\n",
        destOverride: "{aliases.mount}/CLAUDE.md",
      },
      "@forkshop/fonts/raveo/RaveoVF": {
        kind: "binary",
        url: "fonts/raveo/RaveoVF.woff2",
        destOverride: "public/fonts/forkshop/RaveoVF.woff2",
      },
    },
  }
}

async function setupProject(overrides: { withSrc?: boolean } = {}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-init-"))
  await fs.mkdir(path.join(root, overrides.withSrc ? "src/app" : "app"), { recursive: true })
  await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        paths: { "@/*": [overrides.withSrc ? "./src/*" : "./*"] },
      },
    })
  )
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "host", dependencies: { next: "^14.0.0" } }, null, 2)
  )
  await fs.writeFile(
    path.join(root, overrides.withSrc ? "src/app/globals.css" : "app/globals.css"),
    "@tailwind base;\n@tailwind utilities;\n"
  )
  return root
}

describe("runInit (v2)", () => {
  const dirs: string[] = []

  beforeEach(() => {
    // Mock fetch for the font binary
    const payload = new Uint8Array([0x77, 0x4f, 0x46, 0x32])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => payload.buffer,
    } as unknown as Response)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("happy path — flat layout, drops scaffold + writes lock", async () => {
    const root = await setupProject()
    dirs.push(root)
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(true)

    expect(
      await fs.readFile(path.join(root, ".claude/skills/forkshop-setup.md"), "utf8")
    ).toBe("# setup\n")
    expect(
      await fs.readFile(path.join(root, "app/api/forkshop/edit/route.ts"), "utf8")
    ).toBe('export { POST, GET } from "@forkshop/engine/api/edit/route"\n')
    expect(await fs.readFile(path.join(root, "app/forkshop/CLAUDE.md"), "utf8")).toContain(
      "Open `app/forkshop/`."
    )

    const fontBuf = await fs.readFile(path.join(root, "public/fonts/forkshop/RaveoVF.woff2"))
    expect(fontBuf.length).toBe(4)

    const globals = await fs.readFile(path.join(root, "app/globals.css"), "utf8")
    expect(globals.startsWith('@import "@forkshop/engine/forkshop.css";')).toBe(true)

    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBeDefined()

    const lock = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lock.schemaVersion).toBe("2.0.0")
    expect(lock.engineVersion).toBe("0.3.0")
    expect(lock.mount).toBe("@/app/forkshop")
    expect(lock.srcPrefix).toBe("")
    expect(lock.installedBundles).toEqual([
      "route-stubs",
      "skill",
      "claude-md",
      "font",
    ])
    expect(lock.files["@forkshop/skill/setup"].dest).toBe(
      ".claude/skills/forkshop-setup.md"
    )
    expect(lock.files["@forkshop/fonts/raveo/RaveoVF"].dest).toBe(
      "public/fonts/forkshop/RaveoVF.woff2"
    )
  })

  it("respects detected src/ convention", async () => {
    const root = await setupProject({ withSrc: true })
    dirs.push(root)
    const result = await runInit({
      projectRoot: root,
      manifest: fakeManifest(),
    })
    expect(result.ok).toBe(true)
    expect(
      await fs.readFile(path.join(root, "src/app/forkshop/CLAUDE.md"), "utf8")
    ).toContain("Open `src/app/forkshop/`.")
    const lock = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lock.srcPrefix).toBe("src/")
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- commands/init`
Expected: FAIL (old init.ts mismatched).

- [ ] **Step 3: Rewrite `init.ts`**

```ts
// packages/cli/src/commands/init.ts
import path from "node:path"
import { promises as fs } from "node:fs"
import pc from "picocolors"
import { detectPackageManager } from "../detect-pm.js"
import { detectSrcPrefix } from "../detect-src-dir.js"
import { fetchManifest } from "../fetch-manifest.js"
import { copyManifestFiles, findCollisions } from "../copy-files.js"
import { writeForkshopJson } from "../forkshop-json.js"
import { appendForkshopCssImport } from "../globals-css-append.js"
import { fetchFontTo } from "../font-fetch.js"
import {
  DEFAULT_ALIASES,
  type ForkshopJson,
  type Manifest,
  type ResolvedAliases,
} from "../manifest-schema.js"
import { preflightInit } from "../preflight.js"
import { resolveBundles } from "../resolve-bundles.js"
import { resolveDestination } from "../resolve-destination.js"
import { mergeDepsIntoPackageJson } from "../write-deps.js"

export interface InitOptions {
  projectRoot: string
  manifest?: Manifest                 // injected by tests; production uses fetchManifest
  registryUrl?: string
  force?: boolean
}

export type InitResult = { ok: true } | { ok: false; reason: string }

const DEFAULT_REGISTRY_URL = "https://forkshop.dev/r/"

export async function runInit(options: InitOptions): Promise<InitResult> {
  const { projectRoot, force = false } = options
  const registryUrl = options.registryUrl ?? DEFAULT_REGISTRY_URL

  // 1. Preflight
  const pre = await preflightInit(projectRoot, {})
  if (!pre.ok) return pre

  // 2. Refuse re-install
  try {
    await fs.access(path.join(projectRoot, "forkshop.json"))
    return {
      ok: false,
      reason:
        "Forkshop is already installed. Use `forkshop diff <file>` or `forkshop update`.",
    }
  } catch {
    /* OK */
  }

  // 3. Fetch manifest
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))

  // 3a. Schema gate
  if (manifest.version !== "2.0.0") {
    return {
      ok: false,
      reason: `Registry returned manifest schema ${manifest.version}; this CLI expects 2.0.0. Update your CLI or registry.`,
    }
  }

  // 4. Detect src/
  const srcPrefix = (await detectSrcPrefix(projectRoot)) as "" | "src/"

  // 5. Build aliases
  const aliases: ResolvedAliases = {
    mount: DEFAULT_ALIASES.mount,
    srcPrefix,
  }
  if (srcPrefix) {
    console.log(
      pc.dim(`\nDetected \`src/\` convention from tsconfig.json — installing under src/.`)
    )
  }

  // 6. Resolve init bundle
  const resolved = resolveBundles(manifest, ["init"])

  // 7. Collision check (text files + font)
  const destinations = resolved.fileAddresses.map((address) => {
    const file = manifest.files[address]
    if (!file) throw new Error(`Missing file in manifest: ${address}`)
    return resolveDestination(address, file, aliases)
  })
  const collisions = await findCollisions(projectRoot, destinations)
  if (collisions.length > 0 && !force) {
    return {
      ok: false,
      reason:
        "These paths conflict with existing files:\n  " +
        collisions.join("\n  ") +
        "\n\nMove them aside or rerun with --force.",
    }
  }

  // 8. Copy text files
  const textPlan = await copyManifestFiles({
    projectRoot,
    manifest,
    aliases,
    fileAddresses: resolved.fileAddresses,
  })

  // 9. Fetch + write font (binary not handled by copyManifestFiles)
  const fontAddress = "@forkshop/fonts/raveo/RaveoVF"
  const fontFile = manifest.files[fontAddress]
  let fontPlanEntry: { address: string; dest: string; sha: string } | undefined
  if (fontFile && fontFile.kind === "binary") {
    const dest = resolveDestination(fontAddress, fontFile, aliases)
    const absDest = path.join(projectRoot, dest)
    const primaryUrl = new URL(fontFile.url, manifest.registryBaseUrl).toString()
    const fallbackUrl = `https://unpkg.com/@forkshop/engine@${manifest.engineVersion}/dist/fonts/RaveoVF.woff2`
    const result = await fetchFontTo({
      primaryUrl,
      fallbackUrl,
      destAbsolute: absDest,
    })
    if (result.source === "fallback") {
      console.log(pc.yellow(`\nFont fetched from unpkg fallback (registry binary unreachable).`))
    }
    const bytes = await fs.readFile(absDest)
    const { sha256Hex } = await import("../sha.js")
    fontPlanEntry = { address: fontAddress, dest, sha: sha256Hex(bytes.toString("hex")) }
  }

  // 10. Append CSS import
  const cssResult = await appendForkshopCssImport(projectRoot)
  if (cssResult.action === "skipped") {
    console.log(pc.dim(`\n${cssResult.target} already imports forkshop.css — skipped.`))
  }

  // 11. Merge engine into package.json
  const addedDeps = await mergeDepsIntoPackageJson(projectRoot, [
    `@forkshop/engine@^${manifest.engineVersion}`,
  ])

  // 12. Write forkshop.json
  const allPlan = [...textPlan, ...(fontPlanEntry ? [fontPlanEntry] : [])]
  const lock: ForkshopJson = {
    $schema: "https://forkshop.dev/schema/forkshop.json",
    schemaVersion: "2.0.0",
    installedAt: new Date().toISOString(),
    registryUrl,
    engineVersion: manifest.engineVersion,
    mount: aliases.mount,
    srcPrefix: aliases.srcPrefix,
    installedBundles: resolved.bundleNames,
    files: Object.fromEntries(allPlan.map((e) => [e.address, { dest: e.dest, sha: e.sha }])),
  }
  await writeForkshopJson(projectRoot, lock)

  // 13. Summary
  console.log(pc.green(`\nInstalled ${allPlan.length} files into your project.`))
  if (addedDeps.length > 0) {
    const pm = await detectPackageManager(projectRoot)
    const installCmd =
      pm === "pnpm"
        ? "pnpm install"
        : pm === "yarn"
          ? "yarn"
          : pm === "bun"
            ? "bun install"
            : "npm install"
    console.log(
      pc.dim(`\nAdded \`@forkshop/engine\` to package.json. Run \`${installCmd}\` to fetch it.`)
    )
  }
  console.log("\nNext steps:")
  console.log("  1. Open Claude Code in this project and type 'set up Forkshop' to finish wiring.")
  console.log("  2. Or read `app/forkshop/CLAUDE.md` to extend Forkshop by hand.")

  return { ok: true }
}
```

- [ ] **Step 4: Run, expect PASS for happy path**

Run: `pnpm --filter forkshop test -- commands/init`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/init.ts packages/cli/src/commands/init.test.ts
git commit -m "feat(cli): init flow rebuilt around @forkshop/engine on npm"
```

---

### Task 12: Init flow — collision + force tests

**Files:**
- Modify: `packages/cli/src/commands/init.test.ts`

Add the collision-detection cases that the v1 test covered.

- [ ] **Step 1: Append the collision tests**

Add these inside the existing `describe("runInit (v2)", ...)` block:

```ts
it("refuses if forkshop.json already exists", async () => {
  const root = await setupProject()
  dirs.push(root)
  await fs.writeFile(path.join(root, "forkshop.json"), "{}")
  const result = await runInit({
    projectRoot: root,
    manifest: fakeManifest(),
  })
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.reason).toMatch(/already installed/i)
})

it("refuses on collision with an existing scaffold file (no --force)", async () => {
  const root = await setupProject()
  dirs.push(root)
  await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
  await fs.writeFile(path.join(root, ".claude/skills/forkshop-setup.md"), "pre-existing")
  const result = await runInit({
    projectRoot: root,
    manifest: fakeManifest(),
  })
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.reason).toMatch(/conflict/i)
})

it("overwrites on collision with --force", async () => {
  const root = await setupProject()
  dirs.push(root)
  await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
  await fs.writeFile(path.join(root, ".claude/skills/forkshop-setup.md"), "pre-existing")
  const result = await runInit({
    projectRoot: root,
    manifest: fakeManifest(),
    force: true,
  })
  expect(result.ok).toBe(true)
  expect(
    await fs.readFile(path.join(root, ".claude/skills/forkshop-setup.md"), "utf8")
  ).toBe("# setup\n")
})

it("rejects v1 manifest", async () => {
  const root = await setupProject()
  dirs.push(root)
  const m = fakeManifest()
  m.version = "1.0.0"
  const result = await runInit({
    projectRoot: root,
    manifest: m,
  })
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.reason).toMatch(/schema/i)
})
```

- [ ] **Step 2: Run, expect PASS**

Run: `pnpm --filter forkshop test -- commands/init`
Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/init.test.ts
git commit -m "test(cli): init collision + force + schema-gate cases"
```

---

### Task 13: Reduce `add.ts` to 1.0 placeholder

**Files:**
- Modify: `packages/cli/src/commands/add.ts`
- Test: `packages/cli/src/commands/add.test.ts`

The command stays — exits 0 with a printed message pointing at the kits rewrite spec.

- [ ] **Step 1: Rewrite the test**

```ts
// packages/cli/src/commands/add.test.ts
import { describe, expect, it, vi } from "vitest"
import { runAdd } from "./add.js"

describe("runAdd (placeholder for 1.0)", () => {
  it("prints the deferred-kits message and returns ok", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = await runAdd({ projectRoot: "/tmp", bundleName: "marketing" })
    expect(result.ok).toBe(true)
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n")
    expect(output).toMatch(/No add-on bundles ship in 1\.0/)
    expect(output).toMatch(/kits rewrite/)
    logSpy.mockRestore()
  })

  it("does not touch the filesystem (no manifest fetch, no file copy)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
    await runAdd({ projectRoot: "/tmp", bundleName: "anything" })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run, expect FAIL (signature mismatch)**

Run: `pnpm --filter forkshop test -- commands/add`
Expected: FAIL.

- [ ] **Step 3: Replace `add.ts`**

```ts
// packages/cli/src/commands/add.ts
import pc from "picocolors"

export interface AddOptions {
  projectRoot: string
  bundleName: string
  registryUrl?: string
}

export type AddResult = { ok: true } | { ok: false; reason: string }

/**
 * Placeholder for 1.0. The kits rewrite spec (#4) re-enables real bundle
 * resolution. The command stays in the binary so muscle memory survives;
 * exits 0 with a pointer at the roadmap.
 */
export async function runAdd(_options: AddOptions): Promise<AddResult> {
  console.log(pc.bold("\nNo add-on bundles ship in 1.0.\n"))
  console.log(
    "The three starter kits (marketing, saas, default) arrive in the kits rewrite\n" +
      "(https://forkshop.dev/roadmap). Use `forkshop init` to install the base; run\n" +
      "the setup skill (open Claude Code, say 'set up Forkshop') to scaffold\n" +
      "app/forkshop/ for now."
  )
  return { ok: true }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- commands/add`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/add.ts packages/cli/src/commands/add.test.ts
git commit -m "feat(cli): add command becomes a 1.0 placeholder pointing at kits rewrite"
```

---

## Phase D — New `update` command

### Task 14: Update command — drift classification (unit)

**Files:**
- Create: `packages/cli/src/update-drift.ts`
- Create: `packages/cli/src/update-drift.test.ts`

Isolate the drift-classification logic from the command flow. Pure function, easy to test.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/update-drift.test.ts
import { describe, expect, it } from "vitest"
import { classifyDrift, type FileTriple } from "./update-drift.js"

describe("classifyDrift", () => {
  function mk(lockSha: string, manifestSha: string, diskSha?: string): FileTriple {
    return { address: "@forkshop/skill/setup", lockSha, manifestSha, diskSha }
  }

  it("unchanged when all three shas match", () => {
    expect(classifyDrift(mk("a", "a", "a"))).toBe("unchanged")
  })

  it("upstream-drift when manifest moved", () => {
    expect(classifyDrift(mk("a", "b", "a"))).toBe("upstream-drift")
  })

  it("local-drift when disk moved", () => {
    expect(classifyDrift(mk("a", "a", "c"))).toBe("local-drift")
  })

  it("both-drift when both moved", () => {
    expect(classifyDrift(mk("a", "b", "c"))).toBe("both-drift")
  })

  it("missing-on-disk when disk sha absent", () => {
    expect(classifyDrift({ address: "x", lockSha: "a", manifestSha: "b", diskSha: undefined })).toBe(
      "missing-on-disk"
    )
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- update-drift`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// packages/cli/src/update-drift.ts
export type DriftState =
  | "unchanged"
  | "upstream-drift"
  | "local-drift"
  | "both-drift"
  | "missing-on-disk"

export interface FileTriple {
  address: string
  lockSha: string
  manifestSha: string
  diskSha: string | undefined
}

export function classifyDrift(triple: FileTriple): DriftState {
  if (triple.diskSha === undefined) return "missing-on-disk"
  const upstreamMoved = triple.lockSha !== triple.manifestSha
  const localMoved = triple.lockSha !== triple.diskSha
  if (!upstreamMoved && !localMoved) return "unchanged"
  if (upstreamMoved && !localMoved) return "upstream-drift"
  if (!upstreamMoved && localMoved) return "local-drift"
  return "both-drift"
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- update-drift`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/update-drift.ts packages/cli/src/update-drift.test.ts
git commit -m "feat(cli): drift classifier for update command"
```

---

### Task 15: `update` command — flow + tests

**Files:**
- Create: `packages/cli/src/commands/update.ts`
- Create: `packages/cli/src/commands/update.test.ts`

The full flow as described in the spec. Includes `--check` mode and the engine soft-offer.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/update.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runUpdate } from "./update.js"
import type { ForkshopJson, Manifest } from "../manifest-schema.js"

function manifestWithSetupContent(content: string, engineVersion = "0.3.0"): Manifest {
  return {
    version: "2.0.0",
    generatedAt: "2026-05-17T00:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    engineVersion,
    bundles: {
      skill: { kind: "scaffold", items: ["@forkshop/skill/setup"] },
      init: { kind: "composite", includes: ["skill"] },
    },
    files: {
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content,
        destOverride: ".claude/skills/forkshop-setup.md",
      },
    },
  }
}

async function setupInstalled(opts: {
  setupContentOnDisk: string
  lockSha: string
  engineVersion?: string
  withEnginePin?: string
}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-upd-"))
  await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
  await fs.writeFile(
    path.join(root, ".claude/skills/forkshop-setup.md"),
    opts.setupContentOnDisk
  )
  const lock: ForkshopJson = {
    schemaVersion: "2.0.0",
    installedAt: "2026-05-17T00:00:00Z",
    registryUrl: "https://example.test/r/",
    engineVersion: opts.engineVersion ?? "0.3.0",
    mount: "@/app/forkshop",
    srcPrefix: "",
    installedBundles: ["skill"],
    files: {
      "@forkshop/skill/setup": {
        dest: ".claude/skills/forkshop-setup.md",
        sha: opts.lockSha,
      },
    },
  }
  await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lock, null, 2))
  if (opts.withEnginePin) {
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify(
        {
          dependencies: { "@forkshop/engine": opts.withEnginePin },
        },
        null,
        2
      )
    )
  }
  return root
}

import { sha256Hex } from "../sha.js"

describe("runUpdate", () => {
  const dirs: string[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("--check exits 0 when unchanged", async () => {
    const content = "old"
    const sha = sha256Hex(content)
    const root = await setupInstalled({
      setupContentOnDisk: content,
      lockSha: sha,
    })
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(content),
      checkOnly: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.exitCode).toBe(0)
  })

  it("--check exits 1 when upstream drift exists", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: oldContent,
      lockSha: sha,
    })
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      checkOnly: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.exitCode).toBe(1)
  })

  it("applies upstream-drift in apply mode", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: oldContent,
      lockSha: sha,
    })
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      apply: true,
    })
    expect(result.ok).toBe(true)
    const after = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(after).toBe("new")
  })

  it("skips local-drift without --force", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: "user edited",
      lockSha: sha,
    })
    dirs.push(root)
    await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      apply: true,
    })
    const after = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(after).toBe("user edited")
  })

  it("overwrites local-drift with --force", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: "user edited",
      lockSha: sha,
    })
    dirs.push(root)
    await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("new"),
      apply: true,
      force: true,
    })
    const after = await fs.readFile(
      path.join(root, ".claude/skills/forkshop-setup.md"),
      "utf8"
    )
    expect(after).toBe("new")
  })

  it("bumps engine pin when soft offer accepted", async () => {
    const oldContent = "old"
    const sha = sha256Hex(oldContent)
    const root = await setupInstalled({
      setupContentOnDisk: oldContent,
      lockSha: sha,
      engineVersion: "0.2.0",
      withEnginePin: "^0.2.0",
    })
    dirs.push(root)
    await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent(oldContent, "0.3.0"),
      apply: true,
      acceptEngineBump: true,
    })
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
    expect(pkg.dependencies["@forkshop/engine"]).toBe("^0.3.0")
    const lock = JSON.parse(await fs.readFile(path.join(root, "forkshop.json"), "utf8"))
    expect(lock.engineVersion).toBe("0.3.0")
  })

  it("refuses when forkshop.json absent", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-upd-"))
    dirs.push(root)
    const result = await runUpdate({
      projectRoot: root,
      manifest: manifestWithSetupContent("x"),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/forkshop init/)
  })
})
```

- [ ] **Step 2: Run, expect FAIL (module missing)**

Run: `pnpm --filter forkshop test -- commands/update`
Expected: FAIL.

- [ ] **Step 3: Implement `update.ts`**

```ts
// packages/cli/src/commands/update.ts
import { promises as fs } from "node:fs"
import path from "node:path"
import pc from "picocolors"
import { fetchManifest } from "../fetch-manifest.js"
import { readForkshopJson, writeForkshopJson } from "../forkshop-json.js"
import {
  bumpEnginePin,
  isEnginePinBehind,
  readEnginePin,
} from "../engine-version.js"
import {
  type ForkshopJson,
  type Manifest,
  type ResolvedAliases,
} from "../manifest-schema.js"
import { applyTemplatePlaceholders } from "../rewrite.js"
import { sha256Hex } from "../sha.js"
import { classifyDrift, type DriftState } from "../update-drift.js"

export interface UpdateOptions {
  projectRoot: string
  manifest?: Manifest                 // for tests
  registryUrl?: string                // override
  checkOnly?: boolean                 // --check
  apply?: boolean                     // skip prompt; useful in tests
  force?: boolean                     // overwrite local-drift
  acceptEngineBump?: boolean          // test-only — production reads from a prompt
}

export type UpdateResult =
  | { ok: true; exitCode: number }
  | { ok: false; reason: string }

interface PlanEntry {
  address: string
  dest: string
  state: DriftState
  manifestSha: string
  manifestContent: string             // rewritten ready-to-write content (binary handled separately)
}

export async function runUpdate(options: UpdateOptions): Promise<UpdateResult> {
  const { projectRoot, checkOnly = false, force = false } = options

  const lock = await readForkshopJson(projectRoot)
  if (!lock) {
    return { ok: false, reason: "Run `forkshop init` first." }
  }
  if (lock.schemaVersion !== "2.0.0") {
    return {
      ok: false,
      reason:
        "Your installation predates this CLI's manifest schema. Back up `app/forkshop/` and rerun `forkshop init`.",
    }
  }

  const registryUrl = options.registryUrl ?? lock.registryUrl
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))
  if (manifest.version !== "2.0.0") {
    return {
      ok: false,
      reason: `Registry returned manifest schema ${manifest.version}; this CLI expects 2.0.0.`,
    }
  }

  const aliases: ResolvedAliases = {
    mount: lock.mount,
    srcPrefix: lock.srcPrefix,
  }

  // Build the file plan
  const plan: PlanEntry[] = []
  for (const [address, lockEntry] of Object.entries(lock.files)) {
    const file = manifest.files[address]
    if (!file) continue  // removed upstream; leave on disk
    if (file.kind === "binary") {
      // Binary handled separately in production — out of scope for v2-first-cut tests.
      continue
    }
    const rewritten = applyTemplatePlaceholders(file.content, aliases)
    const manifestSha = sha256Hex(rewritten)
    let diskSha: string | undefined
    try {
      const onDisk = await fs.readFile(path.join(projectRoot, lockEntry.dest), "utf8")
      diskSha = sha256Hex(onDisk)
    } catch {
      diskSha = undefined
    }
    const state = classifyDrift({
      address,
      lockSha: lockEntry.sha,
      manifestSha,
      diskSha,
    })
    plan.push({
      address,
      dest: lockEntry.dest,
      state,
      manifestSha,
      manifestContent: rewritten,
    })
  }

  // Engine-pin drift
  const enginePin = await readEnginePin(projectRoot)
  const engineBehind = enginePin && isEnginePinBehind(enginePin.normalized, manifest.engineVersion)

  // Summary
  printSummary(manifest, plan, enginePin, engineBehind ?? false)

  if (checkOnly) {
    const anyDrift =
      plan.some((p) => p.state !== "unchanged") || engineBehind === true
    return { ok: true, exitCode: anyDrift ? 1 : 0 }
  }

  // Apply
  const apply = options.apply ?? true
  if (!apply) return { ok: true, exitCode: 0 }

  let updatedCount = 0
  for (const entry of plan) {
    const shouldApply =
      entry.state === "upstream-drift" ||
      entry.state === "missing-on-disk" ||
      ((entry.state === "local-drift" || entry.state === "both-drift") && force)
    if (!shouldApply) continue
    const abs = path.join(projectRoot, entry.dest)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, entry.manifestContent, "utf8")
    lock.files[entry.address] = { dest: entry.dest, sha: entry.manifestSha }
    updatedCount++
  }

  // Engine bump
  if (engineBehind && options.acceptEngineBump) {
    await bumpEnginePin(projectRoot, manifest.engineVersion)
    lock.engineVersion = manifest.engineVersion
  }

  await writeForkshopJson(projectRoot, lock)
  console.log(pc.green(`\nUpdated ${updatedCount} file${updatedCount === 1 ? "" : "s"}.`))
  if (engineBehind && options.acceptEngineBump) {
    console.log(
      pc.dim(`Engine pin bumped to ${manifest.engineVersion}. Run \`pnpm install\` to fetch it.`)
    )
  }
  return { ok: true, exitCode: 0 }
}

function printSummary(
  manifest: Manifest,
  plan: PlanEntry[],
  enginePin: { raw: string; normalized: string } | undefined,
  engineBehind: boolean
): void {
  console.log(
    pc.bold(`\nforkshop update — registry@${manifest.generatedAt.slice(0, 10)}`)
  )
  if (engineBehind && enginePin) {
    console.log(
      pc.dim(
        `\nEngine pin:  @forkshop/engine ${enginePin.normalized} → ${manifest.engineVersion}  (in package.json)`
      )
    )
  }
  const drift = plan.filter((p) => p.state !== "unchanged" && p.state !== "local-drift" && p.state !== "both-drift")
  const skipped = plan.filter((p) => p.state === "local-drift" || p.state === "both-drift")
  if (drift.length) {
    console.log(`\n${drift.length} file${drift.length === 1 ? "" : "s"} would update:`)
    for (const p of drift) {
      const marker = p.state === "missing-on-disk" ? "+" : "~"
      console.log(`  ${marker} ${p.dest}    (${p.state})`)
    }
  }
  if (skipped.length) {
    console.log(`\n${skipped.length} file${skipped.length === 1 ? "" : "s"} have local edits — skipped:`)
    for (const p of skipped) {
      console.log(`  ! ${p.dest}    (${p.state}; rerun with --force to overwrite)`)
    }
  }
  if (!drift.length && !skipped.length && !engineBehind) {
    console.log(pc.dim("\nNothing to update."))
  }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- commands/update`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/update.ts packages/cli/src/commands/update.test.ts
git commit -m "feat(cli): forkshop update command with drift classification + soft engine bump"
```

---

### Task 16: Register `update` in CLI binary

**Files:**
- Modify: `packages/cli/src/index.ts`

Wire the new command into Commander, with interactive prompts for the apply confirm + engine soft offer.

- [ ] **Step 1: Modify the index**

Replace the body of `packages/cli/src/index.ts` with:

```ts
import { Command } from "commander"
import readline from "node:readline/promises"
import pc from "picocolors"
import { runAdd } from "./commands/add.js"
import { runDiff } from "./commands/diff.js"
import { runInit } from "./commands/init.js"
import { runUpdate } from "./commands/update.js"

async function askYesNo(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(`${prompt} [y/N] `)
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    rl.close()
  }
}

const program = new Command()
  .name("forkshop")
  .description("Install and maintain Forkshop in your Next.js + Tailwind project.")
  .version("0.0.0")

program
  .command("init")
  .description("Install Forkshop into the current project.")
  .option("--force", "Overwrite existing files on collision")
  .option("--registry <url>", "Override the registry base URL")
  .action(async (opts) => {
    const result = await runInit({
      projectRoot: process.cwd(),
      force: opts.force,
      registryUrl: opts.registry,
    })
    if (!result.ok) {
      console.error(pc.red(result.reason))
      process.exit(2)
    }
  })

program
  .command("add <bundle>")
  .description("(1.0 placeholder — kits arrive in spec #4.)")
  .action(async (bundle) => {
    await runAdd({ projectRoot: process.cwd(), bundleName: bundle })
  })

program
  .command("update")
  .description("Refresh Forkshop's thin scaffold layer (skills, CLAUDE.md, route stubs).")
  .option("--check", "Print drift summary; exit 1 if any drift, 0 otherwise.")
  .option("--force", "Overwrite locally edited files too.")
  .option("--registry <url>", "Override the registry base URL")
  .action(async (opts) => {
    if (opts.check) {
      const result = await runUpdate({
        projectRoot: process.cwd(),
        checkOnly: true,
        registryUrl: opts.registry,
      })
      if (!result.ok) {
        console.error(pc.red(result.reason))
        process.exit(2)
      }
      process.exit(result.exitCode)
    }

    // Interactive: first do a dry-run pass to render the summary, then prompt.
    const dry = await runUpdate({
      projectRoot: process.cwd(),
      checkOnly: true,
      registryUrl: opts.registry,
    })
    if (!dry.ok) {
      console.error(pc.red(dry.reason))
      process.exit(2)
    }
    if (dry.exitCode === 0) {
      // Nothing to do.
      return
    }
    const confirm = await askYesNo("Apply changes?")
    if (!confirm) {
      console.log(pc.dim("\nNo changes applied."))
      return
    }

    // The dry pass already printed the summary; re-running in apply mode does the work
    // but suppress the summary. The simplest implementation: pass `apply: true` and
    // accept the engine-pin question separately.
    const acceptEngineBump = await askYesNo("Also bump @forkshop/engine pin in package.json?")
    const applyResult = await runUpdate({
      projectRoot: process.cwd(),
      apply: true,
      force: opts.force,
      registryUrl: opts.registry,
      acceptEngineBump,
    })
    if (!applyResult.ok) {
      console.error(pc.red(applyResult.reason))
      process.exit(2)
    }
  })

program
  .command("diff <path>")
  .description("Show how your local copy of a Forkshop file differs from upstream.")
  .option("--registry <url>", "Override the registry base URL")
  .action(async (filePath, opts) => {
    const result = await runDiff({
      projectRoot: process.cwd(),
      path: filePath,
      registryUrl: opts.registry,
    })
    if (result.diff) {
      const colored = result.diff
        .split("\n")
        .map((line) => {
          if (line.startsWith("+++") || line.startsWith("---")) return pc.bold(line)
          if (line.startsWith("+")) return pc.green(line)
          if (line.startsWith("-")) return pc.red(line)
          if (line.startsWith("@@")) return pc.cyan(line)
          return pc.dim(line)
        })
        .join("\n")
      process.stdout.write(colored)
    }
    if (result.message) {
      console.error(pc.dim(result.message))
    }
    process.exit(result.exitCode)
  })

program.parseAsync().catch((error) => {
  console.error(pc.red((error as Error).message))
  process.exit(2)
})
```

- [ ] **Step 2: Build the CLI**

Run: `pnpm --filter forkshop build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat(cli): register update command with interactive prompt + soft offer"
```

---

## Phase E — `diff` adaptation

### Task 17: Adapt `diff.ts` to v2 lock + placeholder substitution

**Files:**
- Modify: `packages/cli/src/commands/diff.ts`
- Test: `packages/cli/src/commands/diff.test.ts`

`diff` reads the v2 lock; resolves each tracked file's manifest content via `applyTemplatePlaceholders`; renders unified diff.

- [ ] **Step 1: Rewrite the test**

```ts
// packages/cli/src/commands/diff.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runDiff } from "./diff.js"
import type { ForkshopJson, Manifest } from "../manifest-schema.js"
import { sha256Hex } from "../sha.js"

async function setupInstalled(opts: {
  setupOnDisk: string
}): Promise<{ root: string; manifest: Manifest }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-diff-"))
  await fs.mkdir(path.join(root, ".claude/skills"), { recursive: true })
  await fs.writeFile(
    path.join(root, ".claude/skills/forkshop-setup.md"),
    opts.setupOnDisk
  )
  const lock: ForkshopJson = {
    schemaVersion: "2.0.0",
    installedAt: "2026-05-17T00:00:00Z",
    registryUrl: "https://example.test/r/",
    engineVersion: "0.3.0",
    mount: "@/app/forkshop",
    srcPrefix: "",
    installedBundles: ["skill"],
    files: {
      "@forkshop/skill/setup": {
        dest: ".claude/skills/forkshop-setup.md",
        sha: sha256Hex(opts.setupOnDisk),
      },
    },
  }
  await fs.writeFile(path.join(root, "forkshop.json"), JSON.stringify(lock, null, 2))
  const manifest: Manifest = {
    version: "2.0.0",
    generatedAt: "2026-05-17T00:00:00Z",
    registryBaseUrl: "https://example.test/r/",
    engineVersion: "0.3.0",
    bundles: {},
    files: {
      "@forkshop/skill/setup": {
        kind: "text",
        ext: "md",
        content: "# updated upstream\n",
        destOverride: ".claude/skills/forkshop-setup.md",
      },
    },
  }
  return { root, manifest }
}

describe("runDiff", () => {
  const dirs: string[] = []
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("emits a unified diff when local differs from manifest", async () => {
    const { root, manifest } = await setupInstalled({ setupOnDisk: "# local\n" })
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: ".claude/skills/forkshop-setup.md",
      manifest,
    })
    expect(result.exitCode).toBe(1)
    expect(result.diff).toContain("-# local")
    expect(result.diff).toContain("+# updated upstream")
  })

  it("reports no diff when local matches manifest", async () => {
    const { root, manifest } = await setupInstalled({ setupOnDisk: "# updated upstream\n" })
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: ".claude/skills/forkshop-setup.md",
      manifest,
    })
    expect(result.exitCode).toBe(0)
    expect(result.diff).toBeUndefined()
  })

  it("refuses when forkshop.json is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-diff-"))
    dirs.push(root)
    const result = await runDiff({
      projectRoot: root,
      path: "anything",
      manifest: {
        version: "2.0.0",
        generatedAt: "x",
        registryBaseUrl: "x",
        engineVersion: "0.3.0",
        bundles: {},
        files: {},
      },
    })
    expect(result.exitCode).toBe(2)
    expect(result.message).toMatch(/init/)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- commands/diff`
Expected: FAIL.

- [ ] **Step 3: Rewrite `diff.ts`**

```ts
// packages/cli/src/commands/diff.ts
import { promises as fs } from "node:fs"
import path from "node:path"
import { fetchManifest } from "../fetch-manifest.js"
import { readForkshopJson } from "../forkshop-json.js"
import {
  type Manifest,
  type ResolvedAliases,
} from "../manifest-schema.js"
import { applyTemplatePlaceholders } from "../rewrite.js"
import { unifiedDiff } from "../unified-diff.js"

export interface DiffOptions {
  projectRoot: string
  path: string                        // workspace-relative path
  manifest?: Manifest                 // injected by tests
  registryUrl?: string
}

export interface DiffResult {
  diff?: string
  message?: string
  exitCode: 0 | 1 | 2
}

export async function runDiff(options: DiffOptions): Promise<DiffResult> {
  const lock = await readForkshopJson(options.projectRoot)
  if (!lock) {
    return { exitCode: 2, message: "Run `forkshop init` first." }
  }
  if (lock.schemaVersion !== "2.0.0") {
    return {
      exitCode: 2,
      message: "Your installation predates the v2 schema. Run `forkshop init` against a fresh layout.",
    }
  }

  // Find the address that maps to this path
  let address: string | undefined
  for (const [addr, entry] of Object.entries(lock.files)) {
    if (entry.dest === options.path) {
      address = addr
      break
    }
  }
  if (!address) {
    return {
      exitCode: 2,
      message: `\`${options.path}\` is not a Forkshop-managed file (not in forkshop.json).`,
    }
  }

  const registryUrl = options.registryUrl ?? lock.registryUrl
  const manifest = options.manifest ?? (await fetchManifest(registryUrl))
  const file = manifest.files[address]
  if (!file || file.kind !== "text") {
    return {
      exitCode: 2,
      message: `\`${options.path}\` is not a text file in the current manifest.`,
    }
  }

  const aliases: ResolvedAliases = {
    mount: lock.mount,
    srcPrefix: lock.srcPrefix,
  }
  const upstream = applyTemplatePlaceholders(file.content, aliases)

  let local: string
  try {
    local = await fs.readFile(path.join(options.projectRoot, options.path), "utf8")
  } catch {
    return {
      exitCode: 2,
      message: `\`${options.path}\` is in forkshop.json but missing on disk.`,
    }
  }

  if (local === upstream) {
    return { exitCode: 0 }
  }

  return {
    exitCode: 1,
    diff: unifiedDiff({ original: local, updated: upstream, fileLabel: options.path }),
  }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- commands/diff`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff.ts packages/cli/src/commands/diff.test.ts
git commit -m "refactor(cli): diff command reads v2 lock + applies placeholders"
```

---

### Task 18: Full CLI typecheck + lint pass

**Files:** All of `packages/cli/`

After all the per-file edits, confirm everything typechecks and lints together.

- [ ] **Step 1: Typecheck**

Run: `pnpm --filter forkshop typecheck`
Expected: zero errors.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm --filter forkshop test`
Expected: all tests pass.

- [ ] **Step 3: Lint**

Run: `pnpm --filter forkshop lint`
Expected: zero errors.

- [ ] **Step 4: Build the bundled CLI**

Run: `pnpm --filter forkshop build`
Expected: `packages/cli/dist/index.js` produced.

- [ ] **Step 5: Commit any fixups**

```bash
git status --porcelain
# If clean, skip commit. If there are stragglers from typecheck/lint, fix and commit.
```

---

## Phase F — Engine-side templates + manifest builder + validate-registry

### Task 19: Route-stub template files

**Files:**
- Create: `packages/engine/templates/api-stubs/edit-route.ts.template`
- Create: `packages/engine/templates/api-stubs/positions-route.ts.template`
- Create: `packages/engine/templates/api-stubs/agent-activity-route.ts.template`
- Create: `packages/engine/templates/api-stubs/agent-activity-stream-route.ts.template`

These templates are walked by the manifest builder and shipped to the user's `app/api/forkshop/*/route.ts`.

- [ ] **Step 1: Write `edit-route.ts.template`**

```ts
// packages/engine/templates/api-stubs/edit-route.ts.template
export { POST, GET } from "@forkshop/engine/api/edit/route"
```

- [ ] **Step 2: Write `positions-route.ts.template`**

```ts
// packages/engine/templates/api-stubs/positions-route.ts.template
export { POST, GET } from "@forkshop/engine/api/positions/route"
```

- [ ] **Step 3: Write `agent-activity-route.ts.template`**

```ts
// packages/engine/templates/api-stubs/agent-activity-route.ts.template
export { POST } from "@forkshop/engine/api/agent-activity/route"
```

- [ ] **Step 4: Write `agent-activity-stream-route.ts.template`**

```ts
// packages/engine/templates/api-stubs/agent-activity-stream-route.ts.template
export { GET } from "@forkshop/engine/api/agent-activity/stream/route"
```

- [ ] **Step 5: Commit**

```bash
git add packages/engine/templates/api-stubs/
git commit -m "feat(engine): route-stub templates for CLI manifest builder"
```

---

### Task 20: Rewrite `manifest-builder.ts` for v2

**Files:**
- Modify: `packages/cli/src/manifest-builder.ts`
- Modify: `packages/cli/src/manifest-builder.test.ts`

The walker covers `packages/engine/{src/skill,templates,fonts}/` only. No more `src/`, no more `tailwind/`.

- [ ] **Step 1: Rewrite the test**

```ts
// packages/cli/src/manifest-builder.test.ts
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildManifest } from "./manifest-builder.js"

async function makeEngineFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "engine-fixture-"))
  await fs.mkdir(path.join(root, "src/skill"), { recursive: true })
  await fs.writeFile(path.join(root, "src/skill/setup.md"), "# setup")
  await fs.writeFile(path.join(root, "src/skill/live-editing.md"), "# live")
  await fs.writeFile(path.join(root, "src/skill/doc-sync.md"), "# doc-sync")

  await fs.mkdir(path.join(root, "templates/api-stubs"), { recursive: true })
  await fs.writeFile(
    path.join(root, "templates/user-claude-md.md"),
    "# user CLAUDE"
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/edit-route.ts.template"),
    'export { POST, GET } from "@forkshop/engine/api/edit/route"\n'
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/positions-route.ts.template"),
    'export { POST, GET } from "@forkshop/engine/api/positions/route"\n'
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/agent-activity-route.ts.template"),
    'export { POST } from "@forkshop/engine/api/agent-activity/route"\n'
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/agent-activity-stream-route.ts.template"),
    'export { GET } from "@forkshop/engine/api/agent-activity/stream/route"\n'
  )

  await fs.mkdir(path.join(root, "fonts/raveo"), { recursive: true })
  await fs.writeFile(
    path.join(root, "fonts/raveo/RaveoVF.woff2"),
    Buffer.from([0x77, 0x4f, 0x46, 0x32])
  )

  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "@forkshop/engine", version: "0.3.0" })
  )
  return root
}

describe("buildManifest (v2)", () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("walks skill + templates + fonts and emits v2 shapes", async () => {
    const engineRoot = await makeEngineFixture()
    dirs.push(engineRoot)
    const manifest = await buildManifest({ registryRoot: engineRoot })

    expect(manifest.version).toBe("2.0.0")
    expect(manifest.engineVersion).toBe("0.3.0")

    // Bundles exist
    expect(manifest.bundles.skill).toBeDefined()
    expect(manifest.bundles["route-stubs"]).toBeDefined()
    expect(manifest.bundles["claude-md"]).toBeDefined()
    expect(manifest.bundles.font).toBeDefined()
    expect(manifest.bundles.init).toBeDefined()

    // Skill addresses
    expect(manifest.files["@forkshop/skill/setup"]).toBeDefined()
    expect(manifest.files["@forkshop/skill/setup"]).toMatchObject({
      kind: "text",
      ext: "md",
      destOverride: ".claude/skills/forkshop-setup.md",
    })

    // CLAUDE.md
    expect(manifest.files["@forkshop/templates/claude-md"]).toMatchObject({
      kind: "text",
      ext: "md",
      destOverride: "{aliases.mount}/CLAUDE.md",
    })

    // Route stubs (4)
    expect(manifest.files["@forkshop/route-stubs/edit"]).toMatchObject({
      kind: "text",
      ext: "ts",
      destOverride: "app/api/forkshop/edit/route.ts",
    })
    expect(manifest.files["@forkshop/route-stubs/agent-activity-stream"]).toMatchObject({
      destOverride: "app/api/forkshop/agent-activity/stream/route.ts",
    })

    // Font
    expect(manifest.files["@forkshop/fonts/raveo/RaveoVF"]).toMatchObject({
      kind: "binary",
      destOverride: "public/fonts/forkshop/RaveoVF.woff2",
    })

    // Init composite
    expect(manifest.bundles.init).toMatchObject({
      kind: "composite",
      includes: expect.arrayContaining(["route-stubs", "skill", "claude-md", "font"]),
    })
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter forkshop test -- manifest-builder`
Expected: FAIL.

- [ ] **Step 3: Rewrite `manifest-builder.ts`**

```ts
// packages/cli/src/manifest-builder.ts
import { promises as fs } from "node:fs"
import path from "node:path"
import {
  MANIFEST_SCHEMA_VERSION,
  type Bundle,
  type Manifest,
  type ManifestFile,
} from "./manifest-schema.js"

export interface BuildManifestOptions {
  registryRoot: string                // path to packages/engine/
  registryBaseUrl?: string
}

const DEFAULT_BASE_URL = "https://forkshop.dev/r/"

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries: import("node:fs").Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return out
    throw error
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else out.push(full)
  }
  return out
}

function extOf(absolutePath: string): "ts" | "tsx" | "md" | "css" {
  const m = absolutePath.match(/\.(ts|tsx|md|css)(?:\.template)?$/)
  if (!m) throw new Error(`Unknown extension for ${absolutePath}`)
  return m[1] as "ts" | "tsx" | "md" | "css"
}

function skillAddress(rel: string): string {
  const noExt = rel.replace(/^src\/skill\//, "").replace(/\.md$/, "")
  return `@forkshop/skill/${noExt}`
}

function claudeMdAddress(rel: string): string | undefined {
  if (rel === "templates/user-claude-md.md") return "@forkshop/templates/claude-md"
  return undefined
}

function routeStubAddress(rel: string): { address: string; dest: string } | undefined {
  // templates/api-stubs/<name>-route.ts.template
  const m = rel.match(/^templates\/api-stubs\/(.+?)-route\.ts\.template$/)
  if (!m) return undefined
  const name = m[1]!
  // Special case: agent-activity-stream maps to agent-activity/stream/
  const destSubpath = name === "agent-activity-stream" ? "agent-activity/stream" : name
  return {
    address: `@forkshop/route-stubs/${name}`,
    dest: `app/api/forkshop/${destSubpath}/route.ts`,
  }
}

function fontAddress(rel: string): { address: string; basename: string } | undefined {
  const m = rel.match(/^fonts\/(.+)\.woff2?$/)
  if (!m) return undefined
  return { address: `@forkshop/fonts/${m[1]!}`, basename: path.basename(rel) }
}

export async function buildManifest(options: BuildManifestOptions): Promise<Manifest> {
  const { registryRoot, registryBaseUrl = DEFAULT_BASE_URL } = options

  const skillFiles = await walk(path.join(registryRoot, "src/skill"))
  const templateFiles = await walk(path.join(registryRoot, "templates"))
  const fontFiles = await walk(path.join(registryRoot, "fonts"))

  const files: Record<string, ManifestFile> = {}
  const skillItems: string[] = []
  const routeStubItems: string[] = []

  for (const abs of skillFiles) {
    const rel = path.relative(registryRoot, abs).split(path.sep).join("/")
    if (!rel.endsWith(".md")) continue
    const address = skillAddress(rel)
    const content = await fs.readFile(abs, "utf8")
    const name = rel.replace(/^src\/skill\//, "").replace(/\.md$/, "")
    files[address] = {
      kind: "text",
      ext: "md",
      content,
      destOverride: `.claude/skills/forkshop-${name}.md`,
    }
    skillItems.push(address)
  }

  for (const abs of templateFiles) {
    const rel = path.relative(registryRoot, abs).split(path.sep).join("/")
    const claudeAddr = claudeMdAddress(rel)
    if (claudeAddr) {
      const content = await fs.readFile(abs, "utf8")
      files[claudeAddr] = {
        kind: "text",
        ext: "md",
        content,
        destOverride: "{aliases.mount}/CLAUDE.md",
      }
      continue
    }
    const stub = routeStubAddress(rel)
    if (stub) {
      const content = await fs.readFile(abs, "utf8")
      files[stub.address] = {
        kind: "text",
        ext: extOf(abs),
        content,
        destOverride: stub.dest,
      }
      routeStubItems.push(stub.address)
      continue
    }
  }

  for (const abs of fontFiles) {
    const rel = path.relative(registryRoot, abs).split(path.sep).join("/")
    const fa = fontAddress(rel)
    if (!fa) continue
    files[fa.address] = {
      kind: "binary",
      url: rel,
      destOverride: `public/fonts/forkshop/${fa.basename}`,
    }
  }

  const fontItems = Object.keys(files).filter((a) => a.startsWith("@forkshop/fonts/")).sort()

  const bundles: Record<string, Bundle> = {
    "route-stubs": { kind: "scaffold", items: routeStubItems.sort() },
    skill: { kind: "scaffold", items: skillItems.sort() },
    "claude-md": { kind: "scaffold", items: ["@forkshop/templates/claude-md"] },
    font: { kind: "asset", items: fontItems },
    init: {
      kind: "composite",
      includes: ["route-stubs", "skill", "claude-md", "font"],
    },
  }

  // Read engine version from package.json
  let engineVersion = "0.0.0"
  try {
    const pkgText = await fs.readFile(path.join(registryRoot, "package.json"), "utf8")
    const pkg = JSON.parse(pkgText) as { version?: string }
    engineVersion = pkg.version ?? "0.0.0"
  } catch {
    // OK in test fixtures
  }

  return {
    version: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    registryBaseUrl,
    engineVersion,
    bundles,
    files,
  }
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm --filter forkshop test -- manifest-builder`
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/manifest-builder.ts packages/cli/src/manifest-builder.test.ts
git commit -m "feat(cli): manifest-builder v2 — walks skill + templates + fonts only"
```

---

### Task 21: Update `validate-registry.ts` for v2 schema + new check

**Files:**
- Modify: `apps/docs/scripts/validate-registry.ts`

Add `validateInitDestinations`: every file in the `init` composite must land under one of the four allowed prefixes (`.claude/`, `app/api/forkshop/`, `{aliases.mount}/`, `public/fonts/forkshop/`).

- [ ] **Step 1: Read the current validate-registry.ts to know what's there**

Run: `cat apps/docs/scripts/validate-registry.ts`

- [ ] **Step 2: Add the new check**

After the existing `validateBundleItems` function in `apps/docs/scripts/validate-registry.ts`, add:

```ts
function validateInitDestinations(manifest: Manifest): string[] {
  const errors: string[] = []
  const initBundle = manifest.bundles["init"]
  if (!initBundle) return ["No `init` bundle in manifest"]
  if (initBundle.kind !== "composite") {
    return ["Init bundle must be composite"]
  }
  const seen = new Set<string>()
  const visit = (name: string) => {
    if (seen.has(name)) return
    seen.add(name)
    const b = manifest.bundles[name]
    if (!b) return
    if (b.kind === "composite") {
      for (const inc of b.includes) visit(inc)
    } else {
      for (const item of b.items) {
        const file = manifest.files[item]
        if (!file) continue
        const dest = file.destOverride
        if (!dest) {
          errors.push(`${item}: missing destOverride`)
          continue
        }
        const allowed =
          dest.startsWith(".claude/") ||
          dest.startsWith("app/api/forkshop/") ||
          dest.startsWith("{aliases.mount}/") ||
          dest.startsWith("public/fonts/forkshop/")
        if (!allowed) {
          errors.push(
            `${item}: destOverride "${dest}" is outside the four allowed init prefixes ` +
              `(.claude/, app/api/forkshop/, {aliases.mount}/, public/fonts/forkshop/)`
          )
        }
      }
    }
  }
  for (const inc of initBundle.includes) visit(inc)
  return errors
}
```

And in the main entry point (where `validateBundleItems` is called), add a call to `validateInitDestinations` and fail the build if it returns errors.

- [ ] **Step 3: Run the validator**

Run: `pnpm --filter docs validate-registry`
Expected: passes (the v2 manifest builder produces compliant destinations).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/scripts/validate-registry.ts
git commit -m "feat(docs): validate init destinations stay within four allowed prefixes"
```

---

### Task 22: Workspace check after engine-side updates

**Files:** All

- [ ] **Step 1: Run `pnpm check` from root**

Run: `pnpm check`
Expected: typecheck + lint pass across the workspace.

- [ ] **Step 2: Run all CLI tests**

Run: `pnpm --filter forkshop test`
Expected: green.

- [ ] **Step 3: Commit any fixups**

```bash
git status --porcelain
# Address any stragglers.
```

---

## Phase G — Skill + template content rewrites

### Task 23: Rewrite `user-claude-md.md` (5-concept model)

**Files:**
- Modify: `packages/engine/templates/user-claude-md.md`

Full rewrite. The structural contract from the spec, plus a vocabulary-swap pass.

**Content checklist** (every section listed must exist; every constraint must hold):

- Header: opener about Forkshop as a Figma-style canvas + sidebar tool; one-line note that this file is auto-loaded by Claude Code working in `{{srcPrefix}}app/forkshop/`
- Section "Adding a new Board (Layout + data)" — explains Board = Layout + data + sidebar entry; code example uses `Gallery` Layout taking a `nodes` prop; **no `<CanvasNode>` direct usage**
- Section "Mental model" with five subsections — one paragraph + one code example each: **Node** / **NodeType** / **Layout** / **Board** / **Kit**
- Section "File layout" — lists `{{srcPrefix}}app/forkshop/`, `{{srcPrefix}}app/api/forkshop/`, `{{srcPrefix}}app/forkshop/node-types/` (user-side custom NodeTypes)
- Section "How to add a new Board" — Board common, Layout rare (engine contribution path), Kit rarest (deferred to spec #4 currently)
- Section "Adding a custom NodeType" — example NodeType (e.g., Storybook story preview); shows `match` / `render` / `agentMatch` shape; pointer to `app/forkshop/node-types/`
- Section "How edit, spacing, and open-in-editor work" — Edit (unchanged); Spacing (unchanged); **Open-in-editor: built-in `EditorLink` in engine; user only needs `@locator/webpack-loader` in next.config (wired by setup skill); no `<LocatorInit />` mount step**
- Section "The four Layouts at 1.0" — `Gallery`, `Tree`, `DesignSystemView`, `ResponsiveFrameView`; each: import path (`@forkshop/engine`) + typed props
- Section "How positions are persisted" — same mechanism (`layouts/system.json`); examples drop direct `<CanvasNode>` usage
- Section "Live AI awareness" — keep current shape; vocabulary swap (block→`iframe-component` Node, primitive→`inline-react` Node); pointer to spec #5 for the producer protocol; honest note that the Claude Code producer pack ships in spec #5
- Section "Update this file when you customize Forkshop" — unchanged in spirit
- All code-example imports use `@forkshop/engine` (not `@/components/forkshop/...`)
- `{{srcPrefix}}` placeholders used wherever filesystem paths appear (e.g., `{{srcPrefix}}app/forkshop/CLAUDE.md`)

- [ ] **Step 1: Replace the file**

Open `packages/engine/templates/user-claude-md.md` and replace its contents with the full rewrite following the checklist above. Aim for ~320 lines.

- [ ] **Step 2: Verify vocabulary**

Run these checks — all must output nothing:

```bash
grep -c "DesignSystemBoard\|IframeGallery\|PageTree" packages/engine/templates/user-claude-md.md
# Expected: 0 (old kit names should not appear)

grep -c "<CanvasNode" packages/engine/templates/user-claude-md.md
# Expected: 0 (direct CanvasNode usage gone)

grep -c "@/components/forkshop\|@/lib/forkshop" packages/engine/templates/user-claude-md.md
# Expected: 0 (no v1 path imports)

grep -c "lucide-react\|iconoir-react\|motion" packages/engine/templates/user-claude-md.md
# Expected: 0 (no stale deps)

grep -c "<LocatorInit" packages/engine/templates/user-claude-md.md
# Expected: 0 (no manual Locator mount)
```

- [ ] **Step 3: Build the manifest to confirm the template is picked up**

Run: `pnpm --filter forkshop test -- manifest-builder`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/engine/templates/user-claude-md.md
git commit -m "docs(engine): rewrite user CLAUDE.md template for 5-concept model"
```

---

### Task 24: Mechanical sweep on `live-editing.md` and `doc-sync.md`

**Files:**
- Modify: `packages/engine/src/skill/live-editing.md`
- Modify: `packages/engine/src/skill/doc-sync.md`

Small files. Vocabulary swap + drop stale dep refs. No structural rewrite.

- [ ] **Step 1: Sweep `live-editing.md`**

- Replace any occurrences of `block` (small-b, used as a noun for a component preview) with `iframe-component Node` or just `Node` when context is clear.
- Replace `primitive` (small-p) with `inline-react Node` or `Node`.
- Drop any references to `lucide-react`, `iconoir-react`, `motion` (unlikely there but check).
- Drop any reference to the Locator opt-in question (unlikely there either).
- Ensure import paths in code examples (if any) use `@forkshop/engine`.

- [ ] **Step 2: Sweep `doc-sync.md`**

- Same vocabulary swaps.
- Update file-layout examples to reflect v2 paths:
  - `app/forkshop/page.tsx`
  - `app/forkshop/forkshop.config.tsx`
  - `app/forkshop/<board>-board.tsx`
  - `app/forkshop/CLAUDE.md`
- Drop references to old kit names (`DesignSystemBoard`, `IframeGallery`, `PageTree`).

- [ ] **Step 3: Verify with grep**

```bash
grep -c "DesignSystemBoard\|IframeGallery\|PageTree" packages/engine/src/skill/live-editing.md packages/engine/src/skill/doc-sync.md
grep -c "iconoir-react\|motion" packages/engine/src/skill/live-editing.md packages/engine/src/skill/doc-sync.md
# All counts should be 0
```

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/skill/live-editing.md packages/engine/src/skill/doc-sync.md
git commit -m "docs(engine): vocabulary sweep on live-editing and doc-sync skills"
```

---

### Task 25: Rewrite `setup.md` — outer shell + Phase 0-2

**Files:**
- Modify: `packages/engine/src/skill/setup.md`

Because `setup.md` is large (~1205 lines compressing to ~600-700), the rewrite is split across two tasks. This task does the outer shell + Phases 0-2.

**Content for this task:**

- **Frontmatter** (YAML at top): keep `name`, refresh `description` to drop "Locator opt-in" trigger words and add stub-only positioning ("the setup skill scaffolds a minimal stub Forkshop installation; kit-aware audience scaffolding arrives in a later release"). Don't overlap descriptions with `live-editing.md` / `doc-sync.md`.

- **Header section** (above Phase 0): one-paragraph orientation. State explicitly: "Forkshop's mental model is Node / NodeType / Layout / Board / Kit. This skill leaves the engine alone — it just scaffolds the user-side `{{mount}}/` files."

- **Phase 0 — Read preconditions**: as in current, but the `forkshop.json` schema check now expects v2 shape (`schemaVersion: "2.0.0"`); if v1 found, instruct: "Back up `{{srcPrefix}}app/forkshop/` and run `forkshop init` against the v2 schema."

- **Phase 1 — Read project, build understanding**: as in current; ensure narrative output uses 5-concept vocabulary (`Board`, `Node`, etc.)

- **Phase 2 — Scan for primitives, blocks, routes**: as in current; ensure output labels them as `inline-react` Nodes, `iframe-component` Nodes, `iframe-route` Nodes (not "primitives", "blocks", "pages").

- [ ] **Step 1: Open the file and replace lines 1 through whatever-ends-Phase-2**

Identify the line range of Phase 0-2 in the current file:

Run: `grep -n "^## Phase " packages/engine/src/skill/setup.md`

Then edit so frontmatter + header + Phases 0-2 reflect the v2 content. Aim for ~250 lines for this section.

- [ ] **Step 2: Vocabulary spot-check**

```bash
sed -n '1,/^## Phase 3/p' packages/engine/src/skill/setup.md | grep -c "primitives\|blocks\|pages"
# Mention is OK in scanning instructions; but where the OUTPUT labels are introduced,
# the labels should be `inline-react` Node / `iframe-component` Node / `iframe-route` Node.
```

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "docs(engine): setup.md outer shell + Phases 0-2 — v2 vocabulary"
```

---

### Task 26: Rewrite `setup.md` — Phase 3-7 + Scaffolding templates

**Files:**
- Modify: `packages/engine/src/skill/setup.md` (Phase 3 onward)

**Content for this task:**

- **Phase 3 — Build the consolidated proposal**: **stub-only proposal**. Single Board (`Gallery` Layout) over discovered blocks. No kit picker. Section explicitly marked: `<!-- kit picker arrives in kits rewrite spec (#4) -->`. Use the existing proposal template format from the current file but simplified.

- **Phase 4 — Iterate**: unchanged in shape.

- **Phase 5 — Consent for config mutations**: **single AskUserQuestion call with ONE question** (the CLAUDE.md cadence note). Locator opt-in is gone (Option-click is built-in); live-AI hook deferred to spec #5. Preserve the AskUserQuestion call structure (panel format) so kits rewrite can add questions back.

- **Phase 6 — Write artifacts**:
  1. `{{mount}}/forkshop.config.tsx` (data — primitives + blocks)
  2. `{{mount}}/components-board.tsx` (one Board file using `Gallery` Layout)
  3. `{{mount}}/page.tsx` (mounts `ForkshopCanvas` + sidebar with the one Board)
  4. `app/globals.css` gets `@import "@forkshop/engine/forkshop.css";` (idempotent — check before appending)
  5. `next.config.*` patched with `@locator/webpack-loader` rule (automatic, always-on)
  6. `{{mount}}/CLAUDE.md` cadence note appended (only if consented in Phase 5)
  - Drop: `layout.tsx` mutation, tailwind preset, separate `forkshop.css`, `<LocatorInit />` mount, live-AI hook installation.

- **Phase 7 — Final summary**: brief summary; points at `{{mount}}/CLAUDE.md` for next steps; note that "kit-aware scaffolding ships in spec #4. Until then, edit `forkshop.config.tsx` to add primitives + blocks + routes." Doc-burden disclosure.

- **Adjust mode (re-runs)**: as in current.

- **Edge cases**: refreshed — drop iconoir/motion references; add "engine missing — run `pnpm install`"; add "engine version pin mismatch — soft warning, recommend `forkshop update`".

- **What this skill never does**: as in current.

- **Scaffolding templates section** (6 templates instead of 9):
  1. `forkshop.config.tsx` (with discovered primitives + blocks structure)
  2. `<board>-board.tsx` for the stub Board (Gallery Layout)
  3. `page.tsx` (mount of canvas + sidebar)
  4. `globals.css` import line
  5. `next.config.*` webpack/turbopack rule (Next 14 webpack-only template)
  6. `next.config.*` Next 15 turbopack + webpack template
  - **Drop**: Locator wiring template (old separate file approach), live-AI hook template, CSS file template (no separate forkshop.css), tailwind preset template, layout.tsx mutation template.
  - All placeholders use `{{snake_case}}` form. Every template inside a fenced code block.

- [ ] **Step 1: Replace Phase 3 onward**

Edit `packages/engine/src/skill/setup.md`, replacing everything from `## Phase 3` to end-of-file with the content above. Aim for ~400 lines for this half.

- [ ] **Step 2: Verify placeholder discipline**

```bash
# Validate placeholders only appear inside fenced code blocks in the Scaffolding templates section.
pnpm --filter docs validate-registry
```

Expected: pass.

- [ ] **Step 3: Final size + vocabulary check**

```bash
wc -l packages/engine/src/skill/setup.md
# Expected: ~600-700 lines

grep -c "DesignSystemBoard\|IframeGallery\|PageTree" packages/engine/src/skill/setup.md
# Expected: 0

grep -c "iconoir-react\|motion@\|@locator/runtime" packages/engine/src/skill/setup.md
# Expected: 0

grep -c "yes.*Locator" packages/engine/src/skill/setup.md
# Expected: 0 (no opt-in question)

grep -n "<!-- kit picker arrives in kits rewrite" packages/engine/src/skill/setup.md
# Expected: at least one match (the deferred-kits marker)
```

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "docs(engine): setup.md Phase 3-7 + templates — stub-only, v2 vocabulary"
```

---

## Phase H — Playground rebuild

### Task 27: Delete Ravineo-flavored playground content

**Files:**
- Delete or rewrite: `apps/playground/app/page.tsx`, `apps/playground/app/about/page.tsx`, any `components/*` carrying Ravineo content

- [ ] **Step 1: Identify Ravineo content**

```bash
grep -rln "Acme\|Ship better software\|Ravineo\|bg-forkshop-accent" apps/playground/
```

- [ ] **Step 2: Remove the matched files (or strip their content)**

For each file matched, either delete it entirely (if the whole file is Ravineo legacy) or replace with a generic stub. The simplest move is to delete and re-create in subsequent tasks.

```bash
# Example — adjust per actual files found
rm apps/playground/app/page.tsx apps/playground/app/about/page.tsx
```

- [ ] **Step 3: Verify no Ravineo terms remain**

```bash
grep -rln "Acme\|Ship better software\|Ravineo\|bg-forkshop-accent" apps/playground/ || echo "clean"
# Expected: "clean"
```

- [ ] **Step 4: Commit**

```bash
git add -A apps/playground/
git commit -m "chore(playground): remove Ravineo-flavored content"
```

---

### Task 28: Playground primitives + blocks

**Files:**
- Create: `apps/playground/components/ui/{button,badge,input}.tsx`
- Create: `apps/playground/components/blocks/{hero,feature-grid,cta,pricing}.tsx`

Generic placeholder content. The implementer writes small components — neutral colors, no `forkshop-*` tokens, plausible enough to look interesting.

- [ ] **Step 1: Write the 3 primitives**

Example shape for `button.tsx`:

```tsx
// apps/playground/components/ui/button.tsx
import { type ComponentPropsWithoutRef } from "react"

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "default" | "subtle"
}

export function Button({ variant = "default", className = "", ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition"
  const variants = {
    default: "bg-gray-900 text-white hover:bg-gray-800",
    subtle: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
```

Write `badge.tsx` and `input.tsx` in similar generic shape — small focused components, no `forkshop-*` tokens.

- [ ] **Step 2: Write the 4 blocks**

Example shape for `hero.tsx`:

```tsx
// apps/playground/components/blocks/hero.tsx
import { Button } from "@/components/ui/button"

export interface HeroProps {
  eyebrow?: string
  title?: string
  description?: string
}

export function Hero({
  eyebrow = "Just shipped",
  title = "Build interfaces from the inside out",
  description = "Drop components onto a canvas. Drag, edit, ship.",
}: HeroProps) {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">{eyebrow}</p>
        <h1 className="mb-4 text-4xl font-semibold text-gray-900">{title}</h1>
        <p className="mb-8 text-lg text-gray-600">{description}</p>
        <Button>Get started</Button>
      </div>
    </section>
  )
}
```

Write `feature-grid.tsx`, `cta.tsx`, `pricing.tsx` in similar shape — generic content, no Ravineo names, no `forkshop-*` tokens.

- [ ] **Step 3: Commit**

```bash
git add apps/playground/components/ui/ apps/playground/components/blocks/
git commit -m "feat(playground): generic ui primitives + blocks"
```

---

### Task 29: Playground layout + public pages

**Files:**
- Create: `apps/playground/components/layout/{header,footer}.tsx`
- Create: `apps/playground/app/{layout,page}.tsx`
- Create: `apps/playground/app/about/page.tsx`
- Create: `apps/playground/app/pricing/page.tsx`
- Modify: `apps/playground/app/globals.css`

- [ ] **Step 1: Write the layout components**

```tsx
// apps/playground/components/layout/header.tsx
import Link from "next/link"

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold">Playground</Link>
        <nav className="flex gap-6 text-sm text-gray-700">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </div>
    </header>
  )
}
```

```tsx
// apps/playground/components/layout/footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
      Generic placeholder · {new Date().getFullYear()}
    </footer>
  )
}
```

- [ ] **Step 2: Write root `app/layout.tsx` and `app/globals.css`**

```tsx
// apps/playground/app/layout.tsx
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export const metadata = { title: "Playground" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-forkshop-sans bg-white text-gray-900">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
```

```css
/* apps/playground/app/globals.css */
@import "@forkshop/engine/forkshop.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Write the three public pages**

```tsx
// apps/playground/app/page.tsx
import { Hero } from "@/components/blocks/hero"
import { FeatureGrid } from "@/components/blocks/feature-grid"
import { CTA } from "@/components/blocks/cta"

export default function HomePage() {
  return (
    <main>
      <Hero />
      <FeatureGrid />
      <CTA />
    </main>
  )
}
```

```tsx
// apps/playground/app/about/page.tsx
export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-4 text-3xl font-semibold">About</h1>
      <p className="text-gray-600">Placeholder content for an about page.</p>
    </main>
  )
}
```

```tsx
// apps/playground/app/pricing/page.tsx
import { Pricing } from "@/components/blocks/pricing"

export default function PricingPage() {
  return (
    <main>
      <Pricing />
    </main>
  )
}
```

- [ ] **Step 4: Build the playground (without forkshop content yet)**

Run: `pnpm --filter playground build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/
git commit -m "feat(playground): generic site layout + 3 public pages"
```

---

### Task 30: Playground forkshop scaffold (manual hand-curation)

**Files:**
- Create: `apps/playground/app/forkshop/page.tsx`
- Create: `apps/playground/app/forkshop/forkshop.config.tsx`
- Create: `apps/playground/app/forkshop/foundations-board.tsx`
- Create: `apps/playground/app/forkshop/components-board.tsx`
- Create: `apps/playground/app/forkshop/blocks-board.tsx`
- Create: `apps/playground/app/forkshop/pages-board.tsx`

This is the hand-curated dev surface. Wire it like a real user would after the setup skill runs — but the playground does it manually since the setup skill is interactive.

- [ ] **Step 1: Write `forkshop.config.tsx` data wiring**

Example shape (adapt to current engine API; check `packages/engine/src/index.ts` for exact named exports):

```tsx
// apps/playground/app/forkshop/forkshop.config.tsx
"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export const primitives = [
  { id: "button", name: "Button", sourcePath: "components/ui/button.tsx", render: () => <Button>Click me</Button> },
  { id: "badge",  name: "Badge",  sourcePath: "components/ui/badge.tsx",  render: () => <Badge>New</Badge> },
  { id: "input",  name: "Input",  sourcePath: "components/ui/input.tsx",  render: () => <Input placeholder="Type..." /> },
]

export const blocks = [
  { slug: "hero",         name: "Hero",         iframeSrc: "/forkshop/preview/hero",         sourcePath: "components/blocks/hero.tsx" },
  { slug: "feature-grid", name: "Feature grid", iframeSrc: "/forkshop/preview/feature-grid", sourcePath: "components/blocks/feature-grid.tsx" },
  { slug: "cta",          name: "CTA",          iframeSrc: "/forkshop/preview/cta",          sourcePath: "components/blocks/cta.tsx" },
  { slug: "pricing",      name: "Pricing",      iframeSrc: "/forkshop/preview/pricing",      sourcePath: "components/blocks/pricing.tsx" },
]

export const routes = [
  { path: "/",        title: "Home" },
  { path: "/about",   title: "About" },
  { path: "/pricing", title: "Pricing" },
]
```

- [ ] **Step 2: Write the four Board files**

Each Board is a thin wrapper that mounts a Layout from `@forkshop/engine` with the relevant slice of `forkshop.config.tsx` data. Follow the engine's Layout APIs (Gallery, Tree, DesignSystemView).

- [ ] **Step 3: Write `page.tsx` mounting canvas + sidebar**

Standard pattern from the engine — `ForkshopCanvas` + `ForkshopSidebar` + selection state. Reference the existing `apps/playground/app/page.tsx` before deletion (Git history) or the engine's public exports for the API surface.

- [ ] **Step 4: Build the playground**

Run: `pnpm --filter playground build`
Expected: success.

- [ ] **Step 5: Smoke the dev server**

Run: `pnpm --filter playground dev` (in another shell)
Then in the browser: open `/forkshop` and confirm at least the foundations board renders without errors.
Kill the server.

- [ ] **Step 6: Commit**

```bash
git add apps/playground/app/forkshop/
git commit -m "feat(playground): forkshop scaffold (foundations + components + blocks + pages)"
```

---

### Task 31: Playground `forkshop.json` lock

**Files:**
- Create: `apps/playground/forkshop.json`

A locked v2 forkshop.json reflecting the kit-independent files the CLI would manage (skill files + route stubs + font + CLAUDE.md). The hand-curated `app/forkshop/*` content is **not** tracked in `files` — that's user-owned.

- [ ] **Step 1: Compute SHAs for the managed files**

Run for each managed file (set up a small helper or just script it):

```bash
for f in .claude/skills/forkshop-setup.md .claude/skills/forkshop-live-editing.md .claude/skills/forkshop-doc-sync.md app/forkshop/CLAUDE.md app/api/forkshop/edit/route.ts app/api/forkshop/positions/route.ts app/api/forkshop/agent-activity/route.ts app/api/forkshop/agent-activity/stream/route.ts public/fonts/forkshop/RaveoVF.woff2; do
  echo "$f: $(shasum -a 256 "apps/playground/$f" 2>/dev/null | awk '{print $1}')"
done
```

- [ ] **Step 2: Write `forkshop.json` with those shas**

Use the v2 shape:

```json
{
  "$schema": "https://forkshop.dev/schema/forkshop.json",
  "schemaVersion": "2.0.0",
  "installedAt": "2026-05-17T00:00:00Z",
  "registryUrl": "https://forkshop.dev/r/",
  "engineVersion": "0.3.0",
  "mount": "@/app/forkshop",
  "srcPrefix": "",
  "installedBundles": ["route-stubs", "skill", "claude-md", "font"],
  "files": {
    "@forkshop/skill/setup":              { "dest": ".claude/skills/forkshop-setup.md",        "sha": "<computed>" },
    "@forkshop/skill/live-editing":       { "dest": ".claude/skills/forkshop-live-editing.md", "sha": "<computed>" },
    "@forkshop/skill/doc-sync":           { "dest": ".claude/skills/forkshop-doc-sync.md",     "sha": "<computed>" },
    "@forkshop/templates/claude-md":      { "dest": "app/forkshop/CLAUDE.md",                  "sha": "<computed>" },
    "@forkshop/route-stubs/edit":         { "dest": "app/api/forkshop/edit/route.ts",          "sha": "<computed>" },
    "@forkshop/route-stubs/positions":    { "dest": "app/api/forkshop/positions/route.ts",     "sha": "<computed>" },
    "@forkshop/route-stubs/agent-activity":        { "dest": "app/api/forkshop/agent-activity/route.ts",        "sha": "<computed>" },
    "@forkshop/route-stubs/agent-activity-stream": { "dest": "app/api/forkshop/agent-activity/stream/route.ts", "sha": "<computed>" },
    "@forkshop/fonts/raveo/RaveoVF":      { "dest": "public/fonts/forkshop/RaveoVF.woff2",     "sha": "<computed>" }
  }
}
```

Replace each `<computed>` with the actual sha from Step 1.

- [ ] **Step 3: Verify against `forkshop update --check`**

Run: `cd apps/playground && node ../../packages/cli/dist/index.js update --check --registry file://...`

(Or just verify the lock file is well-formed JSON and run `node -e "JSON.parse(require('fs').readFileSync('apps/playground/forkshop.json'))" ` — if no error, the JSON is valid.)

- [ ] **Step 4: Commit**

```bash
git add apps/playground/forkshop.json
git commit -m "feat(playground): commit v2 forkshop.json lock with managed-file shas"
```

---

## Phase I — Smoke fixture

### Task 32: Create the smoke fixture skeleton

**Files:**
- Create: `tests/smoke/README.md`
- Create: `tests/smoke/expected-files.txt`
- Create: `tests/smoke/expected-package-json.json`
- Create: `tests/smoke/run-smoke.sh`

- [ ] **Step 1: Write `tests/smoke/README.md`**

```md
# Forkshop CLI install smoke fixture

This fixture exercises `forkshop init` against a fresh `pnpm create next-app`
output. It's not a dev surface — touched only by CI and manual smoke runs.

## What it covers

- Packs `packages/cli/` and `packages/engine/` as tarballs.
- Creates `/tmp/forkshop-smoke-<timestamp>/`, runs `pnpm create next-app .`.
- Installs the packed CLI tarball; runs `npx forkshop init`.
- Asserts every file in `expected-files.txt` exists.
- Asserts `package.json` includes `@forkshop/engine`.
- Runs `pnpm install` and `pnpm build`. Build must succeed.

## How to run

    bash tests/smoke/run-smoke.sh

Exits 0 on success, non-zero on any assertion failure.

## When does CI run it

On every PR that touches `packages/cli/` or `packages/engine/`. Skipped on
docs-only PRs.
```

- [ ] **Step 2: Write `tests/smoke/expected-files.txt`**

```
.claude/skills/forkshop-setup.md
.claude/skills/forkshop-live-editing.md
.claude/skills/forkshop-doc-sync.md
app/forkshop/CLAUDE.md
app/api/forkshop/edit/route.ts
app/api/forkshop/positions/route.ts
app/api/forkshop/agent-activity/route.ts
app/api/forkshop/agent-activity/stream/route.ts
public/fonts/forkshop/RaveoVF.woff2
forkshop.json
```

- [ ] **Step 3: Write `tests/smoke/expected-package-json.json`**

```json
{
  "dependencies": {
    "@forkshop/engine": "PRESENT"
  }
}
```

(A sentinel; the harness only checks the key is present, not the exact value.)

- [ ] **Step 4: Write `tests/smoke/run-smoke.sh`**

```bash
#!/usr/bin/env bash
# tests/smoke/run-smoke.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SMOKE_DIR="/tmp/forkshop-smoke-$(date +%s)"

cleanup() {
  if [[ -n "${KEEP_SMOKE:-}" ]]; then
    echo "Smoke dir kept at $SMOKE_DIR (KEEP_SMOKE set)."
  else
    rm -rf "$SMOKE_DIR"
  fi
}
trap cleanup EXIT

echo "==> Packing engine and CLI"
pushd "$REPO_ROOT/packages/engine" > /dev/null
ENGINE_TARBALL="$(pnpm pack --pack-destination /tmp 2>&1 | tail -1)"
popd > /dev/null

pushd "$REPO_ROOT/packages/cli" > /dev/null
CLI_TARBALL="$(pnpm pack --pack-destination /tmp 2>&1 | tail -1)"
popd > /dev/null

echo "==> Creating smoke project at $SMOKE_DIR"
mkdir -p "$SMOKE_DIR"
pushd "$SMOKE_DIR" > /dev/null
pnpm create next-app . --typescript --tailwind --app --no-eslint --no-import-alias --use-pnpm

echo "==> Installing engine tarball (so @forkshop/engine resolves)"
pnpm add "$ENGINE_TARBALL"

echo "==> Installing CLI tarball"
pnpm add -D "$CLI_TARBALL"

echo "==> Running forkshop init"
npx forkshop init

echo "==> Asserting expected files exist"
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if [[ ! -e "$f" ]]; then
    echo "FAIL: $f missing"
    exit 1
  fi
done < "$REPO_ROOT/tests/smoke/expected-files.txt"

echo "==> Asserting @forkshop/engine in package.json"
node -e "const p=require('./package.json');if(!p.dependencies?.['@forkshop/engine']){console.error('FAIL: @forkshop/engine not in dependencies');process.exit(1);}"

echo "==> Installing all deps (engine + others)"
pnpm install

echo "==> Building the project"
pnpm build

popd > /dev/null
echo "==> SMOKE PASSED"
```

- [ ] **Step 5: Make it executable**

Run: `chmod +x tests/smoke/run-smoke.sh`

- [ ] **Step 6: Commit**

```bash
git add tests/smoke/
git commit -m "feat(smoke): CLI install smoke fixture against create-next-app"
```

---

### Task 33: Wire smoke into CI

**Files:**
- Modify or create: `.github/workflows/ci.yml` (or whatever CI definition the repo uses)

- [ ] **Step 1: Check what CI definition exists**

Run: `ls -la .github/workflows/ 2>/dev/null || echo "no CI yet"`

- [ ] **Step 2: Either add a smoke job or document the missing CI**

If CI exists, add a `smoke` job that runs on PRs touching `packages/cli/` or `packages/engine/`. Example:

```yaml
# .github/workflows/ci.yml — add this job
  smoke:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'smoke') || (contains(steps.changes.outputs.files, 'packages/cli/') || contains(steps.changes.outputs.files, 'packages/engine/'))
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @forkshop/engine build
      - run: bash tests/smoke/run-smoke.sh
        env:
          CENTRAL_LICENSE_KEY: ${{ secrets.CENTRAL_LICENSE_KEY }}
```

If no CI exists, add a one-line note to `tests/smoke/README.md` saying "CI wiring deferred until a `.github/workflows/ci.yml` exists" — that's a separate concern.

- [ ] **Step 3: Commit**

```bash
git add .github/ tests/smoke/
git commit -m "ci: smoke job runs on CLI/engine PRs"
```

---

## Phase J — Final verification + docs

### Task 34: Run full smoke + workspace check

**Files:** All

- [ ] **Step 1: Run `pnpm check` from repo root**

Run: `pnpm check`
Expected: typecheck + lint pass.

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: all CLI/engine tests pass.

- [ ] **Step 3: Build everything**

Run: `pnpm build`
Expected: engine builds, CLI builds, docs build (validate-registry runs as part of docs build).

- [ ] **Step 4: Run the smoke fixture locally**

Run: `bash tests/smoke/run-smoke.sh`
Expected: SMOKE PASSED.

- [ ] **Step 5: Manually exercise update and diff against the playground**

```bash
# 1. Edit a skill file in the engine to simulate upstream drift:
echo "" >> packages/engine/src/skill/setup.md
pnpm --filter @forkshop/engine build  # rebuilds engine; not necessary for skill-only edits
# Or just trust that the manifest builder will pick up the edit at registry build time.

# 2. From the playground, run --check (against the local docs registry):
cd apps/playground
# (Need the docs dev server running with /r/manifest.json — adapt to local URL)
node ../../packages/cli/dist/index.js update --check --registry http://localhost:3001/r/

# Expected: exits 1 (drift detected on setup.md).
```

This is an exploratory check, not a hard gate. Document the steps as a comment in the smoke fixture's README if they reveal anything.

---

### Task 35: Update root CLAUDE.md + spec status

**Files:**
- Modify: `/Users/jakubfoglar/Desktop/ravineo_dev/forkshop/CLAUDE.md`
- Modify: `docs/specs/2026-05-17-cli-rework-design.md` (status line)

- [ ] **Step 1: Update the root maintainer CLAUDE.md**

In `CLAUDE.md`, update:
- The "What this spec owns" section under CLI (if present)
- File-path examples that use v1 conventions
- The deferred-items table (CLI rework moves from "blocked by engine packaging" to "done")
- Add or update a "Smoke fixture" subsection pointing at `tests/smoke/`

- [ ] **Step 2: Update spec status**

```bash
# Edit the spec's Status: line
sed -i.bak 's/^Status: Approved (brainstorming) — ready for plan$/Status: Implemented/' docs/specs/2026-05-17-cli-rework-design.md
rm docs/specs/2026-05-17-cli-rework-design.md.bak
```

- [ ] **Step 3: Final commit**

```bash
git add CLAUDE.md docs/specs/2026-05-17-cli-rework-design.md
git commit -m "docs: mark CLI rework spec implemented; update maintainer notes"
```

---

## Exit checklist

- [ ] All unit tests pass: `pnpm --filter forkshop test`
- [ ] All engine tests pass: `pnpm --filter @forkshop/engine test`
- [ ] `pnpm check` from root: typecheck + lint clean
- [ ] `pnpm build` from root: engine + CLI + docs build
- [ ] `bash tests/smoke/run-smoke.sh`: SMOKE PASSED
- [ ] `pnpm --filter playground build`: playground builds
- [ ] `pnpm --filter playground dev` + manual open of `/forkshop`: renders, no Ravineo references, no console errors
- [ ] `validateRegistry` passes against `packages/engine/`
- [ ] `git grep -n "@/components/forkshop\|@/lib/forkshop"` returns zero in `packages/engine/templates/` + `packages/engine/src/skill/`
- [ ] `git grep -n "DesignSystemBoard\|IframeGallery\|PageTree" packages/engine/src/skill/ packages/engine/templates/` returns zero
- [ ] Spec status updated to "Implemented"
