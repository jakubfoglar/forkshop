import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchManifest } from "./fetch-manifest.js"
import type { Manifest } from "./manifest-schema.js"

function makeManifest(version: string): Manifest {
  return {
    version,
    generatedAt: "2026-05-21T00:00:00Z",
    registryBaseUrl: "https://forkshop.dev/r/",
    engineVersion: "0.4.0",
    bundles: {},
    files: {},
  }
}

describe("fetchManifest — schema version compatibility", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("accepts manifest version 2.1.0 without warning", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeManifest("2.1.0"),
    } as unknown as Response)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const result = await fetchManifest("https://example.test/r/")
    expect(result.version).toBe("2.1.0")
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("accepts manifest version 2.0.0 with a soft console.warn", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeManifest("2.0.0"),
    } as unknown as Response)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const result = await fetchManifest("https://example.test/r/")
    expect(result.version).toBe("2.0.0")
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const message = String(warnSpy.mock.calls[0]?.[0] ?? "")
    expect(message).toContain("2.0.0")
    expect(message).toContain("2.1.0")
    expect(message).toContain("forkshop init")
  })

  it("rejects unsupported manifest versions with a hard error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeManifest("1.9.0"),
    } as unknown as Response)

    await expect(fetchManifest("https://example.test/r/")).rejects.toThrow(
      /incompatible with this registry/
    )
  })

  it("rebinds registryBaseUrl to the host that was just fetched from", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeManifest("2.1.0"),
    } as unknown as Response)

    const result = await fetchManifest("https://local.test/r")
    expect(result.registryBaseUrl).toBe("https://local.test/r/")
  })
})
