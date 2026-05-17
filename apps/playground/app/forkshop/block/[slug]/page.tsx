// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.

import { notFound } from "next/navigation"
import { getBlockBySlug } from "../../forkshop.config"

export default async function PlaygroundBlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (process.env.NODE_ENV === "production") notFound()
  const { slug } = await params
  const entry = getBlockBySlug(slug)
  if (!entry) notFound()
  const Component = entry.component as React.ComponentType
  return (
    <div className="bg-white">
      <Component />
    </div>
  )
}
