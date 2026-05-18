/**
 * Claude Code's PostToolUse hook entry shape:
 *   { matcher: "Edit|Write|...", hooks: [{ type: "command", command: "...", timeout?: number }] }
 *
 * (NOT the simplified `{ command }` shape — Claude Code's settings parser
 * rejects that with a "hooks: Expected array, but received undefined" error.)
 */
export type HookCommand = {
  type: "command"
  command: string
  timeout?: number
}

export type HookEntry = {
  matcher: string
  hooks: HookCommand[]
}

export type ClaudeSettings = {
  hooks?: { PostToolUse?: HookEntry[]; PreToolUse?: HookEntry[]; [k: string]: unknown }
  [k: string]: unknown
}

export type MergeResult = {
  merged: ClaudeSettings & { hooks: { PostToolUse: HookEntry[] } }
  changed: boolean
}

const DEFAULT_MATCHER = "Edit|Write|MultiEdit|Read"
const DEFAULT_TIMEOUT = 5

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

  // Idempotency: is any entry already wiring this exact command?
  const alreadyPresent = ptu.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      Array.isArray(entry.hooks) &&
      entry.hooks.some(
        (h) => typeof h === "object" && h !== null && h.command === hookCommand,
      ),
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

  ptu.push({
    matcher: DEFAULT_MATCHER,
    hooks: [
      {
        type: "command",
        command: hookCommand,
        timeout: DEFAULT_TIMEOUT,
      },
    ],
  })
  return {
    merged: {
      ...input,
      hooks: { ...(hooks ?? {}), PostToolUse: ptu },
    } as MergeResult["merged"],
    changed: true,
  }
}
