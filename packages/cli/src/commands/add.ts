import pc from "picocolors"

export interface AddOptions {
  projectRoot: string
  bundleName: string
  registryUrl?: string
}

export type AddResult = { ok: true } | { ok: false; reason: string }

/**
 * Placeholder for 1.0. The kits rewrite spec (#4) re-enables real bundle
 * resolution. The command stays in the binary so muscle memory survives;
 * exits 0 with a pointer at the roadmap.
 */
export async function runAdd(_options: AddOptions): Promise<AddResult> {
  console.log(pc.bold("\nNo add-on bundles ship in 1.0.\n"))
  console.log(
    "The three starter kits (marketing, saas, default) arrive in the kits rewrite\n" +
      "(https://forkshop.dev/roadmap). Use `forkshop init` to install the base; run\n" +
      "the setup skill (open Claude Code, say 'set up Forkshop') to scaffold\n" +
      "app/forkshop/ for now."
  )
  return { ok: true }
}
