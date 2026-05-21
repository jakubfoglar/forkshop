import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { maybeInstallClaudeCodePack } from "./install-claude-pack.js"
import type { Manifest } from "./manifest-schema.js"
import type { HookEntry } from "./settings-merge.js"

const HOOK_COMMAND = '"$CLAUDE_PROJECT_DIR"/.claude/hooks/forkshop-post-tool-use.sh'
const EXPECTED_ENTRY: HookEntry = {
  matcher: "Edit|Write|MultiEdit|Read",
  hooks: [{ type: "command", command: HOOK_COMMAND, timeout: 5 }],
}

let tmp: string
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-pack-"))
})
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true })
})

const manifest: Manifest = {
  version: "2.1.0",
  generatedAt: new Date().toISOString(),
  registryBaseUrl: "https://forkshop.dev/r/",
  engineVersion: "0.0.0",
  bundles: {
    hooks: { kind: "scaffold", items: ["@forkshop/hooks/forkshop-post-tool-use"] },
  },
  files: {
    "@forkshop/hooks/forkshop-post-tool-use": {
      kind: "text",
      ext: "sh",
      content: "#!/usr/bin/env bash\nexit 0\n",
      destOverride: ".claude/hooks/forkshop-post-tool-use.sh",
    },
  },
}

type SettingsShape = {
  hooks: { PostToolUse: HookEntry[] }
  permissions?: { allowed: string[] }
}

describe("maybeInstallClaudeCodePack", () => {
  it("does nothing when consent is false", async () => {
    const result = await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: false })
    expect(result.installed).toBe(false)
    await expect(
      fs.access(path.join(tmp, ".claude/hooks/forkshop-post-tool-use.sh")),
    ).rejects.toThrow()
  })

  it("creates the hook script + settings on consent", async () => {
    const result = await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: true })
    expect(result.installed).toBe(true)
    const hookContent = await fs.readFile(
      path.join(tmp, ".claude/hooks/forkshop-post-tool-use.sh"),
      "utf8",
    )
    expect(hookContent).toMatch(/^#!\/usr\/bin\/env bash/)
    const settings = JSON.parse(
      await fs.readFile(path.join(tmp, ".claude/settings.json"), "utf8"),
    ) as SettingsShape
    expect(settings.hooks.PostToolUse).toContainEqual(EXPECTED_ENTRY)
  })

  it("is idempotent on second call", async () => {
    await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: true })
    await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: true })
    const settings = JSON.parse(
      await fs.readFile(path.join(tmp, ".claude/settings.json"), "utf8"),
    ) as SettingsShape
    const matching = settings.hooks.PostToolUse.filter((entry) =>
      entry.hooks.some((h) => h.command === HOOK_COMMAND),
    )
    expect(matching).toHaveLength(1)
  })

  it("preserves existing settings.json keys", async () => {
    await fs.mkdir(path.join(tmp, ".claude"), { recursive: true })
    await fs.writeFile(
      path.join(tmp, ".claude/settings.json"),
      JSON.stringify({ permissions: { allowed: ["pnpm"] } }, null, 2),
    )
    await maybeInstallClaudeCodePack({ projectRoot: tmp, manifest, consent: true })
    const settings = JSON.parse(
      await fs.readFile(path.join(tmp, ".claude/settings.json"), "utf8"),
    ) as SettingsShape
    expect(settings.permissions?.allowed).toEqual(["pnpm"])
    expect(settings.hooks.PostToolUse).toHaveLength(1)
  })
})
