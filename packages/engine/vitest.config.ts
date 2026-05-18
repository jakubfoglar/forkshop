import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: [
      // Explicit dist mappings for @forkshop/engine package imports (public-API test).
      // Must come before the generic @forkshop -> src alias so they take precedence.
      { find: "@forkshop/engine/lib/discover-blocks",                    replacement: path.resolve(__dirname, "dist/lib/discover-blocks.js") },
      { find: "@forkshop/engine/lib/discover-primitives",                replacement: path.resolve(__dirname, "dist/lib/discover-primitives.js") },
      { find: "@forkshop/engine/lib/file-to-selection",                  replacement: path.resolve(__dirname, "dist/lib/file-to-selection.js") },
      { find: "@forkshop/engine/lib/token-registry",                     replacement: path.resolve(__dirname, "dist/lib/token-registry.js") },
      { find: "@forkshop/engine/lib/parse-token-registry-from-css-vars", replacement: path.resolve(__dirname, "dist/lib/parse-token-registry-from-css-vars.js") },
      { find: "@forkshop/engine/lib/sitemap-tree",                       replacement: path.resolve(__dirname, "dist/lib/sitemap-tree.js") },
      { find: "@forkshop/engine/api/edit/route",                         replacement: path.resolve(__dirname, "dist/api/edit/route.js") },
      { find: "@forkshop/engine/api/positions/route",                    replacement: path.resolve(__dirname, "dist/api/positions/route.js") },
      { find: "@forkshop/engine/api/agent-activity/route",               replacement: path.resolve(__dirname, "dist/api/agent-activity/route.js") },
      { find: "@forkshop/engine/api/agent-activity/stream/route",        replacement: path.resolve(__dirname, "dist/api/agent-activity/stream/route.js") },
      { find: "@forkshop/engine/tailwind-preset",                        replacement: path.resolve(__dirname, "dist/tailwind/forkshop-preset.js") },
      { find: "@forkshop/engine",                                        replacement: path.resolve(__dirname, "dist/index.js") },
      // Generic alias for engine-internal imports: @forkshop/* -> src/*
      { find: "@forkshop", replacement: path.resolve(__dirname, "src") },
    ],
  },
  test: {
    globals: false,
    environment: "node",
    environmentMatchGlobs: [
      ["src/**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["src/test-setup-jsdom.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.ts",
    ],
  },
})
