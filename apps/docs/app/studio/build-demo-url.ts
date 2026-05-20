import { serializeSelection } from "@forkshop/engine"
import type { DemoState } from "./types"

export function buildDemoUrl(state: DemoState): string {
  const parts: string[] = []
  if (state.viewport) parts.push(`viewport=${state.viewport}`)
  if (state.canvas?.zoom != null) parts.push(`zoom=${state.canvas.zoom}`)
  if (state.canvas?.pan) {
    parts.push(`panX=${state.canvas.pan.x}`)
    parts.push(`panY=${state.canvas.pan.y}`)
  }
  if (state.agents && state.agents.length > 0) {
    const agentsValue = state.agents
      .map((a) =>
        a.kind === "block"     ? `block:${a.slug}`     :
        a.kind === "primitive" ? `primitive:${a.id}`   :
        `${a.kind}:${a.path}`,
      )
      .join(",")
    parts.push(`agents=${agentsValue}`)
  }

  const search = parts.length > 0 ? parts.join("&") : ""
  const hash   = state.selection ? serializeSelection(state.selection) : ""
  return `/demo${search ? `?${search}` : ""}${hash}`
}
