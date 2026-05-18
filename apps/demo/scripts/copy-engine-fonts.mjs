// apps/playground/scripts/copy-engine-fonts.mjs
import { mkdir, copyFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"
import { existsSync } from "node:fs"

const require = createRequire(import.meta.url)

// Resolve the engine package root via its main entry (always in exports).
// Walk up from dist/index.js until we find the package root.
const engineMain = require.resolve("@forkshop/engine")
// engineMain = .../node_modules/@forkshop/engine/dist/index.js
// pkgRoot    = .../node_modules/@forkshop/engine
const pkgRoot = dirname(dirname(engineMain)) // up from dist/ to package root

let src
// Real-user path: dist/fonts/ (after `pnpm --filter @forkshop/engine build`).
const distFont = resolve(pkgRoot, "dist/fonts/RaveoVF.woff2")
// Fresh-clone fallback: source fonts directory.
const srcFont = resolve(pkgRoot, "fonts/raveo/RaveoVF.woff2")

if (existsSync(distFont)) {
  src = distFont
} else {
  src = srcFont
}

if (!existsSync(src)) {
  console.error(`copy-engine-fonts: source font not found at ${src}`)
  process.exit(1)
}

const dest = resolve("public/fonts/forkshop/RaveoVF.woff2")
await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
console.log(`✓ copied RaveoVF.woff2 → ${dest}`)
