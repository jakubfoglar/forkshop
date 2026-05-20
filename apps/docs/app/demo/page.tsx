// Phase 1b: Primitives gallery.
// Phase 1c: Blocks gallery (appended below primitives).
// A brief color-swatch row at the top lets us confirm token drift at a glance.
// The bulk of the page shows every variant/size combination of each primitive.

import { Button } from "./_components/ui/button.js"
import { Badge } from "./_components/ui/badge.js"
import { StatCounter } from "./_components/ui/stat-counter.js"
import { SectionHeadingRow } from "./_components/ui/section-heading-row.js"
import { ProfileLink } from "./_components/ui/profile-link.js"
import { TickerBelt } from "./_components/ui/ticker-belt.js"

import { SiteHeader, Hero, StatsBelt, AboutCallout, EventSchedule, SurferGrid, GallerySection, SponsorStrip, CtaBuyPass } from "./_components/blocks/index.js"

// ── Swatch data (kept brief — one row per brand primitive) ────────────────────
const brandColors = [
  { token: "waveclash-black",    hex: "#0a0a0a", textClass: "text-waveclash-cream" },
  { token: "waveclash-graphite", hex: "#1a1a1a", textClass: "text-waveclash-cream" },
  { token: "waveclash-cream",    hex: "#faf7ef", textClass: "text-waveclash-black" },
  { token: "waveclash-red",      hex: "#ff4a1c", textClass: "text-waveclash-black" },
  { token: "waveclash-yellow",   hex: "#ffd60a", textClass: "text-waveclash-black" },
  { token: "waveclash-sand",     hex: "#f2ede3", textClass: "text-waveclash-black" },
  { token: "waveclash-navy",     hex: "#00355c", textClass: "text-waveclash-cream" },
] as const

// ── Section label helper ──────────────────────────────────────────────────────
function GalleryLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-demo-mono text-sm font-bold uppercase tracking-label-widest text-waveclash-red mb-4">
      {children}
    </h2>
  )
}

