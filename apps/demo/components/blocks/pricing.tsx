import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface PricingProps {
  title?: string
}

export function Pricing({ title = "Pricing" }: PricingProps) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mb-12 text-center text-3xl font-semibold text-gray-900">{title}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { name: "Free", price: "$0", features: ["1 project", "Community support"] },
            { name: "Pro", price: "$12/mo", features: ["Unlimited projects", "Priority support", "Custom domains"], featured: true },
            { name: "Team", price: "$48/mo", features: ["Everything in Pro", "5 team members", "Audit log"] },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`rounded-lg border p-6 ${tier.featured ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xl font-medium text-gray-900">{tier.name}</h3>
                {tier.featured && <Badge>Most popular</Badge>}
              </div>
              <p className="mb-6 text-3xl font-semibold text-gray-900">{tier.price}</p>
              <ul className="mb-6 space-y-2 text-sm text-gray-600">
                {tier.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Button variant={tier.featured ? "default" : "subtle"}>Choose plan</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
