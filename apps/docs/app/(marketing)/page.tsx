import Image from "next/image";
import heroScreenshot from "@/public/homepage-screenshot.png";

import { ForkshopLogotype } from "@/components/forkshop-logotype";
import enginePkg from "../../../../packages/engine/package.json";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <header className="mb-20">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1>
              <ForkshopLogotype className="h-10 w-auto sm:h-16" />
            </h1>
            <span className="inline-flex items-center rounded-full border border-ink/15 px-2.5 py-0.5 text-xs text-muted">
              v{enginePkg.version} · pre-release
            </span>
          </div>
          <p className="mt-6 text-pretty text-xl text-ink sm:text-2xl">
            A local canvas with your real code.
            <br />
            For designers, engineers and AI agents.
          </p>
          <p className="mt-4 max-w-2xl text-pretty text-base text-muted sm:text-lg">
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
          <p className="mt-4 text-xs text-muted">
            Next.js only for now. Pre-1.0 — expect breaking changes.
          </p>
          <p className="mt-1 text-xs text-muted">
            Feedback:{" "}
            <a
              href="mailto:jakub@forkshop.dev"
              className="underline decoration-ink/20 underline-offset-2 hover:decoration-ink/50"
            >
              jakub@forkshop.dev
            </a>
          </p>
        </header>

        <div className="mt-14 mb-20 overflow-hidden rounded-md border border-ink/10 shadow-xl">
          <div className="flex items-center gap-1.5 border-b border-ink/10 bg-white px-3 py-2.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-full bg-[#ff5f57]"
            />
            <span
              aria-hidden="true"
              className="size-3 rounded-full bg-[#febc2e]"
            />
            <span
              aria-hidden="true"
              className="size-3 rounded-full bg-[#28c840]"
            />
            <span className="ml-3 text-sm text-ink/70">
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

        <footer className="mt-20 border-t border-ink/10 pt-6 text-xs text-muted">
          Questions?{" "}
          <a
            href="mailto:jakub@forkshop.dev"
            className="underline decoration-ink/20 underline-offset-2 hover:decoration-ink/50"
          >
            jakub@forkshop.dev
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/jakubfoglar/forkshop"
            className="underline decoration-ink/20 underline-offset-2 hover:decoration-ink/50"
          >
            GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}
