import createMDX from "@next/mdx"
import remarkFrontmatter from "remark-frontmatter"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "frontmatter" }]],
  },
})

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  env: {
    FORKSHOP_POSITIONS_PATH: "app/demo/positions.json",
  },
  transpilePackages: ["forkshop", "@forkshop/engine"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    }
    return config
  },
  async headers() {
    return [
      {
        source: "/r/fonts/:all*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/r/registry.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      },
    ]
  },
}

export default withMDX(config)
