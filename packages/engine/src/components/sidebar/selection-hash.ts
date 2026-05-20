import type { ForkshopSelection } from "@forkshop/types/selection"

// Pure helpers for round-tripping a ForkshopSelection through a URL hash.
// The hash mirrors what's on screen so /forkshop can be bookmarked/shared:
//   #/section/blocks       → { kind: "section", sectionId: "blocks" }
//   #/section/navigation   → { kind: "section", sectionId: "navigation" }
//   #/page/about           → { kind: "page", path: "/about" }
//   #/page/customers/acme/dashboard
//                          → { kind: "page", path: "/customers/acme/dashboard" }
//   #/block/hero           → { kind: "block", slug: "hero" }
//   (anything else)        → fall back to default

export function serializeSelection(selection: ForkshopSelection): string {
  switch (selection.kind) {
    case "section": {
      return `#/section/${encodeURIComponent(selection.sectionId)}`
    }
    case "page": {
      // page path always starts with "/" so the encoding becomes #/page<path>
      return `#/page${selection.path}`
    }
    case "block": {
      return `#/block/${encodeURIComponent(selection.slug)}`
    }
    case "primitive": {
      return `#/primitive/${encodeURIComponent(selection.id)}`
    }
    case "custom": {
      // Custom selections are not serializable into a URL hash; fall back to root.
      return "#"
    }
  }
}

export function parseSelection(hash: string): ForkshopSelection | undefined {
  // strip leading "#" if present
  const value = hash.startsWith("#") ? hash.slice(1) : hash
  if (value.startsWith("/section/")) {
    const sectionId = decodeURIComponent(value.slice("/section/".length))
    if (sectionId.length === 0) return
    return { kind: "section", sectionId }
  }
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
  if (value.startsWith("/primitive/")) {
    const id = decodeURIComponent(value.slice("/primitive/".length))
    if (id.length === 0) return
    return { kind: "primitive", id }
  }
  return
}
