import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

import sharp from "sharp"
import pngToIco from "png-to-ico"

const here = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(here, "..", "app")

async function main() {
  const svg = await readFile(resolve(appDir, "icon.svg"))

  const appleIcon = await sharp(svg, { density: 384 })
    .resize(180, 180)
    .png()
    .toBuffer()
  await writeFile(resolve(appDir, "apple-icon.png"), appleIcon)

  const sizes = [16, 32, 48]
  const buffers = await Promise.all(
    sizes.map((size) =>
      sharp(svg, { density: 384 }).resize(size, size).png().toBuffer(),
    ),
  )
  const ico = await pngToIco(buffers)
  await writeFile(resolve(appDir, "favicon.ico"), ico)

  console.log(
    `[icons] apple-icon.png (180x180), favicon.ico (${sizes.join("/")})`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
