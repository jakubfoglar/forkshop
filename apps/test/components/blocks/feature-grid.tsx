export interface FeatureGridItem {
  title: string
  description: string
}

export interface FeatureGridProps {
  title?: string
  items?: FeatureGridItem[]
}

const DEFAULT_ITEMS: FeatureGridItem[] = [
  { title: "Live canvas", description: "See your components in context as you build them." },
  { title: "Edit in place", description: "Click any text. Change it. Save. Done." },
  { title: "Works with what you have", description: "Next.js, Tailwind, and your existing components." },
]

export function FeatureGrid({ title = "Three reasons", items = DEFAULT_ITEMS }: FeatureGridProps) {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">{title}</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title}>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
