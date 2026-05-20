import type { StudioBoard } from "../types"

export const BLOCKS_GALLERY: StudioBoard = {
  id: "blocks-gallery",
  title: "All blocks at a glance",
  frames: [
    {
      id: "main",
      x: 0,
      y: 0,
      width: 1200,
      height: 600,
      demoState: {
        selection: { kind: "section", sectionId: "blocks" },
      },
    },
  ],
}
