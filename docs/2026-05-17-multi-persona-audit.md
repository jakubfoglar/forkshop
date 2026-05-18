# Forkshop — Multi-perspective audit (2026-05-17)

A brainstorming-style review of Forkshop from seven distinct perspectives:
senior web dev, senior product designer, solo founder, Rasmus Andersson,
Karri Saarinen (Linear), Guillermo Rauch (Vercel), and shadcn.

Anchored in a codebase pass covering security surface, architecture,
primitives, CLI, kits, docs, and the live-text-editing feature that
shipped 2026-05-16.

Headline: **a well-engineered, scope-disciplined v0 with two
distribution-shaped holes and one credibility-shaped hole.**

---

## 1. The senior web dev (10+ yrs, has shipped both libraries and apps)

**Verdict: Surprisingly clean for a one-person extraction.**

What's right:
- 4 prod deps per package (`lucide-react`, `motion`, `clsx`,
  `@locator/runtime` on registry; `commander`, `picocolors`, `prompts` on
  CLI). That's almost unheard-of restraint in 2026.
- The path-rewriter in `packages/cli/src/rewrite.ts` is the only
  non-trivial piece of logic and it's properly tested with fixture
  inputs/outputs. Two regex passes, longest-prefix-match sort, `.js`
  suffix handling. I'd ship that.
- Canonical-imports lint + manifest validator + skill placeholder
  validator wired into `next build`. The triangulation is what makes
  this safe to evolve.
- Type discipline: no `any`, exhaustive props, discriminated unions in
  `manifest-schema.ts`. Hooks enforce context boundaries
  (`useForkshopCanvas` throws outside provider).

What I'd raise in a PR review:
- **The whole security model rests on `process.env.NODE_ENV !==
  "production"`.** That's *one boolean* gating edit + positions +
  agent-activity. It's correct in spirit, but undocumented in the README
  and not enforced by the routes themselves (no `.env.local` template
  warning, no startup log). One misconfigured deploy and you've shipped
  a write-anywhere endpoint to the internet. Add a second factor: bind
  to `127.0.0.1` only, or refuse to mount if the request `Host` header
  isn't localhost.
- **`FORKSHOP_POSITIONS_PATH`** is constrained to `cwd` but not to a
  subfolder. A user with that env var set to `package.json` ships a
  corrupted file on next drag. Constrain to `.forkshop/` or similar.
- **`edit/route.ts` uses string find-and-replace, not AST.** That's
  defensible (simple, fast, fewer deps), but the error path is sparse —
  "match found N times" is the kind of message Claude will paper over
  and then mangle a file. Return the line numbers of all matches so the
  caller can disambiguate.
- **Agent-activity is wired client-side but the server is a no-op.**
  Either delete the UI plumbing until the SSE handler is real, or hide
  it behind a flag. Don't ship Schrödinger's feature.
- The `apps/playground` pages have committed-but-uncommitted "sdsdsd"
  placeholder text. Embarrassing if a contributor lands on it first.

---

## 2. The super-senior product designer (the one who reviews Figma at FigJam)

**Verdict: The product moment is strong. The product *story* doesn't
exist yet.**

The blue-ring-editable / gray-dashed-locked metaphor for live text
editing is *good*. That's a Figma-grade affordance landing in dev-time
tooling. ⌘↵ to save, Esc to discard, multi-viewport live-sync — that's
the kind of detail that makes someone tweet about it.

But the rest of the product reads like an engineering org chart:
- "DesignSystemBoard", "IframeGallery", "PageTree" — these describe
  *implementations*, not *user moments*. What does a designer-PM want?
  A "tokens map", a "page wall", a "site map". Rename.
- The name "Forkshop" itself is hard to parse on first read. Fork +
  shop? Work-shop with an F? It doesn't say "design canvas for Next.js"
  out loud. (More on this from Rasmus below.)
- There is no demo video, no GIF in the README, nothing that shows the
  live-edit moment that just shipped. The single thing that
  distinguishes this from shadcn-style scaffolding tools is invisible at
  the README level.
- The kit composition story is silent: when do I want a board vs. a
  tree vs. a gallery? Three kits with no narrative is just three kits.

