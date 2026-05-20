// Token swatch gallery — Phase 1a review surface.
// Phase 1b will replace this with the primitives gallery.

const brandColors = [
  { token: "waveclash-black",   hex: "#0a0a0a", usage: "Nav bg, hero overlay, footer bg, primary text on light",  textClass: "text-waveclash-cream" },
  { token: "waveclash-graphite",hex: "#1a1a1a", usage: "'LIVE 24/7' nav pill — near-black, used nowhere else",    textClass: "text-waveclash-cream" },
  { token: "waveclash-cream",   hex: "#faf7ef", usage: "Primary text on dark, card / athlete surfaces",            textClass: "text-waveclash-black" },
  { token: "waveclash-red",     hex: "#ff4a1c", usage: "Accent / CTA fills, COMPETITION badge, nav border, arrows",textClass: "text-waveclash-black" },
  { token: "waveclash-yellow",  hex: "#ffd60a", usage: "Ticker belt, SWELL stat, ★ WORLD TOUR badge, CULTURE badge",textClass: "text-waveclash-black" },
  { token: "waveclash-sand",    hex: "#f2ede3", usage: "Section backgrounds — About, Athletes, Sponsors Strip",    textClass: "text-waveclash-black" },
  { token: "waveclash-navy",    hex: "#00355c", usage: "PREMIER badge, athlete WORLD #1 rank badge, 'NEGOTIATE.'", textClass: "text-waveclash-cream" },
] as const

const semanticAliases = [
  { alias: "demo-background",       resolves: "waveclash-black",  role: "Default page background" },
  { alias: "demo-foreground",       resolves: "waveclash-cream",  role: "Default text on dark" },
  { alias: "demo-surface",          resolves: "waveclash-sand",   role: "Light section backgrounds" },
  { alias: "demo-surface-card",     resolves: "waveclash-cream",  role: "Card surfaces" },
  { alias: "demo-surface-invert",   resolves: "waveclash-black",  role: "Inverted card bg" },
  { alias: "demo-accent",           resolves: "waveclash-red",    role: "CTAs, badges, highlighted words" },
  { alias: "demo-accent-secondary", resolves: "waveclash-yellow", role: "Ticker belt, stat highlights, world-tour badge" },
  { alias: "demo-accent-deep",      resolves: "waveclash-navy",   role: "PREMIER badge family, athlete rank badge" },
  { alias: "demo-border",           resolves: "waveclash-black",  role: "Stroke on cards, section dividers" },
  { alias: "demo-border-invert",    resolves: "waveclash-cream",  role: "Stroke on dark-surface cards" },
  { alias: "demo-muted-foreground", resolves: "waveclash-cream",  role: "Subdued labels on dark (no true gray used)" },
] as const

const sizeLadder = [
  { token: "xs",         px: 10,  usage: "Location metadata, small mono labels" },
  { token: "sm",         px: 11,  usage: "Section labels, badge text, nav captions" },
  { token: "base",       px: 12,  usage: "Nav links (EVENT, ATHLETES, SCHEDULE, …)" },
  { token: "md",         px: 13,  usage: "Ticket card price unit ('/WEEK'), footer mono, CTA button labels" },
  { token: "lg",         px: 14,  usage: "Body copy in ticket cards, athlete card footer link" },
  { token: "xl",         px: 15,  usage: "Ticket tier title ('7-DAY PASS', 'DAY PASS')" },
  { token: "2xl",        px: 16,  usage: "Body copy in manifesto / CTA sections" },
  { token: "3xl",        px: 18,  usage: "Event subtitle bar, schedule time display, footer ticker" },
  { token: "3-5xl",      px: 20,  usage: "Sponsor brand names, hero CTA arrow '→'" },
  { token: "4xl",        px: 22,  usage: "Footer ticker / marquee text" },
  { token: "5xl",        px: 24,  usage: "Nav logo wordmark ('WAVECLASH///'), schedule arrow icon" },
  { token: "6xl",        px: 28,  usage: "Schedule day number ('D01'), hero CTA button label" },
  { token: "7xl",        px: 32,  usage: "Schedule event name, stop number, athlete name in card" },
  { token: "display-xs", px: 30,  usage: "Gallery pull-quote body ('THIS REEF / EATS / HEROES.')" },
  { token: "8xl",        px: 64,  usage: "Stats counter numbers (athletes, countries, prize)" },
  { token: "9xl",        px: 72,  usage: "Ticket card price figures, 'EVENT / SCHEDULE' heading" },
  { token: "10xl",       px: 80,  usage: "Gallery pull-quote opening mark, mobile 'DON'T WATCH' heading" },
  { token: "11xl",       px: 120, usage: "About heading words ('THE OCEAN', 'DOESN'T', 'NEGOTIATE.')" },
  { token: "display-sm", px: 180, usage: "'MEET THE SURFERS.' section heading, 'FROM THE LINEUP.' heading" },
  { token: "display-md", px: 220, usage: "'BE ON THE SAND.' CTA heading" },
  { token: "display-lg", px: 280, usage: "Hero 'WAVE' / 'CLASH' display type" },
] as const

