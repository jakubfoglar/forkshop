import { describe, it, expect } from "vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"
import { runDirectiveChecks } from "./verify-directives.js"

async function mkdtemp() {
  return fs.mkdtemp(path.join(os.tmpdir(), "engine-directives-"))
}

describe("runDirectiveChecks", () => {
  it("passes when at least one dist chunk has 'use client' and no api/* file does", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `"use client";\nexport const X = 1\n`)
    await fs.mkdir(path.join(dir, "api/edit"), { recursive: true })
    await fs.writeFile(path.join(dir, "api/edit/route.js"), `export async function POST() {}\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("fails when no dist chunk has 'use client'", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `export const X = 1\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.join("\n")).toContain("No dist chunk")
  })

  it("fails when an api/* route handler is client-tagged", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `"use client";\nexport const X = 1\n`)
    await fs.mkdir(path.join(dir, "api/edit"), { recursive: true })
    await fs.writeFile(path.join(dir, "api/edit/route.js"), `"use client";\nexport async function POST() {}\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(false)
    expect(result.errors.join("\n")).toContain("api/edit/route.js")
  })

  it("accepts single-quoted 'use client'", async () => {
    const dir = await mkdtemp()
    await fs.writeFile(path.join(dir, "chunk-A.js"), `'use client';\nexport const X = 1\n`)
    const result = await runDirectiveChecks(dir)
    expect(result.ok).toBe(true)
  })
})
