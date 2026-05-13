import { describe, it, expect } from "vitest"
import { filePathToRoute, fileToSelection } from "./file-to-selection.js"

describe("filePathToRoute", () => {
  it("strips a single route group", () => {
    expect(filePathToRoute("app/(marketing)/about/page.tsx")).toBe("/about")
  })
  it("strips multiple route groups", () => {
    expect(filePathToRoute("app/(tools)/(internal)/fogma/page.tsx")).toBe("/fogma")
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
  const root = "/projects/myapp"
  const slugs = ["hero-display", "features-grid"]

  it("maps an app page to { kind: page }", () => {
    expect(fileToSelection("/projects/myapp/app/about/page.tsx", root, slugs)).toEqual({
      kind: "page",
      path: "/about",
    })
  })

  it("maps a root page to { kind: page, path: / }", () => {
    expect(fileToSelection("/projects/myapp/app/page.tsx", root, slugs)).toEqual({
      kind: "page",
      path: "/",
    })
  })

  it("strips route groups for page files", () => {
    expect(
      fileToSelection("/projects/myapp/app/(marketing)/pricing/page.tsx", root, slugs),
    ).toEqual({ kind: "page", path: "/pricing" })
  })

  it("maps an MDX content file to { kind: page }", () => {
    expect(fileToSelection("/projects/myapp/content/blog/my-post.mdx", root, slugs)).toEqual({
      kind: "page",
      path: "/blog/my-post",
    })
  })

  it("maps a known block file to { kind: block }", () => {
    expect(
      fileToSelection("/projects/myapp/components/blocks/hero-display.tsx", root, slugs),
    ).toEqual({ kind: "block", slug: "hero-display" })
  })

  it("returns site-wide for unrecognised blocks (slug not in list)", () => {
    expect(
      fileToSelection("/projects/myapp/components/blocks/unknown-block.tsx", root, slugs),
    ).toBe("site-wide")
  })

  it("returns undefined for files outside the project root", () => {
    expect(fileToSelection("/other/project/app/page.tsx", root, slugs)).toBeUndefined()
  })

  it("returns undefined for node_modules", () => {
    expect(fileToSelection("/projects/myapp/node_modules/react/index.js", root, slugs)).toBeUndefined()
  })

  it("returns site-wide for non-page ts files", () => {
    expect(fileToSelection("/projects/myapp/lib/utils.ts", root, slugs)).toBe("site-wide")
  })

  it("maps navigation files to { kind: section, sectionId: navigation }", () => {
    expect(
      fileToSelection("/projects/myapp/components/navigation/header.tsx", root, slugs),
    ).toEqual({ kind: "section", sectionId: "navigation" })
  })
})
