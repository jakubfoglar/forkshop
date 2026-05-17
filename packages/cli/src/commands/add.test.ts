import { describe, expect, it, vi } from "vitest"
import { runAdd } from "./add.js"

describe("runAdd (placeholder for 1.0)", () => {
  it("prints the deferred-kits message and returns ok", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = await runAdd({ projectRoot: "/tmp", bundleName: "marketing" })
    expect(result.ok).toBe(true)
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n")
    expect(output).toMatch(/No add-on bundles ship in 1\.0/)
    expect(output).toMatch(/kits rewrite/)
    logSpy.mockRestore()
  })

  it("does not touch the filesystem (no manifest fetch, no file copy)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
    await runAdd({ projectRoot: "/tmp", bundleName: "anything" })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
