import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ColorGraph } from "@forkshop/components/color-graph"
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

describe("ColorGraph", () => {
  it("renders a swatch per color token (queryable by aria-label)", () => {
    const tokens: TokenRegistry = {
      ...EMPTY_TOKENS,
      colors: [
        { kind: "color", name: "blue-500", hex: "#3b82f6", isSemantic: false, family: "blue" },
        { kind: "color", name: "blue-600", hex: "#2563eb", isSemantic: false, family: "blue" },
      ],
    }
    render(<ColorGraph tokens={tokens} />)
    expect(screen.getByLabelText("blue-500")).toBeTruthy()
    expect(screen.getByLabelText("blue-600")).toBeTruthy()
  })

  it("renders nothing visible when there are no colors", () => {
    const { container } = render(<ColorGraph tokens={EMPTY_TOKENS} />)
    // Component still renders a wrapper element but no swatch labels
    expect(container.querySelector("[aria-label]")).toBeNull()
  })
})
