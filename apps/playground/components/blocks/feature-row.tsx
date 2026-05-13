export function FeatureRow({
  title = "Feature",
  body = "Description of the feature.",
}: {
  title?: string
  body?: string
}) {
  return (
    <section data-forkshop-block="feature-row" className="px-8 py-12">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-forkshop-fg-muted">{body}</p>
    </section>
  )
}
