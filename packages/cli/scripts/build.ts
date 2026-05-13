import { build } from "esbuild"
import { chmod } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(root, "..")

await build({
  entryPoints: [path.join(pkgRoot, "src/index.ts")],
  outfile: path.join(pkgRoot, "dist/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  banner: {
    js: [
      "#!/usr/bin/env node",
      // Bundled CJS deps (e.g. commander) use require() for node: built-ins.
      // esbuild's default require shim throws "Dynamic require not supported"
      // when targeting ESM, so wire up a real require via createRequire.
      `import { createRequire as __forkshopCreateRequire } from "node:module";`,
      `const require = __forkshopCreateRequire(import.meta.url);`,
    ].join("\n"),
  },
  external: [], // node: built-ins are auto-handled
})

await chmod(path.join(pkgRoot, "dist/index.js"), 0o755)

console.log("Built dist/index.js")
