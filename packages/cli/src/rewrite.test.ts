import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { rewriteImports, type AliasMap } from "./rewrite.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, "__fixtures__/rewrite")

const DEFAULT_ALIASES: AliasMap = {
  "@forkshop/components": "@/components/forkshop",
  "@forkshop/kits": "@/components/forkshop/kits",
  "@forkshop/hooks": "@/lib/forkshop/hooks",
  "@forkshop/lib": "@/lib/forkshop",
  "@forkshop/api": "@/app/api/forkshop",
  "@forkshop/tailwind": "@/lib/forkshop/tailwind",
}

const FIXTURES = ["plain", "dynamic", "type-only", "re-export", "mixed", "js-suffix", "unmatched"]

describe("rewriteImports", () => {
  for (const fixture of FIXTURES) {
    it(`matches the golden output for fixture: ${fixture}`, async () => {
      const ext = fixture === "plain" || fixture === "mixed" ? "tsx" : "ts"
      const input = await fs.readFile(
        path.join(FIXTURES_DIR, fixture, `input.${ext}`),
        "utf8",
      )
      const expected = await fs.readFile(
        path.join(FIXTURES_DIR, fixture, `expected.${ext}`),
        "utf8",
      )
      const actual = rewriteImports(input, DEFAULT_ALIASES)
      expect(actual).toBe(expected)
    })
  }

  it("returns input unchanged when no @forkshop imports present", () => {
    const source = `import { useState } from "react"\nexport const x = useState`
    expect(rewriteImports(source, DEFAULT_ALIASES)).toBe(source)
  })

  it("picks the longest matching alias prefix", () => {
    const aliases: AliasMap = {
      "@forkshop/components": "@/foo",
      "@forkshop/components/canvas": "@/bar/canvas",
    }
    const source = `import { X } from "@forkshop/components/canvas/x"`
    const expected = `import { X } from "@/bar/canvas/x"`
    expect(rewriteImports(source, aliases)).toBe(expected)
  })

  it("returns empty string for empty input", () => {
    expect(rewriteImports("", DEFAULT_ALIASES)).toBe("")
  })

  it("returns input unchanged when aliases map is empty", () => {
    const source = `import { X } from "@forkshop/lib/foo"`
    expect(rewriteImports(source, {})).toBe(source)
  })
})
