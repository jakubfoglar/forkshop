import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdtemp, mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let originalCwd: string
let tempDir: string

beforeEach(async () => {
  originalCwd = process.cwd()
  tempDir = await mkdtemp(join(tmpdir(), "forkshop-positions-test-"))
  process.chdir(tempDir)
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

describe("GET /api/forkshop/positions — ?mount= param resolves storage path", () => {
  it("reads from app/forkshop/positions.json by default", async () => {
    await mkdir(join(tempDir, "app/forkshop"), { recursive: true })
    const { writeFile } = await import("node:fs/promises")
    await writeFile(
      join(tempDir, "app/forkshop/positions.json"),
      JSON.stringify({ "node-a": { x: 10, y: 20 } }),
    )
    const { GET } = await import("@forkshop/api/positions/route")
    const res = await GET(new Request("http://x/api/forkshop/positions"))
    expect(res.status).toBe(200)
    const json = (await res.json()) as Record<string, unknown>
    expect(json["node-a"]).toEqual({ x: 10, y: 20 })
  })

  it("reads from the path given by ?mount= query param", async () => {
    await mkdir(join(tempDir, "app/demo"), { recursive: true })
    const { writeFile } = await import("node:fs/promises")
    await writeFile(
      join(tempDir, "app/demo/positions.json"),
      JSON.stringify({ "demo-node": { x: 42, y: 99 } }),
    )
    const { GET } = await import("@forkshop/api/positions/route")
    const res = await GET(
      new Request("http://x/api/forkshop/positions?mount=app%2Fdemo"),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as Record<string, unknown>
    expect(json["demo-node"]).toEqual({ x: 42, y: 99 })
  })

  it("returns empty object when the file does not exist", async () => {
    const { GET } = await import("@forkshop/api/positions/route")
    const res = await GET(
      new Request("http://x/api/forkshop/positions?mount=app%2Fmissing"),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
  })

  it("reads from FORKSHOP_POSITIONS_PATH env var when no ?mount= param", async () => {
    await mkdir(join(tempDir, "app/custom"), { recursive: true })
    const { writeFile } = await import("node:fs/promises")
    await writeFile(
      join(tempDir, "app/custom/positions.json"),
      JSON.stringify({ "env-node": { x: 5, y: 6 } }),
    )
    vi.stubEnv("FORKSHOP_POSITIONS_PATH", "app/custom/positions.json")
    const { GET } = await import("@forkshop/api/positions/route")
    const res = await GET(new Request("http://x/api/forkshop/positions"))
    const json = (await res.json()) as Record<string, unknown>
    expect(json["env-node"]).toEqual({ x: 5, y: 6 })
  })

  it("two different mount paths are isolated", async () => {
    await mkdir(join(tempDir, "app/board-a"), { recursive: true })
    await mkdir(join(tempDir, "app/board-b"), { recursive: true })
    const { writeFile } = await import("node:fs/promises")
    await writeFile(
      join(tempDir, "app/board-a/positions.json"),
      JSON.stringify({ "shared-id": { x: 1, y: 1 } }),
    )
    await writeFile(
      join(tempDir, "app/board-b/positions.json"),
      JSON.stringify({ "shared-id": { x: 2, y: 2 } }),
    )
    const { GET } = await import("@forkshop/api/positions/route")
    const resA = await GET(
      new Request("http://x/api/forkshop/positions?mount=app%2Fboard-a"),
    )
    const resB = await GET(
      new Request("http://x/api/forkshop/positions?mount=app%2Fboard-b"),
    )
    const jsonA = (await resA.json()) as Record<string, unknown>
    const jsonB = (await resB.json()) as Record<string, unknown>
    expect(jsonA["shared-id"]).toEqual({ x: 1, y: 1 })
    expect(jsonB["shared-id"]).toEqual({ x: 2, y: 2 })
  })
})

describe("POST /api/forkshop/positions — ?mount= param writes to correct file", () => {
  it("is blocked in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { POST } = await import("@forkshop/api/positions/route")
    const res = await POST(
      new Request("http://x/api/forkshop/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "node-x", x: 1, y: 2 }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it("writes to the path given by ?mount= query param", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { POST, GET } = await import("@forkshop/api/positions/route")
    await POST(
      new Request("http://x/api/forkshop/positions?mount=app%2Fmy-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "node-y", x: 7, y: 8 }),
      }),
    )
    const res = await GET(
      new Request("http://x/api/forkshop/positions?mount=app%2Fmy-board"),
    )
    const json = (await res.json()) as Record<string, unknown>
    expect(json["node-y"]).toEqual({ x: 7, y: 8 })
  })
})
