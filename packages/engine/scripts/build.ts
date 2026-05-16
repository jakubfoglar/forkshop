import { execa } from "execa"

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
  // verify-directives → compile-css → copy-assets → verify-tarball added in
  // subsequent tasks.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
