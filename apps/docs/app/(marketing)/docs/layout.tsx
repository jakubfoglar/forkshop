import type { ReactNode } from "react"
import { DocsSidebar } from "@/components/docs-sidebar"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-12 px-6 py-12">
      <aside className="sticky top-20 hidden h-fit w-56 shrink-0 self-start md:block">
        <DocsSidebar />
      </aside>
      <article className="prose prose-zinc min-w-0 flex-1 max-w-none">
        {children}
      </article>
    </div>
  )
}
