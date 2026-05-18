# Forkshop production deploy — design

Date: 2026-05-18
Status: Approved — draft v0
Downstream of: `docs/strategy/2026-05-14-forkshop-strategy-v2-design.md`, `docs/strategy/2026-05-17-forkshop-dev-website-shape.md`

## Goal

Get Forkshop live in production so the CLI's hardcoded `forkshop.dev/r/` registry resolves, the npm packages exist, and there's a credible one-page front door at `forkshop.dev`. Everything else (docs, demo, embedded mini-canvases, Remotion marketing videos) is deliberately out of scope for v0.1.0 launch.

Concretely, after this spec:

- `github.com/jakubfoglar/forkshop` exists, public, with CI on PRs and tag-driven npm release on `v*.*.*`.
- `@forkshop/engine@0.1.0` and `forkshop@0.1.0` are published to npm.
- `forkshop.dev` resolves to a Vercel-deployed Next.js app serving:
  - `/` — real one-page marketing landing.
  - `/r/registry.json` + `/r/fonts/*` — the registry the CLI talks to.
- `npx forkshop init` works end-to-end against a fresh `create-next-app` skeleton.

## Non-goals

- `/docs` and `/demo` — defer; routes simply 404 until a future spec.
- Apex-domain dogfooding (`forkshop.dev/forkshop`) — explicitly out per the website-shape doc.
- Embedded mini-Forkshops on the marketing page — deferred.
- Remotion compositions, marketing videos — deferred.
- Analytics, cookie banner, newsletter signup — deferred.
- Changesets / release-please / staging environment — overkill at solo pre-1.0.
- `apps/docs` → `apps/web` rename from the website-shape doc — defer until docs+demo land (they'll touch much more than a name).

## Architecture

One GitHub repo, one Vercel project, one domain. The repo is the existing monorepo unchanged in structure; the Vercel project's root directory is `apps/docs` (kept as-is to avoid churn).

```
github.com/jakubfoglar/forkshop  (private at create, public at end of runbook)
└── Vercel project "forkshop" — root: apps/docs
    └── forkshop.dev (Vercel nameservers)
        ├── /                       → marketing landing
        ├── /r/registry.json        → CLI registry endpoint (hardcoded)
        └── /r/fonts/raveo/*.woff2  → font binaries

npm:
├── @forkshop/engine@0.1.0  (published by GitHub Actions on v* tag)
└── forkshop@0.1.0           (published by GitHub Actions on v* tag)
```

The `apps/demo` workspace (the dev playground) is part of the monorepo but Vercel never touches it — Vercel only builds `apps/docs`. Standard "monorepo with undeployed apps" Vercel pattern.

## Component 1 — GitHub repo + CI

**Repo:** `jakubfoglar/forkshop`. Private at creation; flipped to public at the end of the runbook after a clean smoke test.

**Default branch:** `main`. Production deploys come from `main`; every other branch gets a Vercel preview at `*.vercel.app`.

**Secrets needed in the repo:**
- `NPM_TOKEN` — automation token from npm (bypasses 2FA for CI).
- `CENTRAL_LICENSE_KEY` — iconists.co license key; needed by the engine workspace's preinstall script. Required for CI and release, NOT for Vercel (Vercel builds `apps/docs` only, which doesn't pull engine source).

**`.github/workflows/ci.yml`** — runs on PRs and pushes to `main`:
1. Checkout, setup-node 20, setup-pnpm (cached store).
2. `pnpm install` with `CENTRAL_LICENSE_KEY` in env.
3. `pnpm check` (typecheck + lint).
4. `pnpm test`.
5. `pnpm build`.

**`.github/workflows/release.yml`** — triggered by tag matching `v*.*.*`:
1. Checkout at tag, setup-node 20, setup-pnpm.
2. `pnpm install` with `CENTRAL_LICENSE_KEY`.
3. `pnpm --filter @forkshop/engine build`.
4. `pnpm --filter forkshop build`.
5. `pnpm --filter @forkshop/engine publish --no-git-checks --access public` with `NPM_TOKEN`.
6. `pnpm --filter forkshop publish --no-git-checks --access public` with `NPM_TOKEN`.
7. `gh release create $TAG --generate-notes`.

**Engine-first publish order:** if engine publish fails, the CLI on npm would point to a missing engine version. The CLI scaffold (via `manifest-builder.ts`) pins the engine version at CLI build time, so the order is: bump both package.json versions in lockstep → rebuild CLI → tag → push tag → Actions publishes engine first, CLI second.

**One pre-publish fix:** `packages/cli/package.json` currently has `"private": true`. Flip to `false` and add `"publishConfig": { "access": "public" }` to mirror engine's. Without this, `pnpm publish` no-ops.

## Component 2 — Vercel project + DNS

