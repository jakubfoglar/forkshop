export type HookEntry = { command: string }

export type ClaudeSettings = {
  hooks?: { PostToolUse?: HookEntry[]; PreToolUse?: HookEntry[]; [k: string]: unknown }
  [k: string]: unknown
}

export type MergeResult = {
  merged: ClaudeSettings & { hooks: { PostToolUse: HookEntry[] } }
  changed: boolean
}

export function mergeClaudeSettings(
  input: ClaudeSettings,
  hookCommand: string,
): MergeResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("settings.json root must be a plain object")
  }
  const hooks = input.hooks
  if (hooks !== undefined && (typeof hooks !== "object" || Array.isArray(hooks))) {
    throw new Error("settings.json `hooks` must be an object")
  }
  const existingPTU = (hooks as { PostToolUse?: unknown } | undefined)?.PostToolUse
  if (existingPTU !== undefined && !Array.isArray(existingPTU)) {
    throw new Error("settings.json `hooks.PostToolUse` must be an array")
  }

  const ptu = ([...((existingPTU as HookEntry[] | undefined) ?? [])] as HookEntry[])
  const alreadyPresent = ptu.some(
    (entry) => typeof entry === "object" && entry !== null && entry.command === hookCommand,
  )
  if (alreadyPresent) {
    return {
      merged: {
        ...input,
        hooks: { ...(hooks ?? {}), PostToolUse: ptu },
      } as MergeResult["merged"],
      changed: false,
    }
  }
  ptu.push({ command: hookCommand })
  return {
    merged: {
      ...input,
      hooks: { ...(hooks ?? {}), PostToolUse: ptu },
    } as MergeResult["merged"],
    changed: true,
  }
}
