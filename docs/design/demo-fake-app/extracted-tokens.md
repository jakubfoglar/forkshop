# WAVECLASH 2026 — Extracted Design Tokens

Working notes for Task 1a.2. All values sourced from pencil JSON (`fill`, `stroke`,
`fontFamily`, `fontSize`, etc.) — not from screenshots.

---

## Colors

### Brand primitives

| Token               | Hex       | Where used                                                                 |
|---------------------|-----------|----------------------------------------------------------------------------|
| `waveclash-black`   | `#0a0a0a` | Nav bg, hero overlay base, stats section bg, footer bg, primary text on light surfaces |
| `waveclash-cream`   | `#faf7ef` | Primary text on dark, card/athlete surfaces, "BUY PASS" secondary button   |
| `waveclash-red`     | `#ff4a1c` | Accent / CTA fills, "COMPETITION" badge, nav bottom border, "↗" arrows, "CLASH" heading word, live-watch button |
| `waveclash-yellow`  | `#ffd60a` | Ticker belt bg, "SWELL" stat highlight, "★ WORLD TOUR" badge label, footer ticker, schedule "CULTURE" badge |
| `waveclash-sand`    | `#f2ede3` | Section backgrounds — About, Athletes, Sponsors Strip, second-page default bg |
| `waveclash-navy`    | `#00355c` | Schedule PREMIER badge fill, athlete WORLD #1 rank badge fill, "NEGOTIATE." heading word |
| `waveclash-graphite`| `#1a1a1a` | "LIVE 24/7" nav pill frame fill (near-black, distinct from `waveclash-black`) |

### Transparency variants (do not promote to full tokens — encode inline)

| Usage                        | Value          | Notes                          |
|------------------------------|----------------|--------------------------------|
| Hero image overlay (dark)    | `#0a0a0ab3`    | ~70% opacity black             |
| Thin rule in hero stats col  | `#faf7ef66`    | ~40% opacity cream             |

These appear only in their specific contexts; no other semi-transparent fills
were observed.

### Semantic aliases

| Alias              | Resolves to       | Role                                       |
|--------------------|-------------------|--------------------------------------------|
| `background`       | `waveclash-black` | Default page background                    |
| `foreground`       | `waveclash-cream` | Default text on dark backgrounds           |
| `surface`          | `waveclash-sand`  | Light section backgrounds                  |
| `surface-card`     | `waveclash-cream` | Card surfaces (athlete cards, ticket cards)|
| `surface-invert`   | `waveclash-black` | Inverted card (featured 7-day pass card)   |
| `accent`           | `waveclash-red`   | CTAs, badges, highlighted words            |
| `accent-secondary` | `waveclash-yellow`| Ticker belt, stat highlights, world-tour badge |
| `accent-deep`      | `waveclash-navy`  | PREMIER badge family, athlete rank badge, rare heading accent |
| `border`           | `waveclash-black` | Stroke on cards, section dividers          |
| `border-invert`    | `waveclash-cream` | Stroke on dark-surface cards               |
| `muted-foreground` | `waveclash-cream` | Subdued labels on dark (no true gray used) |

> Note: the design has **no gray scale** — the only near-black value is
> `waveclash-graphite` (`#1a1a1a`) used exclusively for the "LIVE 24/7" nav
> pill. Do not synthesize grays; use the three surface values
> (`waveclash-black`, `waveclash-sand`, `waveclash-cream`) as the neutral
> progression.

---

## Typography

### Font families

| Role         | Family          | Weight(s) used | Notes                                          |
|--------------|-----------------|----------------|------------------------------------------------|
| `display`    | Archivo Black   | 900            | All headings, nav logo, ticker text, CTA buttons. Google Fonts: `Archivo_Black` |
| `mono`       | JetBrains Mono  | 400, 500, 700  | Labels, nav links, stat captions, badge text, metadata. 400 ("normal") on location/coordinates labels (10px). Google Fonts: `JetBrains_Mono` |
| `body`       | Inter           | 500            | Prose paragraphs, card descriptions. Google Fonts: `Inter` |

**Fallback chain proposals (for `next/font`):**

```
display:  'Archivo Black', 'Arial Black', system-ui, sans-serif
mono:     'JetBrains Mono', 'Fira Code', 'Courier New', monospace
body:     'Inter', system-ui, -apple-system, sans-serif
```

All three are available on Google Fonts. Use `next/font/google` for each.

### Sizes (sampled — every value below appears on at least one node)

