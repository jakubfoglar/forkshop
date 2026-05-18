import * as UIPrimitives from "@/components/ui"
import * as Blocks from "@/components/blocks"
import tailwindConfig from "../../tailwind.config"

export const forkshopConfig = {
  ui: UIPrimitives,
  blocks: Blocks,
  paths: {
    primitives: "components/ui",
    blocks: ["components/blocks"],
  },
  sitemap: {
    excludeGroups: [] as string[],
    autoDiscover: true,
  },
  reference: {
    contentPaths: [] as string[],
  },
  viewportProfile: "responsive" as "responsive" | "mobile",
  tailwindConfig,
} as const

export type ForkshopConfig = typeof forkshopConfig
