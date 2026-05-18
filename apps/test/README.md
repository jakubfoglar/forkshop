# Forkshop test fixture

A pristine Next.js + Tailwind app with curated content for validating the full
`forkshop init` + setup-skill flow.

## Workflow

1. **Reset to pre-init state** (from repo root):
   ```
   pnpm reset-test
   ```
2. **Open a Claude Code session in this directory**:
   ```
   cd apps/test && claude
   ```
3. **Invoke the setup skill**: type `set up Forkshop` in the Claude session.
4. **Verify** the setup skill detects the right recipes from this fixture's signals
   (UI primitives, blocks, routes, MDX content, theme tokens).
5. **Optionally**: `pnpm dev` to see the result at `localhost:3001`.

## What's in here?

- `components/ui/` — shadcn-shaped primitives (Badge, Button, Input, Select)
- `components/blocks/` — composed blocks (Hero, FeatureGrid, CTA, Pricing)
- `app/` — public routes (page, about, pricing, contact)
- `content/` — MDX content (triggers Reference recipe)
- `tailwind.config.ts` — non-default theme.extend (triggers Design System recipe)

## What's NOT in here (and stays not-in)?

- `app/forkshop/`, `app/api/forkshop/`, `forkshop.json`, `.claude/skills/forkshop-*`,
  `.claude/hooks/forkshop-*` — these are init/setup-skill outputs and intentionally
  gitignored. Run `pnpm reset-test` to clean up after a test cycle.