**Project:** `forkshop`, linked to the GitHub repo, on Jakub's Pro account.

**Settings:**
- Root directory: `apps/docs`.
- Framework preset: Next.js (auto-detected).
- Install command: `cd ../.. && pnpm install --filter docs...` (the `...` includes workspace deps — picks up the `forkshop` CLI package since `apps/docs` consumes it via `workspace:*`).
- Build command: `pnpm --filter docs build` (already runs `validate-registry` first).
- Output directory: Vercel's Next.js default.
- Node version: 20 (matches monorepo `engines.node`).
- Environment variables: none. `CENTRAL_LICENSE_KEY` is NOT needed in Vercel — it's only required when the engine workspace's preinstall runs, and Vercel's filtered install (`--filter docs...`) does not install the engine workspace.

**Branching:** `main` → production. Every other branch → preview deploy on auto-generated `*.vercel.app` URL.

**Domain:** `forkshop.dev`.

**DNS via Vercel nameservers:**
1. In Vercel project → Settings → Domains, add `forkshop.dev` and `www.forkshop.dev`. Vercel shows two NS hostnames (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
2. Using the Namecheap API token, swap the domain's nameservers via the `namecheap.domains.dns.setCustom` endpoint. This avoids the Namecheap web UI entirely.
3. Vercel handles apex + www redirect + SSL renewal automatically.
4. Propagation: typically <1h, up to 24h worst case.

**Cache header for the registry:** add to `apps/docs/next.config.mjs` `headers()`:

```js
{
  source: "/r/registry.json",
  headers: [
    { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" },
  ],
}
```

The existing 1-year immutable cache on `/r/fonts/:all*` stays. Together: registry JSON updates within ~5min of a deploy; fonts are cached forever.

## Component 3 — npm publish workflow

**Versioning:** manual bump in both `packages/engine/package.json` and `packages/cli/package.json`, kept in lockstep. First release is `0.1.0`. Pre-1.0 — no API stability promises. Matches CLAUDE.md's "manual cadence" note.

**Trigger:** `git tag v0.1.0 && git push --tags`.

**Release workflow:** see Component 1's `release.yml` shape.

**Pin sync:** the CLI's `manifest-builder.ts` reads the engine version from `packages/engine/package.json` at CLI build time and embeds it as the install pin. So:
- Bump engine to `0.1.0`.
- Bump CLI to `0.1.0`.
- `pnpm --filter forkshop build` (regenerates the manifest with the new pin).
- Commit, tag, push.

**Smoke test, manual, post-release:**
```
cd /tmp
pnpm create next-app smoke
cd smoke
npx forkshop@latest init
```
Verify no 404s on the registry fetch or font fetch.

**Why not changesets:** solo, pre-1.0, manual cadence. Adds machinery that doesn't pay rent yet. Revisit at 1.0 or when there are multiple contributors.

**Why not manual `pnpm publish`:** requires keeping an npm token on the local machine and remembering the order. Tag-driven Actions is one extra workflow file but it eliminates the "did I publish in the right order" footgun and gives a public audit trail in GitHub releases.

## Component 4 — Marketing landing at `/`

Replace the current `<h1>Forkshop</h1>` placeholder. One-page, hand-written Tailwind. Not a Forkshop install — the landing page does not mount `<ForkshopCanvas>` or use any engine primitives. (Embedded mini-canvases are a future spec per the website-shape doc.)

**Above-the-fold hero:**
- Raveo wordmark (`packages/engine/fonts/raveo/RaveoVF.woff2`, loaded via `next/font/local` in `apps/docs/app/layout.tsx`).
- Tagline (one line — to be drafted during implementation; strawman: "A Figma-style canvas for your Next.js project.").
- Sub-paragraph (1–2 sentences on what it is).
- Install command in a copy-able code block: `npx forkshop init`.
- Primary CTA: GitHub repo button.

**Three-card "what it does" strip** (no animations):
1. **Multi-viewport boards** — "See your pages at desktop, tablet, mobile at the same time."
2. **Live text editing** — "Click any text in the canvas to edit. ⌘↵ saves to the TSX file."
3. **AI agent activity indicators** — describes the shipped `agent-iframe-relay` / `agent-activity-context` / `agent-selection-chip` surface ("Watch Claude edit your code live, in the canvas, with per-agent color coding").

**Footer:**
- GitHub link.
- License line (the repo's `FSL-1.1-Apache-2.0`).
- Credit line (link to Jakub's preferred profile).

**No coming-soon strip.** `/docs` and `/demo` simply 404 until built. (Stub pages add a "broken promise" feel; 404 is honest.)

**No analytics, no cookie banner, no newsletter signup.** Defer.

**Files touched:**
- `apps/docs/app/page.tsx` (rewrite).
- `apps/docs/app/layout.tsx` (load Raveo font, add metadata, html lang).
- `apps/docs/app/globals.css` (new — Tailwind base + a few utility tweaks).
- `apps/docs/tailwind.config.ts` (new — brand colors, Raveo font family).
- `apps/docs/postcss.config.mjs` (new).
- `apps/docs/package.json` — add `tailwindcss`, `postcss`, `autoprefixer` devDeps.
- `apps/docs/next.config.mjs` (add the `/r/registry.json` cache header from Component 2).

## Runbook — order of operations

Each step unblocks later steps. Do them in order.

### Step 1 — Prep PR on local repo (no remote yet)
- Flip `packages/cli/package.json` → `"private": false`, add `"publishConfig": { "access": "public" }`.
- Bump engine + CLI to `0.1.0`.
- Add marketing landing files (Component 4).
- Add `apps/docs/next.config.mjs` cache header.
- Add `.github/workflows/ci.yml`, `.github/workflows/release.yml`.
- Local `pnpm check && pnpm build && pnpm test`.
- Commit.

### Step 2 — Create GitHub repo (private)
- `gh repo create jakubfoglar/forkshop --private --source=. --remote=origin --push`.
- Add repo secrets via `gh secret set`: `NPM_TOKEN`, `CENTRAL_LICENSE_KEY`.
- Verify CI runs green on the first push.

### Step 3 — Create Vercel project
- Import the GitHub repo into Vercel.
- Configure root dir / install / build commands per Component 2.
- First deploy goes to auto-generated `forkshop-*.vercel.app`. Verify `/r/registry.json` resolves and parses.

### Step 4 — Point DNS
- In Vercel project → Settings → Domains, add `forkshop.dev` and `www.forkshop.dev`. Note the two Vercel NS hostnames.
- Use Namecheap API to swap the domain's nameservers to those Vercel NS hostnames.
- Wait for propagation. Verify `https://forkshop.dev` and `https://forkshop.dev/r/registry.json` resolve over HTTPS.

### Step 5 — Smoke test the CLI from local tarball (pre-publish)
- `pnpm --filter forkshop pack` → produces `forkshop-0.1.0.tgz`.
- `cd /tmp && pnpm create next-app smoke-cli`.
- `cd /tmp/smoke-cli && npx /path/to/forkshop-0.1.0.tgz init`.
- Verify the scaffold lands, registry JSON is fetched from `forkshop.dev/r/`, font is fetched from `forkshop.dev/r/fonts/raveo/RaveoVF.woff2`, no errors.

### Step 6 — First release
- `git tag v0.1.0 && git push --tags`.
- Watch the `release.yml` Action publish engine then CLI.
- Verify: `npm view @forkshop/engine version` and `npm view forkshop version` both return `0.1.0`.
- Re-do Step 5 with `npx forkshop@latest init` (no tarball — pulls from npm).

### Step 7 — Flip repo public
- Scan committed files for secrets, internal notes, Ravineo references that shouldn't ship publicly. (Repeat of the maintainer guide's "what NOT to port" section, but for accidental leaks.)
- `gh repo edit jakubfoglar/forkshop --visibility public --accept-visibility-change-consequences`.

### Step 8 — Optional polish
- Set repo description, homepage URL (`https://forkshop.dev`), topics (`nextjs`, `tailwind`, `figma`, `developer-tools`).
- Pin the v0.1.0 GitHub release.

## Risks + mitigations

- **DNS misconfig** — Vercel NS swap is one API call. If wrong, swap back to Namecheap defaults via the same API. Low risk.
- **npm publish failure mid-flight** — engine publishes, CLI fails. The pin in the published CLI scaffold still points to the correct (published) engine, so this is recoverable: fix CLI, bump patch, re-tag. Engine doesn't need re-publishing.
- **`CENTRAL_LICENSE_KEY` leaks** — only set as a repo secret; never in code, never in Vercel. Scoped to engine workspace's preinstall.
- **CLI hardcoded URL** — `forkshop.dev/r/` is in 6 places in the CLI (3 runtime: `manifest-builder.ts`, `commands/init.ts`, `commands/add.ts`; 3 in tests). Working as designed; this spec exists to make that URL resolve. Future configurability is out of scope.
- **Marketing copy accuracy** — Card 3 describes the agent-activity feature, which is shipped in the engine. Marketing copy will be drafted during implementation; verify against the actual sidebar surface before deploy.

## What this spec deliberately does not do

- Does not decide the long-term shape of `/docs` or `/demo`. The website-shape strategy doc covers that vision; this spec only ensures those routes are unbuilt for v0.1.0.
- Does not change the engine, the CLI, or the registry. The only code changes are: CLI `private: false` flip, version bumps, marketing landing files, the registry cache header, the two workflow files.
- Does not establish a release cadence. Manual, when there's something worth shipping.
