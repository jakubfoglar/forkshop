import Image from "next/image";
import heroScreenshot from "@/public/homepage-screenshot.png";

import { ForkshopLogotype } from "@/components/forkshop-logotype";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <header className="mb-20">
          <h1>
            <ForkshopLogotype className="h-10 w-auto sm:h-16" />
          </h1>
          <p className="mt-6 text-xl text-ink sm:text-2xl">
            Your real app on a canvas.
          </p>
          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            Forkshop mounts a canvas inside your app&apos;s dev environment.
            Open any page at multiple viewports side-by-side, edit text in place
            to save back to source, and watch your AI agents work in real time.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="rounded-md border border-ink/10 bg-white px-4 py-3 text-sm">
              npx forkshop init
            </code>
            <a
              href="https://github.com/jakubfoglar/forkshop"
              className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-3 text-sm text-canvas hover:bg-ink/90"
            >
              View on GitHub →
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">Next.js only for now.</p>
        </header>

        <div className="mt-14 mb-20 overflow-hidden rounded-md shadow-xl">
          <div className="flex items-center gap-1.5 bg-[#2a2a2a] px-3 py-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-[#ff5f57]"
            />
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-[#febc2e]"
            />
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-[#28c840]"
            />
            <span className="ml-3 text-xs text-white/40">
              localhost:3000/forkshop
            </span>
          </div>
          <Image
            src={heroScreenshot}
            alt="Forkshop running in a Next.js project — sidebar with boards on the left, canvas with stacked iframe viewports on the right."
            priority
            className="block h-auto w-full"
          />
        </div>

        <section className="grid gap-8 sm:grid-cols-3">
          <article>
            <h2 className="text-base font-medium">Side-by-side viewports</h2>
            <p className="mt-2 text-sm text-muted">
              Open desktop, tablet, and mobile views of any page at once. Type
              in one viewport, the others update as you go.
            </p>
          </article>
          <article>
            <h2 className="text-base font-medium">Edit text in place</h2>
            <p className="mt-2 text-sm text-muted">
              Click any text in the canvas to make it editable. ⌘↵ saves to the
              underlying TSX file; Esc discards.
            </p>
          </article>
          <article>
            <h2 className="text-base font-medium">See your agent at work</h2>
            <p className="mt-2 text-sm text-muted">
              When AI agents are editing files, Forkshop highlights it in real
              time.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
