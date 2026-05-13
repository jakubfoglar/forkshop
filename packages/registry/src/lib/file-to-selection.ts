import type { ForkshopSelection } from "@forkshop/components/sidebar/forkshop-sidebar"
import type { FileMap } from "@forkshop/components/agent-activity-context"

// ---------------------------------------------------------------------------
// Route-group stripping (unchanged)
// ---------------------------------------------------------------------------

export function filePathToRoute(
  filePath: string,
  options?: { appDir?: string },
): string | null {
  const appDir = options?.appDir ?? "app"
  const match = filePath.match(
    new RegExp(`(?:^|/)${appDir}/(?:(.+?)/)?page\\.(tsx?|jsx?|mdx?)$`),
  )
  if (!match) return null
  const inner = match[1] ?? ""
  if (inner === "") return "/"
  let route = "/" + inner
  route = route.replace(/\/\([^/]+\)/g, "")
  return route === "/" ? "/" : route.replace(/\/$/, "")
}

// ---------------------------------------------------------------------------
// File-path → selection (config-driven)
// ---------------------------------------------------------------------------

// Map a project-relative file path to the Forkshop sidebar entry that should
// reflect activity on that file. Paths are normalized server-side before
// reaching the client — this function is pure, takes project-relative input.
export function fileToSelection(
  relativePath: string,
  fileMap: FileMap,
): ForkshopSelection | "site-wide" | undefined {
  if (relativePath.startsWith("node_modules/") || relativePath.startsWith(".next/")) {
    return undefined
  }
  if (relativePath.startsWith(".git/")) return undefined

  // 1. Page route (App Router) — route-group strip is generic.
  const route = filePathToRoute(relativePath)
  if (route !== null) {
    return { kind: "page", path: route }
  }

  // 2. MDX content files
  const contentMatch = /^content\/(.+)\.mdx$/.exec(relativePath)
  if (contentMatch && contentMatch[1] !== undefined) {
    return { kind: "page", path: `/${contentMatch[1]}` }
  }

  // 3. Configured block — exact match against sourcePath
  for (const block of fileMap.blocks) {
    if (block.sourcePath === relativePath) {
      return { kind: "block", slug: block.slug }
    }
  }

  // 4. Configured primitive — exact match against sourcePath
  for (const primitive of fileMap.primitives) {
    if (primitive.sourcePath === relativePath) {
      return { kind: "primitive", id: primitive.id }
    }
  }

  // 5. Legacy default — components/blocks/<slug>.tsx where <slug> is a known
  // block slug but the configured sourcePath didn't match. Graceful for users
  // who have entries without sourcePath populated yet.
  const legacyBlockMatch = /^components\/blocks\/(.+)\.tsx$/.exec(relativePath)
  if (legacyBlockMatch && legacyBlockMatch[1] !== undefined) {
    const slug = legacyBlockMatch[1]
    if (fileMap.blocks.some((b) => b.slug === slug)) {
      return { kind: "block", slug }
    }
  }

  return "site-wide"
}
