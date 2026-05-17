import { execa } from "execa"
import path from "node:path"
import { ENGINE_ROOT } from "./_utils.js"
import { runDirectiveChecks } from "./verify-directives.js"

const isWatch = process.argv.includes("--watch")

async function runTsup() {
  const args = ["tsup"]
  if (isWatch) args.push("--watch")
  // tsup runs onSuccess (scripts/post-build.ts) after every successful build —
  // including in watch mode — so inject-directives + compile-css + copy-assets
  // happen on every rebuild without this script orchestrating them.
  await execa("pnpm", ["exec", ...args], { stdio: "inherit", cwd: process.cwd() })
}

async function main() {
  await runTsup()
  if (isWatch) return  // watch mode: tsup keeps running, gates skipped
  console.log("✓ tsup + post-build complete")

  const dist = path.join(ENGINE_ROOT, "dist")

  // Gate: abort if directives are missing or misapplied
  const directives = await runDirectiveChecks(dist)
  if (!directives.ok) {
    console.error("verify-directives FAILED:")
    for (const e of directives.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log("✓ directives verified")

  // Gate: pnpm pack + assert published-tarball contents
  await execa("tsx", ["scripts/verify-tarball.ts"], {
    stdio: "inherit",
    cwd: ENGINE_ROOT,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
