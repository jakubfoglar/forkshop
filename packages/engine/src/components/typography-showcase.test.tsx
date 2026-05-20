import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TypographyShowcase } from "@forkshop/components/typography-showcase"
import type { TokenRegistry } from "@forkshop/lib/token-registry"

const EMPTY_TOKENS: TokenRegistry = {
  colors: [],
  spacing: [],
  fontSizes: [],
  fontWeights: [],
  radii: [],
  shadows: [],
  containers: [],
  classLookup: {},
}

describe("TypographyShowcase", () => {
  it("renders a row per fontSize token", () => {
    const tokens: TokenRegistry = {
      ...EMPTY_TOKENS,
      fontSizes: [
        { kind: "fontSize", name: "lg", value: "18px", lineHeight: undefined, letterSpacing: undefined },
        { kind: "fontSize", name: "xl", value: "20px", lineHeight: undefined, letterSpacing: undefined },
      ],
    }
    render(<TypographyShowcase tokens={tokens} />)
    expect(screen.getByText("lg")).toBeTruthy()
    expect(screen.getByText("xl")).toBeTruthy()
  })

  it("renders empty when no fontSizes", () => {
    const { container } = render(<TypographyShowcase tokens={EMPTY_TOKENS} />)
    expect(container.textContent ?? "").not.toContain("lg")
  })
})
