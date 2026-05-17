import { describe, expect, it } from "vitest"
import { applyTemplatePlaceholders } from "./rewrite.js"

describe("applyTemplatePlaceholders", () => {
  it("substitutes {{srcPrefix}} with empty string by default", () => {
    const src = "Open `{{srcPrefix}}app/forkshop/CLAUDE.md`."
    expect(applyTemplatePlaceholders(src, { srcPrefix: "", mount: "@/app/forkshop" })).toBe(
      "Open `app/forkshop/CLAUDE.md`."
    )
  })

  it("substitutes {{srcPrefix}} with src/ when configured", () => {
    const src = "Open `{{srcPrefix}}app/forkshop/CLAUDE.md`."
    expect(applyTemplatePlaceholders(src, { srcPrefix: "src/", mount: "@/app/forkshop" })).toBe(
      "Open `src/app/forkshop/CLAUDE.md`."
    )
  })

  it("substitutes {{mount}} with the user's mount alias", () => {
    const src = 'import config from "{{mount}}/forkshop.config"'
    expect(
      applyTemplatePlaceholders(src, { srcPrefix: "", mount: "@/app/forkshop" })
    ).toBe('import config from "@/app/forkshop/forkshop.config"')
  })

  it("leaves non-placeholder content untouched", () => {
    const src = "Plain text with @forkshop/engine — should not change."
    expect(applyTemplatePlaceholders(src, { srcPrefix: "", mount: "@/app/forkshop" })).toBe(src)
  })

  it("substitutes multiple occurrences", () => {
    const src = "`{{srcPrefix}}foo` and `{{srcPrefix}}bar`"
    expect(
      applyTemplatePlaceholders(src, { srcPrefix: "src/", mount: "@/app/forkshop" })
    ).toBe("`src/foo` and `src/bar`")
  })
})
