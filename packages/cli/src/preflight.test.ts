import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { preflightInit } from "./preflight.js"

async function makeTempProject(setup: (root: string) => Promise<void>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-preflight-"))
  await setup(root)
  return root
}

async function rmrf(p: string) {
  await fs.rm(p, { recursive: true, force: true })
}

describe("preflightInit", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await rmrf(dir)
  })

  it("succeeds for a Next.js App Router project with @/* alias", async () => {
    const root = await makeTempProject(async (r) => {
      await fs.mkdir(path.join(r, "app"))
      await fs.writeFile(path.join(r, "next.config.js"), "module.exports = {}")
      await fs.writeFile(
        path.join(r, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })
      )
    })
    tempDirs.push(root)
    const result = await preflightInit(root, {})
    expect(result.ok).toBe(true)
  })

  it("fails when no Next.js evidence present", async () => {
    const root = await makeTempProject(async () => {})
    tempDirs.push(root)
    const result = await preflightInit(root, {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/Next\.js/)
  })

  it("fails when tsconfig.json is missing", async () => {
    const root = await makeTempProject(async (r) => {
      await fs.mkdir(path.join(r, "app"))
    })
    tempDirs.push(root)
    const result = await preflightInit(root, {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/tsconfig/)
  })

  it("fails when @/* alias is absent from tsconfig paths", async () => {
    const root = await makeTempProject(async (r) => {
      await fs.mkdir(path.join(r, "app"))
      await fs.writeFile(
        path.join(r, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { paths: {} } })
      )
    })
    tempDirs.push(root)
    const result = await preflightInit(root, {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/@\/\*/)
  })
})

describe("preflightInit JSONC handling", () => {
  it("succeeds for a tsconfig that uses @/* path alias", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-preflight-jsonc-"))
    try {
      await fs.mkdir(path.join(root, "app"))
      await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
      // Pretty-printed tsconfig with @/* path alias AND include patterns containing *
      await fs.writeFile(
        path.join(root, "tsconfig.json"),
        `{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}`
      )
      const result = await preflightInit(root, {})
      expect(result.ok).toBe(true)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it("handles block comments inside tsconfig", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-preflight-jsonc-"))
    try {
      await fs.mkdir(path.join(root, "app"))
      await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
      await fs.writeFile(
        path.join(root, "tsconfig.json"),
        `{
  /* main config */
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"] // <-- magic alias
    }
  }
}`
      )
      const result = await preflightInit(root, {})
      expect(result.ok).toBe(true)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it("handles trailing commas", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fogma-preflight-jsonc-"))
    try {
      await fs.mkdir(path.join(root, "app"))
      await fs.writeFile(path.join(root, "next.config.js"), "module.exports = {}")
      await fs.writeFile(
        path.join(root, "tsconfig.json"),
        `{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
    },
  },
}`
      )
      const result = await preflightInit(root, {})
      expect(result.ok).toBe(true)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
