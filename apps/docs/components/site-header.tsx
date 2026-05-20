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
          <Link href="/docs" className="text-ink hover:text-ink/70">
            Docs
          </Link>
          <a
            href="https://github.com/jakubfoglar/forkshop"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="text-ink hover:text-ink/70"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.11.79-.25.79-.56v-2.17c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.6.23 2.78.11 3.07.73.8 1.18 1.83 1.18 3.09 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56C20.21 21.4 23.5 17.09 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  );
}
