import { Button } from "@/components/ui/button"

export interface PricingTier {
  name: string
  price: string
  features: string[]
}

export interface PricingProps {
  title?: string
  tiers?: PricingTier[]
}

const DEFAULT_TIERS: PricingTier[] = [
  { name: "Free", price: "$0", features: ["1 project", "Community support"] },
  { name: "Pro", price: "$19/mo", features: ["Unlimited projects", "Priority support", "Pro Kits"] },
  { name: "Team", price: "$49/mo", features: ["Everything in Pro", "Team seats", "Audit logs"] },
]

export function Pricing({ title = "Pricing", tiers = DEFAULT_TIERS }: PricingProps) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">{title}</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.name} className="rounded-lg border border-gray-200 p-8">
              <h3 className="mb-2 text-xl font-semibold text-gray-900">{tier.name}</h3>
              <p className="mb-6 text-3xl font-bold text-gray-900">{tier.price}</p>
              <ul className="mb-6 space-y-2 text-sm text-gray-600">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Button variant="outline" size="md" className="w-full">Get started</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
