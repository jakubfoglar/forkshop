# Setup skill v2 — multi-Board scaffolding — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace strategy v2's "kits" prescription with a signal-aware setup skill that scaffolds 1-5 Boards (Design System, UI Components, Blocks, Sitemap, Reference) based on detected project signals. Rewrite the setup skill + user CLAUDE.md template, extend the engine sidebar with a `"page"` entryKind, and rebuild the playground against the new model.

**Architecture:** The model is "sections-are-boards" — every sidebar entry is a Board; parents have content AND expand to children. File layout in the user's repo is hybrid: per-leaf `.tsx` files for UI Components (because variant grids are authored content), data-driven leaves elsewhere (Blocks/Sitemap/Reference, via `forkshop.config.tsx`). One new auto-managed file under the mount: `block/[slug]/page.tsx` (block preview route, dev-gated).

**Tech Stack:** Next.js 14/15 App Router, React 18+, TypeScript (strict), Vitest, Tailwind (`forkshop-*` namespace). Engine source uses `@forkshop/*` canonical alias → `packages/engine/src/*`. Run `pnpm check` from repo root before claiming any task done.

**Spec:** `docs/specs/2026-05-17-setup-skill-v2-design.md`

---

## File Structure

### New files

```
apps/playground/app/forkshop/
  design-system.tsx                       Renamed from foundations-board.tsx (Board single leaf)
  ui-components.tsx                       Renamed from components-board.tsx (parent — Gallery overview)
  ui-components/
    <slug>.tsx                            One per playground primitive (variant grid)
  blocks.tsx                              Renamed from blocks-board.tsx (parent — Gallery overview)
  sitemap.tsx                             Renamed from pages-board.tsx (parent — Tree visualization)
  block/[slug]/page.tsx                   NEW — block preview route (dev-gated)

packages/engine/src/components/sidebar/
  forkshop-sidebar.test.tsx               NEW — covers existing + new "page" entryKind branch
```

### Files modified

```
packages/engine/src/components/sidebar/
  forkshop-sidebar.tsx                    +"page" entryKind on SidebarSection

packages/engine/src/skill/
  setup.md                                Phase 2 extended, Phase 3 rewritten, Phase 6 new templates

packages/engine/templates/
  user-claude-md.md                       Vocabulary swap: 5 concepts → 4 (drop Kit)

apps/playground/app/forkshop/
  forkshop.config.tsx                     New shape (primitives/blocks/sitemap/reference)
  page.tsx                                New section structure (Design System, UI Components, Blocks, Sitemap)

docs/strategy/
  2026-05-14-forkshop-strategy-v2-design.md   +refinement #14

docs/
  polish-backlog.md                       +DesignSystemView spacing/radii/shadows extensions entry
```

### Files deleted

```
apps/playground/app/forkshop/
  foundations-board.tsx                   replaced by design-system.tsx
  components-board.tsx                    replaced by ui-components.tsx
  blocks-board.tsx                        replaced by blocks.tsx
  pages-board.tsx                         replaced by sitemap.tsx
```

---

## Task 1: Strategy v2 — refinement #14

**Files:**
- Modify: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md` — append after refinement #13

- [ ] **Step 1: Read current end of strategy v2**

Run: `tail -50 docs/strategy/2026-05-14-forkshop-strategy-v2-design.md`
Expected: see refinements #12, #13, then a `## Supersedes` heading. The new entry goes immediately before `## Supersedes`.

- [ ] **Step 2: Insert refinement #14**

Insert this block before the `## Supersedes` heading:

```markdown
### Refinements from setup skill v2 (2026-05-17)

**14. Kits removed for 1.0; setup skill v2 takes over project-aware scaffolding.** Strategy v2 prescribed three audience-specific kits (`marketing`, `saas`, `default`) with detection heuristics. During the spec #4 brainstorm we found the marketing/saas Board lineups were ~80% the same (different names for the same Boards), the setup skill already does the project-aware work kits would duplicate, and three permanent kit identities is a maintenance commitment misaligned with the side-project posture. The 5-concept model collapses to **Node / NodeType / Layout / Board** (4 concepts). The setup skill becomes the project-aware layer; it composes 1-5 Boards from a fixed recipe set (Design System, UI Components, Blocks, Sitemap, Reference) based on detected signals. Pro Kits remain plugins (NodeTypes + hooks) and don't require a Kit concept in OSS. Full design: `docs/specs/2026-05-17-setup-skill-v2-design.md`.
```

- [ ] **Step 3: Verify the insert lands in the right place**

Run: `grep -n "^### Refinements from setup skill v2\|^## Supersedes" docs/strategy/2026-05-14-forkshop-strategy-v2-design.md`
Expected: the refinement heading appears on a line before `## Supersedes`.

- [ ] **Step 4: Commit**

```bash
git add docs/strategy/2026-05-14-forkshop-strategy-v2-design.md
git commit -m "docs(strategy): record kits → setup skill v2 deviation (refinement #14)"
```

---

## Task 2: Polish backlog — DesignSystemView extensions entry

**Files:**
- Modify: `docs/polish-backlog.md` — append a new section

- [ ] **Step 1: Find the end of polish-backlog.md**

Run: `tail -20 docs/polish-backlog.md`
Note the last entry's structure (each entry uses `## Title`, then `**Why:**`, `**The fix:**`, `**Sequencing:**`, separated by `---`).

- [ ] **Step 2: Append the new entry**

Append at the bottom of the file:

```markdown
---

## Extend `DesignSystemView` to cover spacing, radii, shadows

**Why:** The setup skill v2 (`docs/specs/2026-05-17-setup-skill-v2-design.md`) promises a Design System Board covering tokens + typography + spacing + radii + shadows. The 1.0 engine's `DesignSystemView` Layout only renders colors + typography + primitive frames. Spacing scale, border-radius samples, and shadow samples are missing — the Board ships honest about its 1.0 content, but the strategy v2 lineup expects more.

**The fix:** extend `packages/engine/src/layouts/design-system-view.tsx` with three new regions: a stacked spacing scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64), a radius sample row (cards at each `borderRadius.*` token), and a shadow sample row (cards at each `boxShadow.*` token). Token discovery via the existing `token-registry` reader. No prop API change — the new regions render automatically when their tokens exist in the Tailwind theme.

**Sequencing:** 1.x polish. Real users will land the 1.0 Design System Board and only ask for spacing/radii/shadows once they're comparing against top-team setups. Filed now so the 1.0 spec's promise is tracked.
```

- [ ] **Step 3: Commit**

```bash
git add docs/polish-backlog.md
git commit -m "docs(backlog): file DesignSystemView spacing/radii/shadows extensions"
```

---

## Task 3: Engine sidebar — extend `entryKind` to support `"page"`

**Files:**
- Modify: `packages/engine/src/components/sidebar/forkshop-sidebar.tsx:60-65, 125-137, 215-230`
- Create: `packages/engine/src/components/sidebar/forkshop-sidebar.test.tsx`

- [ ] **Step 1: Write failing test for the new entryKind**

Create `packages/engine/src/components/sidebar/forkshop-sidebar.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ForkshopSidebar } from "@forkshop/components/sidebar/forkshop-sidebar"
import { AgentActivityProvider } from "@forkshop/components/agent-activity-context"

function renderSidebar(props: Parameters<typeof ForkshopSidebar>[0]) {
  return render(
    <AgentActivityProvider fileMap={{ primitives: [], blocks: [] }}>
      <ForkshopSidebar {...props} />
    </AgentActivityProvider>,
  )
}

describe("ForkshopSidebar — entryKind: 'page'", () => {
  it("emits a page selection when a page-kind child is clicked", () => {
    const onSelect = vi.fn()
    renderSidebar({
      selection: { kind: "section", sectionId: "sitemap" },
      onSelect,
      sections: [
        {
          id: "sitemap",
          title: "Sitemap",
          entryKind: "page",
          entries: [
            { slug: "/about", name: "/about" },
          ],
        },
      ],
      routes: [],
    })

    // Expand the section so the child is visible.
    fireEvent.click(screen.getByLabelText("Expand"))
    fireEvent.click(screen.getByText("/about"))

    expect(onSelect).toHaveBeenCalledWith({ kind: "page", path: "/about" })
  })

  it("auto-expands a page-kind section when its child is the active selection", () => {
    renderSidebar({
      selection: { kind: "page", path: "/pricing" },
      onSelect: () => {},
      sections: [
        {
          id: "sitemap",
          title: "Sitemap",
          entryKind: "page",
          entries: [{ slug: "/pricing", name: "/pricing" }],
        },
      ],
      routes: [],
    })

    expect(screen.getByText("/pricing")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @forkshop/engine test forkshop-sidebar.test.tsx`
