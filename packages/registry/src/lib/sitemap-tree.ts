export const SITEMAP_EXCLUSIONS = ["/styleguide", "/sample-page", "/fogma"] as const
export const SITEMAP_FOOTER_PATHS = ["/privacy", "/terms", "/transparency"] as const

export const SITEMAP_IFRAME_WIDTH = 1280
export const SITEMAP_IFRAME_HEIGHT = 1500
export const SITEMAP_HORIZONTAL_GAP = 240
export const SITEMAP_VERTICAL_GAP = 320

export type SitemapNode = {
  path: string
  children: SitemapNode[]
}

export type SitemapTree = { tree: SitemapNode }
export type SitemapFlat = { paths: string[] }

export type PositionedSitemapNode = {
  path: string
  x: number
  y: number
}

export type SitemapLayout = {
  nodes: PositionedSitemapNode[]
  width: number
  height: number
  connectors: string[]
}

function isExcluded(route: string): boolean {
  return SITEMAP_EXCLUSIONS.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))
}

const FOOTER_SET = new Set<string>(SITEMAP_FOOTER_PATHS)

export function buildMarketingSitemap(routes: readonly string[]): SitemapTree {
  const filtered = [...routes].filter((route) => !isExcluded(route) && !FOOTER_SET.has(route))
  const tree: SitemapNode = { path: "/", children: [] }
  const sortedRoutes = filtered.filter((route) => route !== "/").slice().sort()
  for (const route of sortedRoutes) insertNode(tree, route)
  return { tree }
}

export function buildFooterSitemap(routes: readonly string[]): SitemapFlat {
  const present = [...routes].filter((route) => FOOTER_SET.has(route))
  return { paths: present.slice().sort() }
}

type GuideArticleLite = {
  slug: string
  category: string
  title?: string
}

export function buildGuideSitemap(articles: readonly GuideArticleLite[]): SitemapTree {
  const tree: SitemapNode = { path: "/guide", children: [] }
  tree.children.push({ path: "/guide/whats-new", children: [] })

  const byCategory = new Map<string, SitemapNode>()
  for (const article of articles) {
    const articlePath = `/guide/${article.category}/${article.slug}`
    const categoryKey = `__category_${article.category}`
    let categoryNode = byCategory.get(categoryKey)
    if (!categoryNode) {
      categoryNode = { path: categoryKey, children: [] }
      byCategory.set(categoryKey, categoryNode)
      tree.children.push(categoryNode)
    }
    categoryNode.children.push({ path: articlePath, children: [] })
  }

  for (const node of byCategory.values()) {
    node.children.sort((a, b) => a.path.localeCompare(b.path))
  }

  return { tree }
}

function insertNode(root: SitemapNode, path: string) {
  const segments = path.split("/").filter(Boolean)
  let current = root
  for (let index = 0; index < segments.length - 1; index++) {
    const ancestorPath = `/${segments.slice(0, index + 1).join("/")}`
    const found = current.children.find((child) => child.path === ancestorPath)
    if (found) current = found
  }
  current.children.push({ path, children: [] })
}

function computeSubtreeWidth(node: SitemapNode, widths: Map<SitemapNode, number>): number {
  if (node.children.length === 0) {
    widths.set(node, SITEMAP_IFRAME_WIDTH)
    return SITEMAP_IFRAME_WIDTH
  }
  let total = 0
  for (const [index, child] of node.children.entries()) {
    if (index > 0) total += SITEMAP_HORIZONTAL_GAP
    total += computeSubtreeWidth(child, widths)
  }
  const width = Math.max(SITEMAP_IFRAME_WIDTH, total)
  widths.set(node, width)
  return width
}

function isVirtualNode(node: SitemapNode): boolean {
  return node.path.startsWith("__")
}

export function layoutTreeSitemap({ tree }: SitemapTree): SitemapLayout {
  const widths = new Map<SitemapNode, number>()
  computeSubtreeWidth(tree, widths)

  const nodes: PositionedSitemapNode[] = []
  const connectors: string[] = []

  function position(node: SitemapNode, centerX: number, y: number) {
    if (!isVirtualNode(node)) {
      const x = centerX - SITEMAP_IFRAME_WIDTH / 2
      nodes.push({ path: node.path, x, y })
    }
    if (node.children.length === 0) return

    const subtreeWidth = widths.get(node) ?? SITEMAP_IFRAME_WIDTH
    let cursor = centerX - subtreeWidth / 2
    const childY = y + SITEMAP_IFRAME_HEIGHT + SITEMAP_VERTICAL_GAP
    const parentBottomX = centerX
    const parentBottomY = y + SITEMAP_IFRAME_HEIGHT

    for (const child of node.children) {
      const childWidth = widths.get(child) ?? SITEMAP_IFRAME_WIDTH
      const childCenterX = cursor + childWidth / 2
      position(child, childCenterX, childY)
      if (!isVirtualNode(node) && !isVirtualNode(child)) {
        const midY = (parentBottomY + childY) / 2
        connectors.push(
          `M ${parentBottomX} ${parentBottomY} C ${parentBottomX} ${midY}, ${childCenterX} ${midY}, ${childCenterX} ${childY}`,
        )
      }
      cursor += childWidth + SITEMAP_HORIZONTAL_GAP
    }
  }

  const treeWidth = widths.get(tree) ?? SITEMAP_IFRAME_WIDTH
  position(tree, treeWidth / 2, 0)

  let bottomY = 0
  for (const item of nodes) bottomY = Math.max(bottomY, item.y + SITEMAP_IFRAME_HEIGHT)

  return { nodes, width: treeWidth, height: bottomY, connectors }
}

export function layoutFlatSitemap({ paths }: SitemapFlat): SitemapLayout {
  const nodes = paths.map<PositionedSitemapNode>((path, index) => ({
    path,
    x: index * (SITEMAP_IFRAME_WIDTH + SITEMAP_HORIZONTAL_GAP),
    y: 0,
  }))
  const totalWidth =
    paths.length === 0
      ? SITEMAP_IFRAME_WIDTH
      : paths.length * SITEMAP_IFRAME_WIDTH + (paths.length - 1) * SITEMAP_HORIZONTAL_GAP
  return {
    nodes,
    width: totalWidth,
    height: SITEMAP_IFRAME_HEIGHT,
    connectors: [],
  }
}
