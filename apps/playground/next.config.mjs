/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // In dev only, run @locator/webpack-loader over the playground's JSX so
    // every rendered DOM element carries a `data-locatorjs` attribute holding
    // its source file:line:column. Forkshop's EditorLink component reads that
    // attribute on Option+click to open the file in the editor (vscode://).
    //
    // The loader is a build-time-only dep (devDependency); nothing about it
    // ships in production builds.
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
