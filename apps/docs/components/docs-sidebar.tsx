"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/docs", label: "Introduction" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/concepts", label: "Concepts" },
  { href: "/docs/boards", label: "Boards" },
  { href: "/docs/canvas-editing", label: "Canvas editing" },
  { href: "/docs/open-in-editor", label: "Open in editor" },
  { href: "/docs/live-ai-agents", label: "Live AI agents" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/extending", label: "Extending Forkshop" },
]

export function DocsSidebar() {
  const pathname = usePathname()
  return (
    <nav className="text-sm">
      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  active
                    ? "block rounded-md bg-ink/5 px-3 py-1.5 font-medium text-ink"
                    : "block rounded-md px-3 py-1.5 text-muted hover:bg-ink/[0.03] hover:text-ink"
                }
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
