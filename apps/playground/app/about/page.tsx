import { FeatureRow } from "@/components/blocks/feature-row"
import { CTABand } from "@/components/blocks/cta-band"

export default function About() {
  return (
    <main>
      <section className="px-8 py-16">
        <h1 className="text-4xl font-bold">About Acme</h1>
        <p className="mt-4 max-w-2xl text-forkshop-fg-muted">
          We&apos;re a small team building tools that help product teams ship better
          software. Founded in 2024, we&apos;re backed by the people we wish we&apos;d
          had as customers ten years ago.
        </p>
      </section>
      <FeatureRow
        title="Customer obsession"
        body="Every roadmap decision starts with a customer conversation. Nothing ships without their feedback."
      />
      <FeatureRow
        title="Bias for clarity"
        body="We write things down. We share early. We don&apos;t let work get lost in DMs."
      />
      <FeatureRow
        title="Long-term thinking"
        body="We say no to things that don&apos;t compound. Quality over quantity, always."
      />
      <CTABand text="Want to work with us?" />
    </main>
  )
}