const badges = [
  { label: "CULTURE",     bgClass: "bg-waveclash-yellow", textClass: "text-waveclash-black", note: "Also used for FREESURF — same yellow fill, different label" },
  { label: "COMPETITION", bgClass: "bg-waveclash-red",    textClass: "text-waveclash-black", note: "" },
  { label: "PREMIER",     bgClass: "bg-waveclash-navy",   textClass: "text-waveclash-cream", note: "Also: athlete WORLD #1 rank badge" },
  { label: "FINAL",       bgClass: "bg-waveclash-black",  textClass: "text-waveclash-cream", note: "Border: 2px waveclash-cream (inline only — not a token border-radius)" },
] as const

const trackingSamples = [
  { label: "Hero display (−12px)", text: "WAVECLASH", trackingClass: "tracking-display-tight", sizeClass: "text-7xl", font: "font-display" },
  { label: "About heading (−5px)", text: "NEGOTIATE.", trackingClass: "tracking-display-snug",  sizeClass: "text-9xl", font: "font-display" },
  { label: "Stats counters (−2px)", text: "247",       trackingClass: "tracking-display-normal",sizeClass: "text-8xl", font: "font-display" },
  { label: "Nav links (+1.5px)",   text: "ATHLETES",   trackingClass: "tracking-label-wider",   sizeClass: "text-base",font: "font-mono" },
  { label: "Edition tag (+2px)",   text: "EDITION N°26",trackingClass: "tracking-label-widest", sizeClass: "text-sm",  font: "font-mono" },
] as const

