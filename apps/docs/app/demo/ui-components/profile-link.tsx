"use client"

import { useMemo } from "react"
import { ProfileLink } from "../_components/ui/profile-link"
import { Gallery, type GalleryEntry, type InlineReactNode } from "@forkshop/engine"
import { PlaygroundBoard } from "../playground-board"

type ProfileLinkInstance = {
  id: string
  label: string
  children: string
  bg: string
}

const INSTANCES: ProfileLinkInstance[] = [
  { id: "profile-link-default",  label: "Default",           children: "VIEW PROFILE", bg: "bg-waveclash-cream" },
  { id: "profile-link-on-dark",  label: "On dark surface",   children: "VIEW PROFILE", bg: "bg-waveclash-black" },
  { id: "profile-link-see-all",  label: "See all athletes",  children: "SEE ALL ATHLETES", bg: "bg-waveclash-cream" },
]

export function ProfileLinkBoard() {
  const entries = useMemo<GalleryEntry[]>(
    () =>
      INSTANCES.map(({ id, label, children, bg }): GalleryEntry => {
        const node: InlineReactNode = {
          id: `profile-link:${id}`,
          kind: "inline-react",
          x: 0,
          y: 0,
          width: 240,
          height: 64,
          label,
          render: () => (
            <div className={`demo-scope inline-flex items-center justify-center ${bg} px-6 py-4`}>
              <ProfileLink>{children}</ProfileLink>
            </div>
          ),
        }
        return { id: node.id, label, node }
      }),
    [],
  )

  return (
    <PlaygroundBoard stageWidth={800} stageHeight={400} fitMode="both">
      {({ nodePositions: pos, onPositionChange: onPosChange }) => (
        <Gallery
          entries={entries}
          layout="stack"
          viewportWidth={240}
          fitContent
          nodePositions={pos}
          onPositionChange={onPosChange}
        />
      )}
    </PlaygroundBoard>
  )
}
