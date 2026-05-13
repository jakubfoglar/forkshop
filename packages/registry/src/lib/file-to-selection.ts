import type { FogmaSelection } from "@fogma/components/sidebar/fogma-sidebar"

// Files that belong to site-wide navigation rather than a specific page.
// Projects can extend this by providing a custom fileToSelection implementation.
const NAVIGATION_FILES = new Set<string>([
  "components/navigation/header.tsx",
  "components/navigation/mobile-menu.tsx",
  "lib/navigation.ts",
])

// ---------------------------------------------------------------------------
// Route-group stripping
// ---------------------------------------------------------------------------

// Generic Next.js route-group stripper.
// Turns "app/(marketing)/about/page.tsx" → "/about"
// Turns "app/(tools)/(internal)/fogma/page.tsx" → "/fogma"
// Turns "app/page.tsx" → "/"
export function filePathToRoute(
  filePath: string,
  options?: { appDir?: string },
): string | null {
  const appDir = options?.appDir ?? "app"
  // Match: <appDir>/<...>/page.<ext> or <appDir>/page.<ext> (root)
  const match = filePath.match(
    new RegExp(`(?:^|/)${appDir}/(?:(.+?)/)?page\\.(tsx?|jsx?|mdx?)$`),
  )
  if (!match) return null
  const inner = match[1] ?? ""
  if (inner === "") return "/"
  // Strip any Next.js route-group segments: "/(name)/" → "/"
  let route = "/" + inner
  route = route.replace(/\/\([^/]+\)/g, "")
  // Remove trailing slash (unless root)
  return route === "/" ? "/" : route.replace(/\/$/, "")
}

// ---------------------------------------------------------------------------
// File-path → selection
// ---------------------------------------------------------------------------

// Map an absolute or project-relative file path to the Fogma sidebar entry
// that should reflect activity on that file.
//
// - Returns a FogmaSelection when the file maps to a known sidebar entry.
// - Returns "site-wide" for tracked files that don't map to a specific
//   page/block (configs, libs, …).
// - Returns undefined when Fogma doesn't track this file at all.
//
// Navigation files map to { kind: "section"; sectionId: "navigation" } so
// consumers can check selection.kind === "section" && selection.sectionId === "navigation".
export function fileToSelection(
  filePath: string,
  projectRoot: string,
  blockSlugs: readonly string[],
): FogmaSelection | "site-wide" | undefined {
  const relative = toRelative(filePath, projectRoot)
  if (relative === undefined) return undefined
  if (relative.startsWith("node_modules/") || relative.startsWith(".next/")) return undefined
  if (relative.startsWith(".git/")) return undefined

  // Any Next.js page file in the app directory (any route groups stripped).
  const route = filePathToRoute(relative)
  if (route !== null) {
    return { kind: "page", path: route }
  }

  // MDX content files (e.g. content/blog/my-post.mdx → /blog/my-post)
  const contentMatch = /^content\/(.+)\.mdx$/.exec(relative)
  if (contentMatch && contentMatch[1] !== undefined) {
    return { kind: "page", path: `/${contentMatch[1]}` }
  }

  // Block component files: components/blocks/<slug>.tsx
  const blockMatch = /^components\/blocks\/(.+)\.tsx$/.exec(relative)
  if (blockMatch && blockMatch[1] !== undefined && blockSlugs.includes(blockMatch[1])) {
    return { kind: "block", slug: blockMatch[1] }
  }

  // Navigation files map to the "navigation" section in the sidebar
  if (NAVIGATION_FILES.has(relative)) return { kind: "section", sectionId: "navigation" }

  return "site-wide"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toRelative(filePath: string, projectRoot: string): string | undefined {
  if (!filePath.startsWith("/")) return filePath
  const normalizedRoot = projectRoot.endsWith("/") ? projectRoot : `${projectRoot}/`
  if (filePath === projectRoot) return ""
  if (filePath.startsWith(normalizedRoot)) return filePath.slice(normalizedRoot.length)
  return undefined
}
