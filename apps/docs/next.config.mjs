/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["fogma"],
  webpack(config) {
    // The CLI source uses NodeNext-style relative imports with `.js` extensions
    // (e.g. `import "./manifest-schema.js"`). webpack needs an extensionAlias
    // to resolve those back to the `.ts` source files.
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
    ]
  },
}

export default config
