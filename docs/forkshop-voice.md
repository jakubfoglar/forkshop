# Forkshop docs voice

The reference for writing copy on `forkshop.dev/docs`. If you're editing a docs page or adding a new one, read this once. The point is consistency — Forkshop's docs should feel like one writer's hand.

## Posture

Forkshop is a developer tool for developers. The reader is a senior-ish engineer who already builds Next.js apps. They didn't come to be onboarded — they came to find an answer. Respect their time.

Lead with what something **does**, then how to use it, then trade-offs. Don't lead with what something **is**. "A NodeType matches a Node kind and renders it" beats "A NodeType is Forkshop's plugin abstraction for…"

## Don't do these

**Meta-narration.** Never tell the reader what they're about to read or why. If you find yourself writing "On this page…", "This section covers…", "Four things you'll see repeatedly…", "Reading this anchors the rest of the docs…" — delete it. The reader can read.

**Marketing superlatives.** No "defining feature," "the magic of," "killer," "powerful," "seamless," "delightful," "first-class," "battle-tested." Forkshop doesn't need to sell itself in its own docs — the reader already clicked through.

**Faux-friendly framing.** No "We'll start by…", "Now let's…", "First, we need to…". The docs aren't a tutorial walkthrough; they're a reference. Just describe the thing.

**Hedge words that say nothing.** "Generally," "typically," "usually," "in most cases" — if a thing is true, say it's true. If it has an exception, name the exception.

**Unsupported timings or claims.** "Within ~100ms," "blazing fast," "lightweight." If you can't point to a measurement or a line of code, cut the claim.

## Do these

**Verb-first sentences.** "Renders one page at three viewport sizes." Not "It is a layout that renders…"

**Em-dashes for asides.** "The save POSTs to `/api/forkshop/edit` — dev-only, 403 in production — and writes the file." Not parentheses, not separate sentences.

**Concrete over abstract.** Prefer file paths, function names, code snippets, real defaults. "Default viewports: `[1440, 768, 375]`" beats "comes with sensible defaults."

**Short paragraphs.** One to three sentences. White space is structure. If a paragraph runs four sentences, break it.

**Imperatives over second person.** "Run `npx forkshop init`" beats "You can run `npx forkshop init`." Use "you" only when it carries information the imperative doesn't.

**Trust the reader.** Don't define `iframe`, `App Router`, `MDX`, or `Tailwind`. Don't explain why TypeScript is good. Don't recap what the previous section said.

## Structure

- **First sentence** of every page does the one-line definition. The reader who scrolled here from search should know if they're in the right place by sentence one.
- **First paragraph** says what the thing does and where it fits. No fluff.
- **H2 sections** answer one concrete question each. Section title is the question's noun (e.g. `## Save flow`, not `## How the save flow works`).
- **Code blocks** are real. Don't pseudo-code or fabricate APIs. If you don't know the actual prop shape, grep before you write.
- **Tables** are for prop reference. Two columns: `Prop` and what it does. Drop the `Type` column unless the type is informative beyond the name.
- **No "Next" or "Where to go next" sections** at the bottom. The sidebar handles navigation.

## Tone

Neutral-direct. Slightly dry. The voice of someone who likes the tool but won't waste your time hyping it. Closer to PostgreSQL docs than Notion docs. Em-dashes are fine — overusing them isn't.

## Punctuation and formatting

- Em-dash with no spaces: `Forkshop — Figma-style`. (The existing landing uses spaced em-dashes; either is fine, but stay consistent within a page.) Currently: spaced em-dashes throughout the docs.
- Inline code with backticks for: file paths, function/type/component names, props, CSS variables, commands, env vars.
- Bold for *new* terms on first introduction. Not for emphasis.
- Italic almost never.
- Code blocks: language-tagged (`tsx`, `bash`, `css`, `json`).
- Internal links: relative paths like `[Concepts](/docs/concepts)`. External links: full URLs.

## Voice checks before committing

Read the page top to bottom. If any sentence contains:

- "you'll see," "you'll notice," "we'll," "let's"
- "magic," "defining," "powerful," "seamless"
- A meta-statement about the docs themselves
- A claim with no code reference behind it

Rewrite the sentence or delete it.

## The first sentence test

Look at the first sentence of each page. If it doesn't tell the reader (a) what the thing is and (b) what it's for, in one sentence, the page is off. Examples that pass:

- "Forkshop mounts a Figma-style canvas inside your Next.js dev server."
- "`ResponsiveFrameView` renders one page at three viewport widths."
- "`forkshop init` adds Forkshop to an existing Next.js project."

Examples that fail:

- "Canvas editing is Forkshop's defining feature." (lead is praise, not function)
- "Four words you'll see repeatedly." (lead is meta-narration)
- "Forkshop is a kit, not a closed app." (lead is positioning, not function)
