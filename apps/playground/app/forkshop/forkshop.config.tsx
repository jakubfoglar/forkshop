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
    { id: "input", name: "Input", sourcePath: "components/ui/input.tsx", render: () => <div className="w-48"><Input placeholder="Type here..." /></div> },
  ],
  blocks: [
    { slug: "hero", name: "Hero", iframeSrc: "/forkshop-preview/hero", sourcePath: "components/blocks/hero.tsx" },
    { slug: "cta-band", name: "CTA Band", iframeSrc: "/forkshop-preview/cta-band", sourcePath: "components/blocks/cta-band.tsx" },
    { slug: "feature-row", name: "Feature Row", iframeSrc: "/forkshop-preview/feature-row", sourcePath: "components/blocks/feature-row.tsx" },
  ],
  pages: [
    { path: "/" },
    { path: "/about" },
    { path: "/contact" },
    { path: "/about/team" },
    { path: "/about/careers" },
  ],
} as const
