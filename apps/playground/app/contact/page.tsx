import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Contact() {
  return (
    <main className="mx-auto max-w-xl px-8 py-16">
      <h1 className="text-4xl font-bold">Contact us</h1>
      <p className="mt-4 text-forkshop-fg-muted">
        Send us a note and we&apos;ll get back within one business day.
      </p>
      <form className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <Input placeholder="Your name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <Input type="email" placeholder="you@example.com" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Message</span>
          <textarea
            placeholder="How can we help?"
            rows={5}
            className="rounded-md border border-forkshop-border bg-forkshop-surface px-3 py-2 text-sm text-forkshop-fg placeholder:text-forkshop-fg-muted"
          />
        </label>
        <Button type="submit" className="self-start">
          Send message
        </Button>
      </form>
    </main>
  )
}
