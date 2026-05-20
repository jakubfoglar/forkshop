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
  coordinates = "21°38'N / 158°03'W",
  swellData = "SWELL 12-18 FT",
  title = ["WAVE", "CLASH"],
  subtitleChampionship = "INTERNATIONAL SURF CHAMPIONSHIP",
  subtitleLocation = "BANZAI PIPELINE, HAWAI'I",
  subtitleDate = "MAR 14 — 23, 2026",
  stopNumber = "STOP #07",
  ctaPrimary = { label: "WATCH LIVE", href: "#" },
  ctaSecondary = { label: "BUY 7-DAY PASS", href: "#" },
  imageSrc = "/demo/hero.jpg",
  tickerItems = ["WAVECLASH/26", "PIPELINE, HAWAI'I", "MAR 14-23", "ENTER THE WATER"],
}: HeroProps) {
  return (
    <div className="relative w-full overflow-hidden bg-waveclash-black">
      {/* Background image / overlay */}
      <div className="relative w-full" style={{ minHeight: "600px" }}>
        {/* Background image */}
        <Image
          src={imageSrc}
          alt=""
          fill
          className="object-cover"
          priority
        />

        {/* 70% opacity overlay */}
        <div className="absolute inset-0 bg-waveclash-black/70" />

        {/* Inner content — padding matches [32, 32] source */}
        <div className="relative z-10 flex flex-col justify-between h-full px-8 py-8" style={{ minHeight: "600px" }}>

          {/* Top row: metadata left + coordinates right */}
          <div className="flex items-start justify-between">
            {/* Top-left: edition tag + location (Y0kyt) */}
            <div className="flex flex-col gap-1">
              <span
                className={cn(
                  "font-demo-mono text-sm font-bold text-waveclash-cream uppercase",
                  "tracking-label-widest",
                )}
              >
                {eyebrow}{editionTag ? ` — ${editionTag}` : ""}
              </span>
              <span
                className={cn(
                  "font-demo-mono text-xs font-bold text-waveclash-cream/60 uppercase",
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
                  "font-demo-mono text-sm font-bold text-waveclash-cream uppercase",
                  "tracking-label-wider",
                )}
              >
                {coordinates}
              </span>
              <span
                className={cn(
                  "font-demo-mono text-sm font-bold text-waveclash-yellow uppercase",
                  "tracking-label-wider",
                )}
              >
                {swellData}
              </span>
            </div>
          </div>

          {/* Center: display heading "WAVE / CLASH" stacked */}
          <div className="flex flex-col -mt-4" style={{ lineHeight: 0.85, letterSpacing: "-0.04286em" }}>
            <span
              className="font-display uppercase text-waveclash-cream"
              style={{ fontSize: "clamp(120px, 19.4vw, 280px)", lineHeight: 0.85, letterSpacing: "-0.04286em" }}
            >
              {title[0]}
            </span>
            <span
              className="font-display uppercase text-waveclash-red"
              style={{ fontSize: "clamp(120px, 19.4vw, 280px)", lineHeight: 0.85, letterSpacing: "-0.04286em", marginTop: "-0.05em" }}
            >
              {title[1]}
            </span>
          </div>

          {/* Bottom row: CTAs left + world-tour badge right */}
          <div className="flex items-end justify-between">
            {/* Bottom-left: two CTA buttons (X720Bm), 300px wide */}
            <div className="flex flex-col gap-2 w-[300px]">
              <a href={ctaPrimary.href} className="no-underline">
                <Button variant="primary" width="wide">{ctaPrimary.label}</Button>
              </a>
              <a href={ctaSecondary.href} className="no-underline">
                <Button variant="secondary" width="wide">{ctaSecondary.label}</Button>
              </a>
            </div>

            {/* Bottom-right: world-tour badge rotated −15° (ZGE9R) */}
            <div
              className={cn(
                "font-demo-mono text-sm font-bold text-waveclash-cream uppercase",
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

      {/* Subtitle bar — full-width, cream strokes 2px top+bottom (SRayU) */}
      <div
        className={cn(
          "w-full flex items-center justify-between",
          "border-t-2 border-b-2 border-waveclash-cream",
          "bg-waveclash-black/60 backdrop-blur-none",
          "px-8 py-4",
        )}
      >
        <span
          className={cn(
            "font-display text-3xl text-waveclash-cream uppercase",
            "tracking-label-wide",
          )}
        >
          {subtitleChampionship}
        </span>
        <span
          className={cn(
            "font-display text-3xl text-waveclash-cream uppercase",
            "tracking-label-wide",
          )}
        >
          {subtitleLocation}
        </span>
        <span
          className={cn(
            "font-display text-3xl text-waveclash-cream uppercase",
            "tracking-label-wide",
          )}
        >
          {subtitleDate}
        </span>
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
