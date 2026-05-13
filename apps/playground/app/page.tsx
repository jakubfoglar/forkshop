import Link from "next/link"
import { ArrowRight } from "iconoir-react"
import { FogmaIcon } from "@fogma/registry"

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Fogma Playground</h1>
      <p className="mt-2 text-fogma-fg-muted">Live demo of an installed Fogma.</p>
      <Link href="/fogma" className="mt-4 inline-flex items-center gap-2 underline">
        Open /fogma
        <FogmaIcon icon={ArrowRight} className="size-4" />
      </Link>
    </main>
  )
}
