import pc from "picocolors"

export interface AddOptions {
  projectRoot: string
  bundleName: string
  registryUrl?: string
}

export type AddResult = { ok: true } | { ok: false; reason: string }

/**
 * Placeholder. The command stays in the binary so muscle memory survives;
 * exits 0 with a pointer at the actual install flow. Add-on bundles are
 * not on the roadmap for 0.x — Forkshop ships as one engine + one setup
 * skill, configured from `forkshop.config.tsx`.
 */
export async function runAdd(_options: AddOptions): Promise<AddResult> {
  console.log(pc.bold("\nNo add-on bundles in 0.x.\n"))
  console.log(
    "`forkshop init` installs the base. Then open Claude Code in this project\n" +
      "and say \"set up Forkshop\" — the setup skill scaffolds app/forkshop/\n" +
      "based on what it finds in your codebase (components, routes, tokens)."
  )
  return { ok: true }
}
