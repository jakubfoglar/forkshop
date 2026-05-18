import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-6 text-3xl font-semibold">Contact</h1>
      <form className="space-y-4">
        <Input placeholder="Your email" type="email" />
        <Input placeholder="Subject" />
        <Button type="submit">Send</Button>
      </form>
    </section>
  )
}
