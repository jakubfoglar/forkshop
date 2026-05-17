import { describe, it, expect } from "vitest"
import { discoverPrimitives } from "@forkshop/lib/use-discovered-primitives"

const Button = () => null
const Badge = () => null
const useUtility = () => null // hook — should be filtered out
const helper = () => null // lowercase — should be filtered out

describe("discoverPrimitives", () => {
  it("returns PascalCase function exports as primitives", () => {
    const barrel = { Button, Badge }
    const result = discoverPrimitives(barrel)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ slug: "button", name: "Button" })
    expect(result[1]).toMatchObject({ slug: "badge", name: "Badge" })
  })

  it("filters out non-PascalCase exports (hooks, helpers)", () => {
    const barrel = { Button, useUtility, helper }
    const result = discoverPrimitives(barrel)
    expect(result.map((p) => p.name)).toEqual(["Button"])
  })

  it("filters out non-function exports (types, constants)", () => {
    const barrel = { Button, BUTTON_VARIANTS: ["primary", "secondary"] }
    const result = discoverPrimitives(barrel)
    expect(result.map((p) => p.name)).toEqual(["Button"])
  })

  it("handles multi-word PascalCase via kebab-case slug", () => {
    const ButtonGroup = () => null
    const result = discoverPrimitives({ ButtonGroup })
    expect(result[0]?.slug).toBe("button-group")
  })

  it("returns the Component reference unchanged", () => {
    const result = discoverPrimitives({ Button })
    expect(result[0]?.Component).toBe(Button)
  })

  it("returns an empty array for an empty barrel", () => {
    expect(discoverPrimitives({})).toEqual([])
  })
})
