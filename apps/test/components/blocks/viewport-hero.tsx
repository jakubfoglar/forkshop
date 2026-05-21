// Stress-test block — uses min-h-screen to deliberately trigger the
// iframe-viewport-pinning bug class. When this block is loaded inside an
// iframe-route Node, the engine's CSS injection in LazyIframe (see
// buildIframeContentStyle) MUST neutralize min-h-screen so body.scrollHeight
// reports the real content height instead of the iframe's intrinsic 150px
// default. A regression here = the v0.4.0 h-screen bug returning.

export interface ViewportHeroProps {
  title?: string
  description?: string
}

export function ViewportHero({
  title = "Edge of the page",
  description = "This block uses min-h-screen. If Forkshop renders it correctly inside an iframe, the engine's viewport-pinning override is working.",
}: ViewportHeroProps) {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-6 py-24 text-center text-white">
      <h1 className="mb-6 text-5xl font-bold">{title}</h1>
      <p className="max-w-2xl text-lg text-gray-300">{description}</p>
    </section>
  )
}