Expected: FAIL — TypeScript error on `entryKind: "page"` (not assignable to `"block" | "primitive"`).

- [ ] **Step 3: Extend the `entryKind` type union**

Edit `packages/engine/src/components/sidebar/forkshop-sidebar.tsx` line 60-65 — change:

```tsx
  /**
   * Selection kind emitted when an entry under this section is clicked.
   * Defaults to "block".
   */
  entryKind?: "block" | "primitive";
```

to:

```tsx
  /**
   * Selection kind emitted when an entry under this section is clicked.
   * Defaults to "block".
   */
  entryKind?: "block" | "primitive" | "page";
```

- [ ] **Step 4: Extend the auto-expand effect**

Edit `packages/engine/src/components/sidebar/forkshop-sidebar.tsx` line 125-137 — change the auto-expand block to handle all three entryKinds:

```tsx
  // Auto-expand a section when the active selection is one of its entries.
  useEffect(() => {
    for (const section of sections) {
      const entryKind = section.entryKind ?? "block";
      const isMatch =
        entryKind === "block"
          ? selection.kind === "block" && section.entries?.some((e) => e.slug === selection.slug)
          : entryKind === "primitive"
            ? selection.kind === "primitive" && section.entries?.some((e) => e.slug === selection.id)
            : selection.kind === "page" && section.entries?.some((e) => e.slug === selection.path);
      if (isMatch) {
        setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
      }
    }
  }, [selection, sections]);
```

- [ ] **Step 5: Extend the entry-row active + onClick branches**

Edit `packages/engine/src/components/sidebar/forkshop-sidebar.tsx` line 215-230 — change the entry-row block to handle three entryKinds:

```tsx
                      <SidebarRow
                        key={entry.slug}
                        label={entry.name}
                        depth={2}
                        icon={entry.icon}
                        active={
                          entryKind === "block"
                            ? selection.kind === "block" && selection.slug === entry.slug
                            : entryKind === "primitive"
                              ? selection.kind === "primitive" && selection.id === entry.slug
                              : selection.kind === "page" && selection.path === entry.slug
                        }
                        agentActive={
                          entryKind === "page"
                            ? activePages.has(entry.slug)
                            : activeBlocks.has(entry.slug) || activePrimitives.has(entry.slug)
                        }
                        agentFileLabel={`${entry.slug}.tsx`}
                        onClick={() =>
                          onSelect(
                            entryKind === "block"
                              ? { kind: "block", slug: entry.slug }
                              : entryKind === "primitive"
                                ? { kind: "primitive", id: entry.slug }
                                : { kind: "page", path: entry.slug },
                          )
                        }
                      />
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @forkshop/engine test forkshop-sidebar.test.tsx`
Expected: PASS (both test cases).

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter @forkshop/engine typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/engine/src/components/sidebar/forkshop-sidebar.tsx \
        packages/engine/src/components/sidebar/forkshop-sidebar.test.tsx
git commit -m "feat(engine): extend SidebarSection.entryKind to support 'page'

Adds a third value so sitemap-shaped sections can have route children
that emit page selections. Existing 'block' and 'primitive' branches
preserved unchanged."
```

---

## Task 4: Setup skill — Phase 2 extensions (Scan D: theme tokens, Scan E: MDX content)

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Phase 2 section

- [ ] **Step 1: Read current Phase 2**

Run: `awk '/^## Phase 2/,/^## Phase 3/' packages/engine/src/skill/setup.md | head -60`
Note: Scans A, B, C exist today. We're appending Scans D and E.

- [ ] **Step 2: Append Scan D (theme tokens) and Scan E (MDX content) at the end of Phase 2**

Locate the end of Phase 2 (just before `## Phase 3 —`) and insert these new sections after the existing Scan C:

