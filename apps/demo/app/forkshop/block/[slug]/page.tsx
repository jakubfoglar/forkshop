// forkshop:auto-managed — block preview route for iframe leaves.
// Safe to delete this entire `block/` subtree if you don't have blocks.

"use client"

import { notFound, useParams } from "next/navigation"
import { useDiscoveredBlocks } from "@forkshop/engine"
import { forkshopConfig } from "../../forkshop.config"

export default function PlaygroundBlockPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound()
  const params = useParams<{ slug: string }>()
  const blocks = useDiscoveredBlocks(forkshopConfig.blocks)
  const entry = blocks.find((b) => b.slug === params.slug)
  if (!entry) return null
  const Component = entry.Component
  return (
    <div className="bg-white">
      <Component />
    </div>
  )
}
