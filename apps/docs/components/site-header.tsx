import Link from "next/link";

import { ForkshopLogotype } from "@/components/forkshop-logotype";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink/10 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          aria-label="Forkshop home"
          className="text-ink hover:text-ink/80"
        >
          <ForkshopLogotype className="h-4 w-auto" />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="https://x.com/forkshop_dev"
            target="_blank"
            rel="noreferrer"
            aria-label="Forkshop on X"
            data-umami-event="nav-x"
            className="text-ink hover:text-ink/70"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  );
}