```markdown
### Scan D — Theme tokens (for Design System Board)

1. Read `tailwind.config.{ts,js,mjs}` if present. Look at `theme.extend.{colors, spacing, fontFamily, borderRadius, boxShadow}`. Count non-empty keys per category.
2. If Tailwind v4 is in use (no config file but `@theme` block in `app/globals.css` or `src/app/globals.css`), parse the `@theme` block for `--color-*`, `--spacing-*`, `--font-*`, `--radius-*`, `--shadow-*` custom properties. Same counting.
3. Output a flag: `themeTokens.hasCustomization = any non-default category has ≥1 entry`. Also expose per-category counts (`hasCustomColors`, `hasCustomTypography`, etc.) for the proposal narrative.
4. If neither config file nor `@theme` block exists, set `themeTokens.hasCustomization = false`.

This signal fires the Design System recipe. It doesn't need to find every token — it just decides whether to scaffold a Design System Board at all.

### Scan E — MDX content (for Reference Board)

1. Check `package.json` dependencies (both `dependencies` and `devDependencies`) for any of: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `next-mdx-remote`, `contentlayer`.
2. Glob for `**/*.mdx` files under `app/` and a top-level `content/` directory (if it exists). Cap at 100 — we only need to know "yes there's MDX" plus a count.
3. Look for an MDX-route pattern: `app/(content)/[...slug]/page.tsx`, `app/blog/[slug]/page.tsx`, or any `page.tsx` whose source imports `next/mdx` / `@mdx-js/react`.
4. Output: `mdxContent = { detected: boolean, articleCount: number, routePattern?: string }`.

The Reference recipe fires only when `detected === true` AND a route pattern is found. If MDX files exist but no route pattern resolves them, the skill notes this in the narrative ("I see MDX content but no route renders it — Reference Board needs a Next.js route to iframe") and skips the recipe.
```

- [ ] **Step 3: Update Phase 2 "Output shape" section**

Find the existing `### Output shape` subsection in Phase 2 and replace the data structure block with this extended version:

```
narrative: "<2-3 sentence narrative from Phase 1>"
projectFlags: { mobileProfile, tailwindMajor, monorepo, authLibrary }
primitives: [
  { name: "Button", sourcePath: "components/ui/button.tsx", hasCva: true, cvaVariants: { variant: ["primary","secondary"], size: ["sm","md","lg"] } }
]
blocks: [
  { name: "Hero", sourcePath: "components/blocks/hero.tsx", fixture: "title=\"...\"", previewRoute: "/" }
]
routes: [
  { group: "(marketing)", paths: ["/", "/about", "/pricing"], hasDynamic: false }
]
themeTokens: { hasCustomization: true, hasCustomColors: true, hasCustomTypography: false, … }
mdxContent: { detected: false, articleCount: 0 }
```

- [ ] **Step 4: Validate skill placeholders still pass**

Run: `pnpm --filter docs validate-registry`
Expected: success. (The new sections are prose, no `{{…}}` placeholders outside fenced blocks.)

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): add Scan D (theme tokens) + Scan E (MDX content) to Phase 2

Detection signals for the new Design System and Reference recipes
introduced by spec #4 (setup skill v2)."
```

---

## Task 5: Setup skill — Phase 3 rewrite (recipe selection + multi-Board proposal)

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — replace Phase 3 wholesale

- [ ] **Step 1: Replace Phase 3 contents**

Find the existing `## Phase 3 — Build the consolidated proposal` section and replace everything between that heading and the next `## Phase 4 —` heading with this rewritten content:

```markdown
## Phase 3 — Build the consolidated proposal

Run the recipe-selection algorithm against Phase 2 output. Each recipe fires when its signal threshold is met. Compose them into a multi-Board sidebar proposal.

### Recipe selection

```
recipes = []

if themeTokens.hasCustomization:
  recipes.push("design-system")

if primitives.length >= 3:
  recipes.push("ui-components")

if blocks.length >= 1:
  recipes.push("blocks")

# Sitemap always fires — every Next.js app has routes.
recipes.push("sitemap")

if mdxContent.detected and mdxContent.routePattern:
  recipes.push("reference")
```

Cross-cutting modifiers:

- If `projectFlags.authLibrary` is set, mark Sitemap as `authFilter: true` (filters out `(authenticated|dashboard|app|protected|private)` route groups in the default scaffold).
- If `projectFlags.mobileProfile` is true, mark all Galleries + Blocks for single-viewport (375px).
- Tailwind v3 vs v4 affects only the Design System Board's token-scan path (handled in Phase 6 templates).

### Proposal template

Render the proposal using this exact format. Use box-drawing characters (`└ ├ │ • ─`) for the sidebar tree. Use the actual counts from Phase 2; substitute the recipe-driven Board names.

```
I've read your project. Here's what I see:

<narrative paragraph from Phase 1, 2-3 sentences>

Here's the Forkshop I'd build for you:

/forkshop sidebar
<for each selected recipe, render its line + optional children>
├─ Design System            (DesignSystemView — <N> color tokens, <M> typography styles)
├─ UI Components            (<K> primitives discovered)
│   ├ Button (8 variants via cva)
│   ├ Badge (3 variants)
│   └ …
├─ Blocks                   (<L> blocks discovered)
│   ├ Hero (used on /)
│   ├ CTA  (used on /pricing)
│   └ …
├─ Sitemap                  (<R> routes — public only; <auth-lib> detected)
│   ├ /
│   ├ /about
│   └ …
└─ Reference                (<A> articles)
    ├ <article 1>
    └ …

Mount path:    <aliases.mount, abbreviated>
               (or app/(tools)/forkshop/ — say "use tools group" to switch)

Also touching automatically:
  • app/globals.css — @import "@forkshop/engine/forkshop.css"
  • next.config.*   — @locator/webpack-loader rule (Option-click → editor)
  • app/forkshop/block/[slug]/page.tsx — per-block preview route (auto-managed; one file)

One opt-in (I'll confirm after you accept):
  [1] Cadence note — teaches Claude to use small Edits on Forkshop-watched files
```

When a recipe was not selected, omit its line entirely from the sidebar tree. Truncate child lists to 3 entries plus `└ …` when there are more.

### How to ask the user what's next

Same as before: call `AskUserQuestion` with `Accept all / Adjust / Pause`. See the existing Phase 4 for free-form adjustment handling.

### Thin-Board handling

If a recipe fires but the Phase 2 data is thin (1-2 entries), include the Board anyway but render its child count honestly. In the proposal narrative, surface: *"Reference has only 2 articles right now — Board will be lightly populated. You can grow it as you add more content."* Users can decline thin Boards in Phase 4.

### Always-the-real-thing reminder

Every Board scaffolds against the user's existing components — no duplicated content, no placeholder fixtures unless the user's code can't supply them. Block preview routes import the real block component. UI Components variant grids import the real primitive. Sitemap leaves iframe the user's actual `/about` URL. The skill never copies user code; it only references it.

### After rendering

Wait for user input. Do not proceed to Phase 4 until you receive a reply.
```

- [ ] **Step 2: Validate skill placeholders**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): rewrite Phase 3 for recipe-driven multi-Board proposal

Replaces the stub-only single-Board proposal with the recipe-selection
algorithm from spec #4: Design System, UI Components, Blocks, Sitemap,
Reference. Each recipe fires from a signal threshold; modifiers handle
auth filtering and mobile profile."
```

---

## Task 6: Setup skill — Phase 6 + 7 (new templates + summary)

**Files:**
- Modify: `packages/engine/src/skill/setup.md` — Phase 6 steps + Scaffolding templates section + Phase 7 summary

- [ ] **Step 1: Replace Phase 6 step list**

Find `## Phase 6 — Write the artifacts` and replace its step list (everything from the section heading down to the next section) with this:

```markdown
## Phase 6 — Write the artifacts

Sequential. Failures stop the sequence — no transactional rollback. Each step prints `✓ <action> <path>` on success.

### Step 1 — `{{mount}}/forkshop.config.tsx`

Render from Template 1 (see Scaffolding templates). Populate `primitives` from Phase 2 Scan A, `blocks` from Scan B, `sitemap.excludeGroups` from the auth-filter modifier, `reference.contentPaths` from Scan E.

### Step 2 — `{{mount}}/design-system.tsx` (if Design System recipe fired)

Render from Template 2 — single-leaf Board over `DesignSystemView`.

### Step 3 — `{{mount}}/ui-components.tsx` parent (if UI Components recipe fired)

Render from Template 3 — Gallery over `forkshopConfig.primitives` with one representative instance per primitive.

### Step 4 — `{{mount}}/ui-components/{{slug}}.tsx` (one per primitive)

For each primitive in Phase 2 Scan A:
- If `hasCva` is true, expand `cvaVariants` into a grid of `<Primitive variant="..." size="..." />` instances using Template 4a.
- If `hasCva` is false, render a stub grid using Template 4b (~3 default instances; user fills in real variants).

### Step 5 — `{{mount}}/blocks.tsx` parent (if Blocks recipe fired)

Render from Template 5 — Gallery over `forkshopConfig.blocks` with one iframe-component instance per block at a representative viewport (1440 px or 375 px if mobile profile).

### Step 6 — `{{mount}}/block/[slug]/page.tsx` (auto-managed; if Blocks recipe fired)

Render from Template 6 — dynamic preview route. Reads `forkshopConfig.blocks`, matches by slug, renders the block inside a minimal wrapper. `notFound()` gate when `process.env.NODE_ENV === "production"`. File carries a `<!-- forkshop:auto-managed -->` header comment.

### Step 7 — `{{mount}}/sitemap.tsx` parent

Render from Template 7 — Tree visualization over routes from `forkshopConfig.sitemap`.

### Step 8 — `{{mount}}/reference.tsx` parent (if Reference recipe fired)

Render from Template 8 — Tree over MDX paths from `forkshopConfig.reference.contentPaths`.

### Step 9 — `{{mount}}/page.tsx`

Render from Template 9 — mounts `ForkshopCanvas` + `ForkshopSidebar`. The sidebar `sections` array is built from the selected recipes; each section's `entryKind` matches its child shape (`primitive` for UI Components, `block` for Blocks, `page` for Sitemap and Reference).

### Step 10 — `app/globals.css` (idempotent)

Check whether `@import "@forkshop/engine/forkshop.css"` is present. If not, prepend it above any existing `@tailwind` directives. For src-dir projects, the file is `src/app/globals.css`.

### Step 11 — `next.config.*` (automatic, always-on)

Apply Template 10 (Next 14 webpack-only) or Template 11 (Next 15/16 turbopack + webpack) based on the project's Next major. Merge into existing config rather than replace.

### Step 12 — Root `CLAUDE.md` cadence note (conditional on Phase 5 consent)

Append Template 12 verbatim. Create the file if absent.

### Failure handling

If any step throws, print `✗ <step> — <reason>`, stop, tell the user how to resume.
```

- [ ] **Step 2: Add the new templates to the Scaffolding templates section**

Find the existing `## Scaffolding templates` section. Replace its contents (templates only; keep the substitution-rules preamble) with the templates below.

**Template 1 — `{{mount}}/forkshop.config.tsx`:**

````markdown
### Template 1 — `{{mount}}/forkshop.config.tsx`

```tsx
{{primitive_imports}}

export const forkshopConfig = {
  primitives: [
{{primitive_entries}}
  ],
  blocks: [
{{block_entries}}
  ],
  sitemap: {
    excludeGroups: [{{exclude_groups}}],
    autoDiscover: true,
  },
  reference: {
    contentPaths: [{{content_paths}}],
  },
  viewportProfile: "{{viewport_profile}}",
} as const

export type ForkshopConfig = typeof forkshopConfig

export function getBlockBySlug(slug: string) {
  return forkshopConfig.blocks.find((b) => b.slug === slug)
}
```

Substitution notes:
- `{{primitive_imports}}` — one named import per primitive: `import { Button } from "@/components/ui/button"`. Omit if no primitives.
- `{{primitive_entries}}` — `{ slug, name, component, exampleProps }` per entry, 4-space indented, comma-terminated.
- `{{block_entries}}` — `{ slug, name, src, component }` per entry. `component` imports lazily via the preview route; for the overview tile, `src` is the iframe URL.
- `{{exclude_groups}}` — quoted comma-separated group names from the auth-filter modifier, or empty.
- `{{content_paths}}` — quoted comma-separated glob paths from Scan E, or empty.
- `{{viewport_profile}}` — `"responsive"` (default) or `"mobile"` (mobile flag set).
````

**Template 2 — Design System Board:**

````markdown
### Template 2 — `{{mount}}/design-system.tsx`

```tsx
"use client"

import { ForkshopCanvas, DesignSystemView } from "@forkshop/engine"

export default function DesignSystemBoardView() {
  return (
    <ForkshopCanvas>
      <DesignSystemView />
    </ForkshopCanvas>
  )
}
```
````

**Template 3 — UI Components parent:**

````markdown
### Template 3 — `{{mount}}/ui-components.tsx`

```tsx
"use client"

import { ForkshopCanvas, Gallery } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function UIComponentsBoardView() {
  const entries = forkshopConfig.primitives.map((p) => {
    const Component = p.component
    return {
      id: p.slug,
      label: p.name,
      node: {
        id: `primitive:${p.slug}`,
        kind: "inline-react" as const,
        x: 0, y: 0, width: 320, height: 200,
        label: p.name,
        render: () => <Component {...p.exampleProps} />,
      },
    }
  })
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={320} />
    </ForkshopCanvas>
  )
}
```
````

**Template 4a — per-primitive variant grid (cva-detected):**

````markdown
### Template 4a — `{{mount}}/ui-components/{{slug}}.tsx` (cva variants enumerated)

```tsx
"use client"

import { {{primitive_name}} } from "@/components/ui/{{slug}}"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

export default function {{primitive_name}}BoardView() {
  const entries = [
{{variant_entries}}
  ]
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={240} />
    </ForkshopCanvas>
  )
}
```

`{{variant_entries}}` — one entry per cva variant combination. Each entry is:

```tsx
    {
      id: "{{primitive_slug}}-{{variant_key}}",
      label: "{{variant_label}}",
      node: {
        id: "primitive:{{primitive_slug}}-{{variant_key}}",
        kind: "inline-react" as const,
        x: 0, y: 0, width: 240, height: 80,
        render: () => <{{primitive_name}} {{variant_props}}>Click me</{{primitive_name}}>,
      },
    },
```

E.g., a Button with variant × size cva (3 × 3 = 9 entries) generates 9 such blocks.
````

**Template 4b — per-primitive stub grid (no cva detected):**

````markdown
### Template 4b — `{{mount}}/ui-components/{{slug}}.tsx` (fallback stub)

```tsx
"use client"

import { {{primitive_name}} } from "@/components/ui/{{slug}}"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

// TODO: add variants. This file scaffolds three default instances —
// expand the entries array with the variant combinations you care about.
export default function {{primitive_name}}BoardView() {
  const entries = [
    { id: "default-1", label: "Default", node: { id: "primitive:{{slug}}-default-1", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <{{primitive_name}}>Default</{{primitive_name}}> } },
    { id: "default-2", label: "Default", node: { id: "primitive:{{slug}}-default-2", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <{{primitive_name}}>Default</{{primitive_name}}> } },
    { id: "default-3", label: "Default", node: { id: "primitive:{{slug}}-default-3", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <{{primitive_name}}>Default</{{primitive_name}}> } },
  ]
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={240} />
    </ForkshopCanvas>
  )
}
```
````

**Template 5 — Blocks parent:**

````markdown
### Template 5 — `{{mount}}/blocks.tsx`

```tsx
"use client"

import { ForkshopCanvas, Gallery } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function BlocksBoardView() {
  const viewport = forkshopConfig.viewportProfile === "mobile" ? 375 : 1440
  const entries = forkshopConfig.blocks.map((b) => ({
    id: b.slug,
    label: b.name,
    node: {
      id: `block:${b.slug}`,
      kind: "iframe-component" as const,
      x: 0, y: 0, width: viewport, height: 600,
      label: b.name,
      slug: b.slug,
      src: `/forkshop/block/${b.slug}`,
    },
  }))
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={viewport} />
    </ForkshopCanvas>
  )
}
```
````

**Template 6 — Block preview route (auto-managed):**

````markdown
### Template 6 — `{{mount}}/block/[slug]/page.tsx`

```tsx
// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.
// Auto-recreated by re-running the Forkshop setup skill.

import { notFound } from "next/navigation"
import { getBlockBySlug } from "../../forkshop.config"

export function generateStaticParams() {
  if (process.env.NODE_ENV === "production") return []
  // forkshopConfig.blocks isn't exported as a named const we can iterate here
  // without a circular import, so we rely on the dynamic param + notFound.
  return []
}

export default async function ForkshopBlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (process.env.NODE_ENV === "production") notFound()
  const { slug } = await params
  const entry = getBlockBySlug(slug)
  if (!entry) notFound()
  const Component = entry.component
  return (
    <div className="bg-white">
      <Component />
    </div>
  )
}
```

The block's component renders with its own default props. If the user wants
explicit fixture props for preview, they add them in `forkshop.config.tsx`'s
`blocks` entry (e.g., as a `fixtureProps` field), then read them here.
````

**Template 7 — Sitemap parent:**

````markdown
### Template 7 — `{{mount}}/sitemap.tsx`

```tsx
"use client"

import { ForkshopCanvas, Tree } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function SitemapBoardView() {
  return (
    <ForkshopCanvas>
      <Tree
        excludeGroups={forkshopConfig.sitemap.excludeGroups}
        autoDiscover={forkshopConfig.sitemap.autoDiscover}
      />
    </ForkshopCanvas>
  )
}
```
````

**Template 8 — Reference parent:**

````markdown
### Template 8 — `{{mount}}/reference.tsx`

```tsx
"use client"

import { ForkshopCanvas, Tree } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"

export default function ReferenceBoardView() {
  return (
    <ForkshopCanvas>
      <Tree contentPaths={forkshopConfig.reference.contentPaths} />
    </ForkshopCanvas>
  )
}
```
````

**Template 9 — page.tsx (the orchestrator):**

````markdown
### Template 9 — `{{mount}}/page.tsx`

```tsx
"use client"

import { useState, useEffect } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
} from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"
{{board_imports}}

const DEFAULT_SELECTION: ForkshopSelection = { kind: "section", sectionId: "{{default_section}}" }

export default function ForkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const fromHash = parseSelection(window.location.hash)
    if (fromHash) setSelection(fromHash)
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    window.history.replaceState({}, "", serializeSelection(selection))
  }, [selection, hasHydrated])

  return (
    <AgentActivityProvider fileMap={ /* derived from forkshopConfig */ {} }>
      <div className="flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
{{section_entries}}
          ]}
          routes={[]}
        />
        <div className="relative flex flex-1 overflow-hidden">
{{board_switch}}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
```

Substitution notes:
- `{{board_imports}}` — `import DesignSystemBoardView from "./design-system"` etc., one line per selected recipe.
- `{{default_section}}` — id of the first selected recipe (`design-system`, `ui-components`, etc.).
- `{{section_entries}}` — one `SidebarSection` object per selected recipe. Sitemap and Reference use `entryKind: "page"`; UI Components uses `entryKind: "primitive"`; Blocks uses `entryKind: "block"`.
- `{{board_switch}}` — selection → board mapping (`selection.kind === "section" && selection.sectionId === "design-system" && <DesignSystemBoardView />`, etc., one per recipe + per-leaf cases).
````

**Templates 10-12** (next.config and cadence note) are unchanged from the existing skill — keep them in place.

- [ ] **Step 3: Update Phase 7 summary**

Find the existing `## Phase 7 — Final summary` section and replace its rendered template with this multi-Board version:

