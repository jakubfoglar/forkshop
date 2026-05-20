// Block preview route for iframe leaves — renders a single WAVECLASH block in isolation.
// Used by the Blocks canvas gallery in the /demo forkshop showcase.

import { notFound } from "next/navigation"
import { discoverBlocks } from "@forkshop/engine/lib/discover-blocks"
import { forkshopConfig } from "../../forkshop.config"

export default async function DemoBlockPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blocks = discoverBlocks(forkshopConfig.blocks)
  const entry = blocks.find((b) => b.slug === slug)
  if (!entry) notFound()
  const Component = entry.Component
  return (
    <div className="demo-scope">
      <Component />
    </div>
  )
}
