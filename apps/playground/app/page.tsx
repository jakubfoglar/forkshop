import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ForkshopIcon } from "@forkshop/registry"

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Forkshop Playground</h1>
      <p className="mt-2 text-forkshop-fg-muted">Live demo of an installed Forkshop.</p>
      <Link href="/forkshop" className="mt-4 inline-flex items-center gap-2 underline">
        Open /forkshop
        <ForkshopIcon icon={ArrowRight} className="size-4" />
      </Link>
    </main>
  )
}
