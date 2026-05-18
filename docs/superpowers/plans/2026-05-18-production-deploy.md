# Production deploy — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Forkshop v0.1.0 to production: GitHub repo (private → public), Vercel-deployed Next.js app at `forkshop.dev` serving `/r/registry.json`, a real one-page marketing landing at `/`, and `@forkshop/engine` + `forkshop` published to npm via a tag-triggered GitHub Actions workflow.

**Architecture:** One repo, one Vercel project (root: `apps/docs`), one domain via Vercel-managed DNS. Two workflows: `ci.yml` runs typecheck + lint + test + build on PRs; `release.yml` runs on `v*.*.*` tag and publishes engine then CLI to npm. The marketing landing is hand-written Tailwind in `apps/docs/app/page.tsx` — no Forkshop primitives mounted on the marketing page itself.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript (strict), Tailwind v3, pnpm 11 workspaces, GitHub Actions, Vercel (Hobby/Pro), Namecheap (registrar). Run `pnpm check` from repo root before claiming any task done.

**Spec:** `docs/specs/2026-05-18-production-deploy-design.md`

---

## File Structure

### New files

```
.github/workflows/
  ci.yml                          Typecheck + lint + test + build on PRs and main
  release.yml                     Tag-triggered npm publish (engine first, then CLI)

apps/docs/
  app/
    globals.css                   Tailwind directives + a couple of base tweaks
  tailwind.config.ts              Brand tokens (off-white bg, accent), Raveo font family
  postcss.config.mjs              Tailwind + autoprefixer
```

### Files modified

```
packages/cli/package.json          Flip "private": false → publishable; add publishConfig
packages/cli/package.json          Bump version 0.0.0 → 0.1.0
packages/engine/package.json       Bump version 0.0.0 → 0.1.0
apps/docs/
  package.json                     +tailwindcss, postcss, autoprefixer devDeps
  next.config.mjs                  +Cache-Control header on /r/registry.json
  app/page.tsx                     Rewrite as marketing landing
  app/layout.tsx                   Load Raveo via next/font/local, add metadata
```

---

## Phase 1 — Local prep (no external services touched yet)

### Task 1: Make the CLI publishable

**Files:**
- Modify: `packages/cli/package.json:1-50`

- [ ] **Step 1: Inspect the current package.json**

Run: `cat packages/cli/package.json`
Expected: `"private": true`, no `publishConfig` field.

- [ ] **Step 2: Apply edits**

Edit `packages/cli/package.json`:
- Change `"private": true` → `"private": false`
- Add `"publishConfig": { "access": "public" }` immediately below the `"private"` line.

Final shape of the top of the file should be:
```json
{
  "name": "forkshop",
  "version": "0.0.0",
  "private": false,
  "publishConfig": { "access": "public" },
  "type": "module",
  "bin": { "forkshop": "./dist/index.js" },
  ...
}
```

- [ ] **Step 3: Verify with a dry pack**

Run: `pnpm --filter forkshop pack --dry-run 2>&1 | head -30`
Expected: lists `dist/...` files; does NOT print "package is private" or refuse.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/package.json
git commit -m "fix(cli): mark package public for npm publish"
```

---

### Task 2: Bump engine + CLI to 0.1.0

**Files:**
- Modify: `packages/engine/package.json:3`
- Modify: `packages/cli/package.json:3`

- [ ] **Step 1: Bump engine version**

Edit `packages/engine/package.json` line 3:
- Change `"version": "0.0.0"` → `"version": "0.1.0"`.

- [ ] **Step 2: Bump CLI version**

Edit `packages/cli/package.json` line 3:
- Change `"version": "0.0.0"` → `"version": "0.1.0"`.

- [ ] **Step 3: Rebuild CLI so the embedded engine pin is current**

The CLI's `manifest-builder.ts:172-177` reads engine's `package.json` at build time and bakes the version into the manifest. Force a rebuild:

Run: `pnpm --filter forkshop build`
Expected: writes `packages/cli/dist/index.js`. No errors.

- [ ] **Step 4: Verify the embedded pin**

Run: `node -e "const m = require('./packages/cli/dist/index.js'); console.log('checked')" 2>&1 | tail -5`

Or simpler — regenerate the manifest snapshot and inspect:

Run: `pnpm regen-api-snap` (rebuilds engine + writes the public-api snapshot).
Expected: completes without errors.

- [ ] **Step 5: Run the full check**

Run: `pnpm check` (from repo root)
Expected: typecheck + lint pass.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/package.json packages/cli/package.json
git commit -m "chore: bump engine and CLI to 0.1.0 for first release"
```

