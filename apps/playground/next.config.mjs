/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@fogma/registry"],
  turbopack: {
    rules: {
      "**/*.{tsx,jsx}": {
        loaders: [
          { loader: "@locator/webpack-loader", options: { env: "development" } },
        ],
      },
    },
  },
}

export default nextConfig
