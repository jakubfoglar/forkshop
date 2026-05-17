import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { appendForkshopCssImport } from "./globals-css-append.js"

describe("appendForkshopCssImport", () => {
  const tempDirs: string[] = []
  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
  })

  async function makeProject(initialCss: string | undefined): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-css-"))
    tempDirs.push(root)
    if (initialCss !== undefined) {
      await fs.mkdir(path.join(root, "app"), { recursive: true })
      await fs.writeFile(path.join(root, "app/globals.css"), initialCss, "utf8")
    }
    return root
  }

  it("prepends the import at the top when absent", async () => {
    const root = await makeProject("@tailwind base;\n@tailwind utilities;\n")
    const result = await appendForkshopCssImport(root)
    expect(result).toEqual({ action: "added", target: "app/globals.css" })
    const after = await fs.readFile(path.join(root, "app/globals.css"), "utf8")
    expect(after).toBe(
      '@import "@forkshop/engine/forkshop.css";\n@tailwind base;\n@tailwind utilities;\n'
    )
  })

  it("is idempotent — skips if the import is already present", async () => {
    const root = await makeProject(
      '@import "@forkshop/engine/forkshop.css";\n@tailwind utilities;\n'
    )
    const result = await appendForkshopCssImport(root)
    expect(result).toEqual({ action: "skipped", target: "app/globals.css" })
  })

  it("detects the import even with single quotes", async () => {
    const root = await makeProject(
      "@import '@forkshop/engine/forkshop.css';\n@tailwind utilities;\n"
    )
    const result = await appendForkshopCssImport(root)
    expect(result.action).toBe("skipped")
  })

  it("returns not-found with searched paths when no globals.css exists anywhere", async () => {
    const root = await makeProject(undefined)
    const result = await appendForkshopCssImport(root)
    expect(result.action).toBe("not-found")
    if (result.action === "not-found") {
      expect(result.searched).toContain("app/globals.css")
      expect(result.searched).toContain("src/app/globals.css")
    }
  })
})
