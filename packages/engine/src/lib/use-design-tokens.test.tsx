import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import type { Config } from "tailwindcss"
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

  it("accepts { tailwindConfig } shorthand at the top level", () => {
    // The setup skill scaffolds useDesignTokens({ tailwindConfig }) for
    // Tailwind v3 projects. The shorthand must compile and run without
    // requiring the verbose { source: { tailwindConfig } } form.
    const tailwindConfig: Config = {
      content: [],
      theme: { extend: { colors: { brand: "#5b6cff" } } },
    }
    const { result } = renderHook(() =>
      useDesignTokens({ tailwindConfig }),
    )
    expect(result.current.colors.length).toBeGreaterThan(0)
  })
})
