import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Hero } from "@/components/blocks/hero"
import { FeatureGrid } from "@/components/blocks/feature-grid"
import { CTA } from "@/components/blocks/cta"
import { Pricing } from "@/components/blocks/pricing"

export const forkshopConfig = {
  primitives: [
    { slug: "button", name: "Button", component: Button, exampleProps: { children: "Click me" } },
    { slug: "badge", name: "Badge", component: Badge, exampleProps: { children: "New" } },
    { slug: "input", name: "Input", component: Input, exampleProps: { placeholder: "Type here…" } },
  ],
  blocks: [
    { slug: "hero", name: "Hero", component: Hero, src: "/forkshop/block/hero" },
    { slug: "feature-grid", name: "Feature Grid", component: FeatureGrid, src: "/forkshop/block/feature-grid" },
    { slug: "cta", name: "CTA", component: CTA, src: "/forkshop/block/cta" },
    { slug: "pricing", name: "Pricing", component: Pricing, src: "/forkshop/block/pricing" },
  ],
  sitemap: {
    excludeGroups: [] as string[],
    autoDiscover: true,
  },
  reference: {
    contentPaths: [] as string[],
  },
  viewportProfile: "responsive" as const,
} as const

export type ForkshopConfig = typeof forkshopConfig

export function getBlockBySlug(slug: string) {
  return forkshopConfig.blocks.find((b) => b.slug === slug)
}
