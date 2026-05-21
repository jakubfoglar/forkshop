import { describe, it, expect } from "vitest"
import { nodeSchema, forkshopConfigSchema } from "@forkshop/lib/schemas"

describe("nodeSchema", () => {
  it("accepts a well-formed iframe-route node", () => {
    const result = nodeSchema.safeParse({
      id: "page:/", kind: "iframe-route",
      x: 0, y: 0, width: 1200, height: 800,
      routePath: "/", sourceFile: "app/page.tsx",
    })
    expect(result.success).toBe(true)
  })
  it("rejects an iframe-component node missing slug", () => {
    const result = nodeSchema.safeParse({
      id: "block:hero", kind: "iframe-component",
      x: 0, y: 0, width: 1200, height: 600,
      previewSrc: "/forkshop/block/hero",
      // slug missing
    })
    expect(result.success).toBe(false)
  })
  it("passes the render function through unwrapped for inline-react", () => {
    const render = () => "hello"
    const result = nodeSchema.safeParse({
      id: "inline:greet", kind: "inline-react",
      x: 0, y: 0, width: 100, height: 50,
      render,
    })
    expect(result.success).toBe(true)
    if (result.success && result.data.kind === "inline-react") {
      // z.custom must not wrap the function; reference equality + identical return
      expect(result.data.render).toBe(render)
      expect((result.data.render as () => string)()).toBe("hello")
    }
  })
})

describe("forkshopConfigSchema", () => {
  it("rejects an empty route path", () => {
    const result = forkshopConfigSchema.safeParse({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "", sourceFile: "app/page.tsx" }] },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("sitemap")
    }
  })
  it("defaults viewportProfile to 'responsive' when omitted", () => {
    const result = forkshopConfigSchema.safeParse({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.viewportProfile).toBe("responsive")
    }
  })
})