One designer thing the eng got right: `forkshop-*` token namespacing.
That's the difference between a library that survives integration with
Linear-ish, Vercel-ish, and brand-heavy projects, and one that doesn't.
Keep that discipline.

---

## 3. The solo founder (you, in the mirror)

**Verdict: Scope is honest. Distribution is unsolved.**

Memory says the ambition is "free + small side income, no infra, no
SLA, no SaaS." Good — that constrains the work. But the implication is
that this lives or dies on *attention*, and right now the attention
surface is:
- A GitHub repo with no demo URL.
- A CLI most people won't `npx` cold.
- A docs app that serves a manifest JSON (correct for the build) but
  has "Marketing content TBD" (your own words in CLAUDE.md:37).

Three moves that compound:
1. **The killer feature is the auto-loaded CLAUDE.md template.** A
   Forkshop install drops a `user-claude-md.md` into the user's project
   that teaches *their Claude Code* how to use the kits. That's a
   unique distribution wedge in the AI-coding-tool era. Nobody else is
   doing this. Talk about it loudly.
2. **One demo URL that shows live editing in 10 seconds.** Vercel
   preview of the playground, pinned in the README. No video — just a
   link. If the playground has "sdsdsd" debris it cannot be that link.
3. **The diff command is the moat.** `forkshop diff` is the part that
   says "you own this code, but we'll still tell you what changed
   upstream." That's the *anti-lock-in* pitch — say it explicitly.

Don't build a website. Build one Twitter thread with three GIFs and a
link to the playground. That is the launch.

---

## 4. Rasmus Andersson (Inter, Figma OG, infinite opinions about craft)

**Verdict: The craft is in the code. The craft is not yet in the
surface.**

I look at this and I see disciplined typography tokens and a font
called Raveo I've never heard of. Why a custom font for a dev-time
tool? Either commit to Raveo as part of the personality (and then
*show me* what Raveo looks like in screenshots) or use Inter and stop
carrying the font weight in the registry.

The repo has no visual identity. No screenshot. No diagram. The name
"Forkshop" reads as a pun the way "Webflow" doesn't — it's trying.
Test it: say it out loud three times. Is it a verb? A noun? A place?
Strong tool names work as both ("Linear is fast", "I'm in Figma").
"I'm in Forkshop" is awkward.

Things that *are* good and I'd protect:
- The `forkshop-*` token namespace. That's the same discipline that
  lets Inter ship inside a thousand brand systems without polluting
  them.
- The blue/gray ring distinction in the editor. Two states, clear
  intent, no chrome. That's right.

Things to add before anyone judges this on craft:
- One screenshot in the README. One.
- A wordmark. Even a temporary monospace one.
- A line in the README that says *what this is* in five words. Not
  "OSS Figma-style canvas + sidebar tool for Next.js + Tailwind." Try:
  *"A canvas for your Next.js app."*

---

## 5. Karri Saarinen / Linear-founder voice (restraint, opinionated defaults)

**Verdict: Too many switches for v0. Too little soul.**

The CLI has three kits and a manifest. The first-run experience for a
new user is: "which kit do I want?" That's a worse experience than
"here is what you get." Linear ships one inbox view by default.
shadcn ships `button` first.

A Linear-shaped Forkshop would:
- Make `forkshop init` install *one* board (the most useful — probably
  PageTree) and explicitly say "you'll know when you want more, run
  `forkshop add`."
- Delete agent-activity from the v0 ship list until it's real.
  Aspirational holes are anti-craft.
- Pick a single typeface. Pick a single accent color. Pick a single
  dark/light default. Forkshop currently has a token system; what it
  doesn't have is *taste*. Tokens are infrastructure for taste.
- Have a homepage that's one sentence and a GIF. That's the Linear
  move.

The thing Linear-me would *not* touch:
- The doc-sync convention in CLAUDE.md (every user-facing change
  requires a `user-claude-md.md` update). That's the right kind of
  forcing function. Keep it.

---

## 6. Guillermo Rauch / Vercel voice (DX, distribution, framework gravity)

**Verdict: This is a Vercel-shaped tool that hasn't met Vercel yet.**

Strengths from where I sit:
- Next.js-only, App Router-shaped, RSC-aware, Tailwind-aligned. You
  picked the right frame.