```
Forkshop is set up. Here's what you have:

  Mount:       <aliases.mount, abbreviated>  →  http://localhost:3000/forkshop
  Boards:      <comma-separated list of selected Boards with counts>
  Modifiers:   <auth-filter, mobile, etc., or "none">
  Opt-in:      <✓ Cadence note | ✗ Cadence note (skipped) | ✓ Cadence note (already present)>

Try this first:
  1. pnpm dev   (or your package manager's dev command)
  2. Open /forkshop in your browser
  3. Click any primitive in the sidebar — see all variants on one canvas
  4. Click any route under Sitemap — see it at 1440/768/375
  5. Option-click any element → opens the file at the right line
  6. Click any text on a block → edit in place → save

Customize:
  • Add or remove primitives  → edit forkshop.config.tsx primitives list
  • Edit Button variants      → edit ui-components/button.tsx
  • Add a new block           → add an entry in forkshop.config.tsx blocks
  • Filter Sitemap routes     → edit forkshop.config.tsx sitemap.excludeGroups
  Everything Forkshop generated is in your repo. You own all of it.

Sibling skills:
  • forkshop-live-editing  — cadence guidance auto-applies on edits
  • forkshop-doc-sync      — invoke when <aliases.mount>/CLAUDE.md drifts
```

- [ ] **Step 4: Validate skill placeholders**

