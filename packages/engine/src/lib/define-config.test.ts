import { describe, it, expect } from "vitest"
import { defineConfig, ForkshopConfigError } from "@forkshop/lib/define-config"

describe("defineConfig", () => {
  it("returns the parsed config when valid", () => {
    const cfg = defineConfig({
      mount: "app/forkshop",
      sitemap: { routes: [{ path: "/", sourceFile: "app/page.tsx" }] },
    })
    expect(cfg.mount).toBe("app/forkshop")
    expect(cfg.viewportProfile).toBe("responsive") // default applied
  })

  it("throws ForkshopConfigError when invalid", () => {
    // `input: unknown` lets us pass malformed configs through TS; the schema
    // is the runtime gate.
    expect(() =>
      defineConfig({
        mount: "",
        sitemap: { routes: [{ path: "", sourceFile: "" }] },
      }),
    ).toThrowError(/ForkshopConfigError/)
  })

  it("attaches zod issues to the thrown error for downstream tooling", () => {
    try {
      defineConfig({
        mount: "app/forkshop",
        sitemap: { routes: [{ path: "no-leading-slash", sourceFile: "app/page.tsx" }] },
      })
      throw new Error("expected defineConfig to throw")
    } catch (err) {
      expect(err).toBeInstanceOf(ForkshopConfigError)
      const cfgErr = err as ForkshopConfigError
      expect(cfgErr.name).toBe("ForkshopConfigError")
      expect(Array.isArray(cfgErr.issues)).toBe(true)
      expect(cfgErr.issues.length).toBeGreaterThan(0)
      // Each issue should have a `path` array (ZodIssue shape).
      expect(Array.isArray(cfgErr.issues[0]!.path)).toBe(true)
    }
  })

  it("includes the offending path in the error message", () => {
    try {
      defineConfig({
        mount: "app/forkshop",
        sitemap: { routes: [{ path: "/", sourceFile: "" }] },
      })
      throw new Error("expected defineConfig to throw")
    } catch (err) {
      expect(err).toBeInstanceOf(ForkshopConfigError)
      expect((err as Error).message).toMatch(/sitemap\.routes\.0\.sourceFile/)
    }
  })
})
