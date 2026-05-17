import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchFontTo } from "./font-fetch.js"

describe("fetchFontTo", () => {
  const tempDirs: string[] = []
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    global.fetch = originalFetch
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  it("writes the font from the primary URL", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-font-"))
    tempDirs.push(root)
    const dest = path.join(root, "public/fonts/forkshop/RaveoVF.woff2")

    const payload = new Uint8Array([0x77, 0x4f, 0x46, 0x32]) // "wOF2"
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => payload.buffer,
    } as unknown as Response)

    const result = await fetchFontTo({
      primaryUrl: "https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2",
      fallbackUrl: "https://unpkg.com/@forkshop/engine@0.3.0/dist/fonts/RaveoVF.woff2",
      destAbsolute: dest,
    })

    expect(result).toEqual({ source: "primary", bytes: 4 })
    const written = await fs.readFile(dest)
    expect(Array.from(written)).toEqual([0x77, 0x4f, 0x46, 0x32])
  })

  it("falls back to unpkg when primary returns 404", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-font-"))
    tempDirs.push(root)
    const dest = path.join(root, "public/fonts/forkshop/RaveoVF.woff2")

    const payload = new Uint8Array([0x77, 0x4f, 0x46, 0x32])
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => payload.buffer,
      } as unknown as Response)

    const result = await fetchFontTo({
      primaryUrl: "https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2",
      fallbackUrl: "https://unpkg.com/@forkshop/engine@0.3.0/dist/fonts/RaveoVF.woff2",
      destAbsolute: dest,
    })

    expect(result.source).toBe("fallback")
  })

  it("throws when both URLs fail", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-font-"))
    tempDirs.push(root)
    const dest = path.join(root, "public/fonts/forkshop/RaveoVF.woff2")

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response)

    await expect(
      fetchFontTo({
        primaryUrl: "https://forkshop.dev/r/fonts/raveo/RaveoVF.woff2",
        fallbackUrl: "https://unpkg.com/@forkshop/engine@0.3.0/dist/fonts/RaveoVF.woff2",
        destAbsolute: dest,
      })
    ).rejects.toThrow(/Could not fetch font/)
  })
})
