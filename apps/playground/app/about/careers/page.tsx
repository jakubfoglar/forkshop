import { Badge } from "@/components/ui/badge"
import { CTABand } from "@/components/blocks/cta-band"

const JOBS = [
  { title: "Senior Full-Stack Engineer", location: "Remote", type: "Full-time" },
  { title: "Product Designer", location: "Remote · EU", type: "Full-time" },
  { title: "Developer Advocate", location: "Remote · US", type: "Full-time" },
]

export default function Careers() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-8 py-16">
        <h1 className="text-4xl font-bold">Careers at Acme</h1>
        <p className="mt-4 text-forkshop-fg-muted">
          We hire slowly, pay well, and ask for trust in return. Open roles below.
        </p>
        <ul className="mt-10 flex flex-col gap-3">
          {JOBS.map((job) => (
            <li
              key={job.title}
              className="flex items-center justify-between rounded-md border border-forkshop-border bg-forkshop-surface p-5"
            >
              <div>
                <h2 className="text-lg font-semibold">{job.title}</h2>
                <p className="mt-1 text-sm text-forkshop-fg-muted">{job.location}</p>
              </div>
              <Badge>{job.type}</Badge>
            </li>
          ))}
        </ul>
      </section>
      <CTABand text="Don't see your role? Send us a note anyway." />
    </main>
  )
}
