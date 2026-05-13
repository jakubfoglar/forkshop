import { describe, expect, it } from "vitest"
import { resolveDestination } from "./resolve-destination.js"
import type { FogmaJson, ManifestFile } from "./manifest-schema.js"

const aliases: FogmaJson["aliases"] = {
  base: "@/",
  components: "@/components/fogma",
  kits: "@/components/fogma/kits",
  hooks: "@/lib/fogma/hooks",
  lib: "@/lib/fogma",
  api: "@/app/api/fogma",
  tailwind: "@/lib/fogma/tailwind",
  mount: "@/app/fogma",
}

describe("resolveDestination", () => {
  it("maps a components file to components/fogma/", () => {
    const file: ManifestFile = { kind: "text", ext: "tsx", content: "" }
    const dest = resolveDestination("@fogma/components/canvas/canvas-node", file, aliases)
    expect(dest).toBe("components/fogma/canvas/canvas-node.tsx")
  })

  it("maps a hooks file to lib/fogma/hooks/", () => {
    const file: ManifestFile = { kind: "text", ext: "ts", content: "" }
    const dest = resolveDestination("@fogma/hooks/use-iframe-preview", file, aliases)
    expect(dest).toBe("lib/fogma/hooks/use-iframe-preview.ts")
  })

  it("maps an api file to app/api/fogma/", () => {
    const file: ManifestFile = { kind: "text", ext: "ts", content: "" }
    const dest = resolveDestination("@fogma/api/edit/route", file, aliases)
    expect(dest).toBe("app/api/fogma/edit/route.ts")
  })

  it("honors destOverride templates with {aliases.X} placeholders", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "",
      destOverride: "{aliases.mount}/CLAUDE.md",
    }
    const dest = resolveDestination("@fogma/templates/claude-md", file, aliases)
    expect(dest).toBe("app/fogma/CLAUDE.md")
  })

  it("uses destOverride for binary files", () => {
    const file: ManifestFile = {
      kind: "binary",
      url: "fonts/raveo-regular.woff2",
      destOverride: "app/fonts/raveo/raveo-regular.woff2",
    }
    const dest = resolveDestination("@fogma/fonts/raveo-regular", file, aliases)
    expect(dest).toBe("app/fonts/raveo/raveo-regular.woff2")
  })
})