export default function DemoPage() {
  return (
    <main className="min-h-screen p-8 space-y-16">

      {/* ── 1. Brand Colors ─────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-7xl text-black mb-6">Brand Colors</h2>
        <div className="flex flex-wrap gap-4">
          {brandColors.map(({ token, hex, usage, textClass }) => (
            <div
              key={token}
              className={`bg-${token} ${textClass} p-4 w-56 flex-shrink-0`}
            >
              <div className="font-mono text-sm font-bold mb-1">{token}</div>
              <div className="font-mono text-xs mb-2">{hex}</div>
              <div className="font-body text-xs leading-relaxed">{usage}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Semantic Aliases ─────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-7xl text-black mb-6">Semantic Aliases</h2>
        <div className="flex flex-wrap gap-3">
          {semanticAliases.map(({ alias, resolves, role }) => (
            <div
              key={alias}
              className={`bg-${alias} p-4 w-52 flex-shrink-0 border border-black/10`}
            >
              <div className="font-mono text-xs font-bold mb-1 text-black mix-blend-multiply">
                --{alias}
              </div>
              <div className="font-mono text-xs text-black/60 mb-1">→ {resolves}</div>
              <div className="font-body text-xs text-black/70">{role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Type Families ────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-7xl text-black mb-6">Type Families</h2>
        <div className="space-y-8">
          <div>
            <div className="font-mono text-sm text-waveclash-yellow bg-waveclash-black inline-block px-2 py-0.5 mb-2">
              display — Archivo Black / weight 900
            </div>
            <div className="font-display text-8xl text-waveclash-cream bg-waveclash-black leading-tight px-4 py-2">
              WAVECLASH 2026
            </div>
          </div>
          <div>
            <div className="font-mono text-sm text-waveclash-yellow bg-waveclash-black inline-block px-2 py-0.5 mb-2">
              mono — JetBrains Mono / weight 400 · 500 · 700
            </div>
            <div className="bg-waveclash-sand px-4 py-3 space-y-1">
              <div className="font-mono text-base font-normal text-waveclash-black">
                weight 400 — NORTH SHORE / O&apos;AHU / PACIFIC
              </div>
              <div className="font-mono text-base font-medium text-waveclash-black">
                weight 500 — STOP #07 · PRIZE: $1.2M
              </div>
              <div className="font-mono text-base font-bold text-waveclash-black tracking-label-wider">
                weight 700 — ATHLETES · COUNTRIES · DAYS
              </div>
            </div>
          </div>
          <div>
            <div className="font-mono text-sm text-waveclash-yellow bg-waveclash-black inline-block px-2 py-0.5 mb-2">
              body — Inter / weight 500
            </div>
            <div className="font-body text-2xl font-medium text-waveclash-black bg-waveclash-sand px-4 py-3 leading-relaxed max-w-xl">
              Experience the world&apos;s most prestigious surfing championship.
              Ten stops. One champion. The ocean doesn&apos;t negotiate.
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Size Ladder ──────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-7xl text-black mb-6">Size Ladder</h2>
        <p className="font-mono text-sm text-waveclash-graphite bg-waveclash-sand px-3 py-1 mb-6 inline-block">
          Sizes under 40px shown on dark bg · Sizes 64px+ overflow intentionally
        </p>
        <div className="space-y-2">
          {sizeLadder.map(({ token, px, usage }) => (
            <div key={token} className="flex items-baseline gap-4 bg-waveclash-black px-4 py-2">
              <div className="font-mono text-xs text-waveclash-yellow w-24 flex-shrink-0">
                {token} · {px}px
              </div>
              <div
                className={`text-${token} font-display text-waveclash-cream leading-tight flex-1 overflow-hidden`}
              >
                Aa
              </div>
              <div className="font-mono text-xs text-waveclash-cream/50 text-right max-w-xs flex-shrink-0 hidden md:block">
                {usage}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Tracking Samples ─────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-7xl text-black mb-6">Tracking Samples</h2>
        <div className="space-y-4 bg-waveclash-black px-6 py-8">
          {trackingSamples.map(({ label, text, trackingClass, sizeClass, font }) => (
            <div key={label}>
              <div className="font-mono text-xs text-waveclash-yellow mb-1">{label}</div>
              <div className={`${font} ${sizeClass} ${trackingClass} text-waveclash-cream leading-tight`}>
                {text}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Badge Variants ───────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-7xl text-black mb-6">Badge Variants</h2>
        <p className="font-mono text-xs text-waveclash-graphite mb-4">
          All badges: JetBrains Mono · 10px · weight 700 · tracking +1.5px · padding 6px 12px · no border-radius
        </p>
        <div className="flex flex-wrap gap-4 items-start">
          {badges.map(({ label, bgClass, textClass, note }) => (
            <div key={label} className="space-y-2">
              <div
                className={`${bgClass} ${textClass} font-mono text-xs font-bold tracking-label-wider inline-block`}
                style={{ padding: "6px 12px" }}
              >
                {label}
              </div>
              {note && (
                <div className="font-mono text-xs text-waveclash-graphite max-w-40 leading-relaxed">
                  {note}
                </div>
              )}
            </div>
          ))}
          {/* FREESURF — same yellow as CULTURE, distinct label */}
          <div className="space-y-2">
            <div
              className="bg-waveclash-yellow text-waveclash-black font-mono text-xs font-bold tracking-label-wider inline-block"
              style={{ padding: "6px 12px" }}
            >
              FREESURF
            </div>
            <div className="font-mono text-xs text-waveclash-graphite max-w-40 leading-relaxed">
              Same yellow fill as CULTURE — different event type label
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
