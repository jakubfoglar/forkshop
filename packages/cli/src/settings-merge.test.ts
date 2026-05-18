import { describe, expect, it } from "vitest"
import { mergeClaudeSettings, type HookEntry } from "./settings-merge.js"

const HOOK_CMD = ".claude/hooks/forkshop-post-tool-use.sh"
const EXPECTED_ENTRY: HookEntry = {
  matcher: "Edit|Write|MultiEdit|Read",
  hooks: [{ type: "command", command: HOOK_CMD, timeout: 5 }],
}

describe("mergeClaudeSettings", () => {
  it("creates hooks.PostToolUse with Claude Code's matcher+hooks schema from empty settings", () => {
    const result = mergeClaudeSettings({}, HOOK_CMD)
    expect(result.merged.hooks.PostToolUse).toEqual([EXPECTED_ENTRY])
    expect(result.changed).toBe(true)
  })

  it("appends to existing PostToolUse array preserving prior entries", () => {
    const existingEntry: HookEntry = {
      matcher: "Edit",
      hooks: [{ type: "command", command: "other-hook.sh" }],
    }
    const existing = { hooks: { PostToolUse: [existingEntry] } }
    const result = mergeClaudeSettings(existing, HOOK_CMD)
    expect(result.merged.hooks.PostToolUse).toEqual([existingEntry, EXPECTED_ENTRY])
    expect(result.changed).toBe(true)
  })

  it("is idempotent — second call does not add a duplicate", () => {
    const first = mergeClaudeSettings({}, HOOK_CMD)
    const second = mergeClaudeSettings(first.merged, HOOK_CMD)
    expect(second.changed).toBe(false)
    expect(second.merged.hooks.PostToolUse).toEqual([EXPECTED_ENTRY])
  })

  it("preserves unrelated top-level keys verbatim", () => {
    const existing = {
      permissions: { fileSystemRoot: ".", allowed: ["pnpm"] },
      hooks: {
        PreToolUse: [
          { matcher: "Edit", hooks: [{ type: "command" as const, command: "x.sh" }] },
        ],
      },
    }
    const result = mergeClaudeSettings(existing, HOOK_CMD)
    expect(result.merged.permissions).toEqual(existing.permissions)
    expect(result.merged.hooks.PreToolUse).toEqual(existing.hooks.PreToolUse)
  })

  it("throws when input is not a plain object", () => {
    expect(() => mergeClaudeSettings(null as never, HOOK_CMD)).toThrow()
    expect(() => mergeClaudeSettings("nope" as never, HOOK_CMD)).toThrow()
    expect(() => mergeClaudeSettings([1, 2] as never, HOOK_CMD)).toThrow()
  })

  it("throws when hooks exists but is not an object", () => {
    expect(() => mergeClaudeSettings({ hooks: "broken" } as never, HOOK_CMD)).toThrow()
  })

  it("throws when hooks.PostToolUse exists but is not an array", () => {
    expect(() =>
      mergeClaudeSettings({ hooks: { PostToolUse: "not-an-array" } } as never, HOOK_CMD),
    ).toThrow()
  })
})
