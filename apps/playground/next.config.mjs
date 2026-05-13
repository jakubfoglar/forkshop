/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@fogma/registry"],
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    rules: {
      "**/*.{tsx,jsx}": {
        loaders: [
          { loader: "@locator/webpack-loader", options: { env: "development" } },
        ],
      },
    },
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    }
    return config
  },
}

export default nextConfig
