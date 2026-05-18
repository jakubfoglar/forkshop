import { defineConfig } from "tsup"
import { preserveDirectivesPlugin } from "esbuild-plugin-preserve-directives"

export default defineConfig({
  entry: {
    "index":                              "src/index.ts",
    "api/edit/route":                     "src/api/edit/route.ts",
    "api/positions/route":                "src/api/positions/route.ts",
    "api/agent-activity/route":           "src/api/agent-activity/route.ts",
    "api/agent-activity/stream/route":    "src/api/agent-activity/stream/route.ts",
    // Server-safe pure-helper subpath entries. Each compiles to a separate
    // dist chunk WITHOUT "use client" so RSC consumers can import them.
    "lib/discover-blocks":                "src/lib/discover-blocks.ts",
    "lib/discover-primitives":            "src/lib/discover-primitives.ts",
    "lib/file-to-selection":              "src/lib/file-to-selection.ts",
    "lib/token-registry":                 "src/lib/token-registry.ts",
    "lib/parse-token-registry-from-css-vars": "src/lib/parse-token-registry-from-css-vars.ts",
    "lib/sitemap-tree":                   "src/lib/sitemap-tree.ts",
  },
  format: ["esm"],
  target: "es2022",
  platform: "neutral",
  dts: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  clean: true,
  metafile: true,
  // Use React's automatic JSX runtime so engine source doesn't need `import React`
  // anywhere. Without this, esbuild's default transform produces React.createElement
  // calls that crash with "React is not defined" in consumers' SSR/prerender.
  esbuildOptions(options) {
    options.jsx = "automatic"
  },
  // Empty env: prevents esbuild from substituting process.env.NODE_ENV at
  // engine-build time. The consumer's bundler does that substitution at their
  // build time, which is how production-mode degradation is meant to work.
  env: {},
  // Post-build steps run after every successful tsup build (one-shot AND watch).
  // The directive injection + CSS compile + font copy must regenerate every
  // rebuild because clean:true wipes dist/ at the start of each build.
  onSuccess: "tsx scripts/post-build.ts",
  external: [
    "react", "react-dom",
    "next", "next/headers", "next/server", "next/navigation",
    // @central-icons-react/... is deliberately NOT listed — tsup bundles
    // each imported icon's SVG into dist, so the published artifact has no
    // runtime icon dependency.
  ],
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ["use client", "use server"],
      include: /\.(ts|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
})
