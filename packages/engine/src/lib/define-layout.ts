import type { Layout } from "@forkshop/types/layout"

/**
 * Identity helper for typed Layout definitions. Layouts have no runtime
 * registration — consumers pass them to `forkshop.config.tsx`'s `layouts`
 * array (read by `<BoardRegistry>`). The helper just narrows the generic
 * so callers get inference on `defaultOptions` and the render props.
 */
export function defineLayout<TOptions>(layout: Layout<TOptions>): Layout<TOptions> {
  return layout
}
