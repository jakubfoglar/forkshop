import { cn } from "@/lib/cn"
import { TickerBelt } from "../ui/ticker-belt.js"
import { Button } from "../ui/button.js"

// Source node: wUBEW (page 2, named "Footer")
// Full-width, 966px tall, bg-waveclash-black, vertical layout
//
// 1. TickerBelt (SZ1De, 63px) — yellow fill, 22px Archivo Black, ★ red separator,
//    padding [18, 60], tracking +1.5
//
// 2. Main footer body (JjLvR, 831px):
//    bg-waveclash-black, padding [80, 60, 40, 60], gap 60, vertical layout
//    Upper block (AbA2k): two-column justify-between
//      Left: 180px heading "SEE YOU IN THE WATER." (Archivo Black, cream, tracking −6, leading 0.85)
//            + info-table sub-block (same structure as AboutCallout's K9ujIn)
//      Right (v34XF, 420px): newsletter panel
//        "[ DISPATCH / WEEKLY ]" label (yellow JetBrains Mono 11px 700)
//        body copy (Inter 16px 500, cream)
//        email input placeholder + subscribe Button (primary, node: aaCxQ)
//        4 social tag pills (cream 1px stroke)
//    1px cream rule (iSZeI)
//    Lower nav block (bEIdb): 5-column link nav
//      Each column: red Archivo Black 13px category name + 4 Inter 14px 500 cream links
//
// 3. Legal bar (L8Rv2t, 72px):
//    padding [24, 60], 1px cream top-border, justify-between
//    Left: logo (Archivo Black 22px) + copyright mono text
//    Right: legal links + social links (INSTAGRAM ↗, YOUTUBE ↗), JetBrains Mono 12px 500 tracking +1

const DEFAULT_INFO_ROWS = [
  { label: "LOCATION",  value: "BANZAI PIPELINE / O'AHU" },
  { label: "DATES",     value: "MAR 14 — MAR 23, 2026" },
  { label: "FORMAT",    value: "4 ROUNDS / DBL ELIM" },
  { label: "BROADCAST", value: "WSL+ / WAVECLASH.TV" },
]

const DEFAULT_NAV_COLUMNS = [
  { heading: "EVENT",    links: ["Overview", "Schedule", "Venue", "Broadcast"] },
  { heading: "TICKETS",  links: ["Day Pass", "7-Day Pass", "All-In Pass", "Group Bookings"] },
  { heading: "ATHLETES", links: ["Roster", "Rankings", "Heat Draw", "Stats"] },
  { heading: "MEDIA",    links: ["Gallery", "Film Archive", "Press Kit", "Accreditation"] },
  { heading: "CONTACT",  links: ["General", "Press", "Partnerships", "Support"] },
]

const DEFAULT_LEGAL_LINKS = [
  { label: "TERMS",         href: "#" },
  { label: "PRIVACY",       href: "#" },
  { label: "ACCESSIBILITY", href: "#" },
]

const DEFAULT_SOCIAL_LINKS = [
  { label: "INSTAGRAM ↗", href: "#" },
  { label: "YOUTUBE ↗",   href: "#" },
]

const DEFAULT_SOCIAL_TAGS = [
  "#WAVECLASH",
  "#PIPELINE",
  "#WCTOUR",
  "#SURFING",
]

export interface FooterNavLink {
  label: string
  href: string
}

export interface SiteFooterProps {
  footerHeading?:   string
  navLinks?:        FooterNavLink[]
  socialLinks?:     FooterNavLink[]
}

