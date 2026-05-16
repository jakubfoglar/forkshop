import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { writeFile, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let originalCwd: string
let tempDir: string

beforeEach(async () => {
  originalCwd = process.cwd()
  tempDir = await mkdtemp(join(tmpdir(), "forkshop-edit-test-"))
  process.chdir(tempDir)
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

describe("GET /api/edit (read source)", () => {
  it("returns 403 in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=app/page.tsx"))
    expect(res.status).toBe(403)
  })

  it("returns 400 when path query is missing", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit"))
    expect(res.status).toBe(400)
  })

  it("returns 400 when path escapes project root", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=../outside.tsx"))
    expect(res.status).toBe(400)
  })

  it("returns 404 when file does not exist", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=nonexistent.tsx"))
    expect(res.status).toBe(404)
  })

  it("returns the file source on success", async () => {
    vi.stubEnv("NODE_ENV", "development")
    await writeFile(join(tempDir, "page.tsx"), "export const HEADLINE = \"Welcome\"\n")
    const { GET } = await import("@forkshop/api/edit/route")
    const res = await GET(new Request("http://x/edit?path=page.tsx"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe("export const HEADLINE = \"Welcome\"\n")
  })
})
