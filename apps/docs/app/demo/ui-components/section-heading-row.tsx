"use client"

import { useMemo } from "react"
import { SectionHeadingRow } from "../_components/ui/section-heading-row"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

type SectionHeadingInstance = {
  id: string
  label: string
  title: string
  eyebrow?: string
  size: "lg" | "xl"
  tone: "dark" | "light"
  bg: string
  width: number
  height: number
}

const INSTANCES: SectionHeadingInstance[] = [
  {
    id: "section-heading-event-schedule",
    label: "lg / dark (EVENT SCHEDULE)",
    title: "EVENT SCHEDULE",
    eyebrow: "WAVECLASH 2026",
    size: "lg",
    tone: "dark",
    bg: "bg-waveclash-cream",
    width: 800,
    height: 140,
  },
  {
    id: "section-heading-meet-surfers",
    label: "xl / dark (MEET THE SURFERS.)",
    title: "MEET THE SURFERS.",
    size: "xl",
    tone: "dark",
    bg: "bg-waveclash-cream",
    width: 800,
    height: 200,
  },
  {
    id: "section-heading-light",
    label: "lg / light (on dark bg)",
    title: "SECTION TITLE",
    eyebrow: "CATEGORY",
    size: "lg",
    tone: "light",
    bg: "bg-waveclash-black",
    width: 800,
    height: 140,
  },
]

export function SectionHeadingRowBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      INSTANCES.map(({ id, label, title, eyebrow, size, tone, bg, width, height }): GalleryEntry => {
        const node: InlineReactNode = {
          id: `section-heading-row:${id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width,
          height,
          label,
          render: () => (
            <div className={`demo-scope flex items-center ${bg} px-8 py-6 w-full`}>
              <SectionHeadingRow
                title={title}
                eyebrow={eyebrow}
                size={size}
                tone={tone}
                className="w-full"
              />
            </div>
          ),
        }
        return { label, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={1200} stageHeight={700} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="stack"
          viewportWidth={800}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
