import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registrySrc = path.resolve(__dirname, "../../packages/registry/src")

// Map every top-level dir under packages/registry/src/ to its @fogma/* alias.
// Done per-subdir (not a single "@fogma" prefix alias) so we don't accidentally
// shadow the "@fogma/registry" workspace package itself.
const fogmaSubdirs = ["api", "components", "hooks", "kits", "lib", "templates"]
const fogmaAliases = Object.fromEntries(
  fogmaSubdirs.map((dir) => [`@fogma/${dir}`, path.join(registrySrc, dir)])
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@fogma/registry"],
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    resolveAlias: fogmaAliases,
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
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...fogmaAliases,
    }
    return config
  },
}

export default nextConfig
