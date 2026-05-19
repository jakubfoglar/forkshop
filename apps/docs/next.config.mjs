/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["forkshop"],
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

export default config
