import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import tailwindConfig from "@/tailwind.config"
import type { Config } from "tailwindcss"

export const forkshopConfig = {
  tailwindConfig: tailwindConfig as Config,
  primitives: [
    { id: "button", name: "Button", sourcePath: "components/ui/button.tsx", render: () => <Button>Click me</Button> },
    { id: "badge", name: "Badge", sourcePath: "components/ui/badge.tsx", render: () => <Badge>Label</Badge> },
    { id: "input", name: "Input", sourcePath: "components/ui/input.tsx", render: () => <Input placeholder="Type here..." /> },
  ],
  blocks: [
    { slug: "hero", name: "Hero", iframeSrc: "/sample", sourcePath: "components/blocks/hero.tsx" },
    { slug: "cta-band", name: "CTA Band", iframeSrc: "/sample", sourcePath: "components/blocks/cta-band.tsx" },
    { slug: "feature-row", name: "Feature Row", iframeSrc: "/sample", sourcePath: "components/blocks/feature-row.tsx" },
  ],
  pages: [
    { path: "/sample" },
    { path: "/sample/about" },
    { path: "/sample/dashboard" },
  ],
} as const