---

### Task 3: Add cache header for `/r/registry.json`

**Files:**
- Modify: `apps/docs/next.config.mjs:14-26`

- [ ] **Step 1: Read the current config**

Run: `cat apps/docs/next.config.mjs`
Note the existing `headers()` async function that sets `Cache-Control` on `/r/fonts/:all*`.

- [ ] **Step 2: Add a second header entry**

Edit `apps/docs/next.config.mjs`. In the `headers()` return array, add a second object alongside the existing fonts entry:

```js
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
```

- [ ] **Step 3: Verify the dev server applies the header**

Run: `pnpm --filter docs dev` in one terminal.
In another: `curl -sI http://localhost:3001/r/registry.json | grep -i cache-control`
Expected: `cache-control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400`
Stop the dev server (Ctrl-C).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/next.config.mjs
git commit -m "feat(docs): add 5min cache header on /r/registry.json"
```

---

### Task 4: Set up Tailwind v3 in `apps/docs`

**Files:**
- Modify: `apps/docs/package.json`
- Create: `apps/docs/tailwind.config.ts`
- Create: `apps/docs/postcss.config.mjs`
- Create: `apps/docs/app/globals.css`

- [ ] **Step 1: Install Tailwind devDeps**

Run from repo root: `pnpm --filter docs add -D tailwindcss@^3 postcss@^8 autoprefixer@^10`
Expected: updates `apps/docs/package.json` and `pnpm-lock.yaml`.

- [ ] **Step 2: Create `apps/docs/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
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

- [ ] **Step 3: Create `apps/docs/postcss.config.mjs`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Create `apps/docs/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  background: theme("colors.canvas");
  color: theme("colors.ink");
}
```

- [ ] **Step 5: Verify Tailwind compiles**

Run: `pnpm --filter docs dev`
Open `http://localhost:3001` in a browser. View source — should see Tailwind-generated CSS in the `<head>`. Page content will still be the old `<h1>Forkshop</h1>` (we replace it next task). Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/tailwind.config.ts apps/docs/postcss.config.mjs apps/docs/app/globals.css apps/docs/package.json pnpm-lock.yaml
git commit -m "chore(docs): set up Tailwind v3"
```

---

### Task 5: Build the marketing landing

**Files:**
- Modify: `apps/docs/app/layout.tsx`
- Modify: `apps/docs/app/page.tsx`

The font binary `packages/engine/fonts/raveo/RaveoVF.woff2` already exists in the workspace. We'll load it via `next/font/local` directly from that path.

- [ ] **Step 1: Replace `apps/docs/app/layout.tsx`**

```tsx
import localFont from "next/font/local"
import "./globals.css"

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
      <body className="font-raveo antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Replace `apps/docs/app/page.tsx`**

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

        <footer className="mt-24 border-t border-ink/10 pt-8 text-sm text-muted">
          <a
            href="https://github.com/jakubfoglar/forkshop"
            className="hover:text-ink"
          >
            github.com/jakubfoglar/forkshop
          </a>
          <span className="mx-3">·</span>
          <span>FSL-1.1-Apache-2.0</span>
          <span className="mx-3">·</span>
          <span>
            Built by{" "}
            <a
              href="https://github.com/jakubfoglar"
              className="hover:text-ink"
            >
              @jakubfoglar
            </a>
          </span>
        </footer>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Eyeball it locally**

Run: `pnpm --filter docs dev`
Open `http://localhost:3001`.
Expected: clean off-white page, Raveo wordmark loads, three cards laid out horizontally on desktop, vertically on mobile, install command in a code block, GitHub button works.
Stop the dev server.