Run: `pnpm --filter docs validate-registry`
Expected: success. All `{{…}}` in fenced code blocks within `## Scaffolding templates`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/skill/setup.md
git commit -m "feat(skill): rewrite Phase 6 + 7 for multi-Board scaffolding

Adds eight new templates (forkshop.config, design-system, ui-components
parent, per-primitive variant grids, blocks parent, block preview route,
sitemap parent, reference parent) and rewrites the page.tsx orchestrator
template to support the recipe-driven sidebar."
```

---

## Task 7: User CLAUDE.md template rewrite

**Files:**
- Modify: `packages/engine/templates/user-claude-md.md` — full rewrite for 4-concept model + new file layout

- [ ] **Step 1: Read the current template**

Run: `wc -l packages/engine/templates/user-claude-md.md`
Note the current size; the rewrite ends around the same length.

- [ ] **Step 2: Rewrite section "Mental model" — drop Kit concept**

Find the section heading `### Kit` and the example that follows it. Delete that subsection entirely (from `### Kit` through to the next `### ` or `## `). The 5-concept model becomes 4: Node, NodeType, Layout, Board.

Update the intro paragraph above the concepts. Change:

```markdown
Five concepts compose the whole system.
```

to:

```markdown
Four concepts compose the whole system.
```

- [ ] **Step 3: Rewrite the file-layout section**

Find the section titled `## File layout` (or equivalent — the existing template documents the user-side layout). Replace its directory tree with this:

```
{{srcPrefix}}app/forkshop/
  page.tsx                          mounts ForkshopCanvas + ForkshopSidebar
  forkshop.config.tsx               data: primitives, blocks, sitemap, reference
  design-system.tsx                 Design System Board (single leaf)
  ui-components.tsx                 UI Components parent (Gallery overview)
  ui-components/
    button.tsx                      variant grid — authored
    badge.tsx
    …                               one file per primitive
  blocks.tsx                        Blocks parent (Gallery overview)
  sitemap.tsx                       Sitemap parent (Tree)
  reference.tsx                     Reference parent (Tree) — MDX projects only
  block/[slug]/page.tsx             auto-managed block preview route
  CLAUDE.md                         this file
{{srcPrefix}}app/api/forkshop/      route stubs (re-exports from @forkshop/engine)
```

- [ ] **Step 4: Add a new section "Per-primitive variant authoring"**

Insert this section after the existing "How to add a new Board" section (or equivalent):

```markdown
## Per-primitive variant authoring

UI Components is the one place where Forkshop scaffolds per-file Boards in your repo. Each primitive (Button, Badge, etc.) gets its own `ui-components/<slug>.tsx` file containing a variant grid — different prop combinations of the real primitive component.

The grid lives in a `<Gallery>` from `@forkshop/engine`. Each entry is a Node that imports your primitive and renders an instance with specific props:

```tsx
// ui-components/button.tsx
"use client"

import { Button } from "@/components/ui/button"
import { ForkshopCanvas, Gallery } from "@forkshop/engine"

export default function ButtonBoardView() {
  const entries = [
    { id: "primary-sm", label: "Primary / SM", node: { id: "primitive:button-primary-sm", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <Button variant="primary" size="sm">Click me</Button> } },
    { id: "primary-md", label: "Primary / MD", node: { id: "primitive:button-primary-md", kind: "inline-react" as const, x: 0, y: 0, width: 240, height: 80, render: () => <Button variant="primary" size="md">Click me</Button> } },
    // … etc., one entry per variant × size × state combination
  ]
  return (
    <ForkshopCanvas>
      <Gallery entries={entries} layout="grid" viewportWidth={240} />
    </ForkshopCanvas>
  )
}
```

If your primitive uses `class-variance-authority` (cva), the setup skill scaffolds these entries by enumerating the cva variants. Otherwise it scaffolds three default instances and you fill in the variants manually.

These files render your *real* primitive component — they're not duplicates. Edit `components/ui/button.tsx` and the grid re-renders with the new visuals via HMR.
```

- [ ] **Step 5: Add a new section "Self-containment posture"**

Insert this section near the top of the template, after the opening paragraphs:

```markdown
## Self-containment posture

Forkshop is a drop-in install. Every file Forkshop creates lives under a `forkshop` namespace:

- `{{srcPrefix}}app/forkshop/` — Board scaffolds + the mount + the auto-managed block preview route
- `{{srcPrefix}}app/api/forkshop/` — API route stubs
- `{{srcPrefix}}public/fonts/forkshop/` — font binary
- `.claude/skills/forkshop-*.md` — skill files
- `forkshop.json` — lock file

Modifications to your existing files are limited to four additive items:

1. One import line in `app/globals.css`
2. A `@locator/webpack-loader` rule in `next.config.*` (for Option-click)
3. `@forkshop/engine` + `@locator/webpack-loader` in `package.json`
4. (Opt-in) A `<!-- forkshop:cadence-note start -->`…`end` block in root `CLAUDE.md`

Nothing else. No injection into `components/`, `lib/`, or route groups.

To remove Forkshop cleanly: delete the namespaced directories, revert the four mutations, uninstall the deps. Done.
```

- [ ] **Step 6: Validate registry**

Run: `pnpm --filter docs validate-registry`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/templates/user-claude-md.md
git commit -m "feat(template): rewrite user CLAUDE.md for 4-concept model

