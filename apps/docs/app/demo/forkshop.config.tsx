import * as UIPrimitives from "./_components/ui"
import * as Blocks from "./_components/blocks"
import tailwindConfig from "../../tailwind.config"

export const forkshopConfig = {
  ui: UIPrimitives,
  blocks: Blocks,
  paths: {
    primitives: "app/demo/_components/ui",
    blocks: ["app/demo/_components/blocks"],
  },
  sitemap: {
    excludeGroups: [] as string[],
    autoDiscover: true,
  },
  reference: { contentPaths: [] as string[] },
  viewportProfile: "responsive" as "responsive" | "mobile",
  tailwindConfig,
} as const

export type ForkshopConfig = typeof forkshopConfig
