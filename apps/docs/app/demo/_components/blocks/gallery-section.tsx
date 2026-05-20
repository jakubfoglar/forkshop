import Image from "next/image"
import { cn } from "@/lib/cn"
import { Button } from "../ui/button.js"

// Source node: u9A5Q2 (page 2, named "Gallery Section")
// 1440×1099px, bg-waveclash-black, padding [80, 60], gap 36, vertical layout
//
// Header row (u6SjgE): two-column justify-between
//   Left: section label (red mono 11px) + "FROM THE LINEUP." (180px Archivo, cream, tracking −6, leading 0.88)
//   Right: body copy (Inter 16px 500, cream) + "OPEN ARCHIVE" Button (primary, 360px col, node: aNz2W)
//
// Image mosaic (jmGB2): horizontal flex, gap 16
//   Left: single large 560×560px image (gxl0g) + rotated yellow timestamp badge ("DAY 03 / 06:42") top-left
//   Right column (HaLvX):
//     Top image (E7QL99, 272px tall)
//     Bottom split (P5Qfn, 272px): surf image left + PullQuote panel right (yJ2h6, red fill)
//       PullQuote: " glyph (Archivo Black 80px, leading 0.7), quote body (30px, tracking −0.5, leading 0.95),
//                  attribution row (JetBrains Mono 11px 700)
//
// PullQuote is block-internal — not a separate primitive.

export interface GallerySectionProps {
  sectionLabel?:   string
  sectionHeading?: string
  bodyText?:       string
  ctaLabel?:       string
  ctaHref?:        string
  quote?:          string
  quoteAttrib?:    string
  quoteSubAttrib?: string
  timestampLabel?: string
  /** Paths to the 3 mosaic image slots. Defaults to gallery-1..3 from /demo/ */
  images?: [string, string, string]
}

export function GallerySection({
  sectionLabel   = "[ 03 / DISPATCH ]",
  sectionHeading = "FROM THE\nLINEUP.",
  bodyText       = "Field notes, water shots, locker room thefts and the questionable decisions of athletes who paddled out before sunrise.",
  ctaLabel       = "OPEN ARCHIVE",
  ctaHref        = "#",
  quote          = "THIS REEF / EATS / HEROES.",
  quoteAttrib    = "— INDI WALKER",
  quoteSubAttrib = "WC/26",
  timestampLabel = "DAY 03 / 06:42",
  images         = ["/demo/gallery-1.jpg", "/demo/gallery-2.jpg", "/demo/gallery-3.jpg"],
}: GallerySectionProps) {
  return (
    <section
      className={cn(
        // Hidden on mobile and tablet — mosaic requires lg (1024px+) to be readable
        "hidden lg:flex flex-col gap-9",
        "w-full",
        "bg-waveclash-black",
        "px-[60px] py-20",
      )}
    >
      {/* Header row (u6SjgE): section info left, body+CTA right */}
      <div className="flex items-end justify-between gap-12">
        {/* Left: label + heading */}
        <div className="flex flex-col gap-2 flex-1">
          <span
            className={cn(
              "font-demo-mono text-wc-sm font-bold text-waveclash-red uppercase",
              "tracking-label-widest",
            )}
          >
            {sectionLabel}
          </span>

          {/* "FROM THE LINEUP." — 180px Archivo Black, tracking −6, leading 0.88
               Each \n segment is its own block-span (whiteSpace nowrap) so word-wrap
               cannot further split "FROM THE" onto a third line. */}
          <div
            className="font-display text-wc-display-sm text-waveclash-cream uppercase leading-dense"
            style={{ letterSpacing: "-0.03333em" }} // −6px at 180px
          >
            {sectionHeading.split("\n").map((line, i) => (
              <span key={i} style={{ display: "block", whiteSpace: "nowrap" }}>
                {line}
              </span>
            ))}
          </div>
        </div>

        {/* Right column (360px): body copy + CTA button */}
        <div className="w-[360px] shrink-0 flex flex-col gap-5 justify-end">
          <p
            className={cn(
              "font-body text-wc-2xl text-waveclash-cream leading-relaxed",
            )}
            style={{ fontWeight: 500 }}
          >
            {bodyText}
          </p>

          {/* "OPEN ARCHIVE" Button — primary wide (aNz2W) */}
          <a href={ctaHref} className="no-underline block">
            <Button variant="primary" width="wide">
              {ctaLabel}
            </Button>
          </a>
        </div>
      </div>

      {/* Image mosaic (jmGB2): horizontal flex, gap 16 */}
      <div className="flex gap-4">

        {/* Left: 560×560px large image (gxl0g) + timestamp badge */}
        <div className="relative shrink-0 overflow-hidden" style={{ width: 560, height: 560 }}>
          <Image
            src={images[0]}
            alt=""
            fill
            className="object-cover"
          />

          {/* Timestamp badge: rotated −6°, yellow bg, JetBrains Mono 12px 700 */}
          <div
            className={cn(
              "absolute top-4 left-4",
              "bg-waveclash-yellow text-waveclash-black",
              "font-demo-mono text-wc-base font-bold uppercase",
              "tracking-label-wide",
              "px-2 py-1",
            )}
            style={{ transform: "rotate(-6deg)", transformOrigin: "top left" }}
          >
            {timestampLabel}
          </div>
        </div>

        {/* Right column (HaLvX): flex-1, two rows stacked */}
        <div className="flex flex-col gap-4 flex-1">
          {/* Top image (E7QL99): 272px tall */}
          <div className="relative w-full overflow-hidden" style={{ height: 272 }}>
            <Image
              src={images[1]}
              alt=""
              fill
              className="object-cover"
            />
          </div>

          {/* Bottom split (P5Qfn): 272px — surf image left + pull-quote panel right */}
          <div className="flex gap-4" style={{ height: 272 }}>
            {/* Surf image left — half width */}
            <div className="relative flex-1 overflow-hidden">
              <Image
                src={images[2]}
                alt=""
                fill
                className="object-cover"
              />
            </div>

            {/* Pull-quote panel (yJ2h6): red fill, justify-between */}
            <div
              className={cn(
                "flex flex-col justify-between flex-1",
                "bg-waveclash-red",
                "p-5",
              )}
            >
              {/* Opening quotation mark: Archivo Black 80px, leading 0.7 */}
              <span
                className="font-display text-waveclash-black uppercase"
                style={{ fontSize: "80px", lineHeight: 0.7 }}
                aria-hidden
              >
                &#8220;
              </span>

              {/* Quote body: Archivo Black 30px, tracking −0.5, leading 0.95 */}
              <div
                className="font-display text-waveclash-black uppercase"
                style={{
                  fontSize:      "30px",
                  letterSpacing: "-0.01667em", // −0.5px at 30px
                  lineHeight:    0.95,
                }}
              >
                {quote}
              </div>

              {/* Attribution row: JetBrains Mono 11px 700 */}
              <div className="flex items-center justify-between">
                <span
                  className="font-demo-mono font-bold text-waveclash-black uppercase tracking-label-wide"
                  style={{ fontSize: "11px" }}
                >
                  {quoteAttrib}
                </span>
                <span
                  className="font-demo-mono font-bold text-waveclash-black uppercase tracking-label-wide"
                  style={{ fontSize: "11px" }}
                >
                  {quoteSubAttrib}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