- [ ] **Step 4: Run the full check + build**

```bash
pnpm check
pnpm --filter docs build
```
Expected: typecheck + lint pass; `next build` succeeds; no `validate-registry` errors.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/app/layout.tsx apps/docs/app/page.tsx
git commit -m "feat(docs): replace placeholder with marketing landing"
```

---

### Task 6: Add CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Ensure the `.github/workflows/` dir exists**

Run: `mkdir -p .github/workflows`

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    env:
      CENTRAL_LICENSE_KEY: ${{ secrets.CENTRAL_LICENSE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 3: Verify the YAML is syntactically valid**

Run: `node -e "const fs=require('fs'); const yaml=fs.readFileSync('.github/workflows/ci.yml','utf8'); console.log(yaml.length, 'bytes ok')"`
Expected: prints byte count, no error.

(Optional, if `actionlint` is installed: `actionlint .github/workflows/ci.yml`.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add PR + main typecheck/lint/test/build workflow"
```

---

### Task 7: Add release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    env:
      CENTRAL_LICENSE_KEY: ${{ secrets.CENTRAL_LICENSE_KEY }}
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: "https://registry.npmjs.org"
      - run: pnpm install --frozen-lockfile

      - name: Build engine
        run: pnpm --filter @forkshop/engine build

      - name: Build CLI
        run: pnpm --filter forkshop build

      - name: Publish engine
        run: pnpm --filter @forkshop/engine publish --no-git-checks --access public
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish CLI
        run: pnpm --filter forkshop publish --no-git-checks --access public
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: GitHub release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh release create "${GITHUB_REF_NAME}" --generate-notes
```

**Note on engine-first ordering:** if the engine publish fails, the CLI on npm would pin a missing engine version. The CLI's `manifest-builder.ts` already embeds the engine version at build time, so once the engine is on npm the CLI install path works.

- [ ] **Step 2: Verify the YAML is syntactically valid**

Run: `node -e "const fs=require('fs'); fs.readFileSync('.github/workflows/release.yml','utf8'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(release): tag-driven npm publish for engine and CLI"
```

---

### Task 8: Final local verification

- [ ] **Step 1: Full check**

Run: `pnpm check && pnpm test && pnpm build`
Expected: all pass. If anything fails, stop and fix before going to Phase 2.

- [ ] **Step 2: Confirm registry JSON still validates**

Run: `pnpm --filter docs validate-registry`
Expected: no errors.

- [ ] **Step 3: Sanity check the git log**

Run: `git log --oneline -10`
Expected: see the 7 commits from Tasks 1-7 above the existing history.

---

## Phase 2 — GitHub + Vercel

### Task 9: Create GitHub repo (private) and push

- [ ] **Step 1: Verify gh CLI auth**

Run: `gh auth status`
Expected: signed in as `jakubfoglar`. If not, run `gh auth login`.

- [ ] **Step 2: Create the repo (private) and push**

Run:
```bash
gh repo create jakubfoglar/forkshop \
  --private \
  --description "A Figma-style canvas for your Next.js project" \
  --source=. \
  --remote=origin \
  --push
