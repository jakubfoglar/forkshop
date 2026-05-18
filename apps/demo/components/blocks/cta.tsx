import { Button } from "@/components/ui/button"

export interface CTAProps {
  title?: string
  description?: string
  ctaLabel?: string
}

export function CTA({
  title = "Try the playground",
  description = "Click around. Open /forkshop to see the canvas in action.",
  ctaLabel = "Open Forkshop",
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
