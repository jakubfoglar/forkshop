import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import tailwindConfig from "@/tailwind.config"
import type { Config } from "tailwindcss"

export const forkshopConfig = {
  tailwindConfig: tailwindConfig as Config,
  primitives: [
    { id: "button", name: "Button", sourcePath: "components/ui/button.tsx", render: () => <Button>Label</Button> },
    { id: "badge", name: "Badge", sourcePath: "components/ui/badge.tsx", render: () => <Badge>Label</Badge> },
    { id: "input", name: "Input", sourcePath: "components/ui/input.tsx", render: () => <Input placeholder="Type here..." /> },
  ],
  blocks: [
    { slug: "hero", name: "Hero", iframeSrc: "/forkshop-preview/hero", sourcePath: "components/blocks/hero.tsx", sourceFile: "components/blocks/hero.tsx" },
    { slug: "feature-grid", name: "Feature Grid", iframeSrc: "/forkshop-preview/feature-grid", sourcePath: "components/blocks/feature-grid.tsx", sourceFile: "components/blocks/feature-grid.tsx" },
    { slug: "cta", name: "CTA", iframeSrc: "/forkshop-preview/cta", sourcePath: "components/blocks/cta.tsx", sourceFile: "components/blocks/cta.tsx" },
    { slug: "pricing", name: "Pricing", iframeSrc: "/forkshop-preview/pricing", sourcePath: "components/blocks/pricing.tsx", sourceFile: "components/blocks/pricing.tsx" },
  ],
  pages: [
    { path: "/", sourceFile: "app/page.tsx" },
    { path: "/about", sourceFile: "app/about/page.tsx" },
    { path: "/pricing", sourceFile: "app/pricing/page.tsx" },
  ],
} as const
