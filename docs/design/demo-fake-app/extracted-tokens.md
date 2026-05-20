# WAVECLASH 2026 — Extracted Design Tokens

Working notes for Task 1a.2. All values sourced from pencil JSON (`fill`, `stroke`,
`fontFamily`, `fontSize`, etc.) — not from screenshots.

---

## Colors

### Brand primitives

| Token             | Hex       | Where used                                                                 |
|-------------------|-----------|----------------------------------------------------------------------------|
| `waveclash-black` | `#0a0a0a` | Nav bg, hero overlay base, stats section bg, footer bg, primary text on light surfaces |
| `waveclash-cream` | `#faf7ef` | Primary text on dark, card/athlete surfaces, "BUY PASS" secondary button   |
| `waveclash-red`   | `#ff4a1c` | Accent / CTA fills, "COMPETITION" badge, nav bottom border, "↗" arrows, "CLASH" heading word, live-watch button |
| `waveclash-yellow`| `#ffd60a` | Ticker belt bg, "SWELL" stat highlight, "★ WORLD TOUR" badge label, footer ticker, schedule "CULTURE" badge |
| `waveclash-sand`  | `#f2ede3` | Section backgrounds — About, Athletes, Sponsors Strip, second-page default bg |
| `waveclash-navy`  | `#00355c` | Single heading word "NEGOTIATE." — used once, functions as a deep accent    |

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
| `accent-deep`      | `waveclash-navy`  | Rare third brand accent (single heading use)|
| `border`           | `waveclash-black` | Stroke on cards, section dividers          |
| `border-invert`    | `waveclash-cream` | Stroke on dark-surface cards               |
| `muted-foreground` | `waveclash-cream` | Subdued labels on dark (no true gray used) |

> Note: the design has **no gray scale** — there are no intermediate neutral
> values between `#0a0a0a` and `#faf7ef`. Do not synthesize grays; use the
> three surface values (`waveclash-black`, `waveclash-sand`, `waveclash-cream`)
> as the neutral progression.

---

## Typography

### Font families

| Role         | Family          | Weight(s) used | Notes                                          |
|--------------|-----------------|----------------|------------------------------------------------|
| `display`    | Archivo Black   | 900            | All headings, nav logo, ticker text, CTA buttons. Google Fonts: `Archivo_Black` |
| `mono`       | JetBrains Mono  | 500, 700       | Labels, nav links, stat captions, badge text, metadata. Google Fonts: `JetBrains_Mono` |
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
| `base`    | 12  | 0.75      | Nav logo wordmark                                  |
| `md`      | 13  | 0.8125    | Ticket card price unit ("/WEEK"), footer mono, CTA button labels |
| `lg`      | 14  | 0.875     | Body copy in ticket cards, athlete card footer link |
| `xl`      | 15  | 0.9375    | Ticket tier title ("7-DAY PASS", "DAY PASS")       |
| `2xl`     | 16  | 1.0       | Body copy in manifesto / CTA sections              |
| `3xl`     | 18  | 1.125     | Event subtitle bar ("INTERNATIONAL SURF CHAMPIONSHIP…"), time display in schedule, footer ticker |
| `4xl`     | 22  | 1.375     | Footer ticker / marquee text                       |
| `5xl`     | 24  | 1.5       | Nav logo wordmark (display), schedule arrow icon   |
| `6xl`     | 28  | 1.75      | Schedule day number ("D01"), hero CTA button label |
| `7xl`     | 32  | 2.0       | Schedule event name ("OPENING CEREMONY"), stop number ("STOP #07"), athlete name in card |
| `8xl`     | 64  | 4.0       | Stats counter numbers (athletes, countries, prize) |
| `9xl`     | 72  | 4.5       | Ticket card price figures ("$95", "$420", "$890")  |
| `10xl`    | 120 | 7.5       | About section heading words ("THE OCEAN", "DOESN'T", "NEGOTIATE.") |
| `display-sm` | 180 | 11.25  | "MEET THE SURFERS." section heading                |
| `display-md` | 220 | 13.75  | "BE ON THE SAND." CTA heading                      |
| `display-lg` | 280 | 17.5   | Hero "WAVE" / "CLASH" display type                 |

> The 10–280 px range is deliberate — WAVECLASH uses truly massive display type
> as a primary visual device. Do not collapse the large sizes.

### Font weights

Only three weights appear in the design:

| Weight | Where used                         |
|--------|------------------------------------|
| 500    | Inter body copy, JetBrains Mono secondary labels |
| 700    | JetBrains Mono primary labels and badges          |
| 900    | Archivo Black — all display type and CTAs         |

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

Two badge fills in the schedule table:

| Label         | Fill            | Text fill   | Text family    | Text size | Letter spacing |
|---------------|-----------------|-------------|----------------|-----------|----------------|
| "CULTURE"     | `#ffd60a` (yellow) | `#0a0a0a` | JetBrains Mono | 10px / 700 | +1.5          |
| "COMPETITION" | `#ff4a1c` (red)    | `#0a0a0a` | JetBrains Mono | 10px / 700 | +1.5          |

Padding on both: `[6, 12]` (6px top/bottom, 12px left/right). No border-radius
observed (pencil default = sharp corners).

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

## Concerns / Flags for Review

1. **`#00355c` navy** — appears on exactly one text node ("NEGOTIATE." in the
   About section heading). Could be intentional three-color branding or could
   be a one-off design decision. Included as `waveclash-navy` / `accent-deep`
   but worth confirming before wiring into CSS.

2. **No gray scale** — the design deliberately avoids grays. `#faf7ef` serves
   as "white" and `#f2ede3` as "off-white/sand". Do not introduce grays in
   Task 1a.2 without design sign-off.

3. **Sub-1.0 line heights** — `lineHeight: 0.85` and `0.88` are aggressive.
   Confirm these render correctly in the browser target before committing to
   Tailwind config (they clip descenders on some fonts, but Archivo Black has
   no descenders on uppercase text so it should be fine).

4. **Size scale is non-standard** — the 10–280px ladder does not map cleanly
   onto Tailwind's default type scale. Task 1a.2 will need a custom `fontSize`
   config. The token names above (`xs` through `display-lg`) are proposals —
   the implementer should feel free to rename if a different naming convention
   is preferred for the project.

5. **`Inter` weight 500 only** — Inter appears only in body-copy contexts at
   weight 500. No weight 400 or 700 was observed. If `next/font` loads Inter,
   only request `500` to keep bundle lean.
