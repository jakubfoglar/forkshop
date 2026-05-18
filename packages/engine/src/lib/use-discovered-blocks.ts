"use client"

import { useMemo } from "react"
import { discoverBlocks, type DiscoveredBlock } from "@forkshop/lib/discover-blocks"

export { discoverBlocks, type DiscoveredBlock } from "@forkshop/lib/discover-blocks"

export function useDiscoveredBlocks(
  barrel: Record<string, unknown>,
): DiscoveredBlock[] {
  return useMemo(() => discoverBlocks(barrel), [barrel])
}
