import { describe, it, expect } from "vitest"
import { matchTarballContents } from "./verify-tarball.js"

describe("matchTarballContents", () => {
  const okContents = [
    "package/package.json",
    "package/LICENSE",
    "package/LICENSE-icons.md",
    "package/README.md",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/dist/forkshop.css",
    "package/dist/fonts/RaveoVF.woff2",
    "package/dist/api/edit/route.js",
    "package/dist/api/positions/route.js",
    "package/dist/api/agent-activity/route.js",
    "package/dist/api/agent-activity/stream/route.js",
  ]

  it("passes for a clean expected tarball", () => {
    const result = matchTarballContents(okContents)
    expect(result.errors).toEqual([])
  })

  it("flags missing required files", () => {
    const result = matchTarballContents(okContents.filter((f) => !f.endsWith("forkshop.css")))
    expect(result.errors.join("\n")).toContain("forkshop.css")
  })

  it("flags forbidden src/ leak", () => {
    const result = matchTarballContents([...okContents, "package/src/index.ts"])
    expect(result.errors.join("\n")).toContain("src/")
  })

  it("flags forbidden test files", () => {
    const result = matchTarballContents([...okContents, "package/dist/api/edit/route.test.js"])
    expect(result.errors.join("\n")).toContain("test")
  })

  it("flags forbidden templates/, skill/, tailwind/ leaks", () => {
    const result1 = matchTarballContents([...okContents, "package/templates/user-claude-md.md"])
    expect(result1.errors.join("\n")).toContain("templates")
    const result2 = matchTarballContents([...okContents, "package/src/skill/setup.md"])
    expect(result2.errors.join("\n")).toContain("skill")
    const result3 = matchTarballContents([...okContents, "package/tailwind/forkshop-preset.ts"])
    expect(result3.errors.join("\n")).toContain("tailwind")
  })
})