| Token     | px  | rem (÷16) | Example usage                                      |
|-----------|-----|-----------|----------------------------------------------------|
| `xs`      | 10  | 0.625     | Location metadata, small mono labels               |
| `sm`      | 11  | 0.6875    | Section labels ("ATHLETES", "COUNTRIES"), badge text, nav captions |
| `base`    | 12  | 0.75      | Nav links ("EVENT", "ATHLETES", "SCHEDULE", …)    |
| `md`      | 13  | 0.8125    | Ticket card price unit ("/WEEK"), footer mono, CTA button labels |
| `lg`      | 14  | 0.875     | Body copy in ticket cards, athlete card footer link |
| `xl`      | 15  | 0.9375    | Ticket tier title ("7-DAY PASS", "DAY PASS")       |
| `2xl`     | 16  | 1.0       | Body copy in manifesto / CTA sections              |
| `3xl`     | 18  | 1.125     | Event subtitle bar ("INTERNATIONAL SURF CHAMPIONSHIP…"), time display in schedule, footer ticker |
| `3.5xl`   | 20  | 1.25      | Sponsor brand names strip (BILLABONG, RIPCURL, …), hero CTA arrow "→" |
| `4xl`     | 22  | 1.375     | Footer ticker / marquee text                       |
| `5xl`     | 24  | 1.5       | Nav logo wordmark ("WAVECLASH///"), schedule arrow icon |
| `6xl`     | 28  | 1.75      | Schedule day number ("D01"), hero CTA button label |
| `7xl`     | 32  | 2.0       | Schedule event name ("OPENING CEREMONY"), stop number ("STOP #07"), athlete name in card |
| `8xl`     | 64  | 4.0       | Stats counter numbers (athletes, countries, prize) |
| `9xl`     | 72  | 4.5       | Ticket card price figures ("$95", "$420", "$890"), "EVENT / SCHEDULE" section heading |
| `10xl`    | 80  | 5.0       | Gallery pull-quote opening mark ("""), mobile "DON'T WATCH" CTA heading word |
| `11xl`    | 120 | 7.5       | About section heading words ("THE OCEAN", "DOESN'T", "NEGOTIATE.") |
| `display-xs` | 30 | 1.875   | Gallery pull-quote body text ("THIS REEF / EATS / HEROES.") |
| `display-sm` | 180 | 11.25  | "MEET THE SURFERS." section heading, "FROM THE LINEUP." heading |
| `display-md` | 220 | 13.75  | "BE ON THE SAND." CTA heading                      |
| `display-lg` | 280 | 17.5   | Hero "WAVE" / "CLASH" display type                 |

> The 10–280 px range is deliberate — WAVECLASH uses truly massive display type
> as a primary visual device. Do not collapse the large sizes.

### Font weights

Four weights appear in the design:

| Weight | Family          | Where used                                                        |
|--------|-----------------|-------------------------------------------------------------------|
| 400    | JetBrains Mono  | Location/coordinates label ("NORTH SHORE / O'AHU / PACIFIC"), mobile about body copy; renders as `fontWeight: "normal"` in pencil JSON |
| 500    | Inter, JetBrains Mono | Inter body copy; JetBrains Mono secondary labels (section counters, ticket tier numbering) |
| 700    | JetBrains Mono  | Primary labels, nav links, badge text, stat captions              |
| 900    | Archivo Black   | All display type, headings, CTAs, ticker text                     |

### Line heights

| Token    | Value | Where used                                         |
|----------|-------|----------------------------------------------------|
| `tight`  | 0.85  | Hero display ("WAVE"/"CLASH"), CTA heading ("BE ON THE SAND.") |
| `dense`  | 0.88  | "MEET THE SURFERS." heading                        |
| `snug`   | 0.9   | Stats counters, ticket prices, About heading words |
| `normal` | 1.0   | Schedule event names                               |
| `relaxed`| 1.4   | Manifesto body copy                                |
| `loose`  | 1.45  | Ticket card descriptions, athlete description      |

> The sub-1.0 line heights are intentional and load-bearing — they create the
> compressed stacked-letterform look on all large display text.

### Letter spacing (tracking)

This is critical for the design's uppercase compressed feel. All values in px
as recorded by pencil:

| Context                                  | fontFamily     | letterSpacing |
|------------------------------------------|----------------|---------------|
| Nav logo "WAVECLASH///"                  | Archivo Black  | −0.5          |
| Nav links ("EVENT", "ATHLETES", …)       | JetBrains Mono | +1.5          |
| "GET PASS" CTA button                    | Archivo Black  | +1            |
| Hero edition tag ("EDITION N°26")        | JetBrains Mono | +2            |
| Hero coordinates / metadata              | JetBrains Mono | +1.5          |
| "SWELL 12-18 FT" highlight               | JetBrains Mono | +1.5          |
| Hero "WAVE" display                      | Archivo Black  | −12           |
| Hero "CLASH" display                     | Archivo Black  | −12           |
| Event subtitle bar (18px Archivo)        | Archivo Black  | +1            |
| Date range in subtitle bar ("MAR 14…")  | Archivo Black  | +1            |
| Stats labels ("ATHLETES", "DAYS", …)    | JetBrains Mono | +2            |
| Stats counters (64px Archivo)            | Archivo Black  | −2            |
| Ticket prices (72px Archivo)             | Archivo Black  | −3            |
| "EVENT / SCHEDULE" heading (72px)        | Archivo Black  | −2            |
| Sponsor names (20px Archivo)             | Archivo Black  | +1            |
| About heading words (120px Archivo)      | Archivo Black  | −5            |
| "// MANIFESTO" label                     | JetBrains Mono | +2            |
| Info table labels ("LOCATION", "DATES")  | JetBrains Mono | +2            |
| Info table values ("BANZAI PIPELINE…")  | Archivo Black  | +0.5          |
| Schedule day number (28px)               | Archivo Black  | −1            |
| Schedule event name (32px Archivo)       | Archivo Black  | −1            |
| Schedule time (18px mono)                | JetBrains Mono | +1            |
| Schedule badge text (10px mono)          | JetBrains Mono | +1.5          |
| Ticker belt text (28px Archivo)          | Archivo Black  | +1            |
| "MEET THE SURFERS." (180px)              | Archivo Black  | −6            |
| Athlete rank label ("WORLD #2")          | Archivo Black  | +1.2          |
| Athlete number badge ("01")              | JetBrains Mono | +1            |
| Athlete name (32px Archivo)              | Archivo Black  | −1            |
| Athlete nationality (11px mono)          | JetBrains Mono | +1            |
| "BE ON THE SAND." (220px)                | Archivo Black  | −8            |
| Ticket tier title (15px Archivo)         | Archivo Black  | +1.5          |
| Ticket CTA button ("BUY DAY PASS")       | Archivo Black  | +1.5          |
| Footer ticker (22px Archivo)             | Archivo Black  | +1.5          |
| Footer nav mono (13px)                   | JetBrains Mono | +1.5          |
| "Hero display lg" (280px Archivo)        | Archivo Black  | −12           |

**Summary pattern:** Archivo Black at display sizes uses heavy negative tracking
(−5 to −12). Archivo at UI/label sizes uses light positive tracking (+1 to +1.5).
JetBrains Mono consistently uses moderate positive tracking (+1.5 to +2).
Inter has no explicit letter spacing (default 0).

---

## Badge / Tag variants (observed)

Four badge fills observed — three in the schedule table, one variant also
appears on athlete cards:

| Label         | Fill               | Text fill   | Text family    | Text size  | Letter spacing |
|---------------|--------------------|-------------|----------------|------------|----------------|
| "CULTURE"     | `#ffd60a` (yellow) | `#0a0a0a`   | JetBrains Mono | 10px / 700 | +1.5           |
| "COMPETITION" | `#ff4a1c` (red)    | `#0a0a0a`   | JetBrains Mono | 10px / 700 | +1.5           |
| "PREMIER"     | `#00355c` (navy)   | `#0a0a0a`   | JetBrains Mono | 10px / 700 | +1.5           |
| "FINAL"       | `#0a0a0a` (black)  | `#faf7ef`   | JetBrains Mono | 10px / 700 | +1.5           |

Note: a fifth badge variant ("FREESURF") appears in the schedule with yellow
fill (`#ffd60a`) — same styling as "CULTURE". Both are yellow; the label
differs by event type.

`#00355c` (navy) is used for:
- The PREMIER schedule badge fill
- Athlete rank badge overlay fill (e.g. "WORLD #1" on athlete card)
- The word "NEGOTIATE." in the About heading

Padding on all schedule badges: `[6, 12]` (6px top/bottom, 12px left/right).
No border-radius observed (pencil default = sharp corners).

---

## Stroke / Border patterns

| Context                           | Stroke fill     | Thickness              |
|-----------------------------------|-----------------|------------------------|
| Nav bottom border                 | `#ff4a1c`       | bottom: 2px            |
| Nav "GET PASS" button border      | `#ff4a1c`       | all: 1px               |
| Event subtitle bar (top + bottom) | `#faf7ef`       | top: 2px, bottom: 2px  |
| Stats section (implicit)          | —               | —                      |
| Schedule section border           | `#0a0a0a`       | top: 3px, bottom: 3px  |
| Schedule row dividers             | `#0a0a0a`       | bottom: 1px            |
| Ticker belt border                | `#0a0a0a`       | top: 3px, bottom: 3px  |
| Athlete card border               | `#0a0a0a`       | all: 2px (inside align)|
| Ticket card border                | `#0a0a0a`       | all: 2px               |
| World-tour badge border           | `#ffd60a`       | all: 3px               |
| Photo thumbnail in schedule       | `#0a0a0a`       | all: 2px               |
| Footer sponsor rule               | `#faf7ef`       | top: 1px               |
| Surfers section border            | `#0a0a0a`       | top: 3px, bottom: 3px  |
| Info table top rule               | `#0a0a0a`       | top: 2px               |
| Info table row dividers           | `#0a0a0a`       | bottom: 1px            |

Borders are almost universally solid black or cream (no radius, no shadow observed).

---

## Spacing / Padding (reference — not tokens, but useful for layout)

| Context              | Padding            |
|----------------------|--------------------|
| Nav                  | `[0, 32]`          |
| Hero sections        | `[32, 0]` offset   |
| Stats row            | `[24, 32]` per cell|
| Schedule section     | `[64, 32]`         |
| About / Athletes     | `[80, 32]`         |
| Footer               | `[80, 60]`         |
| Badge (schedule)     | `[6, 12]`          |
| Ticket card          | `[28, 26]`         |
| CTA section          | `[90, 60]`         |

---

## Primitives

Primitives are elements that appear ≥2 times across the design AND are small/contained atoms — not
section-level compositions. All values below sourced directly from pencil `batch_get` JSON; no
inference.

---

### Button

**Occurrences:** 10+ across both pages (desktop + mobile)

Three distinct fill/role variants observed. All share the same structural pattern: horizontal flex
row, `alignItems: center`, label text (Archivo Black) + `→` suffix, `justifyContent:
space_between`, no border-radius.

| Variant    | Fill                | Text fill           | Label font-size | Padding (T/B, L/R) | Source nodes                        |
|------------|---------------------|---------------------|-----------------|--------------------|-------------------------------------|
| `primary`  | `bg-waveclash-red`  | `text-waveclash-black` | `text-md` (13–14px) | `[12–16, 18–22]` | `i9Ino` (nav), `xm0Gd` (hero), `rE6Uq` (ticket DAY), `MpRm9` (ticket ALL-IN), `aaCxQ` (subscribe) |
| `secondary`| `bg-waveclash-cream`| `text-waveclash-black` | `text-md` (13–16px) | `[16, 20]`       | `y5PC1` (hero 7-day), `aPCIW` (ticket 7-day), `gE8FH` (mobile hero) |
| `ghost`    | `bg-waveclash-black`| `text-waveclash-cream` | `text-md` (13–14px) | `[14, 18–22]`    | `ff1pZ` (all athletes), `rE6Uq` alt-invert (ticket ALL-IN on cream card) |

**Arrow suffix:** Always present. On desktop: `→` as a plain text glyph (Archivo Black or Inter,
font-size `text-2xl` / 16–20px, same fill as label). On mobile CTA blocks: a Lucide `arrow-right`
icon, 22×22px. The arrow fill matches the label fill on primary/ghost; on secondary it matches
the label.

**Label tracking:** `+1` to `+1.5` letterSpacing (all-caps Archivo Black). Maps to
`tracking-widened` / `tracking-widest` in the custom token scale.

**Width:** Stretches full container width on all hero/ticket/footer instances (`width:
fill_container` with `justifyContent: space_between`). Nav button (`i9Ino`) is intrinsic width.

**Notes:** No border-radius anywhere in the design — all buttons are sharp-cornered. The nav GET
PASS button also has a 1px red stroke (`stroke: { fill: #FF4A1C, thickness: 1 }`).

---

### Badge

**Occurrences:** 9+ (7 schedule rows × 1 badge each on desktop; additional mini-badges on mobile
schedule rows; world-tour label is a distinct decorated block, not this primitive)

A small flat tag: text label only (no icon), sharp corners, fixed padding, JetBrains Mono 10px
bold, tracking +1.5.

| Variant       | Fill                 | Text fill              | Label            | Source nodes (desktop) |
|---------------|----------------------|------------------------|------------------|------------------------|
| `yellow`      | `bg-waveclash-yellow`| `text-waveclash-black` | CULTURE, FREESURF| `iIHE3`, `o3Sbu`       |
| `red`         | `bg-waveclash-red`   | `text-waveclash-black` | COMPETITION      | `o70xu`, `KbSRK`, `gvnXK` |
| `navy`        | `bg-waveclash-navy`  | `text-waveclash-black` | PREMIER          | `gHqrV`                |
| `black`       | `bg-waveclash-black` | `text-waveclash-cream` | FINAL            | `YV0Rp`                |

Mobile schedule rows use a smaller variant (9px, padding `[3, 6]`, with a 2px black stroke added):
`E4oqDr`. Same four color fills apply.

**Padding (desktop):** `[6, 12]` — 6px top/bottom, 12px left/right.
**Padding (mobile):** `[3, 6]` — half scale.
**Border-radius:** 0 (none observed).
**Font:** JetBrains Mono, 10px (desktop) / 9px (mobile), weight 700, `tracking-[0.15em]`
(letterSpacing +1.5 at 10px).

---

### StatCounter

**Occurrences:** 5 cells on desktop stats belt (`fi42O`); 4 cells on mobile stats grid (`ZLDRp`)

A two-line stacked element: large number on top, short all-caps label below.

**Number:** Archivo Black, `text-8xl` (64px desktop), `lineHeight: 0.9` (`leading-snug`),
`letterSpacing: -2` (`tracking-tighter`), fill = `text-waveclash-cream`.
**Label:** JetBrains Mono, `text-sm` (11px), weight 700, fill = `text-waveclash-red`
(accent color — not cream). No explicit letterSpacing on the label node (inherits 0).
**Container padding:** `[24, 18]` (desktop mobile cell).
**Container fill:** `bg-waveclash-black`.
**Separator:** adjacent cells divided by a 2px cream stroke (right or bottom depending on layout).

Source nodes: `Nc0i9` (ATHLETES cell), `F0N5N` (COUNTRIES), `I5mm4` (DAYS), `jIiKX` (PRIZE).

---

### SectionHeadingRow

**Occurrences:** 4 confirmed (desktop "EVENT / SCHEDULE", desktop "MEET THE SURFERS.", mobile
"ATHLETES" section intro, mobile "FROM THE LINEUP." intro)

A layout row pairing a **section number/label** (small mono, top-left) with a **massive display
heading** (Archivo Black, display sizes), and optionally a **right-side metadata block** (small
mono, bottom-aligned).

This is the recurring `[small-label + display-heading] / [metadata-right]` two-column structure:

| Instance               | Heading font-size | Label text         | Source node |
|------------------------|-------------------|--------------------|-------------|
| "EVENT / SCHEDULE"     | `text-9xl` (72px) | `// 003`           | `dmqgc`     |
| "MEET THE SURFERS."    | `text-display-sm` (180px) | `#02 / ROSTER` | `anKrW`  |
| Mobile "FROM THE LINEUP." | `text-display-sm` (180px) | `#03 / DISPATCH` | `HMmEr` |
| Mobile "DON'T WATCH…" | `text-10xl` (80px) | `// TICKETS — DROPPING NOW` | `x6kkN` / `lxJMx` |

**Label text style:** JetBrains Mono, 11–13px, weight 700, fill `text-waveclash-red`, tracking +2.
**Display heading style:** Archivo Black, varies by section (72px–220px), `leading-tight` /
`leading-dense`, heavy negative tracking (−2 to −8).
**Right metadata (when present):** JetBrains Mono, 11px, weight 700, two lines, bottom-aligned.

> This is a primitive layout wrapper (atom), not a full block — the heading and label are the
> repeating atom; the content below (schedule table, athlete cards, etc.) is the block layer.

---

### ProfileLink

**Occurrences:** 6+ (every athlete card in desktop surfers section; every mobile athlete card;
footer nav column headers use a related but distinct style)

A compact inline link: text label + arrow-right icon, side by side.

**Text:** JetBrains Mono, `text-sm` (11px), weight 700, fill `text-waveclash-red`
(`letterSpacing` inherits from parent — no explicit value on these nodes).
**Icon:** Lucide `arrow-right`, 14×14px, fill `text-waveclash-red`.
**Gap:** 6px between text and icon.
**No background, no border, no padding** — purely inline.

Source nodes: `Y1YAER` (mobile athlete card 1), `yo8d4` (mobile athlete card 2).
Desktop equivalent is a text `→` glyph (Inter 700, 16px, red fill) positioned inline next to the
athlete card's footer text.

---

### TickerBelt

**Occurrences:** 2 (hero bottom stripe `YmRZq`; footer top stripe `SZ1De`)

A full-width horizontal scrolling/marquee bar with uniform background and repeating text nodes.

**Fill:** `bg-waveclash-yellow` (hero instance); `bg-waveclash-black` (footer instance).
**Text:** Archivo Black, `text-4xl` (22–28px), weight 900, `tracking-[0.0625em]` (+1 letterSpacing),
fill = `text-waveclash-black` on yellow belt; `text-waveclash-cream` on black belt.
**Border:** 3px solid `border-waveclash-black` top and bottom on both instances.
**Separator glyph:** `◆` (black diamond) between repeated text segments.
**Height:** ~50–63px depending on instance.

Source nodes: `YmRZq` (hero), `SZ1De` (footer top — contains the marquee content frame).

---

## Blocks

A block is a section-level composition of primitives + content. The unit a page is assembled from.
Both pages are part of **one long landing page** — the pencil splits it across two frames
(`opEVO` 1440×2900 and `N9wSB2` 1440×4318) for canvas management, not because they represent
different page types. There is no separate inner page / athlete-profile page in this design.

---

### SiteHeader

**Source nodes:** `LEYsk` (page 1 — appears once; would appear on every page in a real app)
**Pages used:** Landing (universal — would repeat on every route)
**Primitives used:** Button (`primary` — "GET PASS" nav CTA, node `i9Ino`)
**Content slots:** logo, navLinks[], ctaLabel, ctaHref
**Layout notes:** Full-width, 80px tall, `bg-waveclash-black`, `padding: [0, 32]`.
Three-column flex (`space_between`): left = logo wordmark "WAVECLASH///" (Archivo Black 24px,
cream, tracking −0.5) + "LIVE 24/7" pill (graphite fill + red stroke, node `iweyU`); center = 5
mono nav links (JetBrains Mono 12px 700, cream, tracking +1.5); right = GET PASS Button (primary).
Bottom border: 2px solid `waveclash-red`.
**Responsive notes:** Mobile layout not inspected in this pass; desktop is the reference.

---

### Hero

**Source nodes:** `sUP7n` (page 1)
**Pages used:** Landing
**Primitives used:** Button (`primary` — "GET PASS", node `xm0Gd`), Button (`secondary` — "BUY
7-DAY PASS", node `y5PC1`), TickerBelt (yellow instance, node `YmRZq`)
**Content slots:** backgroundImage, editionTag, locationLabel, coordinates, swellData, displayHeading
("WAVE" / "CLASH"), subtitleBar (championship name, location, date range), worldTourBadge
(stop number), ctaPrimary, ctaSecondary
**Layout notes:** 1440×1100px, `layout: none` (absolute). Full-bleed image (`agriR`) + 70%-opacity
black overlay (`E60T32`). Display type "WAVE" (cream) + "CLASH" (red), Archivo Black 280px,
tracking −12, leading 0.85, gap −30 (lines overlap). Top-left: edition/location metadata column
(`Y0kyt`). Top-right: coordinates + swell data column (`Y1jk79`). Bottom-left: two CTA buttons
stacked vertically, 300px wide (`X720Bm`). Bottom-right: rotated world-tour badge (−15°, yellow
border 3px, `ZGE9R`). Subtitle bar (full-width, cream stroke top+bottom 2px, `SRayU`) sits at
y=880, separating the hero body from the ticker. TickerBelt (`YmRZq`) anchored at bottom, y=1010,
yellow fill, 28px Archivo Black text.
**Responsive notes:** Mobile reduces display type; CTA layout likely stacks differently.

---

### StatsBelt

**Source nodes:** `fi42O` (page 1)
**Pages used:** Landing (immediately below Hero)
**Primitives used:** StatCounter ×5 (nodes `ps1fl`, `oxlpu`, `R9JCb1`, `gSfjv`, `sSCVT`)
**Content slots:** stats[] — each has a `label` (ATHLETES, COUNTRIES, DAYS, PRIZE POOL, WAVES)
and a `value` (64, 23, 10, $1.2M, ∞)
**Layout notes:** Full-width, 140px tall, `bg-waveclash-black`, `justifyContent: space_between`.
Five equal-width StatCounter cells side by side, each separated by a 2px red right-border.
Last cell has no right border. Padding per cell: `[24, 32]`.
**Responsive notes:** Mobile collapses to a 2×2 or 2×3 grid (see mobile frame `ZLDRp`).

---

### AboutCallout

**Source nodes:** `ThXku` (page 1)
**Pages used:** Landing
**Primitives used:** _(none from the primitive set — this block's content is bespoke)_
**Content slots:** displayHeading (3 words, multi-color: "THE OCEAN" black, "DOESN'T" red,
"NEGOTIATE." navy), manifestoLabel, manifestoBody, infoTable (LOCATION, DATES, FORMAT, BROADCAST)
**Layout notes:** 1440×600px, `bg-waveclash-sand`, `padding: [80, 32]`, `gap: 48`, two-column flex.
Left column (`J24RQ`, 908px): stacked display words at 120px Archivo Black, leading 0.9, tracking −5.
Small black rectangle spacer (8×120px) below words. Right column (`nNbxc`, 420px): "// MANIFESTO"
red label, 18px Inter body copy, then a bordered info table (`K9ujIn`) with 4 rows (LOCATION, DATES,
FORMAT, BROADCAST) — each row `justifyContent: space_between`, 2px top border, 1px bottom-border
dividers, label JetBrains Mono 11px 700 tracking +2, value Archivo Black 13px 900 tracking +0.5.
**Responsive notes:** Mobile collapses to single column; heading font size reduces.

---

### EventSchedule

**Source nodes:** `WRu0j` (page 1, named "SCHEDULE" in pencil)
**Pages used:** Landing
**Primitives used:** SectionHeadingRow (`dmqgc`), Badge (all 4 variants: yellow, red, navy, black —
in the schedule rows)
**Content slots:** sectionLabel ("// 003"), sectionHeading ("EVENT / SCHEDULE"), scheduleRows[]
(each row: dayNumber, date, photo, eventName, badge, time, arrowLink)
**Layout notes:** 1440×980px, `bg-waveclash-cream`, `padding: [64, 32]`, `gap: 32`, vertical layout.
Section bordered top+bottom 3px solid black. Heading row (`dmqgc`) is a SectionHeadingRow primitive.
Schedule table (`m5x5sG`) has 7 rows (`oYcgs`, `Dpio8`, `Og8pX`, `R2cAZ`, `T0EVe`, `DJSDK`,
`tDi2q`), each row: `alignItems: center`, `gap: 24`, `padding: [18, 16]`, 1px black bottom-border
divider. Per-row structure: day column (day-code + date, `text-7xl` / `text-base`, Archivo Black /
JetBrains Mono), photo thumbnail (80×60px image, 2px black border), event name (Archivo Black 32px,
tracking −1, fill_container), Badge (variant per event type), time (JetBrains Mono 18px right-
aligned), arrow link (↗ red, Archivo Black 24px).
**Sub-block — ScheduleRow:** Not documented separately; the row is a direct child of the table, not
reused outside this block. See row structure above.

---

### SurferGrid

**Source nodes:** `C7T9Cw` (page 2, named "Athletes Section" in pencil)
**Pages used:** Landing
**Primitives used:** SectionHeadingRow (section header row `eZ744` + heading `anKrW`)
**Content slots:** sectionLabel ("[ 02 / ROSTER ]"), sectionMeta ("64 ATHLETES — 23 COUNTRIES"),
sectionHeading ("MEET THE SURFERS."), sectionSubcopy, cards[] (array of SurferCard)
**Layout notes:** 1440×1115px, `bg-waveclash-sand`, `padding: [80, 60]`, `gap: 40`, vertical layout.
Header strip (`eZ744`) contains label/meta row + 2px black rule. Heading block (`anKrW`) is
two-column: massive display heading left (180px Archivo Black, tracking −6, leading 0.88) + right-
side subcopy column (`xk7we`, 380px wide). Card grid (`ZqcnB`) is a horizontal flex row of 4 cards
with `gap: 20`, `padding: [20, 0, 0, 0]`.

**Card sub-block — SurferCard:**
  **Source nodes:** `qtCVM` (card 1 — Kahanu Makekai), `Zpd8j` (card 2 — Milo Deschamps),
  `xALo4` (card 3 — Indi Walker), `jwezL` (card 4 — Noa Santos)
  **Primitives used:** Badge (rank badge, bottom-right of portrait — variants: red `fQCBG`,
  yellow `YFcHj`, navy `J9FEJ4`) — the number badge (top-left, black fill) is structurally
  identical to Badge `black` variant
  **Content slots:** number (01–04), rankLabel (WORLD #N), image (portrait photo), name (2-line
  Archivo Black 32px), location (city + country), viewLink ("VIEW ↗")
  **Layout notes:** Vertical flex, `bg-waveclash-cream`, 2px inside black stroke, no border-radius.
  Portrait area: absolute-positioned image frame (360px tall, fill_container wide) with number
  badge top-left (black pill, JetBrains Mono 14px 700) and rank badge bottom-right (colored Badge
  primitive, Archivo Black 11px 900, tracking +1.2, padding [6, 12]). Footer area (`XFxb6`):
  `bg-waveclash-cream`, `padding: [20, 18, 22, 18]`, `gap: 8`, vertical flex — name text, 1px rule,
  then location/view-link row (`justifyContent: space_between`). "VIEW ↗" is inline text (JetBrains
  Mono 11px 700, red) — same function as ProfileLink primitive but rendered as plain text here.

---

### GallerySection

**Source nodes:** `u9A5Q2` (page 2, named "Gallery Section" in pencil)
**Pages used:** Landing
**Primitives used:** Button (`primary` — "OPEN ARCHIVE" CTA, node `aNz2W`)
**Content slots:** sectionLabel ("[ 03 / DISPATCH ]"), sectionHeading ("FROM THE LINEUP."),
sectionBody, ctaLabel, ctaHref, featuredImage (large, 560×560px), secondaryImage (top-right,
272px tall), pullQuote (quote text + attribution), pullQuoteBackground
**Layout notes:** 1440×1099px, `bg-waveclash-black`, `padding: [80, 60]`, `gap: 36`, vertical layout.
Header row (`u6SjgE`): two-column `justifyContent: space_between` — left = section label + 180px
"FROM THE LINEUP." heading (Archivo Black, tracking −6, leading 0.88, cream), right = body copy +
"OPEN ARCHIVE" Button (`aNz2W`, red fill, 360px wide col). Image mosaic (`jmGB2`): horizontal flex,
gap 16. Left: single large 560×560px image (`gxl0g`) with a rotated yellow timestamp badge ("DAY 03
/ 06:42", JetBrains Mono 12px 700, −6° rotation) top-left. Right column (`HaLvX`): top image
(`E7QL99`, 272px) + bottom split (`P5Qfn`, 272px) containing a second surf image left and a
**PullQuote** panel right (`yJ2h6`, red fill, `justifyContent: space_between`): opening " glyph
(Archivo Black 80px, leading 0.7), quote body "THIS REEF / EATS / HEROES." (Archivo Black 30px,
tracking −0.5, leading 0.95), attribution row "— INDI WALKER" / "WC/26" (JetBrains Mono 11px 700).
**Note on PullQuote:** The pull-quote panel (`yJ2h6`) is embedded within GallerySection and does
not appear elsewhere as a standalone section. It is a block-internal component, not a separate
block.

---

### SponsorStrip

**Source nodes:** `u9wUYn` (page 2, named "Sponsors Strip" in pencil)
**Pages used:** Landing
**Primitives used:** _(none — sponsor logos are plain text/image nodes)_
**Content slots:** partnershipLabel ("OFFICIAL PARTNERS — WAVECLASH/26"), sponsorLogos[] (7 slots)
**Layout notes:** Full-width, 136px total, `bg-waveclash-sand`, vertical layout. Top sub-frame
(`w7FSUa`, 49px): header bar with a diamond bullet + "OFFICIAL PARTNERS" label on left, "OFFICIAL
PARTNERS — WAVECLASH/26" mono text right — `bg-waveclash-sand`, `padding: [16, 60]`,
`justifyContent: space_between`. 2px black rule divider (`sqvVG`). Logo row (`G7ADC`, 85px):
`bg-waveclash-black`, 7 equal-width cells, each `padding: [28, 16]`, centered, separated by 1px
cream right-border. Section has 2px black top and bottom borders.

---

### CtaBuyPass

**Source nodes:** `lHnti` (page 2, named "CTA Buy Pass" in pencil)
**Pages used:** Landing
**Primitives used:** Button (`ghost` on cream card `rE6Uq`, `primary` on invert card `aPCIW`)
**Content slots:** sectionLabel ("[ 05 / TICKETS ON SALE ]"), sectionHeading ("BE ON THE SAND."),
sectionSubcopy, ticketCards[] (3 tiers)
**Layout notes:** 1440×1002px, `bg-waveclash-red`, `padding: [90, 60]`, `gap: 28`, centered
vertical layout (`alignItems: center`). Section label (JetBrains Mono 13px 700, black, tracking +2).
Display heading "BE ON THE SAND." (Archivo Black 220px, tracking −8, leading 0.85, centered).
Subcopy (Inter 18px 500, centered). Card row (`ZihNf`): 3 ticket cards, `gap: 18`.

**Card sub-block — TicketCard:**
  **Source nodes:** `D9Ai3` (DAY PASS, cream bg), `y1ImGi` (7-DAY PASS, black bg / invert),
  `tjjH2` (ALL-IN PASS, cream bg — not fetched but structurally identical to `D9Ai3`)
  **Primitives used:** Button (`ghost` on cream cards, `primary` on invert card)
  **Content slots:** tierTitle, tierIndex (01/03, 02/03, 03/03), price, priceUnit ("/DAY",
  "/WEEK"), description, ctaLabel
  **Layout notes:** Vertical flex, `padding: [28, 26]`, `gap: 20`, 2px black stroke. Fill:
  cream (DAY, ALL-IN) or black (7-DAY invert). Header row: tier title (Archivo Black 15px 900,
  tracking +1.5) + tier index (JetBrains Mono 11px 500, tracking +1), `justifyContent:
  space_between`. Price row: price figure (Archivo Black 72px, tracking −3, leading 0.9) + unit
  label (JetBrains Mono 13px 500, tracking +1.2), aligned to baseline. 1px rule divider.
  Description (Inter 14px 500, leading 1.45). CTA Button full-width, `justifyContent:
  space_between`.

---

### SiteFooter

**Source nodes:** `wUBEW` (page 2, named "Footer" in pencil)
**Pages used:** Landing (universal — would repeat on every route)
**Primitives used:** TickerBelt (yellow instance at footer top, node `SZ1De`), Button
(`primary` — "SUBSCRIBE" / newsletter CTA, node `aaCxQ`)
**Content slots:** tickerText, footerHeading ("SEE YOU IN THE WATER."), newsletterLabel,
newsletterBody, emailInput, socialTags[], navColumns[] (EVENT, TICKETS, ATHLETES, MEDIA,
CONTACT — each with 4 child links), legalLine, socialLinks (INSTAGRAM ↗, YOUTUBE ↗)
**Layout notes:** Full-width, 966px tall, `bg-waveclash-black`, vertical layout. Three sub-sections:
1. TickerBelt (`SZ1De`, 63px) — yellow fill, 22px Archivo Black, tracking +1.5, `★` red separator
   glyph, `padding: [18, 60]`.
2. Main footer body (`JjLvR`, 831px) — `bg-waveclash-black`, `padding: [80, 60, 40, 60]`, `gap: 60`.
   Upper block (`AbA2k`): two-column `justifyContent: space_between`. Left = display heading "SEE
   YOU IN THE WATER." (Archivo Black 180px, tracking −6, leading 0.85, cream) + an info-table
   sub-block (LOCATION/DATES/FORMAT/BROADCAST, same structure as AboutCallout's info table,
   `K9ujIn`). Right = newsletter panel (`v34XF`, 420px wide): section label ("[ DISPATCH /
   WEEKLY ]", yellow JetBrains Mono), body copy, email input + subscribe Button (`aaCxQ`), social
   tag pills (4 pills with cream 1px stroke). 1px cream rule (`iSZeI`). Lower nav block (`bEIdb`):
   5-column link nav, each column headed by a red Archivo Black 13px category name + 4 Inter 14px
   500 cream links.
3. Legal bar (`L8Rv2t`, 72px) — `padding: [24, 60]`, 1px cream top-border, `justifyContent:
   space_between`. Left: logo wordmark (Archivo Black 22px) + copyright mono text. Right: legal
   links (TERMS, PRIVACY, ACCESSIBILITY) + social links (INSTAGRAM ↗, YOUTUBE ↗), JetBrains
   Mono 12px 500, tracking +1.

---

## Block count summary

| # | Block | Source frame | Page frame |
|---|-------|-------------|------------|
| 1 | SiteHeader | `LEYsk` | `opEVO` |
| 2 | Hero | `sUP7n` | `opEVO` |
| 3 | StatsBelt | `fi42O` | `opEVO` |
| 4 | AboutCallout | `ThXku` | `opEVO` |
| 5 | EventSchedule | `WRu0j` | `opEVO` |
| 6 | SurferGrid | `C7T9Cw` | `N9wSB2` |
| 7 | GallerySection | `u9A5Q2` | `N9wSB2` |
| 8 | SponsorStrip | `u9wUYn` | `N9wSB2` |
| 9 | CtaBuyPass | `lHnti` | `N9wSB2` |
| 10 | SiteFooter | `wUBEW` | `N9wSB2` |

**10 blocks total.** Sub-blocks within blocks: SurferCard (×4 in SurferGrid),
TicketCard (×3 in CtaBuyPass).

Candidate blocks from the task brief that were NOT found as standalone sections:
- **TickerStrip** — merged into Hero (hero TickerBelt) and SiteFooter (footer TickerBelt); the
  TickerBelt primitive handles both. No standalone TickerStrip section exists.
- **LineupGrid** — does not exist as a grid of video tiles; instead the section is a photo mosaic
  with an embedded pull-quote. Documented as GallerySection.
- **AboutCallout / StatsBelt** — confirmed as two separate sections (not merged).
- **PullQuote** — embedded inside GallerySection, not a standalone section block.

---

## Concerns / Flags for Review

1. **`#00355c` navy is a real brand color** — confirmed on three distinct nodes:
   the PREMIER schedule badge, the athlete WORLD #1 rank badge, and the
   "NEGOTIATE." heading word. Treat as a full token (`waveclash-navy` /
   `accent-deep`), not a one-off.

2. **`#1a1a1a` graphite is scoped to one component** — the "LIVE 24/7" nav pill
   is the only place this appears. Wire as `waveclash-graphite` but expect
   usage to stay narrow.

3. **No gray scale** — the design deliberately avoids grays. `#faf7ef` serves
   as "white" and `#f2ede3` as "off-white/sand". Do not introduce grays in
   Task 1a.2 without design sign-off.

4. **Sub-1.0 line heights** — `lineHeight: 0.85` and `0.88` are aggressive.
   Confirm these render correctly in the browser target before committing to
   Tailwind config (they clip descenders on some fonts, but Archivo Black has
   no descenders on uppercase text so it should be fine).

5. **Size scale is non-standard** — the 10–280px ladder does not map cleanly
   onto Tailwind's default type scale. Task 1a.2 will need a custom `fontSize`
   config. The token names above (`xs` through `display-lg`) are proposals —
   the implementer should feel free to rename if a different naming convention
   is preferred for the project. Note: `display-xs` (30px) and `3.5xl` (20px)
   are awkward slots — collapse or rename as needed for the actual Tailwind
   config.

6. **`Inter` weight 500 only** — Inter appears only in body-copy contexts at
   weight 500. No weight 400 or 700 was observed for Inter. If `next/font`
   loads Inter, only request `500` to keep bundle lean.
