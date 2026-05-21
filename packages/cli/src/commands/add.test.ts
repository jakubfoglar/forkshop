import { describe, expect, it, vi } from "vitest"
import { runAdd } from "./add.js"

describe("runAdd (placeholder)", () => {
  it("prints the no-add-on-bundles message and returns ok", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = await runAdd({ projectRoot: "/tmp", bundleName: "marketing" })
    expect(result.ok).toBe(true)
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n")
    expect(output).toMatch(/No add-on bundles in 0\.x/)
    expect(output).toMatch(/set up Forkshop/)
    logSpy.mockRestore()
  })

  it("does not touch the filesystem (no manifest fetch, no file copy)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
    await runAdd({ projectRoot: "/tmp", bundleName: "anything" })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
