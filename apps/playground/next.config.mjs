import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registrySrc = path.resolve(__dirname, "../../packages/registry/src")

// Map every top-level dir under packages/registry/src/ to its @forkshop/* alias.
// Done per-subdir (not a single "@forkshop" prefix alias) so we don't accidentally
// shadow the "@forkshop/registry" workspace package itself.
const forkshopSubdirs = ["api", "components", "hooks", "kits", "lib"]
const forkshopAliases = Object.fromEntries(
  forkshopSubdirs.map((dir) => [`@forkshop/${dir}`, path.join(registrySrc, dir)])
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@forkshop/registry"],
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    resolveAlias: forkshopAliases,
    rules: {
      "components/**/*.{js,jsx,ts,tsx}": {
        loaders: [
          { loader: "@locator/webpack-loader", options: { env: "development" } },
        ],
      },
      "lib/**/*.{js,jsx,ts,tsx}": {
        loaders: [
          { loader: "@locator/webpack-loader", options: { env: "development" } },
        ],
      },
      "src/components/**/*.{js,jsx,ts,tsx}": {
        loaders: [
          { loader: "@locator/webpack-loader", options: { env: "development" } },
        ],
      },
      "src/lib/**/*.{js,jsx,ts,tsx}": {
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
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...forkshopAliases,
    }
    return config
  },
}

export default nextConfig
