#!/usr/bin/env node
import { Command } from "commander"
import pc from "picocolors"
import { runInit } from "./commands/init.js"

const program = new Command()
  .name("fogma")
  .description("Drop Fogma into your Next.js + Tailwind project.")
  .version("0.0.0")

program
  .command("init")
  .description("Install Fogma into the current project.")
  .option("--force", "Overwrite existing files on collision")
  .option("--no-install", "Skip running the package manager")
  .option("--no-warn-dirty", "Don't warn if the git tree is dirty")
  .option("--registry <url>", "Override the registry base URL")
  .option("--verbose", "Print verbose output")
  .option("--quiet", "Suppress non-error output")
  .action(async (opts) => {
    const result = await runInit({
      projectRoot: process.cwd(),
      force: opts.force,
      noInstall: !opts.install,
      registryUrl: opts.registry,
    })
    if (!result.ok) {
      console.error(pc.red(result.reason))
      process.exit(2)
    }
  })

program.parseAsync().catch((error) => {
  console.error(pc.red((error as Error).message))
  process.exit(2)
})
