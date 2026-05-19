import type { MDXComponents } from "mdx/types"
import Link from "next/link"
import type { AnchorHTMLAttributes } from "react"

function MDXLink({ href = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isInternal = href.startsWith("/") || href.startsWith("#")
  if (isInternal) {
    return <Link href={href} {...props} />
  }
  return <a href={href} target="_blank" rel="noreferrer" {...props} />
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    a: MDXLink,
  }
}
