import { Button } from "@/components/ui/button"

export interface HeroProps {
  eyebrow?: string
  title?: string
  description?: string
}

export function Hero({
  eyebrow = "Just shipped",
  title = "Build interfaces from the inside out",
  description = "Drop components onto a canvas. Drag, edit, ship.",
}: HeroProps) {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">{eyebrow}</p>
        <h1 className="mb-4 text-4xl font-semibold text-gray-900">{title}</h1>
        <p className="mb-8 text-lg text-gray-600">{description}</p>
        <Button>Get started</Button>
      </div>
    </section>
  )
}
