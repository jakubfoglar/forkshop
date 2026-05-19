# Forkshop

A Figma-style canvas mounted inside your Next.js dev server.

Forkshop adds a sidebar and an infinite canvas to an existing
project. Your pages, components, and design tokens render on the
canvas as iframes — at multiple viewports, side-by-side. Click any
text to edit it; ⌘↵ saves to source. When a coding agent edits a
file your canvas is showing, the change lands in real time.

**Docs:** https://forkshop.dev/docs

## Install

```bash
npx forkshop init
```

Then run your package manager's install command (init prints it) and
open Claude Code in the project — say "set up Forkshop" to scaffold
your first Board.

## What it does

- A canvas at `/forkshop` in your dev server. Sidebar lists Boards;
  canvas renders the active one.
- Live text editing across iframes — typing mirrors across viewports
  as you go, ⌘↵ writes to source, Next.js HMR picks it up.
- Activity feed for coding agents (Claude Code, Cursor, anything
  that hits the producer endpoint). Edits and reads highlight on
  the canvas in the agent's color.
- Option-click any element to open it in your editor at the exact
  line.
- Four engine-shipped Layouts: `Gallery`, `Tree`, `DesignSystemView`,
  `ResponsiveFrameView`. Build your own NodeTypes and Layouts when
  you need to.
- Dev-only. Production tree-shakes the editing overlay; dev routes
  return 403.

## Status

`v0.1.0`. Pre-1.0 — expect breaking changes between minor versions.

## License

Multi-licensed:

| Component | License |
|-----------|---------|
| `packages/engine/` | FSL-1.1-Apache-2.0 (transitions to Apache-2.0 after 2 years) |
| `packages/cli/` | MIT |
| Scaffolds shipped by the CLI (`packages/engine/src/skill/`, `packages/engine/templates/`) | MIT |
| `apps/` (docs site, demo, test fixture) | MIT |

The [Functional Source License](https://fsl.software) restricts using
the engine to build a competing product or service that substitutes
for Forkshop. Everything else is freely reusable. Full breakdown in
[LICENSE](./LICENSE).

© 2026 Jakub Foglar.

## Contributing

Issues and PRs welcome at
[github.com/jakubfoglar/forkshop](https://github.com/jakubfoglar/forkshop).
For substantive engine or API changes, open an issue first. The
maintainer guide is in [CLAUDE.md](./CLAUDE.md).
