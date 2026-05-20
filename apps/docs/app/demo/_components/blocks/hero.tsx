import Image from "next/image"
import { cn } from "@/lib/cn"
import { Button } from "../ui/button.js"
import { TickerBelt } from "../ui/ticker-belt.js"

// Source node: sUP7n (page 1), 1440×1100px, layout: none (absolute positioning)
// Full-bleed image + 70%-opacity black overlay
// Display type "WAVE" (cream) + "CLASH" (red), 280px Archivo Black, tracking −12, leading 0.85
// Top-left: edition/location metadata column (Y0kyt)
// Bottom-left: two CTA buttons stacked, 300px wide (X720Bm)
// Bottom-right: world-tour badge rotated −15° (ZGE9R)
// Subtitle bar at ~y=880, full-width cream strokes 2px top+bottom (SRayU)
// TickerBelt yellow at bottom (YmRZq)

export interface HeroProps {
  eyebrow?: string
  editionTag?: string
  locationLabel?: string
  coordinates?: string
  swellData?: string
  title?: [string, string] // ["WAVE", "CLASH"]
  subtitleChampionship?: string
  subtitleLocation?: string
  subtitleDate?: string
  stopNumber?: string
  ctaPrimary?: { label: string; href: string }
  ctaSecondary?: { label: string; href: string }
  /** Reserved for phase 1d — not wired yet; bg placeholder shown */
  imageSrc?: string
  tickerItems?: string[]
}

export function Hero({
  eyebrow = "EDITION N°26",
  editionTag,
  locationLabel = "NORTH SHORE / O'AHU / PACIFIC",
  coordinates = "21°39'N / 158°03'W",
  swellData = "SWELL 12-18 FT",
  title = ["WAVE", "CLASH"],
  subtitleChampionship: _subtitleChampionship = "INTERNATIONAL SURF CHAMPIONSHIP",
  subtitleLocation: _subtitleLocation = "BANZAI PIPELINE, HAWAI'I",
  subtitleDate: _subtitleDate = "MAR 14 — 23, 2026",
  stopNumber = "STOP #07",
  ctaPrimary = { label: "▶ WATCH LIVE", href: "#" },
  ctaSecondary = { label: "BUY 7-DAY PASS", href: "#" },
  imageSrc = "/demo/hero.jpg",
  tickerItems = ["WAVECLASH/26", "PIPELINE, HAWAI'I", "MAR 14-23", "ENTER THE WATER"],
}: HeroProps) {
  return (
    <div className="relative w-full overflow-hidden bg-waveclash-black">
      {/* Background image / overlay
          Mobile min-h 687px → tablet ~500px → desktop 1100px */}
      <div className="relative w-full min-h-[687px] md:min-h-[500px] lg:min-h-[1100px]">
        {/* Background image */}
        <Image
          src={imageSrc}
          alt=""
          fill
          className="object-cover"
          priority
        />

        {/* Gradient overlay: 40% at top → 75% at bottom for text contrast */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)" }}
        />

        {/* Inner content
            Mobile: px-4 py-8; tablet: px-6; desktop: px-8 py-8 */}
        <div
          className="relative z-10 flex flex-col justify-between h-full px-4 md:px-6 lg:px-8 py-8"
          style={{ minHeight: "inherit" }}
        >

          {/* Top row: metadata left + coordinates right
              Hidden on mobile — absent from mobile pencil frame; visible from lg */}
          <div className="hidden lg:flex items-start justify-between">
            {/* Top-left: edition tag + location (Y0kyt) */}
            <div className="flex flex-col gap-1">
              <span
                className={cn(
                  "font-demo-mono text-wc-sm font-bold text-waveclash-cream uppercase",
                  "tracking-label-widest",
                )}
              >
                {eyebrow}{editionTag ? ` — ${editionTag}` : ""}
              </span>
              <span
                className={cn(
                  "font-demo-mono text-wc-xs font-bold text-waveclash-cream/60 uppercase",
                  "tracking-label-wider",
                )}
              >
                {locationLabel}
              </span>
            </div>

            {/* Top-right: coordinates + swell (Y1jk79) */}
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "font-demo-mono text-wc-sm font-bold text-waveclash-cream uppercase",
                  "tracking-label-wider",
                )}
              >
                {coordinates}
              </span>
              <span
                className={cn(
                  "font-demo-mono text-wc-sm font-bold text-waveclash-yellow uppercase",
                  "tracking-label-wider",
                )}
              >
                {swellData}
              </span>
            </div>
          </div>

          {/* Mobile-only: spacer that pushes heading down from top */}
          <div className="lg:hidden flex-1" />

          {/* Center: display heading "WAVE / CLASH" stacked
              Mobile: 96px; tablet (md): ~140px; desktop (lg): 280px
              wc-10xl=80px, no exact 96px token — use clamp: 96px→140px→280px */}
          <div className="flex flex-col">
            <span
              className="font-display uppercase text-waveclash-cream"
              style={{
                fontSize: "clamp(96px, 18.2vw, 280px)",
                lineHeight: 0.85,
                letterSpacing: "-0.04286em",
              }}
            >
              {title[0]}
            </span>
            <span
              className="font-display uppercase text-waveclash-red"
              style={{
                fontSize: "clamp(96px, 18.2vw, 280px)",
                lineHeight: 0.85,
                letterSpacing: "-0.04286em",
                marginTop: "-0.05em",
              }}
            >
              {title[1]}
            </span>
          </div>

          {/* Bottom row: CTAs left + world-tour badge right
              Mobile: full-width stacked buttons (flex-col w-full)
              Desktop (lg): 300px-wide column, justify-between with badge */}
          <div className="flex items-end justify-between mt-8 lg:mt-12">
            {/* CTA buttons
                Mobile: full-width stacked; lg: 300px column */}
            <div className="flex flex-col gap-2 w-full lg:w-[300px]">
              <a href={ctaPrimary.href} className="no-underline">
                <Button variant="primary" width="wide">{ctaPrimary.label}</Button>
              </a>
              <a href={ctaSecondary.href} className="no-underline">
                <Button variant="secondary" width="wide">{ctaSecondary.label}</Button>
              </a>
            </div>

            {/* Bottom-right: world-tour badge rotated −15° (ZGE9R)
                Hidden on mobile (no room alongside full-width CTAs) */}
            <div
              className={cn(
                "hidden lg:block",
                "font-demo-mono text-wc-sm font-bold text-waveclash-cream uppercase",
                "tracking-label-widest",
                "border-[3px] border-waveclash-yellow px-4 py-2",
              )}
              style={{ transform: "rotate(-15deg)", transformOrigin: "center" }}
            >
              ★ WORLD TOUR<br />
              <span className="text-waveclash-yellow">{stopNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TickerBelt — yellow, 28px Archivo Black, ◆ separator (YmRZq) */}
      <TickerBelt
        fill="yellow"
        separator="◆"
        size="lg"
        items={tickerItems}
      />
    </div>
  )
}