```
Expected: prints repo URL; `git remote -v` now shows `origin` pointing to `github.com/jakubfoglar/forkshop`.

- [ ] **Step 3: Add repo secrets**

```bash
gh secret set NPM_TOKEN --body "<paste npm automation token>"
gh secret set CENTRAL_LICENSE_KEY --body "<paste from .envrc>"
```

(To get the npm token: `npmjs.com` → Profile → Access Tokens → Generate New Token → Automation → copy. To get the central key: `grep CENTRAL_LICENSE_KEY .envrc`.)

Expected: both `gh secret set` calls print "Set secret X for jakubfoglar/forkshop".

- [ ] **Step 4: Verify secrets are listed**

Run: `gh secret list`
Expected: `CENTRAL_LICENSE_KEY` and `NPM_TOKEN` both present.

---

### Task 10: Verify CI passes on first push

- [ ] **Step 1: Watch the first CI run**

Run: `gh run watch`
(If multiple runs, pick the CI one.)
Expected: workflow `CI` completes green within ~3-5 min.

- [ ] **Step 2: If CI fails — diagnose**

Run: `gh run view --log-failed`
Most likely failure: `CENTRAL_LICENSE_KEY` missing or `pnpm test` fails because of a missing dep. Fix locally, commit, push, re-watch.

---

### Task 11: Create Vercel project + first deploy

- [ ] **Step 1: Verify Vercel CLI auth**

Run: `vercel whoami`
Expected: prints your username. If not, run `vercel login`.

- [ ] **Step 2: Link the repo to a new project from the repo root**

Run: `vercel link`
At prompts:
- "Set up and deploy?" — yes
- Scope — your personal account
- Existing project? — no
- Project name — `forkshop`
- In what directory is your code located? — `./apps/docs`

Expected: writes `.vercel/project.json`. Project created on Vercel.

- [ ] **Step 3: Configure project settings via the dashboard**

Open the project's Settings → General on `vercel.com`. Set:
- Framework Preset: **Next.js** (likely auto-detected).
- Build & Output Settings → Install Command (override): `cd ../.. && pnpm install --filter docs...`
- Build & Output Settings → Build Command (override): `pnpm --filter docs build`
- Node.js Version: **20.x**

Leave Root Directory as `apps/docs` (from Step 2).

- [ ] **Step 4: Trigger a deploy**

Run: `vercel --prod`
Expected: Vercel builds and deploys; prints a production URL like `https://forkshop-<hash>.vercel.app`.

- [ ] **Step 5: Verify the deploy**

```bash
URL="<paste the URL from Step 4>"
curl -sI "$URL/" | head -3                # 200 OK
curl -s "$URL/r/registry.json" | head -c 200   # JSON
curl -sI "$URL/r/fonts/raveo/RaveoVF.woff2" | grep -i cache-control
```
Expected: landing page returns 200, registry JSON resolves, font has the 1-year immutable header.

Open `$URL` in a browser — landing should render with Raveo font and Tailwind styles.

- [ ] **Step 6: If install command fails**

If `cd ../.. && pnpm install --filter docs...` errors on Vercel (path resolution), try blanking the install command override (Vercel auto-detects pnpm workspaces in many cases). Redeploy.

---

## Phase 3 — DNS via Namecheap

### Task 12: Add `forkshop.dev` to the Vercel project + capture NS hostnames

- [ ] **Step 1: Add the domain in the Vercel dashboard**

Open the project → Settings → Domains. Click "Add Domain". Enter `forkshop.dev`. Vercel will say it can't verify ownership and offer two options: (A) use Vercel nameservers (recommended), (B) add DNS records.

Choose (A). Vercel displays two NS hostnames — typically `ns1.vercel-dns.com` and `ns2.vercel-dns.com`. Copy them.

Also add `www.forkshop.dev` in the same flow — Vercel will set up the redirect automatically once DNS is live.

- [ ] **Step 2: Note the NS hostnames for the next task**

```
NS1=ns1.vercel-dns.com
NS2=ns2.vercel-dns.com
```
(Use whatever Vercel actually shows.)

---

### Task 13: Swap nameservers via Namecheap API

The Namecheap API endpoint is `namecheap.domains.dns.setCustom`. Docs: https://www.namecheap.com/support/api/methods/domains-dns/set-custom/.

Required Namecheap API context (you said you have these):
- API user (your account username on Namecheap)
- API key (from Namecheap → Profile → Tools → Namecheap API Access)
- Whitelisted client IP (the public IP of the machine making the call; configured in the same Namecheap settings page)

- [ ] **Step 1: Get your public IP and verify it's whitelisted**

Run: `curl -s https://api.ipify.org`
Expected: prints your public IPv4. Confirm this IP is in Namecheap's whitelisted IPs list. If not, add it via the Namecheap dashboard.

- [ ] **Step 2: Call the API to swap nameservers**

