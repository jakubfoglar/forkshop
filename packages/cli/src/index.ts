import { Command } from "commander"
import pc from "picocolors"
import { runAdd } from "./commands/add.js"
import { runDiff } from "./commands/diff.js"
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

program
  .command("add <bundle>")
  .description("Add a kit or feature to your installation.")
  .option("--force", "Overwrite existing files on collision")
  .option("--no-install", "Skip running the package manager")
  .option("--registry <url>", "Override the registry base URL")
  .action(async (bundle, opts) => {
    const result = await runAdd({
      projectRoot: process.cwd(),
      bundleName: bundle,
      force: opts.force,
      noInstall: !opts.install,
      registryUrl: opts.registry,
    })
    if (!result.ok) {
      console.error(pc.red(result.reason))
      process.exit(2)
    }
  })

program
  .command("diff <path>")
  .description("Show how your local copy of a Fogma file differs from upstream.")
  .option("--registry <url>", "Override the registry base URL")
  .action(async (filePath, opts) => {
    const result = await runDiff({
      projectRoot: process.cwd(),
      path: filePath,
      registryUrl: opts.registry,
    })
    if (result.diff) {
      const colored = result.diff
        .split("\n")
        .map((line) => {
          if (line.startsWith("+++") || line.startsWith("---")) return pc.bold(line)
          if (line.startsWith("+")) return pc.green(line)
          if (line.startsWith("-")) return pc.red(line)
          if (line.startsWith("@@")) return pc.cyan(line)
          return pc.dim(line)
        })
        .join("\n")
      process.stdout.write(colored)
    }
    if (result.message) {
      console.error(pc.dim(result.message))
    }
    process.exit(result.exitCode)
  })

program.parseAsync().catch((error) => {
  console.error(pc.red((error as Error).message))
  process.exit(2)
})
