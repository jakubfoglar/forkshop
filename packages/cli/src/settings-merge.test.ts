import { describe, expect, it } from "vitest"
import { mergeClaudeSettings } from "./settings-merge.js"

const HOOK_CMD = ".claude/hooks/forkshop-post-tool-use.sh"

describe("mergeClaudeSettings", () => {
  it("creates hooks.PostToolUse from empty settings", () => {
    const result = mergeClaudeSettings({}, HOOK_CMD)
    expect(result.merged.hooks.PostToolUse).toEqual([{ command: HOOK_CMD }])
    expect(result.changed).toBe(true)
  })

  it("appends to existing PostToolUse array", () => {
    const existing = {
      hooks: { PostToolUse: [{ command: "other-hook.sh" }] },
    }
    const result = mergeClaudeSettings(existing, HOOK_CMD)
    expect(result.merged.hooks.PostToolUse).toEqual([
      { command: "other-hook.sh" },
      { command: HOOK_CMD },
    ])
    expect(result.changed).toBe(true)
  })

  it("is idempotent — second call does not add a duplicate", () => {
    const first = mergeClaudeSettings({}, HOOK_CMD)
    const second = mergeClaudeSettings(first.merged, HOOK_CMD)
    expect(second.changed).toBe(false)
    expect(second.merged.hooks.PostToolUse).toEqual([{ command: HOOK_CMD }])
  })

  it("preserves unrelated top-level keys verbatim", () => {
    const existing = {
      permissions: { fileSystemRoot: ".", allowed: ["pnpm"] },
      hooks: { PreToolUse: [{ command: "x.sh" }] },
    }
    const result = mergeClaudeSettings(existing, HOOK_CMD)
    expect(result.merged.permissions).toEqual(existing.permissions)
    expect(result.merged.hooks.PreToolUse).toEqual([{ command: "x.sh" }])
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
