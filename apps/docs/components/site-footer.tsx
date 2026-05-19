export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href="https://github.com/jakubfoglar/forkshop"
            className="hover:text-ink"
          >
            github.com/jakubfoglar/forkshop
          </a>
          <span aria-hidden="true">·</span>
          <span>FSL-1.1-Apache-2.0</span>
          <span aria-hidden="true">·</span>
          <span>
            Built by{" "}
            <a
              href="https://github.com/jakubfoglar"
              className="hover:text-ink"
            >
              @jakubfoglar
            </a>
          </span>
        </div>
        {/* Socials placeholder — fill at user's direction (GitHub, X, email, etc.). */}
        <div className="flex items-center gap-3" aria-label="Socials" />
      </div>
    </footer>
  )
}
