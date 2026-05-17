import { describe, expect, it } from "vitest"
import { resolveDestination } from "./resolve-destination.js"
import type { ManifestFile, ResolvedAliases } from "./manifest-schema.js"

const defaultAliases: ResolvedAliases = {
  mount: "@/app/forkshop",
  srcPrefix: "",
}

describe("resolveDestination", () => {
  it("resolves a skill file to .claude/skills/forkshop-<name>.md", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
      destOverride: ".claude/skills/forkshop-setup.md",
    }
    expect(resolveDestination("@forkshop/skill/setup", file, defaultAliases)).toBe(
      ".claude/skills/forkshop-setup.md"
    )
  })

  it("resolves CLAUDE.md to {aliases.mount}/CLAUDE.md", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
      destOverride: "{aliases.mount}/CLAUDE.md",
    }
    expect(resolveDestination("@forkshop/templates/claude-md", file, defaultAliases)).toBe(
      "app/forkshop/CLAUDE.md"
    )
  })

  it("respects srcPrefix for mount-based destinations", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
      destOverride: "{aliases.mount}/CLAUDE.md",
    }
    expect(
      resolveDestination("@forkshop/templates/claude-md", file, {
        mount: "@/app/forkshop",
        srcPrefix: "src/",
      })
    ).toBe("src/app/forkshop/CLAUDE.md")
  })

  it("resolves binary fonts to public/fonts/forkshop/<basename>", () => {
    const file: ManifestFile = {
      kind: "binary",
      url: "fonts/raveo/RaveoVF.woff2",
      destOverride: "public/fonts/forkshop/RaveoVF.woff2",
    }
    expect(resolveDestination("@forkshop/fonts/raveo/RaveoVF", file, defaultAliases)).toBe(
      "public/fonts/forkshop/RaveoVF.woff2"
    )
  })

  it("resolves route stubs to app/api/forkshop/<name>/route.ts", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "ts",
      content: 'export { POST, GET } from "@forkshop/engine/api/edit/route"\n',
      destOverride: "app/api/forkshop/edit/route.ts",
    }
    expect(resolveDestination("@forkshop/route-stubs/edit", file, defaultAliases)).toBe(
      "app/api/forkshop/edit/route.ts"
    )
  })

  it("throws when a text file has no destOverride", () => {
    const file: ManifestFile = {
      kind: "text",
      ext: "md",
      content: "...",
    }
    expect(() => resolveDestination("@forkshop/whatever", file, defaultAliases)).toThrow(
      /destOverride/
    )
  })
})
