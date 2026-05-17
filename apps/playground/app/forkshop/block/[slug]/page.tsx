// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.

import { notFound } from "next/navigation"
import { discoverBlocks } from "@forkshop/engine"
import { forkshopConfig } from "../../forkshop.config"

export default async function PlaygroundBlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (process.env.NODE_ENV === "production") notFound()
  const { slug } = await params
  const blocks = discoverBlocks(forkshopConfig.blocks)
  const entry = blocks.find((b) => b.slug === slug)
  if (!entry) notFound()
  const Component = entry.Component
  return (
    <div className="bg-white">
      <Component />
    </div>
  )
}
