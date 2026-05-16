import { build } from "esbuild"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

const presetSrc = path.join(ENGINE_ROOT, "tailwind", "forkshop-preset.ts")
const out = path.join(ENGINE_ROOT, ".tmp", "forkshop-preset.cjs")

await build({
  entryPoints: [presetSrc],
  outfile: out,
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
})

console.log(`✓ wrote ${out}`)
