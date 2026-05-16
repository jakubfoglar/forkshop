import { Badge } from "@/components/ui/badge"

const TEAM = [
  { name: "Jordan Ellis", role: "Co-founder, CEO", bio: "Ex-Stripe. Cares about latency." },
  { name: "Priya Shah", role: "Co-founder, CTO", bio: "Ex-Linear. Cares about types." },
  { name: "Sam Okafor", role: "Engineering", bio: "Former founder. Cares about feedback loops." },
  { name: "Lin Wei", role: "Design", bio: "Ex-Figma. Cares about color." },
]

export default function Team() {
  return (
    <main className="mx-auto max-w-4xl px-8 py-16">
      <h1 className="text-4xl font-bold">Our team</h1>
      <p className="mt-4 text-forkshop-fg-muted">
        Four people, three time zones, one shared codebase.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {TEAM.map((member) => (
          <div
            key={member.name}
            className="rounded-md border border-forkshop-border bg-forkshop-surface p-5"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{member.name}</h2>
              <Badge>{member.role}</Badge>
            </div>
            <p className="mt-2 text-sm text-forkshop-fg-muted">{member.bio}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
