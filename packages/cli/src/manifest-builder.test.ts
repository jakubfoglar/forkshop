import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildManifest } from "./manifest-builder.js"

async function makeEngineFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "engine-fixture-"))
  await fs.mkdir(path.join(root, "src/skill"), { recursive: true })
  await fs.writeFile(path.join(root, "src/skill/setup.md"), "# setup")
  await fs.writeFile(path.join(root, "src/skill/live-editing.md"), "# live")
  await fs.writeFile(path.join(root, "src/skill/doc-sync.md"), "# doc-sync")

  await fs.mkdir(path.join(root, "templates/api-stubs"), { recursive: true })
  await fs.writeFile(
    path.join(root, "templates/user-claude-md.md"),
    "# user CLAUDE"
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/edit-route.ts.template"),
    'export { POST, GET } from "@forkshop/engine/api/edit/route"\n'
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/positions-route.ts.template"),
    'export { POST, GET } from "@forkshop/engine/api/positions/route"\n'
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/agent-activity-route.ts.template"),
    'export { POST } from "@forkshop/engine/api/agent-activity/route"\n'
  )
  await fs.writeFile(
    path.join(root, "templates/api-stubs/agent-activity-stream-route.ts.template"),
    'export { GET } from "@forkshop/engine/api/agent-activity/stream/route"\n'
  )

  await fs.mkdir(path.join(root, "fonts/raveo"), { recursive: true })
  await fs.writeFile(
    path.join(root, "fonts/raveo/RaveoVF.woff2"),
    Buffer.from([0x77, 0x4f, 0x46, 0x32])
  )

  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "@forkshop/engine", version: "0.3.0" })
  )
  return root
}

describe("buildManifest (v2)", () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
  })

  it("walks skill + templates + fonts and emits v2 shapes", async () => {
    const engineRoot = await makeEngineFixture()
    dirs.push(engineRoot)
    const manifest = await buildManifest({ registryRoot: engineRoot })

    expect(manifest.version).toBe("2.0.0")
    expect(manifest.engineVersion).toBe("0.3.0")

    // Bundles exist
    expect(manifest.bundles.skill).toBeDefined()
    expect(manifest.bundles["route-stubs"]).toBeDefined()
    expect(manifest.bundles["claude-md"]).toBeDefined()
    expect(manifest.bundles.font).toBeDefined()
    expect(manifest.bundles.init).toBeDefined()

    // Skill addresses
    expect(manifest.files["@forkshop/skill/setup"]).toBeDefined()
    expect(manifest.files["@forkshop/skill/setup"]).toMatchObject({
      kind: "text",
      ext: "md",
      destOverride: ".claude/skills/forkshop-setup.md",
    })

    // CLAUDE.md
    expect(manifest.files["@forkshop/templates/claude-md"]).toMatchObject({
      kind: "text",
      ext: "md",
      destOverride: "{aliases.mount}/CLAUDE.md",
    })

    // Route stubs (4)
    expect(manifest.files["@forkshop/route-stubs/edit"]).toMatchObject({
      kind: "text",
      ext: "ts",
      destOverride: "app/api/forkshop/edit/route.ts",
    })
    expect(manifest.files["@forkshop/route-stubs/agent-activity-stream"]).toMatchObject({
      destOverride: "app/api/forkshop/agent-activity/stream/route.ts",
    })

    // Font
    expect(manifest.files["@forkshop/fonts/raveo/RaveoVF"]).toMatchObject({
      kind: "binary",
      destOverride: "public/fonts/forkshop/RaveoVF.woff2",
    })

    // Init composite
    expect(manifest.bundles.init).toMatchObject({
      kind: "composite",
      includes: expect.arrayContaining(["route-stubs", "skill", "claude-md", "font"]),
    })
  })
})