export function SiteFooter({
  footerHeading = "SEE YOU\nIN THE\nWATER.",
  navLinks = DEFAULT_LEGAL_LINKS,
  socialLinks = DEFAULT_SOCIAL_LINKS,
}: SiteFooterProps) {
  return (
    <footer className="w-full bg-waveclash-black flex flex-col" data-forkshop-block="site-footer">

      {/* 1. TickerBelt (SZ1De): absent on mobile, present from md+ */}
      <div className="hidden md:block">
        <TickerBelt
          fill="yellow"
          separator="★"
          size="md"
          items={[
            "WAVECLASH/26 — PIPELINE, HAWAI'I — MAR 14/23",
            "ENTER THE WATER",
            "WAVECLASH/26 — PIPELINE, HAWAI'I — MAR 14/23",
            "ENTER THE WATER",
          ]}
          className="px-[60px]"
        />
      </div>

      {/* 2. Main footer body (JjLvR) */}
      <div
        className={cn(
          "flex flex-col gap-10 lg:gap-[60px]",
          // Mobile: tight padding; tablet: medium; desktop: full
          "px-5 pt-10 pb-8 md:px-8 md:pt-12 lg:px-[60px] lg:pt-20 lg:pb-10",
        )}
      >
        {/* Upper block (AbA2k): stacked on mobile/tablet, side-by-side on desktop */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-10 lg:gap-12">

          {/* Left: "SEE YOU IN THE WATER." + info table */}
          <div className="flex flex-col gap-8 flex-1">
            {/* Display heading: 64px mobile → 96px tablet → 180px desktop */}
            <div>
              {footerHeading.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "font-display text-wc-8xl md:text-wc-11xl lg:text-wc-display-sm text-waveclash-cream uppercase",
                    // last line ("WATER.") is red
                    i === 2 && "text-waveclash-red",
                  )}
                  style={{
                    letterSpacing: "-0.03333em",
                    lineHeight:    0.85,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>

            {/* Info table — same structure as AboutCallout's K9ujIn */}
            <div className="flex flex-col border-t-2 border-waveclash-cream mt-2 max-w-lg">
              {DEFAULT_INFO_ROWS.map((row, i) => {
                const isLast = i === DEFAULT_INFO_ROWS.length - 1
                return (
                  <div
                    key={row.label}
                    className={cn(
                      "flex items-center justify-between py-3",
                      !isLast && "border-b border-waveclash-cream",
                    )}
                  >
                    <span
                      className={cn(
                        "font-demo-mono text-wc-sm font-bold text-waveclash-cream uppercase",
                        "tracking-label-widest",
                      )}
                    >
                      {row.label}
                    </span>
                    <span
                      className={cn(
                        "font-display text-wc-md text-waveclash-cream uppercase",
                        "tracking-label-normal",
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: newsletter panel — full-width mobile/tablet, 420px desktop */}
          <div className="w-full lg:w-[420px] lg:shrink-0 flex flex-col gap-5">
            {/* "[ DISPATCH / WEEKLY ]" — yellow JetBrains Mono 11px 700 */}
            <span
              className={cn(
                "font-demo-mono font-bold text-waveclash-yellow uppercase",
                "tracking-label-widest",
              )}
              style={{ fontSize: "11px" }}
            >
              [ DISPATCH / WEEKLY ]
            </span>

            {/* Body copy — Inter 16px 500, cream */}
            <p
              className="font-body text-wc-2xl text-waveclash-cream leading-relaxed"
              style={{ fontWeight: 500 }}
            >
              Weekly dispatch from the water&apos;s edge. Conditions, competition news, athlete notes, and zero filler.
            </p>

            {/* Email input placeholder */}
            <div
              className={cn(
                "border border-waveclash-cream",
                "px-4 py-3",
                "font-demo-mono text-wc-sm text-waveclash-cream/40 font-bold uppercase tracking-label-wide",
              )}
            >
              YOUR@EMAIL.COM
            </div>

            {/* Subscribe button (aaCxQ) — primary wide */}
            <Button variant="primary" width="wide">
              SUBSCRIBE
            </Button>

            {/* Social tag pills — 4 pills, cream 1px stroke */}
            <div className="flex flex-wrap gap-2 mt-2">
              {DEFAULT_SOCIAL_TAGS.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "font-demo-mono font-bold text-waveclash-cream uppercase",
                    "border border-waveclash-cream",
                    "px-3 py-1",
                    "tracking-label-wide",
                  )}
                  style={{ fontSize: "11px" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 1px cream rule (iSZeI) */}
        <div className="border-t border-waveclash-cream" />

        {/* Lower nav block (bEIdb):
            Mobile: 2-col grid, top-level headings only (no child links)
            Tablet: 3-col grid, top-level headings only
            Desktop: 5-col flex with child links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:justify-between gap-6 lg:gap-8">
          {DEFAULT_NAV_COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              {/* Column heading: Archivo Black 18px mobile → 13px desktop (red) */}
              <span
                className={cn(
                  "font-display text-wc-3xl lg:text-wc-md text-waveclash-red uppercase",
                  "tracking-label-normal",
                )}
              >
                {col.heading}
              </span>

              {/* Child links — hidden on mobile/tablet, visible on desktop */}
              <div className="hidden lg:flex flex-col gap-3">
                {col.links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    className={cn(
                      "font-body text-wc-lg text-waveclash-cream no-underline",
                    )}
                    style={{ fontWeight: 500 }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Legal bar (L8Rv2t): 1px cream top-border, responsive padding */}
      <div
        className={cn(
          "flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
          "border-t border-waveclash-cream",
          "px-5 py-5 md:px-8 md:py-6 lg:px-[60px]",
        )}
      >
        {/* Left: logo wordmark + copyright */}
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "font-display text-wc-4xl text-waveclash-cream uppercase",
              "tracking-label-normal",
            )}
          >
            WAVECLASH///
          </span>
          <span
            className={cn(
              "font-demo-mono text-wc-base font-bold text-waveclash-cream/60 uppercase",
              "tracking-label-wide",
            )}
            style={{ fontSize: "12px", fontWeight: 500 }}
          >
            © 2026 — ALL RIGHTS / NO RESERVES
          </span>
        </div>

        {/* Right: legal links + social links — JetBrains Mono 12px 500, tracking +1 */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={cn(
                "font-demo-mono text-waveclash-cream no-underline uppercase",
                "tracking-label-wide",
              )}
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              {label}
            </a>
          ))}

          <div className="w-px h-4 bg-waveclash-cream/30 hidden md:block" />

          {socialLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={cn(
                "font-demo-mono text-waveclash-cream no-underline uppercase",
                "tracking-label-wide",
              )}
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
