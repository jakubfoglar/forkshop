import { Hero } from "@/components/blocks/hero"
import { FeatureGrid } from "@/components/blocks/feature-grid"
import { CTA } from "@/components/blocks/cta"

export default function HomePage() {
  return (
    <main>
      <Hero />
      <FeatureGrid />
      <CTA />
    </main>
  )
}
