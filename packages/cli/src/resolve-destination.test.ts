import { describe, expect, it } from "vitest"
import { resolveDestination } from "./resolve-destination.js"
import type { ForkshopJson, ManifestFile } from "./manifest-schema.js"

const aliases: ForkshopJson["aliases"] = {
  base: "@/",
  components: "@/components/forkshop",
  kits: "@/components/forkshop/kits",
  hooks: "@/lib/forkshop/hooks",
  lib: "@/lib/forkshop",
  api: "@/app/api/forkshop",
  tailwind: "@/lib/forkshop/tailwind",
  mount: "@/app/forkshop",
}

describe("resolveDestination", () => {
  it("maps a components file to components/forkshop/", () => {
    const file: ManifestFile = { kind: "text", ext: "tsx", content: "" }
    const dest = resolveDestination("@forkshop/components/canvas/canvas-node", file, aliases)
    expect(dest).toBe("components/forkshop/canvas/canvas-node.tsx")
  })

  it("maps a hooks file to lib/forkshop/hooks/", () => {
    const file: ManifestFile = { kind: "text", ext: "ts", content: "" }
    const dest = resolveDestination("@forkshop/hooks/use-iframe-preview", file, aliases)
    expect(dest).toBe("lib/forkshop/hooks/use-iframe-preview.ts")
  })

  it("maps an api file to app/api/forkshop/", () => {
    const file: ManifestFile = { kind: "text", ext: "ts", content: "" }
    const dest = resolveDestination("@forkshop/api/edit/route", file, aliases)
    expect(dest).toBe("app/api/forkshop/edit/route.ts")
  })

  it("honors destOverride templates with {aliases.X} placeholders", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "",
      destOverride: "{aliases.mount}/CLAUDE.md",
    }
    const dest = resolveDestination("@forkshop/templates/claude-md", file, aliases)
    expect(dest).toBe("app/forkshop/CLAUDE.md")
  })

  it("uses destOverride for binary files", () => {
    const file: ManifestFile = {
      kind: "binary",
      url: "fonts/raveo-regular.woff2",
      destOverride: "app/fonts/raveo/raveo-regular.woff2",
    }
    const dest = resolveDestination("@forkshop/fonts/raveo-regular", file, aliases)
    expect(dest).toBe("app/fonts/raveo/raveo-regular.woff2")
  })
})
