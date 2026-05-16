export type PageTreeNode = {
  path: string
  segment: string
  label: string
  isRoute: boolean
  children: PageTreeNode[]
}

export function buildPageTree(
  routes: readonly string[],
  titleOverrides: ReadonlyMap<string, string>,
): PageTreeNode[] {
  // toSorted is ES2023 — use spread+sort for ES2022 compat
  const sorted = [...new Set(routes)].sort()
  const routeSet = new Set(sorted)
  const roots: PageTreeNode[] = []
  const byPath = new Map<string, PageTreeNode>()

  for (const route of sorted) {
    if (route === "/") {
      const node: PageTreeNode = {
        path: "/",
        segment: "/",
        label: "Home",
        isRoute: true,
        children: [],
      }
      byPath.set("/", node)
      roots.push(node)
      continue
    }

    const parts = route.split("/").filter(Boolean)
    let parentChildren = roots
    let cumulative = ""

    for (const [index, part] of parts.entries()) {
      cumulative += `/${part}`
      let node = byPath.get(cumulative)
      if (!node) {
        node = {
          path: cumulative,
          segment: part,
          label: titleOverrides.get(cumulative) ?? humanizeSegment(part),
          isRoute: routeSet.has(cumulative) || index === parts.length - 1,
          children: [],
        }
        byPath.set(cumulative, node)
        parentChildren.push(node)
      } else if (index === parts.length - 1) {
        node.isRoute = true
      }
      parentChildren = node.children
    }
  }

  return roots
}

function humanizeSegment(segment: string): string {
  const spaced = segment.replaceAll("-", " ").replaceAll("_", " ")
  if (spaced.length === 0) return spaced
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
