import { describe, it, expect } from "vitest"
import { enumeratePrimitiveVariants } from "@forkshop/lib/enumerate-primitive-variants"

const noop = () => null

describe("enumeratePrimitiveVariants", () => {
  it("returns 3 stub entries when no cva is detected", () => {
    const entries = enumeratePrimitiveVariants({
      name: "Button", slug: "button", Component: noop, cvaVariants: null,
    })
    expect(entries).toHaveLength(3)
    expect(entries[0]?.id).toMatch(/button.*default-1/)
  })

  it("returns cartesian product of cva variants", () => {
    const entries = enumeratePrimitiveVariants({
      name: "Button", slug: "button", Component: noop,
      cvaVariants: { variant: ["primary", "secondary"], size: ["sm", "md"] },
    })
    expect(entries).toHaveLength(4)
    expect(entries.find((e) => e.id === "button-primary-sm")).toBeDefined()
    expect(entries.find((e) => e.id === "button-secondary-md")).toBeDefined()
  })

  it("each entry's node is an inline-react node with the primitive's filePath", () => {
    const entries = enumeratePrimitiveVariants({
      name: "Button", slug: "button", Component: noop,
      sourcePath: "src/components/ui/button.tsx",
    })
    expect(entries[0]?.node.kind).toBe("inline-react")
    if (entries[0]?.node.kind === "inline-react") {
      expect(entries[0].node.filePath).toBe("src/components/ui/button.tsx")
    }
  })
})
