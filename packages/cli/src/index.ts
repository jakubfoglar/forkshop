import { Command } from "commander"
import { createInterface } from "node:readline/promises"
import pc from "picocolors"
import { runAdd } from "./commands/add.js"
import { runDiff } from "./commands/diff.js"
import { runInit } from "./commands/init.js"
import { runUpdate } from "./commands/update.js"

async function askYesNo(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(`${prompt} [y/N] `)
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    rl.close()
  }
}

const program = new Command()
  .name("forkshop")
  .description("Install and maintain Forkshop in your Next.js + Tailwind project.")
  .version("0.0.0")

program
  .command("init")
  .description("Install Forkshop into the current project.")
  .option("--force", "Overwrite existing files on collision")
  .option("--registry <url>", "Override the registry base URL")
  .action(async (opts) => {
    const result = await runInit({
      projectRoot: process.cwd(),
      force: opts.force,
      registryUrl: opts.registry,
    })
    if (!result.ok) {
      console.error(pc.red(result.reason))
      process.exit(2)
    }
  })

program
  .command("add <bundle>")
  .description("(1.0 placeholder — kits arrive in spec #4.)")
  .action(async (bundle) => {
    await runAdd({ projectRoot: process.cwd(), bundleName: bundle })
  })

program
  .command("update")
  .description("Refresh Forkshop's thin scaffold layer (skills, CLAUDE.md, route stubs).")
  .option("--check", "Print drift summary; exit 1 if any drift, 0 otherwise.")
  .option("--force", "Overwrite locally edited files too.")
  .option("--registry <url>", "Override the registry base URL")
  .action(async (opts) => {
    if (opts.check) {
      const result = await runUpdate({
        projectRoot: process.cwd(),
        checkOnly: true,
        registryUrl: opts.registry,
      })
      if (!result.ok) {
        console.error(pc.red(result.reason))
        process.exit(2)
      }
      process.exit(result.exitCode)
    }

    // Interactive: first do a dry-run pass to render the summary, then prompt.
    const dry = await runUpdate({
      projectRoot: process.cwd(),
      checkOnly: true,
      registryUrl: opts.registry,
    })
    if (!dry.ok) {
      console.error(pc.red(dry.reason))
      process.exit(2)
    }
    if (dry.exitCode === 0) {
      // Nothing to do.
      return
    }
    const confirm = await askYesNo("Apply changes?")
    if (!confirm) {
      console.log(pc.dim("\nNo changes applied."))
      return
    }

    const acceptEngineBump = await askYesNo("Also bump @forkshop/engine pin in package.json?")
    const applyResult = await runUpdate({
      projectRoot: process.cwd(),
      apply: true,
      force: opts.force,
      registryUrl: opts.registry,
      acceptEngineBump,
    })
    if (!applyResult.ok) {
      console.error(pc.red(applyResult.reason))
      process.exit(2)
    }
  })

program
  .command("diff <path>")
  .description("Show how your local copy of a Forkshop file differs from upstream.")
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
