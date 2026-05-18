import { promises as fs } from "node:fs"
import path from "node:path"
import type { Manifest } from "./manifest-schema.js"
import { mergeClaudeSettings, type ClaudeSettings } from "./settings-merge.js"

const HOOK_ADDRESS = "@forkshop/hooks/forkshop-post-tool-use"
const HOOK_DEST = ".claude/hooks/forkshop-post-tool-use.sh"
const SETTINGS_PATH = ".claude/settings.json"

export type InstallPackOptions = {
  projectRoot: string
  manifest: Manifest
  consent: boolean
}

export type InstallPackResult = { installed: boolean }

export async function maybeInstallClaudeCodePack(
  opts: InstallPackOptions,
): Promise<InstallPackResult> {
  if (!opts.consent) return { installed: false }

  const file = opts.manifest.files[HOOK_ADDRESS]
  if (!file || file.kind !== "text") return { installed: false }

  // Write the hook script with executable permissions.
  const hookPath = path.join(opts.projectRoot, HOOK_DEST)
  await fs.mkdir(path.dirname(hookPath), { recursive: true })
  await fs.writeFile(hookPath, file.content, { mode: 0o755 })

  // Idempotently merge the hook entry into .claude/settings.json.
  const settingsPath = path.join(opts.projectRoot, SETTINGS_PATH)
  let existing: ClaudeSettings = {}
  try {
    const text = await fs.readFile(settingsPath, "utf8")
    existing = JSON.parse(text) as ClaudeSettings
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") throw error
  }

  const { merged, changed } = mergeClaudeSettings(existing, HOOK_DEST)
  if (changed) {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true })
    await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2) + "\n", "utf8")
  }

  return { installed: true }
}