Drops the Kit concept, adds per-primitive variant authoring section,
adds self-containment posture section, refreshes file layout for the
multi-Board scaffold."
```

---

## Task 8: Playground — `forkshop.config.tsx` new shape

**Files:**
- Modify: `apps/playground/app/forkshop/forkshop.config.tsx`

- [ ] **Step 1: Read current config**

Run: `cat apps/playground/app/forkshop/forkshop.config.tsx`
Note the current shape; the rewrite preserves the same primitives/blocks/pages but reshapes around the new model.

- [ ] **Step 2: Replace with new shape**

Overwrite `apps/playground/app/forkshop/forkshop.config.tsx` with:

```tsx
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Hero } from "@/components/blocks/hero"
import { FeatureGrid } from "@/components/blocks/feature-grid"
import { Cta } from "@/components/blocks/cta"
import { Pricing } from "@/components/blocks/pricing"

export const forkshopConfig = {
  primitives: [
    { slug: "button", name: "Button", component: Button, exampleProps: { children: "Click me" } },
    { slug: "badge",  name: "Badge",  component: Badge,  exampleProps: { children: "New" } },
    { slug: "input",  name: "Input",  component: Input,  exampleProps: { placeholder: "Type here…" } },
  ],
  blocks: [
    { slug: "hero",         name: "Hero",         component: Hero,         src: "/forkshop/block/hero" },
    { slug: "feature-grid", name: "Feature Grid", component: FeatureGrid,  src: "/forkshop/block/feature-grid" },
    { slug: "cta",          name: "CTA",          component: Cta,          src: "/forkshop/block/cta" },
    { slug: "pricing",      name: "Pricing",      component: Pricing,      src: "/forkshop/block/pricing" },
  ],
  sitemap: {
    excludeGroups: [],
    autoDiscover: true,
  },
  reference: {
    contentPaths: [],
  },
  viewportProfile: "responsive" as const,
} as const

export type ForkshopConfig = typeof forkshopConfig

export function getBlockBySlug(slug: string) {
  return forkshopConfig.blocks.find((b) => b.slug === slug)
}
```

If the playground's actual primitive or block names differ, adjust the imports + entries accordingly. Run `ls apps/playground/components/ui apps/playground/components/blocks` first to confirm.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter playground typecheck`
Expected: errors only in files that consume `forkshopConfig.pages` (the old shape) — those are fixed by later tasks.

- [ ] **Step 4: Commit**

```bash
git add apps/playground/app/forkshop/forkshop.config.tsx
git commit -m "refactor(playground): new forkshop.config.tsx shape

Switches from {primitives,blocks,pages} to the multi-Board shape
{primitives,blocks,sitemap,reference,viewportProfile}. Blocks gain
a 'component' field (the real React component) + a 'src' field
pointing at the new block preview route."
```

---

## Task 9: Playground — `design-system.tsx` (renamed from `foundations-board.tsx`)

**Files:**
- Create: `apps/playground/app/forkshop/design-system.tsx`
- Delete: `apps/playground/app/forkshop/foundations-board.tsx`

- [ ] **Step 1: Inspect the existing foundations board**

Run: `cat apps/playground/app/forkshop/foundations-board.tsx`
Note: probably wraps `DesignSystemView` with positions. The new file is a slimmer version.

- [ ] **Step 2: Create `design-system.tsx`**

Write `apps/playground/app/forkshop/design-system.tsx`:

```tsx
"use client"

import { DesignSystemView } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"

export default function DesignSystemBoardView({
  nodePositions,
  onPositionChange,
}: {
  nodePositions?: Record<string, { x: number; y: number }>
  onPositionChange?: (id: string, position: { x: number; y: number }) => void
}) {
  return (
    <PlaygroundBoard stageWidth={1400} stageHeight={900} fitMode="both">
      {() => (
        <DesignSystemView
          nodePositions={nodePositions}
          onPositionChange={onPositionChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

If `DesignSystemView` accepts different props in the current engine, adapt to those. The intent is one full-canvas DesignSystemView, the only customization being position persistence (already supported).

- [ ] **Step 3: Delete the old `foundations-board.tsx`**

Run: `git rm apps/playground/app/forkshop/foundations-board.tsx`

- [ ] **Step 4: Typecheck (will still fail on consumers — that's expected)**

Run: `pnpm --filter playground typecheck`
Expected: errors point to `page.tsx` still importing `FoundationsBoard`. Fixed in Task 13.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/app/forkshop/design-system.tsx \
        apps/playground/app/forkshop/foundations-board.tsx
git commit -m "refactor(playground): rename foundations-board to design-system

Matches the spec #4 sidebar lineup (foundations → Design System).
Pure rename + lightly slimmed; consumers updated in Task 13."
```

---

## Task 10: Playground — UI Components per-primitive files

**Files:**
- Create: `apps/playground/app/forkshop/ui-components.tsx` (parent)
- Create: `apps/playground/app/forkshop/ui-components/button.tsx`
- Create: `apps/playground/app/forkshop/ui-components/badge.tsx`
- Create: `apps/playground/app/forkshop/ui-components/input.tsx`
- Delete: `apps/playground/app/forkshop/components-board.tsx`

- [ ] **Step 1: Create the UI Components parent file**

Write `apps/playground/app/forkshop/ui-components.tsx`:

```tsx
"use client"

import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export default function UIComponentsBoardView({
  nodePositions,
  onPositionChange,
}: {
  nodePositions?: Record<string, { x: number; y: number }>
  onPositionChange?: (id: string, position: { x: number; y: number }) => void
}) {
  const entries: GalleryEntry[] = forkshopConfig.primitives.map((p) => {
    const Component = p.component
    const node: InlineReactNode = {
      id: `primitive:${p.slug}`,
      kind: "inline-react",
      x: 0,
      y: 0,
      width: 320,
      height: 120,
      label: p.name,
      render: () => <Component {...p.exampleProps} />,
    }
    return { id: p.slug, label: p.name, node }
  })

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={700} fitMode="both">
      {() => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={320}
          nodePositions={nodePositions}
          onPositionChange={onPositionChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

- [ ] **Step 2: Create `ui-components/button.tsx` variant grid**

Make sure the directory exists, then write `apps/playground/app/forkshop/ui-components/button.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

const VARIANTS = ["default", "secondary", "ghost", "destructive"] as const
const SIZES = ["sm", "default", "lg"] as const

