/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      include: [
        /components\//,
        /lib\//,
        /src\/components\//,
        /src\/lib\//,
      ],
      use: ["@locator/webpack-loader"],
    })
    return config
  },
}

export default nextConfig
