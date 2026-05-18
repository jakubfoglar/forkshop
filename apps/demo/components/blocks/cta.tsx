import { Button } from "@/components/ui/button"

export interface CTAProps {
  title?: string
  description?: string
  ctaLabel?: string
}

export function CTA({
  title = "Stop guessing. Start shipping.",
  description = "Forkshop turns your components into a live canvas — edit copy, swap variants, and watch changes land in your codebase instantly.",
  ctaLabel = "Launch the canvas",
}: CTAProps) {
  return (
    <section className="bg-gray-900 py-20 text-white">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-3 text-3xl font-semibold">{title}</h2>
        <p className="mb-8 text-lg text-gray-300">{description}</p>
        <Button variant="subtle">{ctaLabel}</Button>
      </div>
    </section>
  )
}
