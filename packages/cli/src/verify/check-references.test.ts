import { describe, it, expect } from "vitest"
import { extractStringFileRefs } from "./check-references.js"

describe("extractStringFileRefs", () => {
  it("extracts sourceFile literals", () => {
    const src = `sourceFile: "app/about/page.tsx"`
    expect(extractStringFileRefs(src)).toContain("app/about/page.tsx")
  })
  it("extracts filePath literals", () => {
    const src = `filePath: 'components/ui/button.tsx'`
    expect(extractStringFileRefs(src)).toContain("components/ui/button.tsx")
  })
  it("ignores variables, only takes string literals", () => {
    const src = `sourceFile: someVar`
    expect(extractStringFileRefs(src)).toEqual([])
  })
})
