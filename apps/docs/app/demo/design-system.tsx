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

export function DesignSystemBoard({
  nodePositions: _nodePositions,
  onPositionChange: _onPositionChange,
  initialZoom,
  initialPan,
}: {
  nodePositions: Record<string, { x: number; y: number }>
  onPositionChange: (id: string, x: number, y: number) => void
  initialZoom?: number
  initialPan?: { x: number; y: number }
}) {
  // Pass a synthetic config with theme.colors set to ONLY our curated tokens
  // (waveclash-* + demo-*). Using theme.colors (not theme.extend.colors) makes
  // resolveConfig REPLACE the default palette instead of merging into it, so
  // the Design System board shows only the WAVECLASH brand palette.
  const curatedConfig = useMemo(
    () => ({
      ...tailwindConfig,
      theme: { colors: tailwindConfig.theme?.extend?.colors ?? {} },
    }),
    [],
  )
  const tokens = useMemo(() => buildTokenRegistry(curatedConfig), [curatedConfig])

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
          render: () => <div className="demo-scope"><p.Component /></div>,
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
      height: 400,
      label: "Typography",
      render: () => (
        <div className="flex flex-col gap-4 bg-white p-6 shadow-md">
          <span className="font-mono text-xs uppercase tracking-widest text-gray-400">
            WAVECLASH Type Scale
          </span>
          {[
            { cls: "text-wc-display-xs", label: "display-xs / 30px" },
            { cls: "text-wc-9xl", label: "9xl / 72px" },
            { cls: "text-wc-8xl", label: "8xl / 64px" },
            { cls: "text-wc-7xl", label: "7xl / 32px" },
            { cls: "text-wc-2xl", label: "2xl / 16px" },
            { cls: "text-wc-sm", label: "sm / 11px" },
          ].map(({ cls, label }) => (
            <div key={label} className="flex flex-col">
              <span className="font-mono text-[9px] text-gray-400">{label}</span>
              <span className={`${cls} font-display text-waveclash-black`}>
                WAVECLASH
              </span>
            </div>
          ))}
        </div>
      ),
    }),
    [],
  )

  const stageSize = useMemo(
    () => getDesignSystemStageSize({ tokens, primitives: primitiveGroups, typography: typographyNode }),
    [tokens, primitiveGroups, typographyNode],
  )

  return (
    <PlaygroundBoard stageWidth={stageSize.width} stageHeight={stageSize.height} fitMode="both" boardId="design-system" initialZoom={initialZoom} initialPan={initialPan}>
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
