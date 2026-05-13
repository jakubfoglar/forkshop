import { Hero } from "@/components/blocks/hero"
import { FeatureRow } from "@/components/blocks/feature-row"
import { CTABand } from "@/components/blocks/cta-band"

export default function SampleHome() {
  return (
    <main>
      <Hero />
      <FeatureRow
        title="One canvas, real components"
        body="Edit text inline. Drag to reposition. Open source in your editor."
      />
      <FeatureRow
        title="Live AI awareness"
        body="See what Claude is editing, in real time, across pages."
      />
      <CTABand />
    </main>
  )
}