export default function ButtonBoardView({
  nodePositions,
  onPositionChange,
}: {
  nodePositions?: Record<string, { x: number; y: number }>
  onPositionChange?: (id: string, position: { x: number; y: number }) => void
}) {
  const entries: GalleryEntry[] = []
  for (const variant of VARIANTS) {
    for (const size of SIZES) {
      const id = `button-${variant}-${size}`
      const node: InlineReactNode = {
        id: `primitive:${id}`,
        kind: "inline-react",
        x: 0,
        y: 0,
        width: 240,
        height: 80,
        label: `${variant} / ${size}`,
        render: () => (
          <Button variant={variant as never} size={size as never}>
            Click me
          </Button>
        ),
      }
      entries.push({ id, label: `${variant} / ${size}`, node })
    }
  }
  return (
    <PlaygroundBoard stageWidth={1100} stageHeight={500} fitMode="both">
      {() => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={240}
          nodePositions={nodePositions}
          onPositionChange={onPositionChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

Adjust `VARIANTS` and `SIZES` to match what the playground's actual `Button` component supports. Run `cat apps/playground/components/ui/button.tsx` to confirm.

- [ ] **Step 3: Create `ui-components/badge.tsx`**

Write `apps/playground/app/forkshop/ui-components/badge.tsx` — same shape as Button, with Badge's actual variant set. Verify by reading the Badge source.

- [ ] **Step 4: Create `ui-components/input.tsx`**

Write `apps/playground/app/forkshop/ui-components/input.tsx` — Input typically has fewer variants (size, state). Scaffold at least: default, disabled, with-placeholder, error states.

- [ ] **Step 5: Delete `components-board.tsx`**

Run: `git rm apps/playground/app/forkshop/components-board.tsx`

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter playground typecheck`
Expected: page.tsx still has unresolved `ComponentsBoard` import. Fixed in Task 13.

- [ ] **Step 7: Commit**

```bash
git add apps/playground/app/forkshop/ui-components.tsx \
        apps/playground/app/forkshop/ui-components/ \
        apps/playground/app/forkshop/components-board.tsx
git commit -m "refactor(playground): split UI Components into per-primitive variant grids

Adds ui-components.tsx (parent Gallery overview) plus one file per
primitive (button.tsx, badge.tsx, input.tsx) with full variant matrices.
Drops the single components-board.tsx in favor of this hybrid layout."
```

---

## Task 11: Playground — `sitemap.tsx` (renamed from `pages-board.tsx`)

**Files:**
- Create: `apps/playground/app/forkshop/sitemap.tsx`
- Delete: `apps/playground/app/forkshop/pages-board.tsx`

- [ ] **Step 1: Inspect the existing pages-board**

Run: `cat apps/playground/app/forkshop/pages-board.tsx`

- [ ] **Step 2: Create `sitemap.tsx`**

Write `apps/playground/app/forkshop/sitemap.tsx`:

```tsx
"use client"

import { Tree } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"

export default function SitemapBoardView({
  nodePositions,
  onPositionChange,
}: {
  nodePositions?: Record<string, { x: number; y: number }>
  onPositionChange?: (id: string, position: { x: number; y: number }) => void
}) {
  return (
    <PlaygroundBoard stageWidth={1400} stageHeight={900} fitMode="both">
      {() => (
        <Tree
          nodePositions={nodePositions}
          onPositionChange={onPositionChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

If the current `pages-board.tsx` passes additional props (e.g., explicit route list), preserve them here. The intent is a Tree visualization of routes.

- [ ] **Step 3: Delete `pages-board.tsx`**

Run: `git rm apps/playground/app/forkshop/pages-board.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/playground/app/forkshop/sitemap.tsx \
        apps/playground/app/forkshop/pages-board.tsx
git commit -m "refactor(playground): rename pages-board to sitemap

Matches the spec #4 sidebar lineup (pages → Sitemap)."
```

---

## Task 12: Playground — block preview route + blocks parent

**Files:**
- Create: `apps/playground/app/forkshop/block/[slug]/page.tsx`
- Create: `apps/playground/app/forkshop/blocks.tsx`
- Delete: `apps/playground/app/forkshop/blocks-board.tsx`

- [ ] **Step 1: Create the block preview route**

Make sure `apps/playground/app/forkshop/block/[slug]/` exists, then write `page.tsx`:

```tsx
// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.

import { notFound } from "next/navigation"
import { getBlockBySlug } from "../../forkshop.config"

export default async function PlaygroundBlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (process.env.NODE_ENV === "production") notFound()
  const { slug } = await params
  const entry = getBlockBySlug(slug)
  if (!entry) notFound()
  const Component = entry.component
  return (
    <div className="bg-white">
      <Component />
    </div>
  )
}
```

- [ ] **Step 2: Verify it renders**

Run: `pnpm --filter playground dev` (in a background terminal if available).
Open: `http://localhost:3000/forkshop/block/hero`
Expected: the Hero block renders inside a white wrapper, no canvas chrome.

If the dev server is already running from another task, you can skip the background start.

- [ ] **Step 3: Create `blocks.tsx` parent**

Write `apps/playground/app/forkshop/blocks.tsx`:

```tsx
"use client"

import { Gallery, type GalleryEntry, type IframeComponentNode } from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"

export default function BlocksBoardView({
  nodePositions,
  onPositionChange,
}: {
  nodePositions?: Record<string, { x: number; y: number }>
  onPositionChange?: (id: string, position: { x: number; y: number }) => void
}) {
  const viewport = forkshopConfig.viewportProfile === "mobile" ? 375 : 1440
  const entries: GalleryEntry[] = forkshopConfig.blocks.map((b) => {
    const node: IframeComponentNode = {
      id: `block:${b.slug}`,
      kind: "iframe-component",
      x: 0,
      y: 0,
      width: viewport,
      height: 600,
      label: b.name,
      slug: b.slug,
      src: b.src,
    }
    return { id: b.slug, label: b.name, node }
  })

  return (
    <PlaygroundBoard stageWidth={1800} stageHeight={1400} fitMode="width">
      {() => (
        <Gallery
          entries={entries}
          layout="stack"
          viewportWidth={viewport}
          nodePositions={nodePositions}
          onPositionChange={onPositionChange}
        />
      )}
    </PlaygroundBoard>
  )
}
```

- [ ] **Step 4: Delete the old `blocks-board.tsx`**

Run: `git rm apps/playground/app/forkshop/blocks-board.tsx`

- [ ] **Step 5: Commit**

```bash
git add apps/playground/app/forkshop/block/ \
        apps/playground/app/forkshop/blocks.tsx \
        apps/playground/app/forkshop/blocks-board.tsx
git commit -m "feat(playground): add block preview route + new blocks parent

Adds app/forkshop/block/[slug]/page.tsx — the auto-managed preview
route for iframe-component leaves. Follows Fogma's precedent
(/fogma/block/<slug>). Replaces blocks-board.tsx with blocks.tsx
pointed at the new preview route."
```

---

## Task 13: Playground — `page.tsx` restructure for the new section model

**Files:**
- Modify: `apps/playground/app/forkshop/page.tsx`

- [ ] **Step 1: Update imports and FILE_MAP**

Replace the existing imports block (lines 1-25 of the current file) with:

```tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ForkshopSidebar,
  AgentActivityProvider,
  AgentSelectionChip,
  DesignSystemView,
  Gallery,
  Tree,
  ResponsiveFrameView,
  responsiveFrameStageDimensions,
  parseSelection,
  serializeSelection,
  type ForkshopSelection,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import DesignSystemBoardView from "./design-system"
import UIComponentsBoardView from "./ui-components"
import BlocksBoardView from "./blocks"
import SitemapBoardView from "./sitemap"
import ButtonBoardView from "./ui-components/button"
import BadgeBoardView from "./ui-components/badge"
import InputBoardView from "./ui-components/input"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

const DEFAULT_SELECTION: ForkshopSelection = { kind: "section", sectionId: "design-system" }
```

- [ ] **Step 2: Update FILE_MAP to use the new config shape**

Replace the FILE_MAP block with:

```tsx
const FILE_MAP = {
  primitives: forkshopConfig.primitives.map((p) => ({
    id: p.slug,
    sourcePath: `components/ui/${p.slug}.tsx`,
  })),
  blocks: forkshopConfig.blocks.map((b) => ({
    slug: b.slug,
    sourcePath: `components/blocks/${b.slug}.tsx`,
  })),
}
```

If a primitive or block doesn't follow the convention, override `sourcePath` per-entry in the playground config and read it here.

- [ ] **Step 3: Replace the `deriveView` + per-leaf board components**

The current file has `SinglePrimitiveBoard`, `SingleBlockBoard`, `SinglePageBoard` defined inline. Replace them with a single selection-to-Board mapping inside the component, since the per-primitive variant grid is now in `ui-components/<slug>.tsx`.

Locate the start of `export default function ForkshopPage()` and replace from there to the end of the file with:

```tsx
const PRIMITIVE_BOARDS: Record<string, React.ComponentType<BoardProps>> = {
  button: ButtonBoardView,
  badge: BadgeBoardView,
  input: InputBoardView,
}

type BoardProps = {
  nodePositions?: Record<string, { x: number; y: number }>
  onPositionChange?: (id: string, position: { x: number; y: number }) => void
}

function SingleBlockBoard({ slug }: { slug: string }) {
  const block = forkshopConfig.blocks.find((b) => b.slug === slug)
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  const handleBodyHeightChange = useCallback((_id: string, h: number) => setMeasuredHeight(h), [])
  const { width, height } = useMemo(
    () => responsiveFrameStageDimensions(measuredHeight, [1440, 768, 375]),
    [measuredHeight],
  )
  if (!block) return null
  return (
    <PlaygroundBoard stageWidth={width} stageHeight={height} fitMode="width">
      {() => (
        <ResponsiveFrameView
          kind="block"
          path={block.slug}
          source={block.src}
          viewports={[1440, 768, 375]}
          measuredHeight={measuredHeight}
          onBodyHeightChange={handleBodyHeightChange}
        />
      )}
    </PlaygroundBoard>
  )
}

function SinglePageBoard({ path }: { path: string }) {
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined)
  const handleBodyHeightChange = useCallback((_id: string, h: number) => setMeasuredHeight(h), [])
  const { width, height } = useMemo(
    () => responsiveFrameStageDimensions(measuredHeight, [1440, 768, 375]),
    [measuredHeight],
  )
  return (
    <PlaygroundBoard stageWidth={width} stageHeight={height} fitMode="width">
      {() => (
        <ResponsiveFrameView
          kind="page"
          path={path}
          source={path}
          viewports={[1440, 768, 375]}
          measuredHeight={measuredHeight}
          onBodyHeightChange={handleBodyHeightChange}
        />
      )}
    </PlaygroundBoard>
  )
}

export default function ForkshopPage() {
  const [selection, setSelection] = useState<ForkshopSelection>(DEFAULT_SELECTION)
  const [hasHydrated, setHasHydrated] = useState(false)
  const positions = useForkshopPositions()

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

  useEffect(() => {
    function onPopState() {
      const fromHash = parseSelection(window.location.hash)
      setSelection(fromHash ?? DEFAULT_SELECTION)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const sitemapEntries = useMemo(
    () =>
      // Playground exposes a small set of routes for the Sitemap section.
      // Real users derive these from `forkshopConfig.sitemap` + auto-discovery.
      [
        { slug: "/", name: "/" },
        { slug: "/about", name: "/about" },
        { slug: "/pricing", name: "/pricing" },
      ],
    [],
  )

  return (
    <AgentActivityProvider fileMap={FILE_MAP}>
      <div className="flex h-screen overflow-hidden">
        <ForkshopSidebar
          selection={selection}
          onSelect={setSelection}
          sections={[
            { id: "design-system", title: "Design System", icon: DesignSystemView.icon },
            {
              id: "ui-components",
              title: "UI Components",
              icon: Gallery.icon,
              entryKind: "primitive",
              entries: forkshopConfig.primitives.map((p) => ({ slug: p.slug, name: p.name })),
            },
            {
              id: "blocks",
              title: "Blocks",
              icon: Gallery.icon,
              entryKind: "block",
              entries: forkshopConfig.blocks.map((b) => ({ slug: b.slug, name: b.name })),
            },
            {
              id: "sitemap",
              title: "Sitemap",
              icon: Tree.icon,
              entryKind: "page",
              entries: sitemapEntries,
            },
          ]}
          routes={[]}
        />
        <div className="relative flex flex-1 overflow-hidden">
          <AgentSelectionChip
            pageSelectionPath={selection.kind === "page" ? selection.path : undefined}
            blockSelectionSlug={selection.kind === "block" ? selection.slug : undefined}
            primitiveSelectionId={selection.kind === "primitive" ? selection.id : undefined}
          />
          {selection.kind === "section" && selection.sectionId === "design-system" && (
            <DesignSystemBoardView
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {selection.kind === "section" && selection.sectionId === "ui-components" && (
            <UIComponentsBoardView
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {selection.kind === "section" && selection.sectionId === "blocks" && (
            <BlocksBoardView
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {selection.kind === "section" && selection.sectionId === "sitemap" && (
            <SitemapBoardView
              nodePositions={positions.nodePositions}
              onPositionChange={positions.onPositionChange}
            />
          )}
          {selection.kind === "primitive" && PRIMITIVE_BOARDS[selection.id]
            ? (() => {
                const Board = PRIMITIVE_BOARDS[selection.id]
                return (
                  <Board
                    nodePositions={positions.nodePositions}
                    onPositionChange={positions.onPositionChange}
                  />
                )
              })()
            : null}
          {selection.kind === "block" && <SingleBlockBoard slug={selection.slug} />}
          {selection.kind === "page" && <SinglePageBoard path={selection.path} />}
        </div>
      </div>
    </AgentActivityProvider>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter playground typecheck`
Expected: no errors.

- [ ] **Step 5: Build**

Run: `pnpm --filter playground build`
Expected: success.

- [ ] **Step 6: Run dev server + manual smoke**

Run: `pnpm --filter playground dev` (background).
Open: `http://localhost:3000/forkshop`
Click through:
- Design System → DesignSystemView renders
- UI Components (parent) → Gallery with 3 primitive tiles
- UI Components > Button → variant grid (12 cells: 4 variants × 3 sizes)
- UI Components > Badge → variant grid
- UI Components > Input → variant grid
- Blocks (parent) → Gallery of 4 block iframes
- Blocks > Hero → ResponsiveFrameView at 3 viewports
- Sitemap (parent) → Tree
- Sitemap > /about → ResponsiveFrameView of /about

Confirm: no Ravineo references visible.

- [ ] **Step 7: Commit**

```bash
git add apps/playground/app/forkshop/page.tsx
git commit -m "refactor(playground): restructure page.tsx for spec #4 section model

Wires the new sections (Design System, UI Components with primitive
children, Blocks, Sitemap with route children using entryKind:'page')
to their respective Board files. The per-primitive variant grids live
in ui-components/<slug>.tsx, mapped through PRIMITIVE_BOARDS."
```

---

## Task 14: Final validation pass

**Files:** none — verification only.

- [ ] **Step 1: Run the full check**

Run: `pnpm check` (from repo root)
Expected: success — typecheck + lint passes across the workspace.

- [ ] **Step 2: Run validate-registry**

Run: `pnpm --filter docs validate-registry`
Expected: success — no placeholder leaks, all bundle items resolve.

- [ ] **Step 3: Run the engine unit tests**

Run: `pnpm --filter @forkshop/engine test`
Expected: success — including the new `forkshop-sidebar.test.tsx`.

- [ ] **Step 4: Run the playground build**

Run: `pnpm --filter playground build`
Expected: success.

- [ ] **Step 5: Run the smoke fixture (if available)**

Run: `bash tests/smoke/run-smoke.sh`
Expected: success — `forkshop init` produces expected files against a fresh Next.js skeleton.

If the smoke fixture isn't aware of the new templates yet, file a follow-up TODO; this plan doesn't require updating the smoke fixture for the multi-Board scaffolds (the smoke covers the CLI's init layer, not the setup skill's scaffold layer).

- [ ] **Step 6: Final exit-criteria check against the spec**

Spec exit criteria (`docs/specs/2026-05-17-setup-skill-v2-design.md:514-525`):
- ✓ `packages/engine/src/skill/setup.md` updated with multi-Board logic (Tasks 4-6)
- ✓ `packages/engine/templates/user-claude-md.md` updated (Task 7)
- ✓ `packages/engine/src/components/sidebar/forkshop-sidebar.tsx` supports `entryKind: "page"` (Task 3)
- ✓ `apps/playground/app/forkshop/` rebuilt against the new layout (Tasks 8-13)
- ✓ `validate-registry` passes (Step 2)
- ✓ Manual smoke through 5 fixture project shapes — manual outside this plan; document any gaps as follow-up tasks
- ✓ Strategy v2 has refinement entry #14 (Task 1)
- ✓ `docs/polish-backlog.md` carries the DesignSystemView extension (Task 2)

Each item satisfied — green light to mark the plan complete.

- [ ] **Step 7: Final commit (if any uncommitted state remains)**

Run: `git status --short`
Expected: clean — every task committed its own changes.

If there are any uncommitted bits (e.g., positions.json updates from manual smoke clicking around), discard them: `git checkout apps/playground/app/forkshop/positions.json`.
