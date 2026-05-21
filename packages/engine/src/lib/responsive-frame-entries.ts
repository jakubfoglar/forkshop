import type { LayoutEntry } from "@forkshop/types/layout"

export type ResponsiveFrameOptions = {
  /** Viewport widths in pixels. Defaults to [1440, 768, 375]. */
  viewports?: number[]
  /** Source file used for the editor-link affordance on each frame. */
  sourceFile?: string
}

const DEFAULT_VIEWPORTS = [1440, 768, 375] as const

export function responsiveFrameEntries(
  path: string,
  options: ResponsiveFrameOptions = {},
): LayoutEntry[] {
  const viewports = options.viewports ?? [...DEFAULT_VIEWPORTS]
  return viewports.map((width, i) => ({
    id: `responsive:${path}:${width}`,
    label: `${width}px`,
    column: i,
    row: 0,
    node: {
      id: `responsive:${path}:${width}`,
      kind: "iframe-route" as const,
      x: 0,
      y: 0,
      width,
      // 4:3 initial height — `heightMode: "auto"` lets the iframe grow to its
      // body's natural height once loaded, so the frame shows the full page.
      // The initial value is only used between mount and first measurement.
      height: Math.round(width * (3 / 4)),
      heightMode: "auto" as const,
      routePath: path,
      sourceFile: options.sourceFile,
    },
  }))
}
