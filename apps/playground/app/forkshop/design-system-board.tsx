"use client"

import { useMemo, useRef } from "react"
import {
  ForkshopCanvas,
  DesignSystemGraph,
  BUILTIN_NODE_TYPES,
  buildTokenRegistry,
  type PrimitiveGroup,
  type InlineReactNode,
} from "@forkshop/registry"
import { forkshopConfig } from "./forkshop.config"
import { useForkshopPositions } from "./use-forkshop-positions"

const STAGE_W = 3000
const STAGE_H = 2400

const DISPLAY_SAMPLES = [
  { className: "text-display-3xl", label: "display-3xl" },
  { className: "text-display-2xl", label: "display-2xl" },
  { className: "text-display-xl", label: "display-xl" },
  { className: "text-display-lg", label: "display-lg" },
  { className: "text-display-md", label: "display-md" },
  { className: "text-display-sm", label: "display-sm" },
  { className: "text-display-xs", label: "display-xs" },
] as const

const BODY_SAMPLES = [
  { className: "text-xl", label: "xl" },
  { className: "text-lg", label: "lg" },
  { className: "text-base", label: "base" },
  { className: "text-sm", label: "sm" },
  { className: "text-xs", label: "xs" },
] as const

const TYPOGRAPHY_SAMPLE = "Type Sample"
const BODY_SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog."

function TypographySamples() {
  return (
    <div className="flex flex-col gap-forkshop-4 p-forkshop-4">
      <section className="flex flex-col gap-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          Display
        </span>
        {DISPLAY_SAMPLES.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-forkshop-0.5">
            <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">
              {sample.label}
            </span>
            <span className={`${sample.className} text-forkshop-fg`}>{TYPOGRAPHY_SAMPLE}</span>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-forkshop-2">
        <span className="font-mono text-forkshop-xs uppercase tracking-forkshop-wider text-forkshop-fg-muted">
          Body
        </span>
        {BODY_SAMPLES.map((sample) => (
          <div key={sample.label} className="flex flex-col gap-forkshop-0.5">
            <span className="font-mono text-forkshop-xs text-forkshop-fg-muted">
              {sample.label}
            </span>
            <span className={`${sample.className} text-forkshop-fg`}>{BODY_SAMPLE_TEXT}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

export default function DesignSystemBoardView({
  selectedNodeId,
  onBack,
}: {
  selectedNodeId?: string
  onBack?: () => void
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { nodePositions, onPositionChange } = useForkshopPositions()

  const tokens = useMemo(() => buildTokenRegistry(forkshopConfig.tailwindConfig), [])

  const primitiveGroups = useMemo<PrimitiveGroup[]>(() => {
    return [
      {
        id: "ui",
        label: "UI Primitives",
        primitives: forkshopConfig.primitives.map<InlineReactNode>((p) => ({
          id: `primitive:${p.id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 720,
          height: 480,
          label: p.name,
          filePath: p.sourcePath,
          render: p.render,
        })),
      },
    ]
  }, [])

  const typographyNode = useMemo<InlineReactNode>(
    () => ({
      id: "typography",
      kind: "inline-react",
      x: 0,
      y: 0,
      width: 720,
      height: 920,
      label: "Typography",
      render: () => <TypographySamples />,
    }),
    [],
  )

  return (
    <ForkshopCanvas
      containerRef={containerRef}
      stageRef={stageRef}
      stageWidth={STAGE_W}
      stageHeight={STAGE_H}
      fitMode="both"
      nodeTypes={BUILTIN_NODE_TYPES}
      onBack={onBack}
    >
      <DesignSystemGraph
        tokens={tokens}
        primitives={primitiveGroups}
        typography={typographyNode}
        selectedId={selectedNodeId}
        nodePositions={nodePositions}
        onPositionChange={onPositionChange}
      />
    </ForkshopCanvas>
  )
}
