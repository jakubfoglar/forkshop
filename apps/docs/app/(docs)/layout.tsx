import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { ReactNode } from "react"
import { source } from "@/lib/source"

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ title: "Forkshop docs", url: "/docs" }}
    >
      {children}
    </DocsLayout>
  )
}