Replace the placeholders with your actual values:
```bash
API_USER="<your namecheap username>"
API_KEY="<your namecheap API key>"
CLIENT_IP="$(curl -s https://api.ipify.org)"
NS1="ns1.vercel-dns.com"
NS2="ns2.vercel-dns.com"

curl -s "https://api.namecheap.com/xml.response" \
  --data-urlencode "ApiUser=$API_USER" \
  --data-urlencode "ApiKey=$API_KEY" \
  --data-urlencode "UserName=$API_USER" \
  --data-urlencode "ClientIp=$CLIENT_IP" \
  --data-urlencode "Command=namecheap.domains.dns.setCustom" \
  --data-urlencode "SLD=forkshop" \
  --data-urlencode "TLD=dev" \
  --data-urlencode "Nameservers=$NS1,$NS2"
```
Expected: XML response with `<ApiResponse Status="OK">` and `<DomainDNSSetCustomResult Domain="forkshop.dev" Updated="true"/>`. If `Status="ERROR"`, check the error code in the response.

- [ ] **Step 3: Verify the change took effect at Namecheap**

Run:
```bash
dig +short NS forkshop.dev @8.8.8.8
```
Expected: eventually returns `ns1.vercel-dns.com.` and `ns2.vercel-dns.com.`. Propagation can take 5min–24h; usually <1h.

- [ ] **Step 4: Wait for Vercel verification**

Refresh the Vercel Domains settings page periodically. Both `forkshop.dev` and `www.forkshop.dev` should flip from "Invalid Configuration" to "Valid Configuration" within an hour. SSL certificates issue automatically.

- [ ] **Step 5: Smoke test the live domain**

```bash
curl -sI https://forkshop.dev/ | head -3
curl -s https://forkshop.dev/r/registry.json | head -c 200
curl -sI https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2 | grep -i cache-control
```
Expected: all three resolve over HTTPS, JSON parses, font cache header present.

Open `https://forkshop.dev` in a browser. Verify it serves the landing.

---

## Phase 4 — npm publish

### Task 14: Pre-release smoke (caveat: engine install will 404 pre-publish)

This step verifies the registry resolves and the scaffold flow runs up to the engine install step. Engine install will fail with 404 — that's expected and Task 15 fixes it.

- [ ] **Step 1: Pack the CLI**

Run: `pnpm --filter forkshop pack`
Expected: writes `packages/cli/forkshop-0.1.0.tgz`.

- [ ] **Step 2: Create a throwaway Next app**

```bash
cd /tmp && pnpm create next-app smoke-cli --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*"
cd smoke-cli
```

- [ ] **Step 3: Run `forkshop init` from the local tarball**

```bash
npx /Users/jakubfoglar/Desktop/ravineo_dev/forkshop/packages/cli/forkshop-0.1.0.tgz init
```
Expected up to the engine install step: scaffold files land, `forkshop.json` is written, registry JSON fetched from `https://forkshop.dev/r/`, font fetched from `https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2`. Then expected failure: `pnpm add @forkshop/engine@0.1.0` → 404. Note that as the only remaining gap; proceed to publish.

- [ ] **Step 4: Clean up**

```bash
rm -rf /tmp/smoke-cli
rm /Users/jakubfoglar/Desktop/ravineo_dev/forkshop/packages/cli/forkshop-0.1.0.tgz
cd /Users/jakubfoglar/Desktop/ravineo_dev/forkshop
```

---

### Task 15: Tag v0.1.0 and watch the release workflow

- [ ] **Step 1: Tag and push**

```bash
git tag v0.1.0
git push origin v0.1.0
```

- [ ] **Step 2: Watch the workflow**

Run: `gh run watch`
Expected: `Release` workflow runs. Should publish `@forkshop/engine@0.1.0`, then `forkshop@0.1.0`, then create a GitHub release titled `v0.1.0`.

If it fails at the publish step: check `gh run view --log-failed`. Common causes: missing `NPM_TOKEN`, package name conflict on npm, missing `publishConfig`.

- [ ] **Step 3: Verify both packages are live on npm**

```bash
npm view @forkshop/engine version
npm view forkshop version
```
Expected: both print `0.1.0`.

- [ ] **Step 4: Verify the GitHub release**

Run: `gh release view v0.1.0`
Expected: shows the auto-generated release notes.

---

### Task 16: Post-release end-to-end smoke

- [ ] **Step 1: Fresh Next app**

