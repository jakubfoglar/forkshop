import { execa } from "execa"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"

export async function compileCss() {
  // Compile the TS preset → .tmp/forkshop-preset.cjs for Tailwind CLI consumption.
  await execa("tsx", ["scripts/compile-preset.ts"], {
    stdio: "inherit",
    cwd: ENGINE_ROOT,
  })

  await execa(
    "npx",
    [
      "tailwindcss",
      "-c", "tailwind/build.config.cjs",
      "-i", "src/styles/forkshop.entry.css",
      "-o", "dist/forkshop.css",
      "--minify",
    ],
    {
      stdio: "inherit",
      cwd: ENGINE_ROOT,
      env: { ...process.env, NODE_ENV: "production" },
    },
  )

  // Verify the output is sane
  const distCss = path.join(ENGINE_ROOT, "dist/forkshop.css")
  const fs = await import("node:fs/promises")
  const content = await fs.readFile(distCss, "utf8")
  const errors: string[] = []
  if (!content.includes("@font-face")) errors.push("missing @font-face block")
  if (!content.includes("data-forkshop-mount") && !content.includes(".forkshop-scope")) {
    errors.push("missing scoped token block ([data-forkshop-mount], .forkshop-scope)")
  }
  if (!content.includes("/fonts/forkshop/RaveoVF.woff2")) errors.push("missing font URL")
  const sizeKB = Buffer.byteLength(content) / 1024
  if (sizeKB > 30) errors.push(`dist/forkshop.css ${sizeKB.toFixed(1)}KB > 30KB budget`)
  if (errors.length > 0) {
    console.error("compile-css verification FAILED:")
    for (const e of errors) console.error(`  - ${e}`)
    throw new Error("compile-css failed")
  }
  console.log(`✓ dist/forkshop.css (${sizeKB.toFixed(1)}KB) verified`)
}
