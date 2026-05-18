"use client"

import { useMemo } from "react"
import {
  DesignSystemView,
  getDesignSystemStageSize,
  buildTokenRegistry,
  discoverPrimitives,
  type InlineReactNode,
  type PrimitiveGroup,
} from "@forkshop/engine"
import { PlaygroundBoard } from "./playground-board"
import { forkshopConfig } from "./forkshop.config"
import tailwindConfig from "../../tailwind.config"

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
    <div className="flex flex-col gap-forkshop-4 bg-white p-forkshop-4 shadow-md">
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

export function DesignSystemBoard({
  nodePositions: _nodePositions,
  onPositionChange: _onPositionChange,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const tokens = useMemo(() => buildTokenRegistry(tailwindConfig), [])

  const primitiveGroups = useMemo<PrimitiveGroup[]>(
    () => [
      {
        id: "ui",
        label: "UI Primitives",
        primitives: discoverPrimitives(forkshopConfig.ui).map<InlineReactNode>((p) => ({
          id: `primitive:${p.slug}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 320,
          height: 160,
          label: p.name,
          render: () => <p.Component />,
        })),
      },
    ],
    [],
  )

  const typographyNode = useMemo<InlineReactNode>(
    () => ({
      id: "typography",
      kind: "inline-react",
      x: 0,
      y: 0,
      width: 360,
      height: 600,
      label: "Typography",
      render: () => <TypographySamples />,
    }),
    [],
  )

  const stageSize = useMemo(
    () => getDesignSystemStageSize({ tokens, primitives: primitiveGroups, typography: typographyNode }),
    [tokens, primitiveGroups, typographyNode],
  )

  return (
    <PlaygroundBoard stageWidth={stageSize.width} stageHeight={stageSize.height} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <DesignSystemView
          tokens={tokens}
          primitives={primitiveGroups}
          typography={typographyNode}
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
