import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { detectSrcPrefix } from "./detect-src-dir.js"

async function makeProject(tsconfig: string | undefined): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "forkshop-detect-src-"))
  if (tsconfig !== undefined) {
    await fs.writeFile(path.join(root, "tsconfig.json"), tsconfig, "utf8")
  }
  return root
}

describe("detectSrcPrefix", () => {
  let root: string | undefined

  afterEach(async () => {
    if (root) await fs.rm(root, { recursive: true, force: true })
    root = undefined
  })

  it("returns '' when tsconfig.json is missing", async () => {
    root = await makeProject(undefined)
    expect(await detectSrcPrefix(root)).toBe("")
  })

  it("returns '' for flat layout (@/* → ./*)", async () => {
    root = await makeProject(
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }),
    )
    expect(await detectSrcPrefix(root)).toBe("")
  })

  it("returns 'src/' for src/ layout (@/* → ./src/*)", async () => {
    root = await makeProject(
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
    )
    expect(await detectSrcPrefix(root)).toBe("src/")
  })

  it("handles JSONC comments (create-next-app default)", async () => {
    root = await makeProject(`{
      // Comment from create-next-app
      "compilerOptions": {
        /* multi-line
           comment */
        "paths": {
          "@/*": ["./src/*"]
        }
      }
    }`)
    expect(await detectSrcPrefix(root)).toBe("src/")
  })

  it("returns '' on malformed tsconfig", async () => {
    root = await makeProject(`{ not json }`)
    expect(await detectSrcPrefix(root)).toBe("")
  })

  it("returns '' when paths has no @/* entry", async () => {
    root = await makeProject(
      JSON.stringify({ compilerOptions: { paths: { "~/*": ["./src/*"] } } }),
    )
    expect(await detectSrcPrefix(root)).toBe("")
  })
})
