import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forkshop",
    short_name: "Forkshop",
    description:
      "A local canvas with your real code. For designers, engineers and AI agents.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFD711",
    theme_color: "#FFD711",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  }
}
