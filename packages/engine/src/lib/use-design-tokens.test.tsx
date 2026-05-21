import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useDesignTokens } from "@forkshop/lib/use-design-tokens"

describe("useDesignTokens", () => {
  it("returns an empty registry shape when there are no CSS vars", () => {
    const { result } = renderHook(() => useDesignTokens())
    expect(result.current).toMatchObject({
      colors: expect.any(Array),
      spacing: expect.any(Array),
      fontSizes: expect.any(Array),
      fontWeights: expect.any(Array),
      radii: expect.any(Array),
      shadows: expect.any(Array),
      containers: expect.any(Array),
    })
  })
})
