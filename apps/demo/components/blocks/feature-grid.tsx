export interface FeatureGridProps {
  title?: string
  features?: { title: string; description: string }[]
}

const DEFAULT_FEATURES = [
  {
    title: "Real components",
    description: "See your actual React components rendered live, not screenshots.",
  },
  {
    title: "Edit in place",
    description: "Click any text or component to edit it directly in your codebase.",
  },
  {
    title: "Drag to arrange",
    description: "Position components on a canvas. Snap to grid, save to disk.",
  },
]

export function FeatureGrid({ title = "Three reasons", features = DEFAULT_FEATURES }: FeatureGridProps) {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-3xl font-semibold text-gray-900">{title}</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-2 text-lg font-medium text-gray-900">{f.title}</h3>
              <p className="text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