- Dev-time only — no production cost, no runtime tax. That's the right
  wedge for a dev tool in 2026.
- Locator.js wiring is clever and underrated — that's the kind of
  "click to jump to source" affordance that becomes muscle memory.

What I'd push you on:
- **Where is the live URL?** Forkshop should be a deploy-to-Vercel
  button in the README. The playground is right there. Cost: zero.
  Conversion: massive.
- **The registry pattern is shadcn-shaped — lean into it.** A
  `/r/registry.json` served by `apps/docs` is the right shape; what's
  missing is a registry browser at `forkshop.dev` so people can preview
  kits before installing.
- **AI angle.** The auto-loaded CLAUDE.md is a *huge* signal in the
  AI-coding era. v0 and Bolt-style tools are emergent registries;
  Forkshop is one. Position it that way explicitly: "Forkshop is a
  Claude-Code-native canvas for Next.js."
- **Framework gravity, not lock-in.** You're a Next.js tool. Don't
  apologize for it. Don't promise Remix support. Pick a side; the side
  is winning.

One thing I'd flag as a Vercel-shaped concern: the
`FORKSHOP_POSITIONS_PATH` env-var-controlled write path. If someone
deploys this to a Vercel preview without realizing dev routes are
exposed, that's a story. Bind to `127.0.0.1` or assert non-Vercel.

---

## 7. shadcn (the actual one)

**Verdict: You took the right pattern. You haven't paid all of its
costs.**

The good:
- Registry-served-as-JSON, install-to-user-project, `diff` against
  upstream, alias-rewrite at install time. That's the shadcn loop. It
  works. The `forkshop diff` command in particular is the right answer
  to "what about updates."
- MIT, copy-paste-and-own ethos. Right call.
- No npm runtime dep on `@forkshop/registry` after install. Users own
  the code. Correct.

The costs you haven't fully paid:
- **My primitives are ~150 lines each. Are yours?** I see
  `ForkshopCanvas` and `ForkshopSidebar` with 30–40-prop interfaces and
  a `ForkshopCanvasHandle` imperative API. That's a *component*, not a
  *primitive*. Once a user installs that into their repo, are they
  going to read it, understand it, and modify it? If the answer is no,
  you don't have a shadcn-style library — you have a library you happen
  to install via copy-paste. There's a difference.
- **The `@forkshop/*` import rewrite means after install, user code
  has aliases pointing at *their own* files.** That's strange. A
  user's `@forkshop/canvas/forkshop-canvas` is now living in their own
  `components/forkshop/`. Why not relative paths after install? It
  would make the code feel more like "yours" and less like "still
  belongs to the library."
- **The CLI has init/add/diff.** Mine has `add`. Do you need three
  commands? `add` can subsume init (just add the kit and infer setup).
  Less ceremony, faster first-run.
- **Three kits at launch is two kits too many.** Ship one. The one
  that gives someone the "oh that's the thing" moment in under a
  minute. (My guess: live-text-edit PageTree.)
- **Components built on Tailwind + tokens + namespacing — good.** But
  run the test: rip a kit out, paste it into a fresh Next.js project
  without `forkshop init`. Does it work? If not, the kit isn't really
  portable; it's installed.

If you can ship a Forkshop kit that any dev can paste into any Next.js
project without the CLI and have it work, you've earned the shadcn
comparison. If they need the CLI to make it function, you've built a
framework — own that instead.

---

## Where I'd focus next (synthesized, opinionated)

Three things, in order:

1. **Make the playground demo-credible.** Strip the "sdsdsd" debris,
   deploy it to Vercel, pin a live URL in the README. Until this is
   true nothing else compounds.
2. **Decide what agent-activity is.** Either ship the SSE handler this
   week or rip the UI plumbing out. Half-features are the loudest
   signal that the rest of the work is also half.
3. **Write the README the way Linear or shadcn would.** One sentence at
   the top. One screenshot. One GIF of the live-edit moment. One
   install command. One link to the live demo. Everything else moves
   below the fold.

Architecture, security model, type system, CLI quality, and validator
discipline are already at the level of a v0.x OSS tool I'd happily
install. The gap is between "good code" and "people know it exists and
want to use it" — and that gap is presentation, naming, and demo, not
engineering.