function Divider() {
  return <hr className="border-waveclash-cream/20 my-12" />
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DemoPage() {
  return (
    <main className="min-h-screen p-8 space-y-12">

      {/* ── 0. Token sanity: brand color swatches (keep for drift detection) ── */}
      <section>
        <GalleryLabel>Brand Colors — token sanity</GalleryLabel>
        <div className="flex flex-wrap gap-2">
          {brandColors.map(({ token, hex, textClass }) => (
            <div
              key={token}
              className={`bg-${token} ${textClass} px-3 py-2 flex-shrink-0`}
            >
              <div className="font-demo-mono text-xs font-bold">{token}</div>
              <div className="font-demo-mono text-xs opacity-60">{hex}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── 1. TickerBelt ────────────────────────────────────────────────────── */}
      <section>
        <GalleryLabel>TickerBelt</GalleryLabel>

        <div className="space-y-2">
          {/* Yellow — hero instance (◆ diamond separator, wider text) */}
          <div>
            <div className="font-demo-mono text-xs text-waveclash-cream/50 mb-1">
              fill=&quot;yellow&quot; — separator=&quot;◆&quot; (hero instance, source: YmRZq)
            </div>
            <TickerBelt
              fill="yellow"
              separator="◆"
              items={["SURF", "WAVECLASH 26", "PIPELINE", "MAR 14-23", "SURF"]}
            />
          </div>

          {/* Black — footer instance (★ star separator, smaller text) */}
          <div>
            <div className="font-demo-mono text-xs text-waveclash-cream/50 mb-1">
              fill=&quot;black&quot; — separator=&quot;★&quot; (footer instance, source: SZ1De)
            </div>
            <TickerBelt
              fill="black"
              separator="★"
              items={["WAVECLASH/26 — PIPELINE, HAWAI'I — MAR 14/23 — ENTER THE WATER —"]}
            />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── 2. Badge ─────────────────────────────────────────────────────────── */}
      <section>
        <GalleryLabel>Badge</GalleryLabel>

        <div className="space-y-6">
          {/* Desktop size (default) */}
          <div>
            <div className="font-demo-mono text-xs text-waveclash-cream/50 mb-3">
              size=&quot;md&quot; — 10px, padding [6,12] (source: iIHE3, o70xu, gHqrV, YV0Rp)
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge fill="yellow">CULTURE</Badge>
              <Badge fill="yellow">FREESURF</Badge>
              <Badge fill="red">COMPETITION</Badge>
              <Badge fill="navy">PREMIER</Badge>
              <Badge fill="black">FINAL</Badge>
            </div>
          </div>

          {/* Mobile size */}
          <div>
            <div className="font-demo-mono text-xs text-waveclash-cream/50 mb-3">
              size=&quot;sm&quot; — 9px, padding [3,6] (source: E4oqDr mobile variants)
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge fill="yellow" size="sm">CULTURE</Badge>
              <Badge fill="yellow" size="sm">FREESURF</Badge>
              <Badge fill="red" size="sm">COMPETITION</Badge>
              <Badge fill="navy" size="sm">PREMIER</Badge>
              <Badge fill="black" size="sm">FINAL</Badge>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── 3. ProfileLink ───────────────────────────────────────────────────── */}
      <section>
        <GalleryLabel>ProfileLink</GalleryLabel>
        <div className="font-demo-mono text-xs text-waveclash-cream/50 mb-3">
          JetBrains Mono 11px bold red, gap 6px, → arrow (source: Y1YAER, yo8d4)
        </div>
        <div className="flex flex-wrap gap-6">
          <ProfileLink href="#">Profile</ProfileLink>
          <ProfileLink href="#">Gabriel Medina</ProfileLink>
          <ProfileLink href="#">View All Athletes</ProfileLink>
        </div>
      </section>

      <Divider />

      {/* ── 4. StatCounter ───────────────────────────────────────────────────── */}
      <section>
        <GalleryLabel>StatCounter</GalleryLabel>
        <div className="font-demo-mono text-xs text-waveclash-cream/50 mb-3">
          Archivo Black 64px / JetBrains Mono 11px bold red label (source: Nc0i9, F0N5N)
        </div>

        {/* Default (black bg) */}
        <div className="mb-2 font-demo-mono text-xs text-waveclash-cream/50">highlight=false (default)</div>
        <div className="flex flex-wrap gap-px mb-6">
          <StatCounter value="64" label="Athletes" />
          <StatCounter value="23" label="Countries" />
          <StatCounter value="10" label="Days" />
          <StatCounter value="$1.2M" label="Prize" />
        </div>

        {/* Highlight (red bg) */}
        <div className="mb-2 font-demo-mono text-xs text-waveclash-cream/50">highlight=true (COUNTRIES cell variant, source: F0N5N)</div>
        <div className="flex flex-wrap gap-px">
          <StatCounter value="64" label="Athletes" />
          <StatCounter value="23" label="Countries" highlight />
          <StatCounter value="10" label="Days" />
          <StatCounter value="$1.2M" label="Prize" />
        </div>
      </section>

      <Divider />

      {/* ── 5. SectionHeadingRow ─────────────────────────────────────────────── */}
      <section>
        <GalleryLabel>SectionHeadingRow</GalleryLabel>

        {/* size="lg" — 72px heading (EVENT / SCHEDULE) */}
        <div className="mb-2 font-demo-mono text-xs text-waveclash-cream/50">
          size=&quot;lg&quot; — 72px (source: dmqgc)
        </div>
        <div className="bg-waveclash-sand px-8 py-6 mb-8">
          <SectionHeadingRow
            eyebrow="// 003"
            title="EVENT / SCHEDULE"
            size="lg"
            metadata={
              <>
                <span className="text-waveclash-black">TEN DAYS</span>
                <span className="text-waveclash-red">OF CARNAGE</span>
              </>
            }
          />
        </div>

        {/* size="xl" — 180px heading (MEET THE SURFERS.) */}
        <div className="mb-2 font-demo-mono text-xs text-waveclash-cream/50">
          size=&quot;xl&quot; — 180px (source: anKrW) — overflow intentional at this width
        </div>
        <div className="bg-waveclash-sand px-8 py-6 overflow-hidden">
          <SectionHeadingRow
            eyebrow="#02 / ROSTER"
            title="MEET THE SURFERS."
            size="xl"
          />
        </div>
      </section>

      <Divider />

      {/* ── 6. Button ────────────────────────────────────────────────────────── */}
      <section>
        <GalleryLabel>Button</GalleryLabel>

        {/* Compact variants */}
        <div className="mb-2 font-demo-mono text-xs text-waveclash-cream/50">
          width=&quot;compact&quot; — intrinsic width (source: i9Ino nav, ff1pZ athletes)
        </div>
        <div className="flex flex-wrap gap-3 mb-8">
          <Button variant="primary" width="compact">GET PASS</Button>
          <Button variant="secondary" width="compact">BUY 7-DAY PASS</Button>
          <Button variant="ghost" width="compact">ALL ATHLETES</Button>
        </div>

        {/* Wide variants — shown in constrained containers to simulate fill_container */}
        <div className="mb-2 font-demo-mono text-xs text-waveclash-cream/50">
          width=&quot;wide&quot; — fill container (source: xm0Gd hero, y5PC1 ticket, rE6Uq ticket)
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <Button variant="primary" width="wide">WATCH LIVE</Button>
          <Button variant="secondary" width="wide">BUY 7-DAY PASS</Button>
          <Button variant="ghost" width="wide">BUY DAY PASS</Button>
        </div>
      </section>

      <Divider />

      {/* ── Blocks (Part 1) ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-demo-mono uppercase text-sm tracking-label-wider mb-4 mt-16 text-waveclash-red font-bold">
          Blocks (Part 1)
        </h2>

        <div className="space-y-12">
          <GalleryItem label="SiteHeader (source: LEYsk)">
            <SiteHeader />
          </GalleryItem>

          <GalleryItem label="Hero (source: sUP7n)">
            <Hero />
          </GalleryItem>

          <GalleryItem label="StatsBelt (source: fi42O)">
            <StatsBelt />
          </GalleryItem>

          <GalleryItem label="AboutCallout (source: ThXku)">
            <AboutCallout />
          </GalleryItem>

          <GalleryItem label="EventSchedule (source: WRu0j)">
            <EventSchedule />
          </GalleryItem>
        </div>
      </section>

      {/* ── Blocks (Part 2) ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-demo-mono uppercase text-sm tracking-label-wider mb-4 mt-16 text-waveclash-red font-bold">
          Blocks (Part 2)
        </h2>

        <div className="space-y-12">
          <GalleryItem label="SurferGrid (source: C7T9Cw)">
            <SurferGrid />
          </GalleryItem>

          <GalleryItem label="GallerySection (source: u9A5Q2)">
            <GallerySection />
          </GalleryItem>

          <GalleryItem label="SponsorStrip (source: u9wUYn)">
            <SponsorStrip />
          </GalleryItem>

          <GalleryItem label="CtaBuyPass (source: lHnti)">
            <CtaBuyPass />
          </GalleryItem>
        </div>
      </section>

    </main>
  )
}

// ── Gallery helpers ───────────────────────────────────────────────────────────
function GalleryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-demo-mono uppercase text-xs text-waveclash-graphite mb-2">{label}</div>
      <div className="border border-waveclash-graphite overflow-hidden">{children}</div>
    </div>
  )
}
