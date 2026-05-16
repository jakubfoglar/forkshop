import { mkdir, copyFile, stat } from "node:fs/promises"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

export async function copyAssets() {
  const srcFont = path.join(ENGINE_ROOT, "fonts", "raveo", "RaveoVF.woff2")
  const dstFont = path.join(ENGINE_ROOT, "dist", "fonts", "RaveoVF.woff2")

  await mkdir(path.dirname(dstFont), { recursive: true })
  await copyFile(srcFont, dstFont)

  const srcStat = await stat(srcFont)
  const dstStat = await stat(dstFont)
  if (srcStat.size !== dstStat.size) {
    throw new Error(`Font copy size mismatch: src=${srcStat.size} dst=${dstStat.size}`)
  }
  if (dstStat.size === 0) {
    throw new Error(`Copied font is zero bytes`)
  }
  console.log(`✓ copied RaveoVF.woff2 (${(dstStat.size / 1024).toFixed(1)}KB)`)
}
