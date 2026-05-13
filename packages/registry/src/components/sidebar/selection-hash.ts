import type { FogmaSelection } from "./fogma-sidebar.js"

// Pure helpers for round-tripping a FogmaSelection through a URL hash.
// The hash mirrors what's on screen so /fogma can be bookmarked/shared:
//   #/foundations          → { kind: "foundations" }
//   #/blocks               → { kind: "blocks" }
//   #/flows                → { kind: "flow" }
//   #/sitemap              → { kind: "sitemap" }
//   #/page/about           → { kind: "page", path: "/about" }
//   #/page/customers/beauty-brand-share-of-influence
//                          → { kind: "page", path: "/customers/beauty-brand-share-of-influence" }
//   #/block/hero           → { kind: "block", slug: "hero" }
//   (anything else)        → fall back to default (sitemap)

export function serializeSelection(selection: FogmaSelection): string {
  switch (selection.kind) {
    case "flow": {
      return "#/flows"
    }
    case "foundations": {
      return "#/foundations"
    }
    case "blocks": {
      return "#/blocks"
    }
    case "navigation": {
      return "#/navigation"
    }
    case "sitemap": {
      return "#/sitemap"
    }
    case "page": {
      // page path always starts with "/" so the encoding becomes #/page<path>
      return `#/page${selection.path}`
    }
    case "block": {
      return `#/block/${encodeURIComponent(selection.slug)}`
    }
  }
}

export function parseSelection(hash: string): FogmaSelection | undefined {
  // strip leading "#" if present
  const value = hash.startsWith("#") ? hash.slice(1) : hash
  if (value === "/foundations") return { kind: "foundations" }
  if (value === "/blocks") return { kind: "blocks" }
  if (value === "/navigation") return { kind: "navigation" }
  if (value === "/flows") return { kind: "flow" }
  if (value === "/sitemap") return { kind: "sitemap" }
  if (value.startsWith("/page/")) {
    // strip the "/page" prefix; the remainder includes the leading "/"
    const path = value.slice("/page".length)
    if (path.length === 0 || !path.startsWith("/")) return
    return { kind: "page", path }
  }
  if (value.startsWith("/block/")) {
    const slug = decodeURIComponent(value.slice("/block/".length))
    if (slug.length === 0) return
    return { kind: "block", slug }
  }
  return
}
