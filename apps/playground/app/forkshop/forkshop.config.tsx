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
    { slug: "cta-band", name: "CTA Band", iframeSrc: "/forkshop-preview/cta-band", sourcePath: "components/blocks/cta-band.tsx", sourceFile: "components/blocks/cta-band.tsx" },
    { slug: "feature-row", name: "Feature Row", iframeSrc: "/forkshop-preview/feature-row", sourcePath: "components/blocks/feature-row.tsx", sourceFile: "components/blocks/feature-row.tsx" },
  ],
  pages: [
    { path: "/", sourceFile: "app/page.tsx" },
    { path: "/about", sourceFile: "app/about/page.tsx" },
    { path: "/contact", sourceFile: "app/contact/page.tsx" },
    { path: "/about/team", sourceFile: "app/about/team/page.tsx" },
    { path: "/about/careers", sourceFile: "app/about/careers/page.tsx" },
  ],
} as const
