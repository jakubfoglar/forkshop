import { describe, expect, it } from "vitest"
import { normalizeImportSource } from "./normalize-imports.js"

describe("normalizeImportSource", () => {
  it("rewrites a relative .js import to @fogma/* form", () => {
    const filePath = "src/kits/iframe-gallery.tsx"
    const importPath = "../components/canvas/canvas-node.js"
    expect(normalizeImportSource(filePath, importPath)).toBe(
      "@fogma/components/canvas/canvas-node"
    )
  })

  it("rewrites a sibling import", () => {
    const filePath = "src/components/canvas/canvas-node.tsx"
    const importPath = "./canvas-label.js"
    expect(normalizeImportSource(filePath, importPath)).toBe(
      "@fogma/components/canvas/canvas-label"
    )
  })

  it("rewrites a nested relative import", () => {
    const filePath = "src/api/edit/route.ts"
    const importPath = "../../lib/edit-mode.js"
    expect(normalizeImportSource(filePath, importPath)).toBe(
      "@fogma/lib/edit-mode"
    )
  })

  it("leaves npm package imports unchanged", () => {
    expect(normalizeImportSource("src/components/x.tsx", "react")).toBe("react")
    expect(normalizeImportSource("src/components/x.tsx", "motion/react")).toBe("motion/react")
  })

  it("leaves already-canonical @fogma/* imports unchanged", () => {
    expect(
      normalizeImportSource("src/kits/x.tsx", "@fogma/lib/foo")
    ).toBe("@fogma/lib/foo")
  })

  it("strips .ts/.tsx extensions if present", () => {
    expect(
      normalizeImportSource("src/kits/x.tsx", "../lib/foo.ts")
    ).toBe("@fogma/lib/foo")
    expect(
      normalizeImportSource("src/kits/x.tsx", "../lib/foo.tsx")
    ).toBe("@fogma/lib/foo")
  })
})
