import { describe, it, expect } from "vitest"
import { filePathToRoute, fileToSelection } from "@forkshop/lib/file-to-selection"
import type { FileMap } from "@forkshop/components/agent-activity-context"

describe("filePathToRoute", () => {
  it("strips a single route group", () => {
    expect(filePathToRoute("app/(marketing)/about/page.tsx")).toBe("/about")
  })
  it("strips multiple route groups", () => {
    expect(filePathToRoute("app/(tools)/(internal)/forkshop/page.tsx")).toBe("/forkshop")
  })
  it("returns / for the root page", () => {
    expect(filePathToRoute("app/page.tsx")).toBe("/")
  })
  it("returns null for non-page files", () => {
    expect(filePathToRoute("app/(marketing)/about/components/hero.tsx")).toBeNull()
  })
  it("preserves dynamic segments", () => {
    expect(filePathToRoute("app/blog/[slug]/page.tsx")).toBe("/blog/[slug]")
  })
})

describe("fileToSelection", () => {
  const fileMap: FileMap = {
    primitives: [
      { id: "button", sourcePath: "components/ui/button.tsx" },
      { id: "badge", sourcePath: "components/ui/badge.tsx" },
    ],
    blocks: [
      { slug: "hero", sourcePath: "components/marketing/hero.tsx" },
      { slug: "cta-band", sourcePath: "components/blocks/cta-band.tsx" },
    ],
  }

  it("maps an app page to { kind: page }", () => {
    expect(fileToSelection("app/about/page.tsx", fileMap)).toEqual({
      kind: "page",
      path: "/about",
    })
  })

  it("maps a root page to { kind: page, path: / }", () => {
    expect(fileToSelection("app/page.tsx", fileMap)).toEqual({ kind: "page", path: "/" })
  })

  it("strips route groups for page files", () => {
    expect(fileToSelection("app/(marketing)/pricing/page.tsx", fileMap)).toEqual({
      kind: "page",
      path: "/pricing",
    })
  })

  it("maps an MDX content file to { kind: page }", () => {
    expect(fileToSelection("content/blog/my-post.mdx", fileMap)).toEqual({
      kind: "page",
      path: "/blog/my-post",
    })
  })

  it("maps a configured block (custom folder) to { kind: block }", () => {
    expect(fileToSelection("components/marketing/hero.tsx", fileMap)).toEqual({
      kind: "block",
      slug: "hero",
    })
  })

  it("maps a configured block (default folder) to { kind: block }", () => {
    expect(fileToSelection("components/blocks/cta-band.tsx", fileMap)).toEqual({
      kind: "block",
      slug: "cta-band",
    })
  })

  it("maps a configured primitive to { kind: primitive }", () => {
    expect(fileToSelection("components/ui/button.tsx", fileMap)).toEqual({
      kind: "primitive",
      id: "button",
    })
  })

  it("returns site-wide for components/blocks/* when slug is not configured", () => {
    expect(fileToSelection("components/blocks/unknown.tsx", fileMap)).toBe("site-wide")
  })

  it("legacy-default: resolves components/blocks/<slug>.tsx when slug exists in fileMap but no sourcePath matches", () => {
    const legacyMap: FileMap = {
      primitives: [],
      blocks: [{ slug: "legacy-block", sourcePath: "components/old-location/legacy-block.tsx" }],
    }
    expect(fileToSelection("components/blocks/legacy-block.tsx", legacyMap)).toEqual({
      kind: "block",
      slug: "legacy-block",
    })
  })

  it("returns undefined for node_modules", () => {
    expect(fileToSelection("node_modules/react/index.js", fileMap)).toBeUndefined()
  })

  it("returns undefined for .next", () => {
    expect(fileToSelection(".next/server/app/page.js", fileMap)).toBeUndefined()
  })

  it("returns undefined for .git", () => {
    expect(fileToSelection(".git/HEAD", fileMap)).toBeUndefined()
  })

  it("returns site-wide for non-page TS files outside the fileMap", () => {
    expect(fileToSelection("lib/utils.ts", fileMap)).toBe("site-wide")
  })
})
