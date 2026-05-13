import Link from "next/link"

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Fogma Playground</h1>
      <p className="mt-2 text-gray-600">Live demo of an installed Fogma.</p>
      <Link href="/fogma" className="mt-4 inline-block underline">
        Open /fogma
      </Link>
    </main>
  )
}
