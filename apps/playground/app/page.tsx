import Link from "next/link"
import { Hero } from "@/components/blocks/hero"
import { FeatureRow } from "@/components/blocks/feature-row"
import { CTABand } from "@/components/blocks/cta-band"

export default function Home() {
  return (
    <main>
      <nav className="flex items-center justify-between border-b border-forkshop-border px-8 py-4">
        <span className="font-semibold">Acme</span>
        <Link href="/forkshop" className="text-sm underline">
          Open /forkshop
        </Link>
      </nav>
      <Hero
        headline="Ship better software, faster"
        subhead="Acme is the easiest way to plan, build, and ship — all in one place."
        cta="Start free"
      />
      <FeatureRow
        title="One workspace for the whole team"
        body="Designers, engineers, and PMs work in the same canvas. No more screenshot-driven meetings."
      />
      <FeatureRow
        title="Built for the long haul"
        body="Acme grows with you. Start with a single project, scale to thousands without rewiring anything."
      />
      <CTABand text="Try Acme free for 30 days." />
    </main>
  )
}
