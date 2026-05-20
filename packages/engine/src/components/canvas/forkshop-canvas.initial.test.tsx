/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { createRef } from "react"
import { ForkshopCanvas } from "@forkshop/components/canvas/forkshop-canvas"
import { BUILTIN_NODE_TYPES } from "@forkshop/node-types"

afterEach(() => cleanup())

describe("ForkshopCanvas initialZoom / initialPan", () => {
  it("starts with the given zoom and pan when props are provided", () => {
    const containerRef = createRef<HTMLDivElement>()
    const stageRef = createRef<HTMLDivElement>()
    render(
      <ForkshopCanvas
        containerRef={containerRef}
        stageRef={stageRef}
        stageWidth={1440}
        stageHeight={900}
        fitMode="width"
        nodeTypes={BUILTIN_NODE_TYPES}
        initialZoom={0.8}
        initialPan={{ x: -100, y: -50 }}
      >
        <div />
      </ForkshopCanvas>,
    )
    const transform = stageRef.current?.style.transform ?? ""
    // ForkshopCanvas writes: translate(Xpx, Ypx) scale(Z)
    // with panX and panY rounded via Math.round
    expect(transform).toContain("scale(0.8)")
    expect(transform).toContain("translate(-100px, -50px)")
  })
})
