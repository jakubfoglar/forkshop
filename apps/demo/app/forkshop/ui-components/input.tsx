"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

const INSTANCES = [
  { id: "input-default", label: "Default", props: { placeholder: "Type here…" } },
  { id: "input-email", label: "Email", props: { type: "email", placeholder: "you@example.com" } },
  { id: "input-password", label: "Password", props: { type: "password", placeholder: "Password" } },
  { id: "input-disabled", label: "Disabled", props: { placeholder: "Disabled", disabled: true } },
  { id: "input-with-value", label: "With value", props: { defaultValue: "Hello world", readOnly: true } },
] as const

export function InputBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      INSTANCES.map(({ id, label, props }): GalleryEntry => {
        const node: InlineReactNode = {
          id: `primitive:${id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 280,
          height: 80,
          label,
          render: () => (
            <div className="inline-flex items-center justify-center bg-white p-6 w-full">
              <Input {...props} className="w-48" />
            </div>
          ),
        }
        return { label, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={1000} stageHeight={500} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="grid"
          viewportWidth={280}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
