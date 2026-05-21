"use client"

import { useMemo } from "react"
import { ColorGraph, PrimitivesGrid, buildTokenRegistry } from "@forkshop/engine"
import { forkshopConfig } from "./forkshop.config"
import tailwindConfig from "../../tailwind.config"

function TypographySamples() {
  return (
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
  )
}

export function DesignSystemBoard(_props?: {
  nodePositions?: Record<string, { x: number; y: number }>
  onPositionChange?: (id: string, x: number, y: number) => void
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

  return (
    <div className="h-full w-full overflow-auto bg-forkshop-surface p-forkshop-4">
      <div className="flex flex-col gap-forkshop-6">
        <section>
          <ColorGraph tokens={tokens} />
        </section>
        <section className="max-w-xl">
          <TypographySamples />
        </section>
        <section className="demo-scope">
          <PrimitivesGrid ui={forkshopConfig.ui} />
        </section>
      </div>
    </div>
  )
}
