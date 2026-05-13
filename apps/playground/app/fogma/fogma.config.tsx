import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import tailwindConfig from "@/tailwind.config"
import type { Config } from "tailwindcss"

export const fogmaConfig = {
  tailwindConfig: tailwindConfig as Config,
  primitives: [
    { id: "button", name: "Button", render: () => <Button>Click me</Button> },
    { id: "badge", name: "Badge", render: () => <Badge>Label</Badge> },
    { id: "input", name: "Input", render: () => <Input placeholder="Type here..." /> },
  ],
  blocks: [
    { slug: "hero", name: "Hero", iframeSrc: "/sample" },
    { slug: "cta-band", name: "CTA Band", iframeSrc: "/sample" },
    { slug: "feature-row", name: "Feature Row", iframeSrc: "/sample" },
  ],
  pages: [
    { path: "/sample" },
    { path: "/sample/about" },
    { path: "/sample/dashboard" },
  ],
} as const
