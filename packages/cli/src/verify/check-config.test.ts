import { describe, it, expect } from "vitest"
import { checkConfig } from "./check-config.js"

describe("checkConfig", () => {
  it("flags missing forkshop.config.tsx", async () => {
    const result = await checkConfig({ cwd: "/tmp/nonexistent-forkshop-test" })
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]?.file).toContain("forkshop.config")
  })
})
