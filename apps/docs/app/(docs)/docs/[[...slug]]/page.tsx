import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page"
import defaultMdxComponents from "fumadocs-ui/mdx"
import type { TOCItemType } from "fumadocs-core/server"
import type { ComponentType } from "react"
import { source } from "@/lib/source"

interface PageData {
  title?: string
  description?: string
  // Injected by fumadocs-mdx at compile time
  body: ComponentType<{ components?: Record<string, unknown> }>
  toc: TOCItemType[]
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  const data = page.data as unknown as PageData
  const MDX = data.body

  return (
    <DocsPage toc={data.toc}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>{data.description}</DocsDescription>
      <DocsBody>
        <MDX components={defaultMdxComponents as Record<string, unknown>} />
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) return {}
  const data = page.data as unknown as PageData
  return {
    title: data.title,
    description: data.description,
  }
}
