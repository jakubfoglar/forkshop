/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @locator/runtime is browser-only (depends on solid-js/web's browser build).
  // Externalize so Next's SSR pass doesn't try to bundle it.
  experimental: {
    serverComponentsExternalPackages: ["@locator/runtime"],
  },
  turbopack: {
    rules: {
      "components/**/*.{js,jsx,ts,tsx}": {
        loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
      },
      "lib/**/*.{js,jsx,ts,tsx}": {
        loaders: [{ loader: "@locator/webpack-loader", options: { env: "development" } }],
      },
    },
  },
  webpack: (config, { dev }) => {
    // Locator.js source-loc transform — only in dev. Attaches __source props
    // to playground JSX so Option-click in the iframe opens the file in VS Code.
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
