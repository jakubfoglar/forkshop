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
