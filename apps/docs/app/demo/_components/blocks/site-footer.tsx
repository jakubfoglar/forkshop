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
  { label: "LOCATION",  value: "BANZAI PIPELINE, NORTH SHORE" },
  { label: "DATES",     value: "MAR 14 — 23, 2026" },
  { label: "FORMAT",    value: "SINGLE ELIMINATION" },
  { label: "BROADCAST", value: "WAVECLASH.TV / GLOBAL STREAM" },
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
  footerHeading = "SEE YOU IN\nTHE WATER.",
  navLinks = DEFAULT_LEGAL_LINKS,
  socialLinks = DEFAULT_SOCIAL_LINKS,
}: SiteFooterProps) {
  return (
    <footer className="w-full bg-waveclash-black flex flex-col">

      {/* 1. TickerBelt (SZ1De): yellow fill, ★ separator, 22px text, padding [18, 60] */}
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

      {/* 2. Main footer body (JjLvR) */}
      <div
        className={cn(
          "flex flex-col gap-[60px]",
          "px-[60px] pt-20 pb-10",
        )}
      >
        {/* Upper block (AbA2k): left = heading + info table; right = newsletter panel */}
        <div className="flex justify-between gap-12">

          {/* Left: "SEE YOU IN THE WATER." + info table */}
          <div className="flex flex-col gap-8 flex-1">
            {/* Display heading: 180px Archivo Black, cream, tracking −6, leading 0.85 */}
            <div>
              {footerHeading.split("\n").map((line, i) => (
                <div
                  key={i}
                  className="font-display text-display-sm text-waveclash-cream uppercase"
                  style={{
                    letterSpacing: "-0.03333em", // −6px at 180px
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
                        "font-demo-mono text-sm font-bold text-waveclash-cream uppercase",
                        "tracking-label-widest",
                      )}
                    >
                      {row.label}
                    </span>
                    <span
                      className={cn(
                        "font-display text-md text-waveclash-cream uppercase",
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

          {/* Right: newsletter panel (v34XF, 420px) */}
          <div className="w-[420px] shrink-0 flex flex-col gap-5">
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
              className="font-body text-2xl text-waveclash-cream leading-relaxed"
              style={{ fontWeight: 500 }}
            >
              Weekly dispatch from the water&apos;s edge. Conditions, competition news, athlete notes, and zero filler.
            </p>

            {/* Email input placeholder (Phase 1e will wire this up) */}
            <div
              className={cn(
                "border border-waveclash-cream",
                "px-4 py-3",
                "font-demo-mono text-sm text-waveclash-cream/40 font-bold uppercase tracking-label-wide",
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

        {/* Lower nav block (bEIdb): 5-column link nav */}
        <div className="flex justify-between gap-8">
          {DEFAULT_NAV_COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              {/* Column heading: red Archivo Black 13px */}
              <span
                className={cn(
                  "font-display text-md text-waveclash-red uppercase",
                  "tracking-label-normal",
                )}
              >
                {col.heading}
              </span>

              {/* Links: Inter 14px 500, cream */}
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className={cn(
                    "font-body text-lg text-waveclash-cream no-underline",
                  )}
                  style={{ fontWeight: 500 }}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Legal bar (L8Rv2t): 1px cream top-border, padding [24, 60], justify-between */}
      <div
        className={cn(
          "flex items-center justify-between",
          "border-t border-waveclash-cream",
          "px-[60px] py-6",
        )}
      >
        {/* Left: logo wordmark + copyright */}
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "font-display text-4xl text-waveclash-cream uppercase",
              "tracking-label-normal",
            )}
          >
            WAVECLASH///
          </span>
          <span
            className={cn(
              "font-demo-mono text-base font-bold text-waveclash-cream/60 uppercase",
              "tracking-label-wide",
            )}
            style={{ fontSize: "12px", fontWeight: 500 }}
          >
            © 2026 WAVECLASH. ALL RIGHTS RESERVED.
          </span>
        </div>

        {/* Right: legal links + social links — JetBrains Mono 12px 500, tracking +1 */}
        <div className="flex items-center gap-6">
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

          <div className="w-px h-4 bg-waveclash-cream/30" />

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
