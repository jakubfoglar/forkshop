// Stress-test block — naturally tall content (no fixed height, just lots
// of vertical sections). Exercises iframe auto-growth: Gallery's measured
// height should grow to fit this block, not clip it. A regression where
// the cell stays at DEFAULT_INITIAL_HEIGHT (600) = the auto-growth chain
// is broken.

export interface TallFeatureProps {
  heading?: string
}

export function TallFeature({ heading = "Many small things" }: TallFeatureProps) {
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-12 text-3xl font-semibold text-gray-900">{heading}</h2>
        <div className="space-y-12">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-6">
              <h3 className="mb-2 text-lg font-medium text-gray-900">Section {i + 1}</h3>
              <p className="text-gray-600">
                Each section has padding, text, and a border. Twenty of them
                stacked vertically make this block tall enough that any clipping
                bug shows up immediately when rendered in a Forkshop iframe cell.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
