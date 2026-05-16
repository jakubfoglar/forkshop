import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registrySrc = path.resolve(__dirname, "../../packages/registry/src")

// Map every top-level dir under packages/registry/src/ to its @forkshop/* alias.
// Done per-subdir (not a single "@forkshop" prefix alias) so we don't accidentally
// shadow the "@forkshop/registry" workspace package itself.
const forkshopSubdirs = ["api", "components", "hooks", "kits", "layouts", "lib", "node-types", "types"]
const forkshopAliases = Object.fromEntries(
  forkshopSubdirs.map((dir) => [`@forkshop/${dir}`, path.join(registrySrc, dir)])
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@forkshop/registry"],
  // @locator/runtime is browser-only (depends on solid-js/web's browser build
  // for setStyleProperty). Externalize so Next's SSR pass doesn't try to bundle it.
  experimental: {
    serverComponentsExternalPackages: ["@locator/runtime"],
  },
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
  webpack: (config, { dev }) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    }
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...forkshopAliases,
    }
    // Locator.js source-loc transform — only in dev. Attaches __source props
    // (fileName + lineNumber + columnNumber) to every JSX element so
    // Option-click in the iframe can open the file in VS Code at the right
    // line. The `turbopack.rules` block above is the Next 15+ / `next dev
    // --turbo` equivalent; this webpack rule covers default `next dev`
    // (webpack) on Next 14 where the top-level `turbopack` key is unknown.
    if (dev) {
      config.module.rules.push({
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: ["@locator/webpack-loader"],
      })
    }
    return config
  },
}

export default nextConfig
