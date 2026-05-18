import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface HeroProps {
  eyebrow?: string
  title?: string
  description?: string
  ctaLabel?: string
}

export function Hero({
  eyebrow = "Just shipped",
  title = "Your codebase, on a canvas",
  description = "Drop components onto a canvas. Drag, edit, ship.",
  ctaLabel = "Get started",
}: HeroProps) {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Badge tone="success" className="mb-4">{eyebrow}</Badge>
        <h1 className="mb-4 text-5xl font-bold text-gray-900">{title}</h1>
        <p className="mb-8 text-lg text-gray-600">{description}</p>
        <Button size="lg">{ctaLabel}</Button>
      </div>
    </section>
  )
}
