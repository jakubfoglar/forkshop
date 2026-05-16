import { execa } from "execa"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"
import { injectDirectives } from "./inject-directives.js"
import { runDirectiveChecks } from "./verify-directives.js"
import { compileCss } from "./compile-css.js"

const isWatch = process.argv.includes("--watch")

async function runTsup() {
  const args = ["tsup"]
  if (isWatch) args.push("--watch")
  await execa("pnpm", ["exec", ...args], { stdio: "inherit", cwd: process.cwd() })
}

async function main() {
  await runTsup()
  if (isWatch) return  // watch mode: tsup keeps running, no further steps
  console.log("✓ tsup complete")

  const dist = path.join(ENGINE_ROOT, "dist")

  // Post-build: inject "use client" directives that tsup's plugin discards
  await injectDirectives(dist)

  // Gate: abort if directives are missing or misapplied
  const directives = await runDirectiveChecks(dist)
  if (!directives.ok) {
    console.error("verify-directives FAILED:")
    for (const e of directives.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log("✓ directives verified")

  await compileCss()
  // copy-assets → verify-tarball added in subsequent tasks.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
