export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <header className="mb-20">
          <h1 className="text-5xl tracking-tight sm:text-7xl">Forkshop</h1>
          <p className="mt-6 text-xl text-ink sm:text-2xl">
            A Figma-style canvas for your Next.js project.
          </p>
          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            Forkshop mounts a sidebar and a canvas inside your app&apos;s dev
            environment. Open multiple viewports of your pages side-by-side,
            edit text in any iframe and save back to source, and watch your AI
            assistant make changes in real time — all without leaving your code.
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
        </header>

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
              underlying TSX file; Esc discards. No round-trip to your editor.
            </p>
          </article>
          <article>
            <h2 className="text-base font-medium">See your agent at work</h2>
            <p className="mt-2 text-sm text-muted">
              When Claude (or another agent) edits a file your canvas is
              showing, Forkshop highlights the change live, with a per-agent
              color so you can track multiple sessions at once.
            </p>
          </article>
        </section>

      </div>
    </main>
  )
}
