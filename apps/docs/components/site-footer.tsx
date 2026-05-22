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
        <div className="flex items-center gap-3" aria-label="Socials">
          <a
            href="https://x.com/forkshop_dev"
            target="_blank"
            rel="noreferrer"
            aria-label="Forkshop on X"
            data-umami-event="footer-x"
            className="hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
