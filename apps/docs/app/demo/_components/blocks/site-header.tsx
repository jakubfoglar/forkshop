import { cn } from "@/lib/cn"
import { Button } from "../ui/button.js"

// Source node: LEYsk (page 1)
// Layout: full-width 80px, bg-waveclash-black, padding [0,32]
// Three-column flex: logo+"LIVE 24/7" pill | 5 nav links | GET PASS button
// Bottom border: 2px solid waveclash-red

const DEFAULT_NAV_LINKS = [
  { label: "EVENT",    href: "#" },
  { label: "ATHLETES", href: "#" },
  { label: "SCHEDULE", href: "#" },
  { label: "TICKETS",  href: "#" },
  { label: "JOURNAL",  href: "#" },
]

export interface SiteHeaderProps {
  currentPath?: string
  navLinks?: Array<{ label: string; href: string }>
  ctaLabel?: string
  ctaHref?: string
}

export function SiteHeader({
  currentPath,
  navLinks = DEFAULT_NAV_LINKS,
  ctaLabel = "GET PASS",
  ctaHref = "#",
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "w-full flex items-center justify-between",
        "bg-waveclash-black border-b-2 border-waveclash-red",
        "px-8 h-20",
      )}
    >
      {/* Left: wordmark + LIVE 24/7 pill */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          className={cn(
            "font-display text-wc-5xl text-waveclash-cream uppercase",
            "tracking-[-0.02083em]", // −0.5px @ 24px
            "leading-none no-underline",
          )}
        >
          WAVECLASH///
        </a>

        {/* LIVE 24/7 pill — graphite fill, red stroke, red dot, node: iweyU */}
        <span
          className={cn(
            "flex items-center gap-2",
            "font-demo-mono text-wc-xs font-bold text-waveclash-cream uppercase",
            "tracking-label-wider",
            "bg-waveclash-graphite border border-waveclash-red",
            "px-2 py-1",
          )}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-waveclash-red" aria-hidden />
          LIVE 24/7
        </span>
      </div>

      {/* Center: nav links */}
      <nav className="flex items-center gap-8">
        {navLinks.map(({ label, href }) => {
          const isActive = currentPath === href
          return (
            <a
              key={label}
              href={href}
              className={cn(
                "font-demo-mono text-wc-base font-bold text-waveclash-cream uppercase",
                "tracking-label-wider no-underline",
                isActive && "text-waveclash-red",
              )}
            >
              {label}
            </a>
          )
        })}
      </nav>

      {/* Right: CTA button */}
      <a href={ctaHref} className="no-underline">
        <Button variant="primary" width="compact">
          {ctaLabel}
        </Button>
      </a>
    </header>
  )
}
