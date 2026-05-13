export function Hero({
  headline = "A canvas for product builders",
  subhead = "Edit your real components, in your real project.",
  cta = "Get started",
}: {
  headline?: string
  subhead?: string
  cta?: string
}) {
  return (
    <section data-forkshop-block="hero" className="px-8 py-16 text-center">
      <h1 className="text-4xl font-bold">{headline}</h1>
      <p className="mt-4 text-forkshop-fg-muted">{subhead}</p>
      <button className="mt-6 rounded-md bg-forkshop-accent px-4 py-2 text-forkshop-accent-fg">
        {cta}
      </button>
    </section>
  )
}