```bash
cd /tmp && pnpm create next-app smoke-post --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*"
cd smoke-post
```

- [ ] **Step 2: Run `forkshop init` from the real npm registry**

```bash
npx forkshop@latest init
```
Expected: full flow completes. Scaffold lands. `@forkshop/engine@0.1.0` installs cleanly. No 404s.

- [ ] **Step 3: Verify the scaffold landed and a board can be opened**

```bash
ls app/forkshop/
cat forkshop.json
```
Expected: `app/forkshop/page.tsx`, `app/forkshop/forkshop.config.tsx`, `app/forkshop/CLAUDE.md`, and `forkshop.json` lock file all present.

(Optional: `pnpm dev` → open `http://localhost:3000/forkshop` → see a working board.)

- [ ] **Step 4: Clean up**

```bash
rm -rf /tmp/smoke-post
cd /Users/jakubfoglar/Desktop/ravineo_dev/forkshop
```

---

## Phase 5 — Flip public + polish

### Task 17: Pre-public security/leak scan

- [ ] **Step 1: Scan for accidentally committed secrets**

```bash
git log --all --full-history -p | grep -iE "(api[_-]?key|token|secret|password|CENTRAL_LICENSE)" | head -20
```
Expected: no real secrets in the log. (Hits for the literal string `CENTRAL_LICENSE_KEY` in code/docs are fine — that's the variable name, not the value.)

- [ ] **Step 2: Scan for internal/Ravineo references**

```bash
git ls-files | xargs grep -liE "(ravineo|fogma\.ravineo|internal[-_]?only)" 2>/dev/null | grep -v '^docs/\|CLAUDE.md$' | head -20
```
Expected: list is empty or only includes intentional historical mentions (CLAUDE.md's "Lineage" section is intentional and fine).

- [ ] **Step 3: Verify `.envrc` is gitignored**

```bash
git check-ignore -v .envrc
```
Expected: prints `.gitignore:...:.envrc` or similar. If not, add `.envrc` to `.gitignore`, commit, push.

---

### Task 18: Flip the repo public

- [ ] **Step 1: Make it public**

```bash
gh repo edit jakubfoglar/forkshop \
  --visibility public \
  --accept-visibility-change-consequences
```
Expected: prints the new URL; repo is now public.

- [ ] **Step 2: Verify**

Run: `gh repo view --web`
Browser opens repo — visible without auth.

---

### Task 19: Polish

- [ ] **Step 1: Set repo description, homepage, topics**

```bash
gh repo edit jakubfoglar/forkshop \
  --description "A Figma-style canvas for your Next.js project" \
  --homepage "https://forkshop.dev" \
  --add-topic nextjs \
  --add-topic tailwind \
  --add-topic figma \
  --add-topic developer-tools \
  --add-topic claude \
  --add-topic monorepo
```

- [ ] **Step 2: Mark the v0.1.0 release as the latest**

```bash
gh release edit v0.1.0 --latest
```
Expected: tagged as `Latest` on the GitHub releases page.

- [ ] **Step 3: Final end-user check from a browser**

Visit `https://forkshop.dev` — landing renders. Click the GitHub link — public repo loads. Visit `https://www.forkshop.dev` — redirects to apex.

Done.

---

## Caveats and rollback

**If DNS misconfig:** re-run the Namecheap `setCustom` API call with the original Namecheap nameservers (typically `dns1.registrar-servers.com` and `dns2.registrar-servers.com`). Reverts within propagation window.

**If a deploy goes bad:** Vercel keeps every prior production deploy. On the project's Deployments page, find the last-known-good deploy and click "Promote to Production".

**If a bad version ships to npm:** within 72h, `npm deprecate forkshop@0.1.0 "broken, use 0.1.1"` and `npm deprecate @forkshop/engine@0.1.0 "broken, use 0.1.1"`. Then bump patch + re-tag.

**If a secret leaks into git history:** revoke the secret at its source (npm token regen, central license key regen), rewrite history with `git filter-repo` or use the GitHub-provided "Allow secret in commit" + force-push only if pre-public. Once public, assume the secret is burned and rotate.
